begin;
do $$
declare
  owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid(); staff_id uuid := gen_random_uuid();
  biz uuid; cats smallint[]; denied boolean; appointment_id uuid := gen_random_uuid();
begin
  insert into auth.users(id,raw_user_meta_data) values(owner_id,'{}'),(other_id,'{}'),(staff_id,'{}');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  update public.platform_settings set value = '{"enabled":false}' where key = 'business_listing_billing';
  biz := (public.create_business_with_owner_v3(p_request_id=>gen_random_uuid(),p_name=>'UX recovery fixture',p_requested_slug=>'ux-'||left(owner_id::text,8),p_slug_customized=>false,p_business_type=>'services')->>'businessId')::uuid;
  select array_agg(id order by id) into cats from (select id from public.categories where is_active and (business_type is null or business_type='services') order by id limit 2) c;
  if cardinality(cats) < 1 then raise exception 'Missing category fixtures'; end if;
  perform public.set_business_categories(biz,cats);
  if not exists(select 1 from public.business_categories where business_id=biz and category_id=cats[1] and is_primary) then raise exception 'Primary category lost'; end if;
  if not exists(select 1 from jsonb_array_elements(public.get_business_readiness(biz)->'checks') c where c->>'key'='category' and c->>'complete'='true') then raise exception 'Readiness did not refresh'; end if;
  denied := false;
  begin perform public.set_business_categories(biz,array[cats[1],cats[1]]); exception when sqlstate '22023' then denied:=true; end;
  if not denied then raise exception 'Duplicate categories accepted'; end if;
  if not exists(select 1 from public.business_categories where business_id=biz and category_id=cats[1]) then raise exception 'Invalid save erased categories'; end if;
  insert into public.business_members(business_id,user_id,role,is_active) values(biz,staff_id,'staff',true);
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  denied:=false; begin perform public.set_business_categories(biz,'{}'); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Staff edited categories'; end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  denied:=false; begin perform public.set_business_categories(biz,'{}'); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'Unrelated account edited categories'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  insert into public.appointments(id,business_id,customer_id,customer_name,customer_phone,service_snapshot,policy_snapshot,timezone,starts_at,ends_at,blocked_until,status,payment_status,total_minor,amount_due_minor,currency,idempotency_key,request_hash)
    values(appointment_id,biz,owner_id,'Fixture','9855550100','{"name":"Home visit"}','{}','America/Chicago',now()+interval '2 day',now()+interval '2 day 1 hour',now()+interval '2 day 1 hour','confirmed','none',0,0,'USD',gen_random_uuid(),repeat('a',64));
  if not exists(select 1 from public.get_customer_appointments() where id=appointment_id and service_name='Home visit') then raise exception 'Customer cannot recover appointment'; end if;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  if exists(select 1 from public.get_customer_appointments() where id=appointment_id) then raise exception 'History leaked across accounts'; end if;
  perform set_config('request.jwt.claim.sub','',true);
  if exists(select 1 from public.get_customer_appointments()) then raise exception 'Unauthenticated history leak'; end if;
end $$;
rollback;
