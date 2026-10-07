-- Transactional fixtures only. No email, provider request, or notification dispatch.
begin;
do $$
declare owner_id uuid := gen_random_uuid(); customer uuid := gen_random_uuid();
  biz uuid; program uuid; membership uuid; oid uuid; paid_order uuid; kind text; rail text;
  restored integer; reversed integer; sid uuid; aid uuid; a public.appointments; event_fixture text := 'evt_fixture_'||gen_random_uuid(); claimed integer;
begin
  insert into auth.users(id,raw_user_meta_data) values(owner_id,'{"display_name":"Settlement owner"}'),(customer,'{"display_name":"Settlement customer"}');
  foreach kind in array array['points','visits'] loop
    foreach rail in array array['square','stripe'] loop
      biz := gen_random_uuid(); program := gen_random_uuid(); membership := gen_random_uuid(); oid := gen_random_uuid(); paid_order := gen_random_uuid();
      insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at) values(biz,owner_id,'settlement-'||biz,'Settlement fixture','food_drink','active',now());
      insert into public.business_members(business_id,user_id,role) values(biz,owner_id,'owner');
      insert into public.loyalty_programs(id,business_id,name,reward_description,program_type,stamps_required,points_per_dollar,points_required)
        values(program,biz,'Settlement','Fixture reward',kind::public.loyalty_program_type,5,case when kind = 'points' then 2 end,case when kind = 'points' then 100 end);
      insert into public.loyalty_memberships(id,program_id,business_id,customer_id) values(membership,program,biz,customer);
      insert into public.square_orders(id,provider,business_id,business_name,customer_id,merchant_id,location_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,idempotency_key,request_hash,provider_request)
        select id,rail,biz,'Settlement fixture',customer,'fixture','fixture',now()+interval '1 hour','America/Chicago','Fixture','{}',1000,0,1000,'USD',gen_random_uuid(),repeat('a',64),'{}' from unnest(array[oid,paid_order]) id;
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,actor_id,idempotency_key,square_order_id)
        values(membership,biz,'redemption',1,case when kind = 'points' then 100 else 0 end,customer,gen_random_uuid(),oid);
      update public.square_orders set status = 'checkout_expired' where id = oid;
      perform public.settle_pickup_loyalty(oid);
      select count(*) into restored from public.loyalty_transactions where square_order_id = oid and payment_adjustment = 'reward_restored';
      if restored <> 1 then raise exception 'Reward restoration must be exactly once for %/%',kind,rail; end if;
      if (select sum(points_amount) from public.loyalty_transactions where square_order_id = oid) <> 0 or
        (select sum(amount) from public.loyalty_transactions where square_order_id = oid) <> 0 then raise exception 'Reward balance not restored'; end if;
      update public.square_orders set status = 'ready',paid_at = now(),square_payment_id = 'payment-'||paid_order where id = paid_order;
      insert into public.square_pickup_codes(order_id,token_hash,expires_at) values(paid_order,repeat('b',64),now()+interval '1 hour');
      perform public.square_confirm_pickup(paid_order,owner_id,biz,repeat('b',64));
      update public.square_orders set disputed_minor = 1000,status = 'dispute_lost' where id = paid_order;
      if kind = 'points' and (select points_amount from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed') <> -20 then raise exception 'Lost dispute did not reverse earned points'; end if;
      update public.square_orders set status = 'completed',dispute_state = 'WON' where id = paid_order;
      if (select coalesce(sum(points_amount),0) from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed') <> 0 then raise exception 'Won dispute did not restore earned points'; end if;
      update public.square_orders set refunded_minor = 500,status = 'payment_review' where id = paid_order;
      if kind = 'points' and (select sum(points_amount) from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed') <> -10 then raise exception 'Partial points refund must be proportional'; end if;
      update public.square_orders set refunded_minor = 1000,status = 'refunded' where id = paid_order;
      perform public.settle_pickup_loyalty(paid_order);
      select count(*) into reversed from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed';
      if reversed <> 1 then raise exception 'Earnings reversal must be exactly once'; end if;
      if kind = 'points' and (select points_amount from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed') <> -20 then raise exception 'Full points reversal wrong'; end if;
      if kind = 'visits' and (select amount from public.loyalty_transactions where square_order_id = paid_order and payment_adjustment = 'earnings_reversed') <> 1 then raise exception 'Full visit reversal wrong'; end if;
      begin
        insert into public.loyalty_transactions(membership_id,business_id,transaction_type,amount,points_amount,actor_id,idempotency_key)
          values(membership,biz,'redemption',-1,-100,customer,gen_random_uuid());
        raise exception 'Unmarked negative reward transaction was allowed';
      exception when check_violation then null; end;
    end loop;
  end loop;
  sid := gen_random_uuid(); aid := gen_random_uuid();
  insert into public.appointment_services(id,business_id,name,duration_minutes,price_minor,currency,payment_policy,deposit_minor,is_bookable)
    values(sid,biz,'Settlement appointment',30,1000,'USD','fixed_deposit',1000,true);
  insert into public.appointments(id,business_id,service_id,customer_id,customer_name,customer_phone,service_snapshot,policy_snapshot,timezone,starts_at,ends_at,blocked_until,status,payment_status,total_minor,amount_due_minor,currency,square_order_id,idempotency_key,request_hash)
    values(aid,biz,sid,customer,'Fixture customer','+15555550100','{}','{}','America/Chicago',now()+interval '1 day',now()+interval '1 day 30 minutes',now()+interval '1 day 30 minutes','cancelled','none',1000,1000,'USD','order-'||aid,gen_random_uuid(),repeat('c',64));
  insert into public.appointment_holds(appointment_id,business_id,service_id,starts_at,blocked_until,expires_at,state)
    values(aid,biz,sid,now()+interval '1 day',now()+interval '1 day 30 minutes',now()-interval '1 minute','expired');
  a := public.apply_appointment_provider_payment(aid,'order-'||aid,'payment-'||aid,'COMPLETED');
  if a.status <> 'payment_review' or a.payment_status <> 'review' then raise exception 'Late payment after cancellation was ignored'; end if;
  begin perform public.prepare_appointment_review_refund(aid,customer,a.version); raise exception 'Non-owner refund preparation allowed'; exception when insufficient_privilege then null; end;
  a := public.prepare_appointment_review_refund(aid,owner_id,a.version);
  if a.status <> 'cancellation_pending' or a.payment_status <> 'paid' then raise exception 'Late paid review cannot enter refund flow'; end if;
  a := public.apply_appointment_provider_refund(aid,'payment-'||aid,'external-partial-'||aid,null,400,'USD','COMPLETED');
  if a.refunded_minor <> 400 or a.payment_status <> 'review' then raise exception 'External partial refund was ignored'; end if;
  a := public.apply_appointment_provider_refund(aid,'payment-'||aid,'external-partial-'||aid,null,400,'USD','PENDING');
  if a.refunded_minor <> 400 then raise exception 'Refund replay reversed settled money'; end if;
  a := public.apply_appointment_provider_refund(aid,'payment-'||aid,'external-final-'||aid,null,600,'USD','COMPLETED');
  if a.refunded_minor <> 1000 or a.payment_status <> 'refunded' or a.status <> 'cancelled' then raise exception 'Aggregate partial appointment refunds did not settle'; end if;
  if (select state from public.appointment_holds where appointment_id = aid) <> 'expired' then raise exception 'Refund left a blocking review hold'; end if;
  a := public.apply_appointment_provider_refund(aid,'payment-'||aid,'external-final-'||aid,null,600,'USD','COMPLETED');
  if a.refunded_minor <> 1000 then raise exception 'Duplicate refund counted twice'; end if;
  if has_function_privilege('authenticated','public.prepare_appointment_review_refund(uuid,uuid,integer)','EXECUTE') or has_function_privilege('anon','public.settle_pickup_loyalty(uuid)','EXECUTE') then raise exception 'Trusted payment settlement exposed to clients'; end if;
  insert into public.stripe_webhook_inbox(event_id,payload) values(event_fixture,'{}');
  select count(*) into claimed from public.stripe_webhook_claim(event_fixture,gen_random_uuid());
  if claimed <> 1 then raise exception 'Webhook event could not be claimed'; end if;
  select count(*) into claimed from public.stripe_webhook_claim(event_fixture,gen_random_uuid());
  if claimed <> 0 then raise exception 'Webhook event had concurrent claims'; end if;
  update public.stripe_webhook_inbox set processed_at = now(),lease_until = null where event_id = event_fixture;
  select count(*) into claimed from public.stripe_webhook_claim(event_fixture,gen_random_uuid());
  if claimed <> 0 or has_table_privilege('authenticated','public.stripe_webhook_inbox','SELECT') or has_function_privilege('anon','public.stripe_webhook_claim(text,uuid)','EXECUTE') then raise exception 'Webhook replay or private inbox access was allowed'; end if;
end $$;
rollback;
