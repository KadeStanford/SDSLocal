begin;

-- A request ID is an idempotency key, not an authorization credential.
alter table public.platform_admin_audit_log add column request_id uuid;
create unique index platform_admin_audit_request_id on public.platform_admin_audit_log(request_id)
  where request_id is not null;

-- Private normalized projection. Only checked RPCs can read it.
create view public.admin_moderation_records as
with records as (
  select 'business'::text kind, b.id, b.status::text status,
    coalesce(b.submitted_at,b.created_at) created_at,
    jsonb_build_object(
      'kind','business','id',b.id,'title',b.name,'subtitle',concat_ws(', ',b.city,b.region_code),
      'status',b.status,'content_status',b.status,'created_at',coalesce(b.submitted_at,b.created_at),
      'text',b.description,'reason',null,'details',null,'resolution_note',b.review_feedback,
      'readiness',public.get_business_readiness(b.id),
      'duplicates',(select count(*) from public.businesses other where other.id <> b.id
        and (
          (lower(trim(other.name))=lower(trim(b.name)) and coalesce(lower(other.city),'')=coalesce(lower(b.city),''))
          or (nullif(regexp_replace(b.phone,'[^0-9]','','g'),'') is not null
            and regexp_replace(other.phone,'[^0-9]','','g')=regexp_replace(b.phone,'[^0-9]','','g')))),
      'activity_count',(select count(*) from public.businesses sibling where sibling.created_by=b.created_by
        and coalesce(sibling.submitted_at,sibling.created_at) between coalesce(b.submitted_at,b.created_at)-interval '30 minutes'
          and coalesce(b.submitted_at,b.created_at)+interval '30 minutes'),
      'context',jsonb_build_object('slug',b.slug,'phone',b.phone,'email',b.email,'website',b.website_url,
        'submitted_at',b.submitted_at,'reviewed_at',b.reviewed_at,'updated_at',b.updated_at,
        'address',concat_ws(', ',b.address_line_1,b.city,b.region_code),'target_type','business','target_id',b.id)
    ) record
  from public.businesses b
  where b.status='pending_review' or b.reviewed_at is not null
  union all
  select 'content_report',r.id,r.status::text,r.created_at,
    jsonb_build_object('kind','content_report','id',r.id,
      'title',coalesce(b.name,e.title,o.name,'Unavailable content'),
      'subtitle',r.target_type::text||' report','status',r.status,'content_status',null,
      'created_at',r.created_at,'text',coalesce(b.description,e.description,o.description,''),
      'reason',r.reason,'details',r.details,'resolution_note',r.resolution_note,
      'readiness',null,'duplicates',(select count(*) from public.content_reports d where d.id<>r.id
        and coalesce(d.business_id,d.event_id,d.offering_item_id)=coalesce(r.business_id,r.event_id,r.offering_item_id)
        and d.status in ('open','reviewing')),
      'activity_count',(select count(*) from public.content_reports d where d.reporter_id=r.reporter_id
        and d.created_at between r.created_at-interval '30 minutes' and r.created_at+interval '30 minutes'),
      'context',jsonb_build_object('target_type',r.target_type,'target_id',coalesce(r.business_id,r.event_id,r.offering_item_id),
        'reporter',coalesce(p.display_name,'Customer'),'updated_at',r.updated_at,
        'slug',coalesce(b.slug,e.slug),'business_id',coalesce(b.id,e.business_id,o.business_id)))
  from public.content_reports r
  left join public.businesses b on b.id=r.business_id
  left join public.events e on e.id=r.event_id
  left join public.offering_items o on o.id=r.offering_item_id
  left join public.profiles p on p.id=r.reporter_id
  union all
  select 'pickup_review',r.id,r.status,r.created_at,
    jsonb_build_object('kind','pickup_review','id',r.id,'title',coalesce(b.name,'Deleted business'),
      'subtitle','Verified pickup review','status',r.status,'content_status',v.moderation_status,
      'created_at',r.created_at,'text',v.review_text,'reason',r.reason,'details',r.details,
      'resolution_note',r.resolution_note,'readiness',null,
      'duplicates',(select count(*) from public.pickup_order_review_reports d where d.review_id=r.review_id and d.id<>r.id and d.status='open'),
      'activity_count',(select count(*) from public.pickup_order_review_reports d where d.reporter_id=r.reporter_id
        and d.created_at between r.created_at-interval '30 minutes' and r.created_at+interval '30 minutes'),
      'context',jsonb_build_object('review_id',v.id,'rating',v.rating,'merchant_response',v.merchant_response,
        'outcome_recipient',case when v.customer_id is null then 'no_account' else 'account' end,
        'review_updated_at',v.updated_at,'resolved_at',r.resolved_at,'reporter',coalesce(p.display_name,'Customer'),
        'business_id',b.id,'slug',b.slug,'target_type','pickup_review','target_id',v.id))
  from public.pickup_order_review_reports r join public.pickup_order_reviews v on v.id=r.review_id
  left join public.businesses b on b.id=v.business_id left join public.profiles p on p.id=r.reporter_id
  union all
  select 'event_review',r.id,r.status,r.created_at,
    jsonb_build_object('kind','event_review','id',r.id,'title',coalesce(e.title,'Deleted event'),
      'subtitle',coalesce(b.name,'Deleted business')||' / verified event review','status',r.status,'content_status',v.moderation_status,
      'created_at',r.created_at,'text',v.review_text,'reason',r.reason,'details',r.details,
      'resolution_note',r.resolution_note,'readiness',null,
      'duplicates',(select count(*) from public.verified_event_review_reports d where d.review_id=r.review_id and d.id<>r.id and d.status='open'),
      'activity_count',(select count(*) from public.verified_event_review_reports d where d.reporter_id=r.reporter_id
        and d.created_at between r.created_at-interval '30 minutes' and r.created_at+interval '30 minutes'),
      'context',jsonb_build_object('review_id',v.id,'rating',v.rating,'merchant_response',v.merchant_response,
        'outcome_recipient',case when v.customer_id is null then 'no_account' else 'account' end,
        'review_updated_at',v.updated_at,'resolved_at',r.resolved_at,'reporter',coalesce(p.display_name,'Customer'),
        'business_id',b.id,'slug',b.slug,'target_type','event_review','target_id',v.id))
  from public.verified_event_review_reports r join public.verified_event_reviews v on v.id=r.review_id
  left join public.businesses b on b.id=v.business_id left join public.events e on e.id=v.event_id
  left join public.profiles p on p.id=r.reporter_id
)
select kind,id,status,created_at,record||jsonb_build_object('revision',md5(record::text)) record from records;
revoke all on public.admin_moderation_records from public,anon,authenticated;

