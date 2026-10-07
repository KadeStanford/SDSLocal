begin;
create function pg_temp.expect_reward_error(statement text, expected text)
returns void language plpgsql as $$ begin
 begin execute statement; exception when others then
  if position(expected in sqlerrm)>0 then return; end if;
  raise exception 'Unexpected failure: %',sqlerrm;
 end;
 raise exception 'Expected failure was not raised: %',expected;
end $$;
do $$
declare owner_id uuid:=gen_random_uuid(); staff_id uuid:=gen_random_uuid(); biz uuid:=gen_random_uuid();
 program uuid:=gen_random_uuid(); member uuid:=gen_random_uuid(); payload jsonb; pickup timestamptz;
 reserved public.square_orders; retry public.square_orders; reward jsonb; kind text;
begin
  insert into auth.users(id,raw_user_meta_data) values(owner_id,'{"display_name":"Local Square owner"}'),(staff_id,'{"display_name":"Local Square staff"}');
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
    values(biz,owner_id,'square-sql-'||biz::text,'Square SQL fixture','food_drink','active',now());
  insert into public.business_members(business_id,user_id,role) values(biz,owner_id,'owner'),(biz,staff_id,'staff');
  insert into public.square_connections(business_id,merchant_id,merchant_name,location_id,key_version,expires_at,state)
    values(biz,'fixture-merchant','Local seller','fixture-location','fixture-v1',now()+interval '30 days','connected');
  insert into public.square_ordering_settings(business_id,enabled,is_open,timezone,max_orders_per_slot,pickup_windows,synced_at)
    values(biz,true,true,'UTC',1,(select jsonb_agg(jsonb_build_object('day',day,'start','00:00','end','23:59')) from generate_series(0,6) day),now());
  insert into public.ordering_provider_selections(business_id,provider) values(biz,'square');
  update public.platform_settings set value=jsonb_build_object('enabled',true,'business_ids',jsonb_build_array(biz)) where key='square_commerce';


 update public.square_ordering_settings set max_orders_per_slot=20 where business_id=biz;
 insert into public.loyalty_programs(id,business_id,name,reward_description,program_type,stamps_required,checkout_reward_type,is_active)
 values(program,biz,'Regression rewards','Automatic cart item','visits',3,'free_item',true);
 insert into public.loyalty_memberships(id,program_id,business_id,customer_id,is_active) values(member,program,biz,staff_id,true);
 insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,actor_id,idempotency_key)
 select member,biz,'stamp',1,owner_id,gen_random_uuid() from generate_series(1,30);
 pickup:=to_timestamp(ceil(extract(epoch from now()+interval '2 hours')/900)*900);
 reward:=jsonb_build_object('type','free_item','membershipId',member,'variationId','cart-item','discountMinor',350);
 payload:=jsonb_build_object('id',gen_random_uuid(),'business_id',biz,'business_name','Reward regression','customer_id',staff_id,
 'guest_hash',repeat('d',64),'merchant_id','fixture-merchant','location_id','fixture-location','pickup_at',pickup,
 'pickup_timezone','UTC','pickup_address','Fixture','recipient',jsonb_build_object('display_name','Customer'),
 'subtotal_minor',1800,'tax_minor',0,'total_minor',1800,'currency','USD','idempotency_key',gen_random_uuid(),
 'request_hash',repeat('e',64),'provider_request','{}'::jsonb,'loyalty_membership_id',member,'loyalty_reward',reward);
 foreach kind in array array['free_item','bogo'] loop
  update public.loyalty_programs set checkout_reward_type=kind,checkout_reward_variation_id=null where id=program;
  reward:=reward||jsonb_build_object('type',kind);
  payload:=payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'loyalty_reward',reward);
  reserved:=public.square_reserve_order(payload,'[{"name":"Reward item","quantity":"2","catalog_object_id":"cart-item"}]');
  retry:=public.square_reserve_order(payload,'[]');
  if reserved.id<>retry.id then raise exception 'Retry duplicated order'; end if;
  if (select count(*) from public.loyalty_transactions where square_order_id=reserved.id and transaction_type='redemption')<>1 then raise exception 'Reward not redeemed exactly once'; end if;
  perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'loyalty_reward',reward-'variationId'),'[]'),'REWARD_CHANGED');
  update public.loyalty_programs set checkout_reward_variation_id='other-item' where id=program;
  perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'REWARD_CHANGED');
  update public.loyalty_programs set checkout_reward_variation_id='cart-item' where id=program;
  perform public.square_reserve_order(payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]');
 end loop;
 delete from public.loyalty_transactions where id in (select id from public.loyalty_transactions where membership_id=member and transaction_type='stamp' limit 18);
 perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'REWARD_NOT_READY');
 if has_function_privilege('authenticated','public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb)','EXECUTE') or has_function_privilege('anon','public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb)','EXECUTE') then raise exception 'Reward RPC exposed'; end if;
end $$;
rollback;
