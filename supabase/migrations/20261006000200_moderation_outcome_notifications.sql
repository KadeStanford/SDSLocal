begin;

-- Inbox availability must not depend on a device token or successful push delivery.
alter table public.notification_deliveries
  add column inbox_available_at timestamptz,
  add column moderation_outcome jsonb;
create index notification_moderation_inbox on public.notification_deliveries(user_id,created_at desc)
  where moderation_outcome is not null and dismissed_at is null;
-- Live staging has a broad authenticated UPDATE table grant in addition to the
-- intended inbox-column grants. Outcomes and delivery state are server-managed.
revoke update on public.notification_deliveries from public,anon,authenticated;
grant update(read_at,dismissed_at) on public.notification_deliveries to authenticated;

-- Only current owners / authors can see an outcome or follow its quick action.
create function public.moderation_outcome_access(p_user uuid,p_outcome jsonb)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare resource uuid := (p_outcome->>'resource_id')::uuid; kind text := p_outcome->>'kind';
begin
  if p_user is null or not (p_user=auth.uid() or coalesce(auth.role(),'')='service_role') then return false; end if;
  if kind in ('business','content_report') then
    return exists(select 1 from public.business_members m where m.business_id=(p_outcome->>'business_id')::uuid
      and m.user_id=p_user and m.role='owner' and m.is_active)
      and case p_outcome->>'resource_type' when 'business' then exists(select 1 from public.businesses where id=resource)
        when 'event' then exists(select 1 from public.events where id=resource and business_id=(p_outcome->>'business_id')::uuid)
        when 'offering_item' then exists(select 1 from public.offering_items where id=resource and business_id=(p_outcome->>'business_id')::uuid)
        else false end;
  elsif kind='pickup_review' then
    return exists(select 1 from public.pickup_order_reviews where id=resource and customer_id=p_user);
  elsif kind='event_review' then
    return exists(select 1 from public.verified_event_reviews where id=resource and customer_id=p_user);
  end if;
  return false;
end $$;
revoke all on function public.moderation_outcome_access(uuid,jsonb) from public,anon;
grant execute on function public.moderation_outcome_access(uuid,jsonb) to authenticated,service_role;
create policy moderation_outcomes_current_access on public.notification_deliveries as restrictive
  for select to authenticated using (moderation_outcome is null or public.moderation_outcome_access((select auth.uid()),moderation_outcome));

-- Private helper accepts only an already-created audit row, never a client-supplied recipient.
create function public.queue_moderation_outcomes(p_audit_id bigint)
returns integer language plpgsql security definer set search_path='' as $$
declare
  a public.platform_admin_audit_log%rowtype; action text; bid uuid; resource uuid; resource_type text;
  author uuid; recipient record; title text; summary text; next_step text; outcome jsonb; inserted integer:=0;
  delivery_id uuid; row_count integer; recipient_count integer:=0; push_enabled boolean:=false;
