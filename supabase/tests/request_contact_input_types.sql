begin;
create or replace function pg_temp.expect_contact_error(statement text) returns void language plpgsql as $$
begin
  begin execute statement; exception when sqlstate '22023' then return; end;
  raise exception 'Expected invalid contact answer to be rejected';
end $$;
do $$
declare owner_id uuid:=gen_random_uuid(); customer_id uuid:=gen_random_uuid(); biz uuid:=gen_random_uuid();
  fields jsonb:='[{"id":"email","label":"Email","type":"email","required":true,"options":[]},{"id":"phone","label":"Phone","type":"phone","required":false,"options":[]},{"id":"url","label":"Website","type":"url","required":false,"options":[]},{"id":"access","label":"Access instructions","type":"long_text","required":false,"options":[]}]';
  answers jsonb; invalid jsonb; result_id uuid; retry_key uuid:=gen_random_uuid();
begin
  -- SQL fixtures only: these inserts do not invoke email delivery.
  insert into auth.users(id,email,raw_user_meta_data) values(owner_id,null,'{"display_name":"Input owner"}'),
    (customer_id,'kade20413+input-rollback@gmail.com','{"display_name":"Input customer"}');
  perform set_config('request.jwt.claim.sub','',true);
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
    values(biz,owner_id,'input-sql-'||biz,'Input fixture','services','active',now());
  insert into public.business_members(business_id,user_id,role) values(biz,owner_id,'owner');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  if public.save_service_request_form(biz,0,fields)<>1 then raise exception 'Form did not save'; end if;
  perform set_config('request.jwt.claim.sub',customer_id::text,true);
  answers:=jsonb_build_object('email','person+tag@example.com','phone','+44 (20) 1234-5678','url','https://example.com/path?q=yes#info','access',repeat('Gate instructions. ',50));
  for invalid in select value from jsonb_array_elements('[{"email":""},{"email":"a@@example.com"},{"email":"a@bad..com"},{"email":"a b@example.com"},{"phone":"123"},{"phone":"1234567890123456"},{"phone":"555+1234567"},{"url":"javascript:alert(1)"},{"url":"example.com"},{"url":"https://"},{"url":"https://bad host.com"},{"url":"https://.example.com"},{"url":"https://user@example.com"}]') loop
    perform pg_temp.expect_contact_error(format('select public.submit_service_request(%L,%L,%L,null,null,1,%L)',biz,gen_random_uuid(),'Please help with my project',answers||invalid));
  end loop;
  result_id:=public.submit_service_request(biz,retry_key,'Please help with my project',null,null,1,answers);
  if (select jsonb_array_length(form_answers) from public.service_requests where id=result_id)<>4 then raise exception 'Snapshot missing'; end if;
  if public.submit_service_request(biz,retry_key,'Please help with my project',null,null,1,answers)<>result_id then raise exception 'Retry duplicated'; end if;
  perform public.submit_service_request(biz,gen_random_uuid(),'Please help with my project',null,null,1,'{"email":"person@example.com","phone":"","url":""}');
end $$;
select 'Contact types, invalid answers, optional blanks, multiline, snapshot and retry passed' as result;
rollback;