create function public.get_admin_moderation_snapshot(
  p_kind text default null,p_state text default 'open',p_search text default '',p_offset integer default 0
) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_state not in ('open','all') or p_state is null or p_offset is null or p_offset < 0
    or char_length(coalesce(p_search,''))>120 or (p_kind is not null and p_kind not in ('business','content_report','pickup_review','event_review')) then
    raise exception 'Invalid queue filters' using errcode='22023'; end if;
  with filtered as (
    select * from public.admin_moderation_records
    where (p_kind is null or kind=p_kind) and (p_state='all' or status in ('pending_review','open','reviewing'))
      and (coalesce(p_search,'')='' or position(lower(p_search) in lower((record->>'title')||' '||(record->>'text')||' '||coalesce(record->>'reason','')))>0)
  ), page as (select * from filtered order by created_at,kind,id limit 50 offset p_offset)
  select jsonb_build_object('records',coalesce((select jsonb_agg(record order by created_at,kind,id) from page),'[]'::jsonb),
    'total',(select count(*) from filtered),'offset',p_offset,'page_size',50,
    'counts',(select coalesce(jsonb_object_agg(kind,cnt),'{}'::jsonb) from (
      select kind,count(*) cnt from public.admin_moderation_records where status in ('pending_review','open','reviewing') group by kind) counts),
    'operations',jsonb_build_object('service_requests',(select count(*) from public.service_requests where status in ('new','in_review')),
      'order_requests',(select count(*) from public.square_order_support_requests where status='open'),
      'appointments',(select count(*) from public.appointments where status in ('requested','payment_review'))),
    'generated_at',now()) into result;
  return result;
end $$;