begin
  select * into strict a from public.platform_admin_audit_log where id=p_audit_id;
  action:=replace(a.action,'moderation_','');
  if action='start_review' then return 0; end if; -- A pending investigation is not an outcome.
  if action not in ('approve','reject','request_info','resolve','dismiss','hide','restore','reopen')
    or a.request_id is null or length(coalesce(a.details->>'reason','')) not between 10 and 1000 then
    raise exception 'Invalid moderated outcome' using errcode='22023'; end if;
  if a.target_type='business' then
    bid:=a.target_id; resource:=bid; resource_type:='business';
  elsif a.target_type='content_report' then
    select coalesce(r.business_id,e.business_id,o.business_id),coalesce(r.business_id,r.event_id,r.offering_item_id),r.target_type::text
      into bid,resource,resource_type from public.content_reports r
      left join public.events e on e.id=r.event_id left join public.offering_items o on o.id=r.offering_item_id where r.id=a.target_id;
  elsif a.target_type='pickup_review' then
    select v.business_id,v.id,v.customer_id into bid,resource,author
      from public.pickup_order_review_reports r join public.pickup_order_reviews v on v.id=r.review_id where r.id=a.target_id;
    resource_type:='pickup_review';
  elsif a.target_type='event_review' then
    select v.business_id,v.id,v.customer_id into bid,resource,author
      from public.verified_event_review_reports r join public.verified_event_reviews v on v.id=r.review_id where r.id=a.target_id;
    resource_type:='event_review';
  end if;
  if resource is null then raise exception 'Affected item is unavailable' using errcode='P0002'; end if;
  -- Original pickup authorization permits a guest with an order status proof.
  -- A guest has no account inbox; preserve moderation and audit without inventing
  -- a recipient or sending to an order email address.
  -- Both review author foreign keys also become null after account removal.
  if a.target_type in ('pickup_review','event_review') and author is null then return 0; end if;
  title:=case action when 'approve' then 'Your business was approved' when 'reject' then 'Your business needs changes'
    when 'request_info' then 'More business information is needed' when 'hide' then 'Your review was hidden'
    when 'restore' then 'Your review was restored' when 'reopen' then 'Your moderation case was reopened'
    when 'dismiss' then 'A report about your content was dismissed' else 'A report about your content was resolved' end;
  summary:=case action when 'approve' then 'The business is now published.'
    when 'reject' then 'The business returned to draft. This is not an account ban.'
    when 'request_info' then 'The business returned to draft so you can supply the requested information.'
    when 'hide' then 'The review is hidden from public display. Nothing was deleted.'
    when 'restore' then 'The review is published again.'
    when 'reopen' then case when a.target_type='business' and a.details->'before'->>'status'='active'
      then 'Publication was withdrawn while the business is reviewed again.' else 'The case is open for another review. Content visibility otherwise stays unchanged.' end
    else 'The report is closed. Content visibility stays unchanged.' end;
  next_step:=case when a.target_type='business' and action in ('reject','request_info')
    then 'Open your business, correct the requested details, check publication readiness, and submit it for review again.'
    when a.target_type='business' and action='approve' then 'Open your business to check its published details.'
    when a.target_type='business' then 'Open your business to check its current review status. Read this feedback before making changes.'
    when a.target_type='content_report' then 'Open the affected listing and read this outcome. Correct the specific detail if requested.'
    else 'Open the review and read this outcome. A moderator can reopen or reverse the decision if it needs another review.' end;
  -- Explicit allowlist: no actor, reporter, report allegation, private note or full audit snapshot.
  outcome:=jsonb_build_object('schema_version',1,'kind',a.target_type,'action',action,'business_id',bid,
    'resource_type',resource_type,'resource_id',resource,'public_reason',a.details->>'reason',
    'summary',summary,'next_step',next_step,'decision_sequence',a.id);
  -- Fail closed until the matching generic-copy dispatcher is deployed. The
  -- existing dispatcher must never pick up new outcome bodies during rollout.
  select coalesce((select value->'enabled'='true'::jsonb from public.platform_settings
    where key='moderation_push_enabled'),false) into push_enabled;
  for recipient in
    select m.user_id from public.business_members m where a.target_type in ('business','content_report')
      and m.business_id=bid and m.role='owner' and m.is_active
    union select author where a.target_type in ('pickup_review','event_review') and author is not null
  loop
    recipient_count:=recipient_count+1;
    delivery_id:=gen_random_uuid();
    -- Keep earlier outcomes in the inbox, but suppress obsolete queued push messages.
    update public.notification_deliveries d set status='skipped',last_error='Superseded moderation outcome',updated_at=now()
      where d.user_id=recipient.user_id and d.status='queued' and d.moderation_outcome->>'kind'=a.target_type
        and d.moderation_outcome->>'resource_id'=resource::text;
    insert into public.notification_deliveries(id,user_id,business_id,notification_type,entity_type,entity_id,dedupe_key,
      title,body,url,status,last_error,inbox_available_at,moderation_outcome,expires_at)
    values(delivery_id,recipient.user_id,bid,'operational','account',resource,
      'moderation:'||a.request_id||':'||recipient.user_id,title,left(summary||' Reason: '||(a.details->>'reason'),500),
      '/notification?deliveryId='||delivery_id,
      case when push_enabled and public.notification_enabled(recipient.user_id,bid,'operational') then 'queued' else 'skipped' end,
      case when not push_enabled then 'Moderation push disabled; inbox available' else null end,
      now(),outcome,now()+interval '30 days') on conflict(dedupe_key) do nothing;
    get diagnostics row_count=row_count; inserted:=inserted+row_count;
  end loop;
  if recipient_count=0 then raise exception 'No active affected recipient is available' using errcode='P0002'; end if;
  return inserted;
end $$;
revoke all on function public.queue_moderation_outcomes(bigint) from public,anon,authenticated;
grant execute on function public.queue_moderation_outcomes(bigint) to sds_business_moderator;

