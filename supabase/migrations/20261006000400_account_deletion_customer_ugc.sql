-- Pending alignment: local verification only; not applied to hosted staging.
begin;

-- Retain decision/retry keys without retaining a deleted administrator's profile.
alter table public.platform_admin_audit_log alter column actor_id drop not null;
alter table public.platform_admin_audit_log
  drop constraint platform_admin_audit_log_actor_id_fkey;
alter table public.platform_admin_audit_log
  add constraint platform_admin_audit_log_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

-- Privacy policy for affected snapshots: retain only operational IDs, states,
-- dates and revisions. Remove all titles, descriptions, review/report text,
-- reporter/context attribution and free-form moderator reasons/private notes.
-- This deliberately does not retain a reversible hash of customer text.
create function public.account_deletion_safe_moderation_snapshot(p_snapshot jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce((select jsonb_object_agg(key,value) from jsonb_each(
    case when jsonb_typeof(p_snapshot)='object' then p_snapshot else '{}'::jsonb end)
    where key in ('kind','id','status','content_status','created_at','revision')), '{}'::jsonb)
    || jsonb_build_object('privacy_redacted',true,'context',coalesce((
      select jsonb_object_agg(key,value) from jsonb_each(
        case when jsonb_typeof(p_snapshot->'context')='object' then p_snapshot->'context' else '{}'::jsonb end)
      where key in ('target_type','target_id','review_id','business_id','review_updated_at','resolved_at')
    ),'{}'::jsonb));
$$;
revoke all on function public.account_deletion_safe_moderation_snapshot(jsonb)
  from public,anon,authenticated;


-- FK anonymization can encounter a concurrently committed actor audit. Scrub
-- that row at the SET NULL transition as well as in the resource sweep below.
create function public.account_deletion_anonymize_moderation_actor()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.actor_id is not null and new.actor_id is null then
    new.details:=jsonb_build_object('reason','[Removed for account privacy]','private_note',null,
      'expected_revision',new.details->'expected_revision','notification_state',new.details->'notification_state',
      'before',public.account_deletion_safe_moderation_snapshot(new.details->'before'),
      'after',public.account_deletion_safe_moderation_snapshot(new.details->'after'),
      'privacy_redacted',true,'privacy_deletion_job_id',nullif(current_setting('parish.account_deletion_job',true),''));
  end if;
  return new;
end $$;
revoke all on function public.account_deletion_anonymize_moderation_actor() from public,anon,authenticated;
create trigger platform_admin_audit_anonymize_actor before update of actor_id
  on public.platform_admin_audit_log for each row
  execute function public.account_deletion_anonymize_moderation_actor();

create or replace function public.execute_account_deletion(p_user_id uuid, p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.account_deletion_jobs%rowtype;
  business_record record;
  replacement_owner uuid;
  owned_businesses uuid[];
  removed_businesses uuid[];
  removed_pickup_reviews uuid[];
  removed_event_reviews uuid[];
  removed_content_reports uuid[];
  removed_pickup_reports uuid[];
  removed_event_reports uuid[];
  affected_audits bigint[];
  affected_pickup_events bigint[];
  affected_event_events bigint[];
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into job
  from public.account_deletion_jobs
  where id = p_job_id and user_id = p_user_id
  for update;
  if job.id is null then
    raise exception 'Deletion request not found' using errcode = 'P0002';
  end if;
  if job.status in ('data_deleted', 'cleanup_pending', 'completed') then
    return jsonb_build_object('jobId', job.id, 'status', job.status, 'alreadyDeleted', true);
  end if;

  -- Serialize ownership changes before deciding which businesses will be
  -- deleted. Parent locks prevent new memberships; existing member locks
  -- prevent an active co-owner changing while classification is in use.
  select coalesce(array_agg(id),'{}'::uuid[]) into owned_businesses from (
    select b.id from public.businesses b
    where b.created_by=p_user_id or exists(
      select 1 from public.business_members m where m.business_id=b.id
        and m.user_id=p_user_id and m.role='owner' and m.is_active)
    order by b.id for update of b
  ) locked_businesses;
  perform 1 from public.business_members m
    where m.business_id=any(owned_businesses)
    order by m.business_id,m.user_id for update;

  -- Capture affected resources before business/review/profile cascades erase
  -- their relationships. Shared businesses remain outside this deletion set.
  select coalesce(array_agg(b.id),'{}'::uuid[]) into removed_businesses
  from public.businesses b where b.id=any(owned_businesses)
    and not exists(select 1 from public.business_members m where m.business_id=b.id
      and m.user_id<>p_user_id and m.role='owner' and m.is_active);
  select coalesce(array_agg(id),'{}'::uuid[]) into removed_pickup_reviews
    from public.pickup_order_reviews where customer_id=p_user_id or business_id=any(removed_businesses);
  select coalesce(array_agg(id),'{}'::uuid[]) into removed_event_reviews
    from public.verified_event_reviews where customer_id=p_user_id or business_id=any(removed_businesses)
      or rsvp_id in (select id from public.event_rsvps where customer_id=p_user_id);
  select coalesce(array_agg(id),'{}'::uuid[]) into removed_content_reports
    from public.content_reports where reporter_id=p_user_id or business_id=any(removed_businesses)
      or event_id in (select id from public.events where business_id=any(removed_businesses))
      or offering_item_id in (select id from public.offering_items where business_id=any(removed_businesses));
  select coalesce(array_agg(id),'{}'::uuid[]) into removed_pickup_reports
    from public.pickup_order_review_reports where reporter_id=p_user_id or review_id=any(removed_pickup_reviews);
  select coalesce(array_agg(id),'{}'::uuid[]) into removed_event_reports
    from public.verified_event_review_reports where reporter_id=p_user_id or review_id=any(removed_event_reviews);
  select coalesce(array_agg(id),'{}'::bigint[]) into affected_audits
    from public.platform_admin_audit_log where actor_id=p_user_id
      or (target_type='business' and target_id=any(removed_businesses))
      or (target_type='content_report' and target_id=any(removed_content_reports))
      or (target_type='pickup_review' and target_id=any(removed_pickup_reports))
      or (target_type='event_review' and target_id=any(removed_event_reports));
  select coalesce(array_agg(id),'{}'::bigint[]) into affected_pickup_events
    from public.pickup_order_review_events where actor_id=p_user_id or review_id=any(removed_pickup_reviews);
  select coalesce(array_agg(id),'{}'::bigint[]) into affected_event_events
    from public.verified_event_review_events where actor_id=p_user_id or review_id=any(removed_event_reviews);

  -- Customer loyalty history prevents membership deletion by design. Remove
  -- only transactions belonging to the deleting customer's memberships.
  delete from public.loyalty_transactions transaction
  where transaction.membership_id in (
    select membership.id
    from public.loyalty_memberships membership
    where membership.customer_id = p_user_id
  );

  for business_record in
    select business.id
    from public.businesses business
    where business.id=any(owned_businesses)
    order by business.id
  loop
    select owner.user_id into replacement_owner
    from public.business_members owner
    where owner.business_id = business_record.id
      and owner.role = 'owner'
      and owner.is_active
      and owner.user_id <> p_user_id
    order by owner.created_at, owner.user_id
    limit 1;

    if replacement_owner is null then
      delete from public.loyalty_transactions where business_id = business_record.id;
      delete from public.businesses where id = business_record.id;
    else
      update public.businesses
      set created_by = replacement_owner, updated_at = now()
      where id = business_record.id and created_by = p_user_id;
    end if;
  end loop;

  -- Preserve legitimate content and audit history for businesses that remain,
  -- while removing the departing person's attribution from restrictive keys.
  update public.media_assets asset
  set uploaded_by = business.created_by
  from public.businesses business
  where asset.business_id = business.id and asset.uploaded_by = p_user_id;

  update public.business_updates update_record
  set created_by = business.created_by
  from public.businesses business
  where update_record.business_id = business.id and update_record.created_by = p_user_id;

  update public.business_staff_invites invite
  set invited_by = business.created_by
  from public.businesses business
  where invite.business_id = business.id and invite.invited_by = p_user_id;

  update public.business_staff_invites
  set status = 'revoked', accepted_by = null, accepted_at = null, revoked_at = now()
  where accepted_by = p_user_id;

  update public.loyalty_transactions transaction
  set actor_id = business.created_by
  from public.businesses business
  where transaction.business_id = business.id and transaction.actor_id = p_user_id;

  -- Remove departing customer-authored reviews before RSVP/profile cascades.
  -- Keeping an event review would retain public UGC and its restrictive RSVP
  -- reference blocks account deletion entirely. Reports/events follow their
  -- existing review cascades; retained financial records are unchanged.
  delete from public.pickup_order_reviews where customer_id = p_user_id;
  delete from public.verified_event_reviews
  where customer_id = p_user_id
     or rsvp_id in (select id from public.event_rsvps where customer_id = p_user_id);

  -- The first delete can wait for a moderator while that transaction commits
  -- a new review/report outside its statement snapshot. Lock both identity
  -- parents (the review/report FKs use Auth, other sources use profiles), then
  -- refresh resource IDs and delete late UGC before identity SET NULL cascades.
  -- New FK writers now wait and cannot leave anonymous public customer text.
  perform 1 from auth.users where id=p_user_id for update;
  perform 1 from public.profiles where id=p_user_id for update;
  removed_pickup_reviews:=removed_pickup_reviews||array(
    select id from public.pickup_order_reviews where customer_id=p_user_id);
  removed_event_reviews:=removed_event_reviews||array(
    select id from public.verified_event_reviews where customer_id=p_user_id
      or rsvp_id in (select id from public.event_rsvps where customer_id=p_user_id));
  removed_content_reports:=removed_content_reports||array(
    select id from public.content_reports where reporter_id=p_user_id);
  removed_pickup_reports:=removed_pickup_reports||array(
    select id from public.pickup_order_review_reports
      where reporter_id=p_user_id or review_id=any(removed_pickup_reviews));
  removed_event_reports:=removed_event_reports||array(
    select id from public.verified_event_review_reports
      where reporter_id=p_user_id or review_id=any(removed_event_reviews));
  affected_pickup_events:=affected_pickup_events||array(
    select id from public.pickup_order_review_events
      where actor_id=p_user_id or review_id=any(removed_pickup_reviews));
  affected_event_events:=affected_event_events||array(
    select id from public.verified_event_review_events
      where actor_id=p_user_id or review_id=any(removed_event_reviews));
  delete from public.pickup_order_reviews where customer_id=p_user_id;
  delete from public.verified_event_reviews where customer_id=p_user_id
    or rsvp_id in (select id from public.event_rsvps where customer_id=p_user_id);

  -- Deleting the Auth row and its profile happens in this same database
  -- transaction. All remaining personal rows use profile cascades/set-null.
  perform set_config('parish.account_deletion_job',p_job_id::text,true);
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  -- Final sweep follows source/profile cascades. It includes decisions that
  -- committed while deletion waited for resource/FK locks. The actor trigger
  -- marks concurrent anonymizations with this operation's technical job ID.
  select coalesce(array_agg(id),'{}'::bigint[]) into affected_audits
    from public.platform_admin_audit_log where id=any(affected_audits)
      or details->>'privacy_deletion_job_id'=p_job_id::text
      or (target_type='business' and target_id=any(removed_businesses))
      or (target_type='content_report' and target_id=any(removed_content_reports))
      or (target_type='pickup_review' and target_id=any(removed_pickup_reports))
      or (target_type='event_review' and target_id=any(removed_event_reports))
      -- A report can be created and cascaded away after initial ID capture.
      -- Its immutable decision snapshots still identify the removed resource.
      or (target_type in ('content_report','pickup_review','event_review') and (
        details#>>'{before,context,business_id}' in (select id::text from unnest(removed_businesses) id)
        or details#>>'{after,context,business_id}' in (select id::text from unnest(removed_businesses) id)))
      or (target_type='pickup_review' and (
        details#>>'{before,context,review_id}' in (select id::text from unnest(removed_pickup_reviews) id)
        or details#>>'{after,context,review_id}' in (select id::text from unnest(removed_pickup_reviews) id)))
      or (target_type='event_review' and (
        details#>>'{before,context,review_id}' in (select id::text from unnest(removed_event_reviews) id)
        or details#>>'{after,context,review_id}' in (select id::text from unnest(removed_event_reviews) id)));

  -- Scrub live operational feedback only when its latest audited decision is
  -- affected. A later unrelated administrator's decision remains unchanged.
  update public.businesses b set review_feedback='[Removed for account privacy]'
    where exists(select 1 from public.platform_admin_audit_log a where a.id=any(affected_audits)
      and a.target_type='business' and a.target_id=b.id
      and a.id=(select max(n.id) from public.platform_admin_audit_log n where n.target_type=a.target_type and n.target_id=a.target_id));
  update public.content_reports r set resolution_note='[Removed for account privacy]'
    where exists(select 1 from public.platform_admin_audit_log a where a.id=any(affected_audits)
      and a.target_type='content_report' and a.target_id=r.id
      and a.id=(select max(n.id) from public.platform_admin_audit_log n where n.target_type=a.target_type and n.target_id=a.target_id));
  update public.pickup_order_review_reports r set resolution_note='[Removed for account privacy]'
    where exists(select 1 from public.platform_admin_audit_log a where a.id=any(affected_audits)
      and a.target_type='pickup_review' and a.target_id=r.id
      and a.id=(select max(n.id) from public.platform_admin_audit_log n where n.target_type=a.target_type and n.target_id=a.target_id));
  update public.verified_event_review_reports r set resolution_note='[Removed for account privacy]'
    where exists(select 1 from public.platform_admin_audit_log a where a.id=any(affected_audits)
      and a.target_type='event_review' and a.target_id=r.id
      and a.id=(select max(n.id) from public.platform_admin_audit_log n where n.target_type=a.target_type and n.target_id=a.target_id));

  update public.platform_admin_audit_log
    set actor_id=case when actor_id=p_user_id then null else actor_id end,
      details=jsonb_build_object('reason','[Removed for account privacy]','private_note',null,
        'expected_revision',details->'expected_revision','notification_state',details->'notification_state',
        'before',public.account_deletion_safe_moderation_snapshot(details->'before'),
        'after',public.account_deletion_safe_moderation_snapshot(details->'after'),'privacy_redacted',true)
    where id=any(affected_audits);

  -- Review event trails also survive review deletion via SET NULL. Keep their
  -- event IDs/types/state transitions, but discard free-form copied content.
  update public.pickup_order_review_events set event_data=jsonb_build_object(
    'action',event_data->'action','request_id',event_data->'request_id','privacy_redacted',true)
    where id=any(affected_pickup_events) or review_id=any(removed_pickup_reviews)
      or event_data->>'request_id' in (select to_jsonb(a)->>'request_id' from public.platform_admin_audit_log a where id=any(affected_audits));
  update public.verified_event_review_events set event_data=jsonb_build_object(
    'action',event_data->'action','request_id',event_data->'request_id','privacy_redacted',true)
    where id=any(affected_event_events) or review_id=any(removed_event_reviews)
      or event_data->>'request_id' in (select to_jsonb(a)->>'request_id' from public.platform_admin_audit_log a where id=any(affected_audits));

  -- Admin002's outcome field is optional on the older baseline. Its recipient
  -- cascades/access checks remain intact; scrub remaining copies of free-form
  -- reasons in other recipients' retained inbox rows for affected decisions.
  if exists(select 1 from information_schema.columns where table_schema='public'
    and table_name='notification_deliveries' and column_name='moderation_outcome') then
    update public.notification_deliveries
      set body='Moderation content was removed following account deletion.',
        moderation_outcome=jsonb_set(moderation_outcome,'{public_reason}',
          to_jsonb('[Removed for account privacy]'::text)),updated_at=now()
      where moderation_outcome is not null
        and moderation_outcome->>'decision_sequence'=any(
          array(select id::text from unnest(affected_audits) id));
  end if;

  update public.account_deletion_jobs
  set status = 'data_deleted', last_error = null, updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('jobId', p_job_id, 'status', 'data_deleted', 'alreadyDeleted', false);
end;
$$;

revoke all on function public.execute_account_deletion(uuid, uuid) from public,anon,authenticated;
grant execute on function public.execute_account_deletion(uuid, uuid) to service_role;

commit;
