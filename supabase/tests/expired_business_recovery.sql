begin;
\ir fixtures/business.sql
do $$
declare f database_test_fixture; program uuid; membership uuid; service uuid := gen_random_uuid();
  account uuid; appointment uuid; paid_appointment uuid; result jsonb; row public.appointments;
  starts timestamptz := (date_trunc('day',now() at time zone 'America/Chicago')+interval '4 days 12 hours') at time zone 'America/Chicago';
  refund_key uuid := gen_random_uuid(); denied boolean;
begin
  select * into f from database_test_fixture;
  update public.platform_settings set value='{"enabled":false}' where key='business_listing_billing';
  update public.businesses set business_type='services' where id=f.business_id;
  insert into public.loyalty_programs(business_id,name,reward_description,stamps_required,is_active)
    values(f.business_id,'Recovery rewards','Earned reward',2,true) returning id into program;
  insert into public.loyalty_memberships(program_id,business_id,customer_id,is_active)
    values(program,f.business_id,f.customer_id,true) returning id into membership;
  perform public.process_loyalty_action(f.owner_id,membership,gen_random_uuid(),'stamp',gen_random_uuid());
  update public.loyalty_transactions set created_at=now()-interval '2 minutes' where membership_id=membership;
  perform public.process_loyalty_action(f.owner_id,membership,gen_random_uuid(),'stamp',gen_random_uuid());
  insert into public.appointment_settings(business_id,enabled,timezone,minimum_notice_minutes,
    booking_horizon_days,slot_interval_minutes,automatically_confirm,cancellation_cutoff_minutes)
    values(f.business_id,true,'America/Chicago',0,60,30,true,60);
  insert into public.appointment_weekly_windows(business_id,day_of_week,opens_at,closes_at)
    select f.business_id,d,'08:00','20:00' from generate_series(0,6) d;
  insert into public.business_hours(business_id,day_of_week,opens_at,closes_at,is_closed)
    select f.business_id,d,'08:00','20:00',false from generate_series(0,6) d;
  insert into public.appointment_services(id,business_id,name,duration_minutes,price_minor,currency,payment_policy,is_bookable,capacity)
    values(service,f.business_id,'Recovery appointment',30,1000,'USD','pay_in_person',true,1);
  appointment := public.reserve_appointment_slot(f.business_id,service,null,starts,f.customer_id,null,
    'Recovery customer','+13125550123',null,'',gen_random_uuid(),repeat('a',64));
  paid_appointment := public.reserve_appointment_slot(f.business_id,service,null,starts+interval '2 hours',f.customer_id,null,
    'Recovery customer','+13125550123',null,'',gen_random_uuid(),repeat('b',64));
  update public.appointments set payment_status='paid',amount_due_minor=1000,
    square_payment_id='recovery-payment-'||paid_appointment where id=paid_appointment;
  update public.square_orders set status='ready',paid_at=now(),square_payment_id='recovery-order-'||f.order_id
    where id=f.order_id;
  insert into public.square_pickup_codes(order_id,token_hash,expires_at)
    values(f.order_id,repeat('c',64),now()+interval '1 hour');

  insert into public.billing_accounts(owner_id) values(f.owner_id) returning id into account;
  insert into public.business_listing_assignments(business_id,billing_account_id,assigned_by)
    values(f.business_id,account,f.owner_id);
  insert into public.listing_entitlements(billing_account_id,provider,product_id,plan_code,status,environment,current_period_end,last_provider_event_id)
    values(account,'apple','listing_pro_monthly_v1','pro','expired','sandbox',now()-interval '1 day','recovery-fixture');
  update public.platform_settings set value='{"enabled":true,"featureEnforcement":true,"environment":"sandbox"}'
    where key='business_listing_billing';
  update public.businesses set status='suspended',suspension_reason='billing',billing_suspension_previous_status='active'
    where id=f.business_id;

  -- New benefits fail while already-earned rewards remain reachable and redeemable.
  denied := false;
  begin perform public.assert_business_feature(f.business_id,'pickup_ordering');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Expired business accepted a new pickup benefit'; end if;
  perform set_config('request.jwt.claim.sub',f.customer_id::text,true);
  if not exists(select 1 from public.get_loyalty_wallet_v2() w where w.membership_id=membership) then
    raise exception 'Existing reward disappeared after billing suspension'; end if;
  perform public.process_loyalty_action(f.owner_id,membership,gen_random_uuid(),'redemption',gen_random_uuid());

  -- Existing paid pickup and its promised reward settle, then a refund can reverse it.
  result := public.square_confirm_pickup(f.order_id,f.owner_id,f.business_id,repeat('c',64));
  if result->>'completed'<>'true' or (result->>'visitsAwarded')::integer<>1 then
    raise exception 'Expired business could not finish pickup and promised rewards'; end if;
  update public.square_orders set status='refunded',refunded_minor=total_minor where id=f.order_id;

  -- Existing customer rescheduling, cancellation and paid refunds stay available.
  select * into row from public.reschedule_appointment_slot(appointment,f.business_id,f.customer_id,null,
    starts+interval '1 day',null,gen_random_uuid(),repeat('d',64),1);
  if row.starts_at<>starts+interval '1 day' then raise exception 'Existing reschedule failed'; end if;
  select * into row from public.transition_appointment(appointment,f.business_id,f.customer_id,'customer','customer_cancel',row.version);
  if row.status<>'cancelled' then raise exception 'Existing cancellation failed'; end if;
  select * into row from public.appointments where id=paid_appointment;
  select * into row from public.transition_appointment(paid_appointment,f.business_id,f.owner_id,'owner','cancel',row.version);
  select * into row from public.appointment_refund_lease(paid_appointment,gen_random_uuid(),refund_key);
  select * into row from public.apply_appointment_provider_refund(paid_appointment,row.square_payment_id,
    'recovery-refund-'||paid_appointment,refund_key,1000,'USD','COMPLETED');
  if row.status<>'cancelled' or row.payment_status<>'refunded' then raise exception 'Existing refund failed'; end if;

  -- This exception must never reopen a business suspended by moderation.
  update public.businesses set suspension_reason='moderation' where id=f.business_id;
  if public.business_allows_obligation_recovery(f.business_id) then raise exception 'Moderation suspension bypassed'; end if;
  if exists(select 1 from public.get_loyalty_wallet_v2() w where w.membership_id=membership) then
    raise exception 'Moderation-suspended rewards exposed'; end if;
end $$;
rollback;
