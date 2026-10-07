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

 insert into public.stripe_account_states(business_id,account_id,state,details_submitted,charges_enabled,payouts_enabled)
 values(biz,'acct_rewardfixture','connected',true,true,true);
 insert into public.stripe_ordering_settings(business_id,enabled,is_open,timezone,max_orders_per_slot,pickup_windows,synced_at)
 values(biz,true,true,'UTC',20,(select jsonb_agg(jsonb_build_object('day',day,'start','00:00','end','23:59')) from generate_series(0,6) day),now());
 update public.platform_settings set value=jsonb_build_object('enabled',true,'business_ids',jsonb_build_array(biz)) where key='stripe_commerce';
 foreach kind in array array['square','stripe'] loop
   update public.ordering_provider_selections set provider=kind where business_id=biz;
   update public.loyalty_programs set checkout_reward_enabled=true, checkout_reward_items=jsonb_build_array(jsonb_build_object('provider',kind,'variationId','cart-item')) where id=program;
   select jsonb_build_object('version',2,'programId',id,'revision',checkout_reward_revision,'provider',kind,'type','free_item','membershipId',member,'variationId','cart-item','lineIndex',0,'discountMinor',350) into reward from public.loyalty_programs where id=program;
   payload:=payload||jsonb_build_object('provider',kind,'merchant_id',case kind when 'stripe' then 'acct_rewardfixture' else 'fixture-merchant' end,'location_id',case kind when 'stripe' then 'stripe' else 'fixture-location' end,'loyalty_reward',reward,'subtotal_minor',0,'total_minor',0,'id',gen_random_uuid(),'idempotency_key',gen_random_uuid());
   reserved:=public.square_reserve_order(payload,'[{"name":"Reward coffee","quantity":"1","total_money":{"amount":0}}]');
   if reserved.status<>'placed' or reserved.paid_at is null or reserved.provider_status<>'REWARD_COVERED' or reserved.square_payment_id is not null then raise exception 'Zero total not settled without payment'; end if;
   retry:=public.square_reserve_order(payload,'[]');
   if retry.id<>reserved.id or (select count(*) from public.loyalty_transactions where square_order_id=reserved.id and transaction_type='redemption')<>1 then raise exception 'Duplicate redemption'; end if;
   update public.square_orders set status='ready' where id=reserved.id;
   insert into public.square_pickup_codes(order_id,token_hash,expires_at) values(reserved.id,repeat('f',64),now()+interval '5 minutes');
   perform public.square_confirm_pickup(reserved.id,owner_id,biz,repeat('f',64));
   if exists(select 1 from public.square_pickup_confirmations where order_id=reserved.id and (visits_awarded<>0 or points_awarded<>0)) then raise exception 'Free order earned another reward'; end if;
   update public.square_orders set status='refunded',refunded_at=now() where id=reserved.id;
   perform public.settle_pickup_loyalty(reserved.id);
   if (select count(*) from public.loyalty_transactions where square_order_id=reserved.id and payment_adjustment='reward_restored')<>1 then raise exception 'Reward not restored exactly once'; end if;
   payload:=payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'subtotal_minor',100,'total_minor',100);
   reserved:=public.square_reserve_order(payload,'[]');
   update public.square_orders set status='checkout_expired' where id=reserved.id;
   if not exists(select 1 from public.loyalty_transactions where square_order_id=reserved.id and payment_adjustment='reward_restored') then raise exception 'Expired reward was lost'; end if;
   update public.loyalty_programs set reward_description='Changed offer '||kind where id=program;
   perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'REWARD_CHANGED');
   select reward||jsonb_build_object('revision',checkout_reward_revision,'variationId','wrong-item') into reward from public.loyalty_programs where id=program;
   perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'loyalty_reward',reward),'[]'),'REWARD_CHANGED');

   update public.loyalty_programs set program_type='points',points_required=100,points_per_dollar=1 where id=program;
   insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,spend_minor,actor_id,idempotency_key)
   select member,biz,'points_earned',1,100,10000,owner_id,gen_random_uuid() where kind='square';
   select reward||jsonb_build_object('revision',checkout_reward_revision,'variationId','cart-item') into reward from public.loyalty_programs where id=program;
   payload:=payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'loyalty_reward',reward);
   reserved:=public.square_reserve_order(payload,'[]');
   perform pg_temp.expect_reward_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'REWARD_NOT_READY');
   update public.square_orders set status='checkout_expired' where id=reserved.id;
   if not exists(select 1 from public.loyalty_transactions where square_order_id=reserved.id and payment_adjustment='reward_restored' and points_amount=-100) then raise exception 'Points not restored'; end if;
   update public.loyalty_programs set program_type='visits',points_required=null,points_per_dollar=null where id=program;
 end loop;
 if has_function_privilege('authenticated','public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb)','EXECUTE') or has_function_privilege('anon','public.square_redeem_checkout_reward(uuid,uuid,uuid,jsonb)','EXECUTE') then raise exception 'Reward RPC exposed'; end if;
end $$;
rollback;
