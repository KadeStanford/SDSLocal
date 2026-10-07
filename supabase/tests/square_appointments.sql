\set ON_ERROR_STOP on
begin;

create function pg_temp.expect_appointment_error(statement text, expected text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) > 0 then return; end if;
    raise exception 'Unexpected appointment failure: %', sqlerrm;
  end;
  raise exception 'Expected appointment failure was not raised: %', expected;
end $$;

do $$
declare
  owner_id uuid := gen_random_uuid();
  customer_id uuid := gen_random_uuid();
  other_customer_id uuid := gen_random_uuid();
  biz uuid := gen_random_uuid();
  service_id uuid := gen_random_uuid();
  group_service_id uuid := gen_random_uuid();
  deposit_service_id uuid := gen_random_uuid();
  appointment_id uuid;
  retry_id uuid;
  group_one uuid;
  group_two uuid;
  group_three uuid;
  paid_appointment uuid;
  paid_idempotency uuid := gen_random_uuid();
  reschedule_idempotency uuid := gen_random_uuid();
  request_hash text := repeat('a',64);
  service_start timestamptz;
  rescheduled_start timestamptz;
  deposit_start timestamptz;
  appointment_row public.appointments;
  refund_key uuid := gen_random_uuid();
  refund_lease uuid := gen_random_uuid();
  setup_resource_id uuid := gen_random_uuid();
  relation text;
  statement text;
