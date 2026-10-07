-- Combined pending admin schema/deletion004 regression; caller wraps full rollback.
\ir fixtures/business.sql
do $$
declare
  f database_test_fixture; remaining_owner uuid:=gen_random_uuid();
  sole_report uuid:=gen_random_uuid(); shared_report uuid:=gen_random_uuid();
  sole_audit bigint; shared_audit bigint; departing_actor_audit bigint;
  sole_request uuid:=gen_random_uuid(); shared_request uuid:=gen_random_uuid();
  sole_delivery uuid:=gen_random_uuid(); shared_delivery uuid:=gen_random_uuid();
  shared_update uuid:=gen_random_uuid(); shared_invite uuid:=gen_random_uuid();
  original_shared_audit jsonb; original_shared_delivery jsonb;
  original_shared_report jsonb; job jsonb; result jsonb; retry_denied boolean:=false; audit_count integer;
begin
  select * into f from database_test_fixture;
  insert into auth.users(id,raw_user_meta_data) values(remaining_owner,'{"display_name":"Remaining fixture owner"}');
  insert into public.platform_admins(user_id) values(remaining_owner);
  insert into public.business_members(business_id,user_id,role,is_active)
    values(f.other_business_id,remaining_owner,'owner',true);
  insert into public.business_updates(id,business_id,created_by,update_type,title,body)
    values(shared_update,f.other_business_id,f.owner_id,'announcement','Shared business news','Legitimate retained business announcement');
  insert into public.business_staff_invites(id,business_id,invited_email,token_hash,invited_by)
    values(shared_invite,f.other_business_id,'local-fixture@example.invalid',encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),f.owner_id);
  insert into public.content_reports(id,reporter_id,target_type,business_id,reason,details)
    values(sole_report,f.customer_id,'business',f.business_id,'other','SOLE_DELETE_ME content'),
      (shared_report,f.customer_id,'business',f.other_business_id,'other','Shared business report remains');
  insert into public.platform_admin_audit_log(actor_id,action,target_type,target_id,request_id,details)
    values(remaining_owner,'moderation_resolve','content_report',sole_report,sole_request,
      jsonb_build_object('reason','SOLE_DELETE_ME decision','private_note','SOLE_DELETE_ME note','expected_revision',repeat('1',32),
        'before',jsonb_build_object('kind','content_report','id',sole_report,'status','open','text','SOLE_DELETE_ME content',
          'context',jsonb_build_object('business_id',f.business_id,'target_type','business','target_id',f.business_id)),
        'after',jsonb_build_object('kind','content_report','id',sole_report,'status','resolved','text','SOLE_DELETE_ME content'))) returning id into sole_audit;
  insert into public.platform_admin_audit_log(actor_id,action,target_type,target_id,request_id,details)
    values(remaining_owner,'moderation_dismiss','content_report',shared_report,shared_request,
      '{"reason":"Shared business operational decision","private_note":"Retained unrelated operational note","before":{"status":"open"},"after":{"status":"dismissed"}}') returning id into shared_audit;
  insert into public.platform_admin_audit_log(actor_id,action,target_type,target_id,request_id,details)
    values(f.owner_id,'moderation_reopen','business',f.other_business_id,gen_random_uuid(),
      '{"reason":"ACTOR_DELETE_ME reason","private_note":"ACTOR_DELETE_ME note","before":{"status":"draft","text":"ACTOR_DELETE_ME text"},"after":{"status":"pending_review"}}') returning id into departing_actor_audit;
  insert into public.notification_deliveries(id,user_id,business_id,notification_type,entity_type,entity_id,dedupe_key,title,body,url,status,inbox_available_at,moderation_outcome)
    values(sole_delivery,remaining_owner,null,'operational','account',f.business_id,'ownership:'||sole_request,'Moderation outcome','SOLE_DELETE_ME inbox','/notification?deliveryId='||sole_delivery,'skipped',now(),
        jsonb_build_object('schema_version',1,'kind','content_report','resource_type','business','resource_id',f.business_id,'business_id',f.business_id,'public_reason','SOLE_DELETE_ME reason','decision_sequence',sole_audit)),
      (shared_delivery,remaining_owner,f.other_business_id,'operational','account',f.other_business_id,'ownership:'||shared_request,'Shared moderation outcome','Retained shared business inbox','/notification?deliveryId='||shared_delivery,'skipped',now(),
        jsonb_build_object('schema_version',1,'kind','content_report','resource_type','business','resource_id',f.other_business_id,'business_id',f.other_business_id,'public_reason','Retained shared business reason','decision_sequence',shared_audit));
  select to_jsonb(a) into original_shared_audit from public.platform_admin_audit_log a where id=shared_audit;
  select to_jsonb(d) into original_shared_delivery from public.notification_deliveries d where id=shared_delivery;
  select to_jsonb(r) into original_shared_report from public.content_reports r where id=shared_report;
  job:=public.begin_account_deletion(f.owner_id);
  if (job->'impact'->>'soleOwnedBusinessCount')::integer is distinct from 1
    or (job->'impact'->>'preservedOwnedBusinessCount')::integer is distinct from 1 then
    raise exception 'Ownership impact did not distinguish sole versus shared ownership'; end if;
  result:=public.execute_account_deletion(f.owner_id,(job->>'jobId')::uuid);
  if exists(select 1 from auth.users where id=f.owner_id)
    or exists(select 1 from public.profiles where id=f.owner_id)
    or exists(select 1 from public.businesses where id=f.business_id)
    or exists(select 1 from public.content_reports where id=sole_report) then
    raise exception 'Sole owner identity/business/report was retained'; end if;
  if not exists(select 1 from public.businesses where id=f.other_business_id and created_by=remaining_owner)
    or not exists(select 1 from public.business_members where business_id=f.other_business_id and user_id=remaining_owner and role='owner' and is_active)
    or exists(select 1 from public.business_members where user_id=f.owner_id) then
    raise exception 'Shared business transfer/member cleanup failed'; end if;
  if not exists(select 1 from public.business_updates where id=shared_update and created_by=remaining_owner and body='Legitimate retained business announcement')
    or not exists(select 1 from public.business_staff_invites where id=shared_invite and invited_by=remaining_owner and status='pending') then
    raise exception 'Shared business content/invitation was lost instead of transferred'; end if;
  if not exists(select 1 from public.platform_admin_audit_log where id=sole_audit and request_id=sole_request and details->>'privacy_redacted'='true'
    and details->'before'->>'status'='open' and details->'after'->>'status'='resolved' and details::text not like '%SOLE_DELETE_ME%') then
    raise exception 'Sole business decision evidence was lost or retained deleted content'; end if;
  if not exists(select 1 from public.platform_admin_audit_log where id=departing_actor_audit and actor_id is null and details->>'privacy_redacted'='true'
    and details::text not like '%ACTOR_DELETE_ME%') then
    raise exception 'Departing actor history was removed or retained identifying payload'; end if;
  if original_shared_audit is distinct from (select to_jsonb(a) from public.platform_admin_audit_log a where id=shared_audit)
    or original_shared_delivery is distinct from (select to_jsonb(d) from public.notification_deliveries d where id=shared_delivery)
    or original_shared_report is distinct from (select to_jsonb(r) from public.content_reports r where id=shared_report) then
    raise exception 'Unrelated shared-business report/audit/inbox was changed'; end if;
  if not exists(select 1 from public.notification_deliveries where id=sole_delivery and moderation_outcome->>'decision_sequence'=sole_audit::text
    and body not like '%SOLE_DELETE_ME%' and moderation_outcome::text not like '%SOLE_DELETE_ME%') then
    raise exception 'Retained affected inbox lost its decision key or leaked deleted content'; end if;
  if not exists(select 1 from auth.users where id=f.customer_id)
    or not exists(select 1 from public.square_orders where id=f.order_id and status='completed') then
    raise exception 'Business owner deletion removed another customer or completed financial record'; end if;
  result:=public.execute_account_deletion(f.owner_id,(job->>'jobId')::uuid);
  if not coalesce((result->>'alreadyDeleted')::boolean,false) then raise exception 'Ownership deletion retry was not idempotent'; end if;
  -- A surviving administrator must not replay a reduced privacy snapshot as a
  -- complete decision response, even using the original historical request ID.
  select count(*) into audit_count from public.platform_admin_audit_log;
  perform set_config('request.jwt.claim.sub',remaining_owner::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  begin
    perform public.admin_moderation_action('content_report',sole_report,'resolve','SOLE_DELETE_ME decision',repeat('1',32),sole_request,'SOLE_DELETE_ME note');
  exception when sqlstate '22023' then retry_denied:=true; end;
  if not retry_denied or (select count(*) from public.platform_admin_audit_log) is distinct from audit_count then
    raise exception 'Redacted historical decision replay was returned or created another audit'; end if;
end $$;
