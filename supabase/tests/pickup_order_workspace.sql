\set ON_ERROR_STOP on
begin;
create temporary table workspace_fixtures(owner_id uuid,staff_id uuid,inactive_id uuid,customer_id uuid,business_id uuid,other_id uuid);
insert into workspace_fixtures select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
do $$ declare f workspace_fixtures; u uuid; b uuid; begin
 select * into f from workspace_fixtures;
 foreach u in array array[f.owner_id,f.staff_id,f.inactive_id,f.customer_id] loop
  insert into auth.users(id,raw_user_meta_data) values(u,'{"display_name":"Transactional pickup test"}');
 end loop;
 foreach b in array array[f.business_id,f.other_id] loop
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
   values(b,f.owner_id,'workspace-test-'||b,'Workspace fixture','food_drink','active',now());
  insert into public.square_ordering_settings(business_id,enabled,is_open,synced_at,sync_summary) values(b,true,true,now(),'{"variations":4}');
  insert into public.ordering_provider_selections(business_id,provider) values(b,'square');
  insert into public.square_connections(business_id,merchant_id,merchant_name,location_id,key_version,expires_at,state)
   values(b,'fixture-'||b,'Fixture','location-'||b,'v1',now()+interval '1 day','connected');
 end loop;
 insert into public.business_members(business_id,user_id,role,is_active) values
  (f.business_id,f.owner_id,'owner',true),(f.business_id,f.staff_id,'staff',true),(f.business_id,f.inactive_id,'staff',false)
 on conflict(business_id,user_id) do update set role=excluded.role,is_active=excluded.is_active;
 insert into public.square_orders(id,business_id,business_name,merchant_id,location_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,status,idempotency_key,request_hash,provider_request)
 select gen_random_uuid(),f.business_id,'Workspace fixture','fixture-merchant','fixture-location',now()+interval '1 hour','America/Chicago','Fixture address','{}',100,0,100,'USD',state,gen_random_uuid(),'fixture','{}'
 from unnest(array['placed','preparing','ready','completed','refund_pending']) state;
 if not (public.square_queue_counts(f.business_id) @> '{"active":3,"placed":1,"preparing":1,"ready":1,"attention":1}'::jsonb) then raise exception 'Incorrect operational counts'; end if;
 if (public.square_queue_counts(f.other_id)->>'active')::integer<>0 then raise exception 'Cross-business counts leaked'; end if;
 if jsonb_array_length(public.square_operator_businesses(f.staff_id))<>1 then raise exception 'Active staff should see its eligible business only'; end if;
 if public.square_operator_businesses(f.inactive_id)<>'[]' or public.square_operator_businesses(f.customer_id)<>'[]' then raise exception 'Unauthorized membership exposed'; end if;
 if public.square_operator_businesses(f.staff_id)->0->>'canRefund'<>'false' then raise exception 'Staff financial permission'; end if;
 if public.square_operator_businesses(f.owner_id)->0->>'canRefund'<>'true' then raise exception 'Owner permission missing'; end if;
 update public.square_ordering_settings set enabled=false where business_id=f.business_id;
 if jsonb_array_length(public.square_operator_businesses(f.staff_id))<>1
   or public.square_operator_businesses(f.staff_id)->0->>'orderingReady'<>'false'
 then raise exception 'Disabled ordering must retain authorized order history without being ready'; end if;
 update public.square_ordering_settings set enabled=true,is_open=false where business_id=f.business_id;
 update public.platform_settings set value=jsonb_build_object('enabled',true,'public_environment','staging','business_ids',jsonb_build_array(f.business_id)) where key='square_commerce';
 if (select pickup_status from public.get_pickup_status(array[f.business_id])) is distinct from 'paused' then raise exception 'Paused state missing'; end if;
 update public.square_ordering_settings set is_open=true where business_id=f.business_id;
 if (select pickup_status from public.get_pickup_status(array[f.business_id])) is distinct from 'accepting' then raise exception 'Accepting state missing'; end if;
 update public.square_ordering_settings set enabled=false where business_id=f.business_id;
 if exists(select 1 from public.get_pickup_status(array[f.business_id])) then raise exception 'Disabled marketing leaked'; end if;
 if has_function_privilege('anon','public.square_operator_businesses(uuid)','execute') or has_function_privilege('authenticated','public.square_operator_businesses(uuid)','execute') or has_function_privilege('authenticated','public.square_queue_counts(uuid)','execute') then raise exception 'Private summary RPC exposed'; end if;
 if has_table_privilege('authenticated','public.square_orders','select') or has_table_privilege('anon','public.square_order_events','select') then raise exception 'Private tables exposed'; end if;
 if not has_function_privilege('service_role','public.square_operator_businesses(uuid)','execute') then raise exception 'Service grant missing'; end if;
 if not exists(select 1 from pg_indexes where indexname='square_orders_history') or not exists(select 1 from pg_indexes where indexname='square_order_events_order_time') or not exists(select 1 from pg_indexes where indexname='square_order_items_order') then raise exception 'Queue/detail indexes missing'; end if;
end $$;
rollback;