begin
  insert into auth.users(id,raw_user_meta_data) values
    (owner_id,'{"display_name":"Appointment owner"}'),
    (customer_id,'{"display_name":"Appointment customer"}'),
    (other_customer_id,'{"display_name":"Other customer"}');
  insert into public.businesses(id,created_by,slug,name,business_type,status,timezone,approved_at)
    values(biz,owner_id,'appointment-'||biz::text,'Appointment fixture','services','active','America/Chicago',now());
  insert into public.business_members(business_id,user_id,role)
    values(biz,owner_id,'owner');
  insert into public.business_hours(business_id,day_of_week,interval_number,opens_at,closes_at,is_closed)
    select biz,day,1,'08:00','20:00',false from generate_series(0,6) day;
  insert into public.appointment_settings(business_id,enabled,timezone,minimum_notice_minutes,
    booking_horizon_days,slot_interval_minutes,automatically_confirm,cancellation_cutoff_minutes)
    values(biz,true,'America/Chicago',0,60,30,true,60);
  insert into public.appointment_weekly_windows(business_id,day_of_week,opens_at,closes_at)
    select biz,day,'08:00','20:00' from generate_series(0,6) day;
  insert into public.appointment_services(id,business_id,name,duration_minutes,price_minor,currency,
    payment_policy,deposit_minor,is_bookable,capacity)
    values
      (service_id,biz,'Consultation',30,10000,'USD','pay_in_person',null,true,1),
      (group_service_id,biz,'Group class',30,2500,'USD','pay_in_person',null,true,2),
      (deposit_service_id,biz,'Deposit service',30,10000,'USD','fixed_deposit',2000,true,1);

  update public.platform_settings
    set value = jsonb_build_object('enabled',true,'environment','staging',
      'business_ids',jsonb_build_array(biz::text))
    where key = 'appointment_booking';
  if exists(select 1 from public.get_appointment_capabilities(array[biz])) then
    raise exception 'Disconnected seller exposed the booking CTA';
  end if;
  insert into public.square_connections
    (business_id,merchant_id,merchant_name,location_id,key_version,expires_at,state)
    values(biz,'appointment-test-'||biz::text,'Appointment test seller','test-location',
      'test',now()+interval '1 day','connected');
  if not exists(select 1 from public.get_appointment_capabilities(array[biz])) then
    raise exception 'Connected seller did not expose the booking CTA';
  end if;
  update public.square_connections set state='disconnected',location_id=null where business_id=biz;
  if exists(select 1 from public.get_appointment_capabilities(array[biz])) then
    raise exception 'Disconnect left the booking CTA visible';
  end if;
  update public.square_connections set state='connected',location_id='test-location' where business_id=biz;

  foreach relation in array array[
    'appointment_settings','appointment_services','appointment_resources',
    'appointment_service_resources','appointment_weekly_windows','appointment_date_overrides',
    'appointments','appointment_holds','appointment_events','appointment_reschedule_keys',
    'appointment_refunds'
  ] loop
    if has_table_privilege('anon','public.'||relation,'SELECT')
      or has_table_privilege('authenticated','public.'||relation,'SELECT')
      or has_table_privilege('authenticated','public.'||relation,'UPDATE') then
      raise exception 'Appointment table exposed: %',relation;
    end if;
    if not (select relrowsecurity from pg_class where oid=('public.'||relation)::regclass) then
      raise exception 'Appointment table missing RLS: %',relation;
    end if;
  end loop;
  if has_function_privilege('anon','public.reserve_appointment_slot(uuid,uuid,uuid,timestamptz,uuid,text,text,text,text,text,uuid,text)','EXECUTE')
    or has_function_privilege('authenticated','public.reschedule_appointment_slot(uuid,uuid,uuid,text,timestamptz,uuid,uuid,text,integer)','EXECUTE') then
    raise exception 'Private appointment RPC exposed';
  end if;
  if not has_table_privilege('service_role','public.business_hours','SELECT') then
    raise exception 'Appointment availability cannot read business hours';
  end if;

  service_start := (date_trunc('day',now() at time zone 'America/Chicago') + interval '3 days 10 hours') at time zone 'America/Chicago';
  select public.reserve_appointment_slot(biz,service_id,null,service_start,customer_id,null,
    'Customer','+13125550123',null,'',gen_random_uuid(),request_hash) into appointment_id;
  select public.reserve_appointment_slot(biz,service_id,null,service_start,customer_id,null,
    'Customer','+13125550123',null,'',
    (select idempotency_key from public.appointments where id=appointment_id),request_hash) into retry_id;
  if retry_id <> appointment_id then raise exception 'Booking idempotency did not return the same appointment'; end if;
  statement := format(
    'select public.reserve_appointment_slot(%L::uuid,%L::uuid,null,%L::timestamptz,%L::uuid,null,%L,%L,null,%L,%L::uuid,%L)',
    biz,service_id,service_start,customer_id,'Customer','+13125550123','',gen_random_uuid(),request_hash
  );
  perform pg_temp.expect_appointment_error(statement,'SLOT_FULL');

  rescheduled_start := service_start + interval '1 day';
  select * into appointment_row from public.reschedule_appointment_slot(appointment_id,biz,customer_id,null,rescheduled_start,null,
    reschedule_idempotency,repeat('b',64),1);
  if appointment_row.starts_at <> rescheduled_start or appointment_row.version <> 2 then
    raise exception 'Reschedule did not atomically move the appointment';
  end if;
  select * into appointment_row from public.reschedule_appointment_slot(appointment_id,biz,customer_id,null,rescheduled_start,null,
    reschedule_idempotency,repeat('b',64),1);
  if appointment_row.starts_at <> rescheduled_start then raise exception 'Reschedule retry lost its result'; end if;
  statement := format(
    'select public.reschedule_appointment_slot(%L::uuid,%L::uuid,%L::uuid,null,%L::timestamptz,null,%L::uuid,%L,%s)',
    appointment_id,biz,other_customer_id,rescheduled_start,gen_random_uuid(),repeat('c',64),appointment_row.version
  );
  perform pg_temp.expect_appointment_error(statement,'APPOINTMENT_ACCESS');

  select public.reserve_appointment_slot(biz,group_service_id,null,service_start,customer_id,null,
    'Customer','+13125550123',null,'',gen_random_uuid(),repeat('d',64)) into group_one;
  select public.reserve_appointment_slot(biz,group_service_id,null,service_start,other_customer_id,null,
    'Other','+13125550124',null,'',gen_random_uuid(),repeat('e',64)) into group_two;
  if group_one = group_two then raise exception 'Group capacity reused an appointment id'; end if;
  statement := format(
    'select public.reserve_appointment_slot(%L::uuid,%L::uuid,null,%L::timestamptz,%L::uuid,null,%L,%L,null,%L,%L::uuid,%L)',
    biz,group_service_id,service_start,owner_id,'Owner','+13125550125','',gen_random_uuid(),repeat('f',64)
  );
  perform pg_temp.expect_appointment_error(statement,'SLOT_FULL');

  deposit_start := (date_trunc('day',now() at time zone 'America/Chicago') + interval '5 days 12 hours') at time zone 'America/Chicago';
  select public.reserve_appointment_slot(biz,deposit_service_id,null,deposit_start,customer_id,null,
    'Customer','+13125550123',null,'',paid_idempotency,repeat('1',64)) into paid_appointment;
  update public.appointments set square_order_id='sandbox-order-'||paid_appointment::text
    where id=paid_appointment;
  perform public.apply_appointment_provider_payment(
    paid_appointment,'sandbox-order-'||paid_appointment::text,'sandbox-payment-'||paid_appointment::text,'COMPLETED'
  );
  select * into appointment_row from public.appointments where id=paid_appointment;
  select * into appointment_row from public.transition_appointment(
    paid_appointment,biz,customer_id,'customer','customer_cancel',appointment_row.version);
  if appointment_row.status <> 'cancellation_pending' then raise exception 'Paid cancellation was not held for refund'; end if;
  select * into appointment_row from public.appointment_refund_lease(paid_appointment,refund_lease,refund_key);
  if appointment_row.payment_status <> 'refund_pending' then raise exception 'Refund lease was not recorded'; end if;
  perform public.apply_appointment_provider_refund(paid_appointment,appointment_row.square_payment_id,
    'sandbox-refund-'||paid_appointment::text,refund_key,2000,'USD','PENDING');
  select * into appointment_row from public.apply_appointment_provider_refund(
    paid_appointment,appointment_row.square_payment_id,
    'sandbox-refund-'||paid_appointment::text,refund_key,2000,'USD','COMPLETED');
  if appointment_row.status <> 'cancelled' or appointment_row.payment_status <> 'refunded'
    or appointment_row.refunded_minor <> 2000 then
    raise exception 'Square-confirmed full refund did not finish cancellation';
  end if;

  perform public.save_appointment_setup(biz,owner_id,jsonb_build_object(
    'settings',jsonb_build_object('enabled',true,'timezone','America/Chicago'),
    'services',jsonb_build_array(jsonb_build_object(
      'id',service_id,'name','Consultation','durationMinutes',30,
      'priceMinor',10000,'paymentPolicy','pay_in_person','isBookable',true,
      'requiresResource',true,'resourceIds',jsonb_build_array(setup_resource_id)
    )),
    'resources',jsonb_build_array(jsonb_build_object(
      'id',setup_resource_id,'name','Test staff','isActive',true
    )),
    'windows','[]'::jsonb,'overrides','[]'::jsonb
  ));
  if not exists (
    select 1 from public.appointment_service_resources mapping
    where mapping.business_id = biz and mapping.resource_id = setup_resource_id
  ) then raise exception 'Owner setup did not save its resource mapping'; end if;
end $$;

rollback;
