begin;
create function pg_temp.expect_form_error(statement text, expected text) returns void language plpgsql as $$ begin
 begin execute statement; exception when others then if position(expected in sqlerrm)>0 then return; end if;raise exception 'Unexpected: %',sqlerrm;end;raise exception 'Expected rejection: %',expected;end $$;
do $$
declare owner_id uuid:=gen_random_uuid();customer_id uuid:=gen_random_uuid();stranger uuid:=gen_random_uuid();biz uuid:=gen_random_uuid();r uuid;key uuid:=gen_random_uuid();fields jsonb:='[{"id":"job","label":"Type of work","type":"choice","required":true,"options":["Repair","Install"]},{"id":"size","label":"Property size","type":"number","required":false,"options":[]},{"id":"day","label":"Preferred date","type":"date","required":false,"options":[]}]';
begin
 insert into auth.users(id,email,raw_user_meta_data) values(owner_id,null,'{"display_name":"Form owner"}'),(customer_id,'kade20413+form-rollback@gmail.com','{"display_name":"Form customer"}'),(stranger,null,'{"display_name":"Other customer"}');
 insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at) values(biz,owner_id,'request-sql-'||biz,'Request form fixture','services','active',now());
 insert into public.business_members(business_id,user_id,role) values(biz,owner_id,'owner');
 perform set_config('request.jwt.claim.sub',customer_id::text,true);
 perform pg_temp.expect_form_error(format('select public.save_service_request_form(%L,0,%L)',biz,fields),'Owner access');
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 if public.save_service_request_form(biz,0,fields)<>1 then raise exception 'Revision incorrect';end if;
 perform pg_temp.expect_form_error(format('select public.save_service_request_form(%L,0,%L)',biz,fields),'changed');
 perform pg_temp.expect_form_error(format('select public.save_service_request_form(%L,1,%L)',biz,'[{"id":"a","label":"A","type":"choice","required":true,"options":["same","same"]}]'),'unique');
 perform set_config('request.jwt.claim.sub',customer_id::text,true);
 perform pg_temp.expect_form_error(format('select public.submit_service_request(%L,%L,%L)',biz,key,'Please fix my sink'),'updated its questions');
 perform pg_temp.expect_form_error(format('select public.submit_service_request(%L,%L,%L,null,null,1,%L)',biz,key,'Please fix my sink','{}'),'Please answer');
 perform pg_temp.expect_form_error(format('select public.submit_service_request(%L,%L,%L,null,null,1,%L)',biz,key,'Please fix my sink','{"job":"Other"}'),'available option');
 perform pg_temp.expect_form_error(format('select public.submit_service_request(%L,%L,%L,null,null,1,%L)',biz,key,'Please fix my sink','{"job":"Repair","size":"NaN"}'),'valid number');
 perform pg_temp.expect_form_error(format('select public.submit_service_request(%L,%L,%L,null,null,1,%L)',biz,key,'Please fix my sink','{"job":"Repair","day":"2026-02-30"}'),'valid date');
 r:=public.submit_service_request(biz,key,'Please fix my sink',null,null,1,'{"job":"Repair","size":"2500","day":"2026-10-03"}');
 if (select jsonb_array_length(form_answers) from public.service_requests where id=r)<>3 then raise exception 'Answers not saved';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.save_service_request_form(biz,1,'[{"id":"job","label":"New question label","type":"text","required":true,"options":[]}]');
 if (select form_answers->0->>'label' from public.service_requests where id=r)<>'Type of work' then raise exception 'Historical question changed';end if;
 perform set_config('request.jwt.claim.sub',customer_id::text,true);
 if public.submit_service_request(biz,key,'Please fix my sink',null,null,1,'{"job":"Repair"}')<>r then raise exception 'Retry duplicated';end if;
 if (select count(*) from public.service_requests where business_id=biz)<>1 then raise exception 'Duplicate request';end if;
 perform set_config('request.jwt.claim.sub',owner_id::text,true);
 perform public.update_service_request_status(r,'in_review');
 if (select status from public.service_requests where id=r)<>'in_review' then raise exception 'Inbox status failed';end if;
 -- RLS checks run as the customer and an unrelated account.
 perform set_config('test.form_request',r::text,true);perform set_config('test.customer',customer_id::text,true);perform set_config('test.stranger',stranger::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.customer'),true);
do $$ begin if (select count(*) from public.service_requests where id=current_setting('test.form_request')::uuid)<>1 then raise exception 'Customer cannot see own answers';end if;end $$;
select set_config('request.jwt.claim.sub',current_setting('test.stranger'),true);
do $$ begin if exists(select 1 from public.service_requests where id=current_setting('test.form_request')::uuid) then raise exception 'Request leaked to another account';end if;end $$;
reset role;
rollback;