create function public.get_admin_moderation_record(p_kind text,p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; history jsonb;
begin
  if not public.is_platform_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  select record into result from public.admin_moderation_records where kind=p_kind and id=p_id;
  if result is null then raise exception 'Record not found' using errcode='P0002'; end if;
  select coalesce(jsonb_agg(entry order by created_at desc),'[]'::jsonb) into history from (
    select a.created_at,jsonb_build_object('id',a.id,'action',a.action,'created_at',a.created_at,
      'actor',coalesce(p.display_name,'Administrator'),'details',a.details) entry
    from public.platform_admin_audit_log a left join public.profiles p on p.id=a.actor_id
    where a.target_type=p_kind and a.target_id=p_id order by a.created_at desc limit 50
  ) recent;
  return result||jsonb_build_object('history',history);
end $$;

-- A single checked transactional mutation path. No delete, suspension or payment action.
create function public.admin_moderation_action(
  p_kind text,p_id uuid,p_action text,p_reason text,p_expected_revision text,p_request_id uuid,p_private_note text default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  actor uuid := public.moderation_request_user_id();
  before_record jsonb; after_record jsonb; existing public.platform_admin_audit_log%rowtype;
  review_id uuid; prior_status text; content_status text; next_content_status text;
  note text := trim(coalesce(p_reason,'')); private_note text := nullif(trim(coalesce(p_private_note,'')),'');
  audit_id bigint; notification_count integer; notification_state text;
begin
  if not public.is_platform_admin() or actor is null then raise exception 'Administrator access required' using errcode='42501'; end if;
  if p_request_id is null or p_id is null or p_expected_revision is null or length(p_expected_revision)<>32
    or length(note) not between 10 and 1000 or length(coalesce(private_note,''))>2000 or p_kind is null or p_action is null
    or p_kind not in ('business','content_report','pickup_review','event_review') then
    raise exception 'Provide a valid record, revision, request ID and a reason of 10-1000 characters' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
  select * into existing from public.platform_admin_audit_log where request_id=p_request_id;
  if found then
    -- Privacy cleanup removes the original free-form payload and reduces the
    -- snapshot. It can no longer attest an identical retry or return a full
    -- DecisionResult.record. Preserve the audit key; require a fresh record.
    if existing.details->>'privacy_redacted'='true' then
      raise exception 'Historical decision was redacted for account privacy. Refresh the record before making a new decision.' using errcode='22023'; end if;
    -- A privacy cleanup may anonymize the actor or scrub historical payload.
    -- NULL must never make a different actor/payload compare as an exact retry.
    if existing.actor_id is distinct from actor or existing.target_type is distinct from p_kind or existing.target_id is distinct from p_id
      or existing.action is distinct from 'moderation_'||p_action or existing.details->>'reason' is distinct from note
      or existing.details->>'expected_revision' is distinct from p_expected_revision
      or coalesce(existing.details->>'private_note','')<>coalesce(private_note,'') then
      raise exception 'Request ID already used for a different decision' using errcode='22023'; end if;
    return jsonb_build_object('replayed',true,'audit_id',existing.id,'record',existing.details->'after',
      'notification_state',existing.details->>'notification_state');
  end if;
  if p_kind='business' then
    perform 1 from public.businesses where id=p_id for update;
  elsif p_kind='content_report' then
    perform 1 from public.content_reports where id=p_id for update;
  elsif p_kind='pickup_review' then
    select r.review_id into review_id from public.pickup_order_review_reports r where r.id=p_id for update;
    perform 1 from public.pickup_order_reviews where id=review_id for update;
  else
    select r.review_id into review_id from public.verified_event_review_reports r where r.id=p_id for update;
    perform 1 from public.verified_event_reviews where id=review_id for update;
  end if;
  select record into before_record from public.admin_moderation_records where kind=p_kind and id=p_id;
  if before_record is null then raise exception 'Record not found' using errcode='P0002'; end if;
  if before_record->>'revision'<>p_expected_revision then
    raise exception 'This record changed. Refresh it before deciding.' using errcode='40001'; end if;
  prior_status := before_record->>'status'; content_status := before_record->>'content_status';
  if p_kind='business' then
    if p_action='approve' and prior_status='pending_review' then
      if not coalesce((public.get_business_readiness(p_id)->>'ready')::boolean,false) then
        raise exception 'Complete every readiness check before approval' using errcode='22023'; end if;
      update public.businesses set status='active',approved_at=now(),reviewed_at=now(),reviewed_by=actor,review_feedback=null where id=p_id;
    elsif p_action in ('reject','request_info') and prior_status='pending_review' then
      update public.businesses set status='draft',approved_at=null,reviewed_at=now(),reviewed_by=actor,review_feedback=note where id=p_id;
    elsif p_action='reopen' and prior_status in ('draft','active') then
      update public.businesses set status='pending_review',approved_at=null,reviewed_at=now(),reviewed_by=actor,review_feedback=note where id=p_id;
    else raise exception 'This business action is not available in its current state' using errcode='22023'; end if;
  elsif p_kind='content_report' then
    if (p_action in ('resolve','dismiss') and prior_status in ('open','reviewing'))
      or (p_action='start_review' and prior_status='open')
      or (p_action='reopen' and prior_status in ('resolved','dismissed','reviewing')) then
      update public.content_reports set status=(case p_action when 'resolve' then 'resolved'
        when 'dismiss' then 'dismissed' when 'start_review' then 'reviewing' else 'open' end)::public.report_status,
        resolution_note=note,updated_at=now() where id=p_id;
    else raise exception 'This report action is not available in its current state' using errcode='22023'; end if;
  else
    if not ((p_action in ('hide','dismiss') and prior_status='open')
      or (p_action='restore' and content_status in ('hidden','removed'))
      or (p_action='reopen' and prior_status in ('resolved','dismissed'))) then
      raise exception 'This review action is not available in its current state' using errcode='22023'; end if;
    next_content_status := case p_action when 'hide' then 'hidden' when 'restore' then 'published' else content_status end;
    if p_kind='pickup_review' then
      if p_action in ('hide','restore') then
        update public.pickup_order_reviews set moderation_status=next_content_status,moderated_at=now(),moderated_by=actor where id=review_id;
        insert into public.pickup_order_review_events(review_id,order_id,actor_id,event_type,event_data)
          select id,order_id,actor,'moderated',jsonb_build_object('action',p_action,'reason',note,'request_id',p_request_id)
          from public.pickup_order_reviews where id=review_id;
      end if;
      update public.pickup_order_review_reports set status=case p_action when 'dismiss' then 'dismissed' when 'reopen' then 'open' else 'resolved' end,
        resolution_note=note,resolved_at=case when p_action='reopen' then null else now() end,
        resolved_by=case when p_action='reopen' then null else actor end where id=p_id;
    else
      if p_action in ('hide','restore') then
        update public.verified_event_reviews set moderation_status=next_content_status,moderated_at=now(),moderated_by=actor where id=review_id;
        insert into public.verified_event_review_events(review_id,event_id,actor_id,event_type,event_data)
          select id,event_id,actor,'moderated',jsonb_build_object('action',p_action,'reason',note,'request_id',p_request_id)
          from public.verified_event_reviews where id=review_id;
      end if;
      update public.verified_event_review_reports set status=case p_action when 'dismiss' then 'dismissed' when 'reopen' then 'open' else 'resolved' end,
        resolution_note=note,resolved_at=case when p_action='reopen' then null else now() end,
        resolved_by=case when p_action='reopen' then null else actor end where id=p_id;
    end if;
  end if;
  select record into after_record from public.admin_moderation_records where kind=p_kind and id=p_id;
  notification_state:=case when p_action='start_review' then 'not_an_outcome'
    when p_kind in ('pickup_review','event_review') and before_record->'context'->>'outcome_recipient'='no_account' then 'no_account'
    else 'inbox_available' end;
  insert into public.platform_admin_audit_log(actor_id,action,target_type,target_id,request_id,details)
    values(actor,'moderation_'||p_action,p_kind,p_id,p_request_id,jsonb_build_object(
      'reason',note,'private_note',private_note,'expected_revision',p_expected_revision,'before',before_record,'after',after_record,
      'notification_state',notification_state)) returning id into audit_id;
  -- Inbox/outbox creation is in this transaction. A failed notification write rolls back the decision and audit.
  notification_count := public.queue_moderation_outcomes(audit_id);
  return jsonb_build_object('replayed',false,'record',after_record,'audit_id',audit_id,
    'notification_count',notification_count,'notification_state',notification_state);
end $$;

revoke all on function public.get_admin_moderation_snapshot(text,text,text,integer),
  public.get_admin_moderation_record(text,uuid),public.admin_moderation_action(text,uuid,text,text,text,uuid,text) from public,anon;
grant execute on function public.get_admin_moderation_snapshot(text,text,text,integer),
  public.get_admin_moderation_record(text,uuid),public.admin_moderation_action(text,uuid,text,text,text,uuid,text) to authenticated;

-- Preserve the existing narrow no-login identity needed by the business guard.
grant select on public.businesses,public.content_reports,public.pickup_order_reviews,public.pickup_order_review_reports,
  public.verified_event_reviews,public.verified_event_review_reports,public.platform_admin_audit_log,
  public.admin_moderation_records to sds_business_moderator;
grant update on public.content_reports,public.pickup_order_review_reports,public.verified_event_review_reports to sds_business_moderator;
grant update(moderation_status,moderated_at,moderated_by) on public.pickup_order_reviews,public.verified_event_reviews to sds_business_moderator;
grant insert on public.platform_admin_audit_log,public.pickup_order_review_events,public.verified_event_review_events to sds_business_moderator;
grant usage,select on sequence public.platform_admin_audit_log_id_seq,public.pickup_order_review_events_id_seq,
  public.verified_event_review_events_id_seq to sds_business_moderator;
-- Preserve pre-existing trusted-role membership and schema privileges.
do $$
declare
  before_memberships jsonb;
  after_memberships jsonb;
  had_set boolean := pg_has_role(current_user,'sds_business_moderator','SET');
  had_create boolean := has_schema_privilege('sds_business_moderator','public','CREATE');
  added_membership boolean := false;
begin
  if current_user <> 'postgres' then
    raise exception 'Reviewed staging ownership proposal requires postgres';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('grantor',m.grantor,
    'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option)
    order by m.grantor),'[]'::jsonb) into before_memberships
  from pg_auth_members m
  where m.roleid='sds_business_moderator'::regrole and m.member=current_user::regrole;
  if not had_set then
    if exists(select 1 from pg_auth_members m
      where m.roleid='sds_business_moderator'::regrole
        and m.member=current_user::regrole and m.grantor=current_user::regrole) then
      raise exception 'Existing self-granted membership requires separate review';
    end if;
    -- A NEW edge defaults to SET=true, ADMIN=false. Explicit INHERIT=false
    -- prevents inherited moderator privileges; original grantor's edge is untouched.
    grant sds_business_moderator to postgres with inherit false granted by postgres;
    added_membership := true;
  end if;
  if not had_create then grant create on schema public to sds_business_moderator; end if;
  alter function public.admin_moderation_action(text,uuid,text,text,text,uuid,text)
    owner to sds_business_moderator;
  -- Retirement also needs the old approval function's actual owner. The same
  -- temporary SET edge remains active; no additional role or lasting grant.
  set local role sds_business_moderator;
  revoke execute on function public.approve_business(uuid) from public,anon,authenticated;
  reset role;
  if not had_create then revoke create on schema public from sds_business_moderator; end if;
  if added_membership then
    revoke sds_business_moderator from postgres granted by postgres;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('grantor',m.grantor,
    'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option)
    order by m.grantor),'[]'::jsonb) into after_memberships
  from pg_auth_members m
  where m.roleid='sds_business_moderator'::regrole and m.member=current_user::regrole;
  if before_memberships is distinct from after_memberships
    or had_set is distinct from pg_has_role(current_user,'sds_business_moderator','SET')
    or had_create is distinct from has_schema_privilege('sds_business_moderator','public','CREATE') then
    raise exception 'Moderator membership or schema privilege preservation failed';
  end if;
end $$;

-- Retire unversioned manual write endpoints. New UI and checked action RPC above
-- replace their callers. This does not revoke merchant/customer workflow RPCs.
revoke execute on function public.reject_business(uuid,text),
  public.resolve_platform_report(uuid,public.report_status,text),public.resolve_pickup_review_report(uuid,text,text)
  from public,anon,authenticated;

commit;
notify pgrst,'reload schema';