-- Recheck access and supersession before push. A skipped/failed push never removes the inbox entry.
create function public.moderation_notification_sendable(p_delivery_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare d public.notification_deliveries%rowtype;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Trusted dispatcher required' using errcode='42501'; end if;
  select * into d from public.notification_deliveries where id=p_delivery_id and moderation_outcome is not null;
  if not found then return false; end if;
  return public.moderation_outcome_access(d.user_id,d.moderation_outcome)
    and coalesce((select value->'enabled'='true'::jsonb from public.platform_settings where key='moderation_push_enabled'),false)
    and public.notification_enabled(d.user_id,d.business_id,d.notification_type)
    and (d.expires_at is null or d.expires_at>now())
    and not exists(select 1 from public.notification_deliveries newer where newer.user_id=d.user_id
      and newer.moderation_outcome->>'kind'=d.moderation_outcome->>'kind'
      and newer.moderation_outcome->>'resource_id'=d.moderation_outcome->>'resource_id'
      and (newer.moderation_outcome->>'decision_sequence')::bigint>(d.moderation_outcome->>'decision_sequence')::bigint);
end $$;
revoke all on function public.moderation_notification_sendable(uuid) from public,anon,authenticated;
grant execute on function public.moderation_notification_sendable(uuid) to service_role;

-- The quick action is computed from current state and checked ownership, not an untrusted URL.
create function public.get_my_moderation_outcome(p_delivery_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.notification_deliveries%rowtype; resource uuid; state text; app_path text; web_path text;
  label text; current_body text; latest boolean; section text;
begin
  if auth.uid() is null then raise exception 'Sign in to view this update' using errcode='42501'; end if;
  select * into d from public.notification_deliveries where id=p_delivery_id and user_id=auth.uid() and moderation_outcome is not null;
  if not found or not public.moderation_outcome_access(auth.uid(),d.moderation_outcome) then
    raise exception 'Update unavailable' using errcode='P0002'; end if;
  resource:=(d.moderation_outcome->>'resource_id')::uuid;
  latest:=not exists(select 1 from public.notification_deliveries newer where newer.user_id=d.user_id
    and newer.moderation_outcome->>'kind'=d.moderation_outcome->>'kind'
    and newer.moderation_outcome->>'resource_id'=d.moderation_outcome->>'resource_id'
    and (newer.moderation_outcome->>'decision_sequence')::bigint>(d.moderation_outcome->>'decision_sequence')::bigint);
  if d.moderation_outcome->>'kind'='business' then
    select status::text into state from public.businesses where id=resource;
    label:=case state when 'draft' then 'Edit business and resubmit' when 'pending_review' then 'View submitted business' else 'View business status' end;
    app_path:='/business?id='||resource||'&section=review';
    web_path:='/account/businesses/'||resource||'/settings#readiness';
  elsif d.moderation_outcome->>'kind'='content_report' then
    section:=case d.moderation_outcome->>'resource_type' when 'event' then 'events' when 'offering_item' then 'offerings' else 'profile' end;
    state:='report_'||(d.moderation_outcome->>'action'); label:='View affected listing';
    app_path:='/business?id='||(d.moderation_outcome->>'business_id')||'&section='||section||'&itemId='||resource;
    web_path:='/account/businesses/'||(d.moderation_outcome->>'business_id')||'/'||case section when 'profile' then 'settings' else section end||'?itemId='||resource;
  elsif d.moderation_outcome->>'kind'='pickup_review' then
    select moderation_status,review_text,'/order?orderId='||order_id into state,current_body,app_path from public.pickup_order_reviews where id=resource;
    label:='View your review and outcome'; web_path:='/account/moderation/'||d.id;
  else
    select moderation_status,review_text,'/my-event-reviews?eventId='||event_id into state,current_body,app_path from public.verified_event_reviews where id=resource;
    label:='View your event review and outcome'; web_path:='/account/moderation/'||d.id;
  end if;
  return jsonb_build_object('id',d.id,'title',d.title,'created_at',d.created_at,'read_at',d.read_at,'outcome',d.moderation_outcome,
    'current_state',state,'current_review_text',current_body,'is_latest',latest,
    'quick_action',jsonb_build_object('label',label,'app_path',app_path,'web_path',web_path,'requires_confirmation',false,'mutates',false));
end $$;
revoke all on function public.get_my_moderation_outcome(uuid) from public,anon;
grant execute on function public.get_my_moderation_outcome(uuid) to authenticated;
create function public.get_my_moderation_outcomes(p_limit integer default 50)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to view these updates' using errcode='42501'; end if;
  select coalesce(jsonb_agg(public.get_my_moderation_outcome(id) order by created_at desc),'[]'::jsonb) into result from
    (select id,created_at from public.notification_deliveries where user_id=auth.uid() and moderation_outcome is not null
      and dismissed_at is null and public.moderation_outcome_access(auth.uid(),moderation_outcome)
      order by created_at desc limit least(greatest(coalesce(p_limit,50),1),100)) recent;
  return result;
end $$;
revoke all on function public.get_my_moderation_outcomes(integer) from public,anon;
grant execute on function public.get_my_moderation_outcomes(integer) to authenticated;
commit;
notify pgrst,'reload schema';
