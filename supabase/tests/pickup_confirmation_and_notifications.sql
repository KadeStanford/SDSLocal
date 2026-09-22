-- All fixtures and queued notifications are rolled back. Never sends a push,
-- contacts Square, triggers email, or changes an existing order.
begin;
create function pg_temp.expect_pickup_error(statement text, expected text)
returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if position(expected in sqlerrm)>0 then return; end if;
    raise;
  end;
  raise exception 'Expected %',expected;
end;
$$;
do $$
declare
  staff uuid := gen_random_uuid(); customer uuid := gen_random_uuid(); outsider uuid := gen_random_uuid();
  biz uuid; program uuid; membership uuid; oid uuid; kind text;
  result jsonb; repeated jsonb; delivery uuid; before_count integer; claimed record; claims integer:=0;
begin
  insert into auth.users(id,raw_user_meta_data) values
    (staff,'{"display_name":"Pickup staff fixture"}'),
    (customer,'{"display_name":"Pickup customer fixture"}'),
    (outsider,'{"display_name":"Pickup outsider fixture"}');
  perform set_config('request.jwt.claim.role','service_role',true);
  foreach kind in array array['points','visits'] loop
    biz:=gen_random_uuid(); program:=gen_random_uuid(); membership:=gen_random_uuid(); oid:=gen_random_uuid();
    insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
      values(biz,staff,'pickup-'||biz,'Pickup fixture','food_drink','active',now());
    insert into public.business_members(business_id,user_id,role) values(biz,staff,'owner');
    insert into public.loyalty_programs(id,business_id,name,reward_description,stamps_required,
      program_type,points_per_dollar,points_required)
      values(program,biz,'Fixture','Fixture reward',5,kind::public.loyalty_program_type,
        case when kind='points' then 2 else null end,case when kind='points' then 100 else null end);
    insert into public.loyalty_memberships(id,program_id,business_id,customer_id)
      values(membership,program,biz,customer);
    insert into public.square_orders(id,business_id,business_name,customer_id,merchant_id,location_id,
      pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,
      idempotency_key,request_hash,provider_request)
      values(oid,biz,'Pickup fixture',customer,'fixture','fixture',now()+interval '1 hour','America/Chicago',
        'Fixture location','{"display_name":"Fixture"}',1250,100,1350,'USD',gen_random_uuid(),repeat('a',64),'{}');
    if exists(select 1 from public.notification_deliveries where entity_id=oid) then
      raise exception 'Unpaid checkout generated an order alert';
    end if;
    update public.square_orders set status='placed',paid_at=now(),square_payment_id='fixture-'||oid where id=oid;
    if (select count(*) from public.notification_deliveries where entity_id=oid)<>2 then
      raise exception 'Paid order must alert customer and active business staff';
    end if;
    select id into delivery from public.notification_deliveries where entity_id=oid and order_audience='business';
    if not public.pickup_notification_sendable(delivery) then raise exception 'Current business alert rejected'; end if;
    update public.business_members set is_active=false where business_id=biz and user_id=staff;
    if public.pickup_notification_sendable(delivery) then raise exception 'Revoked staff can receive order push'; end if;
    update public.business_members set is_active=true where business_id=biz and user_id=staff;
    update public.square_orders set status='ready' where id=oid;
    if public.pickup_notification_sendable(delivery) then raise exception 'Stale placed alert can be pushed'; end if;
    select count(*) into before_count from public.notification_deliveries where entity_id=oid;
    update public.square_orders set status='ready' where id=oid;
    if (select count(*) from public.notification_deliveries where entity_id=oid)<>before_count then
      raise exception 'Duplicate provider update generated duplicate alerts';
    end if;
    insert into public.square_pickup_codes(order_id,token_hash,expires_at) values(oid,repeat('b',64),now()+interval '5 minutes');
    perform pg_temp.expect_pickup_error(format('select public.square_confirm_pickup(%L,%L,%L,%L)',oid,outsider,biz,repeat('b',64)),'OPERATOR_REQUIRED');
    perform pg_temp.expect_pickup_error(format('select public.square_confirm_pickup(%L,%L,%L,%L)',oid,staff,biz,repeat('c',64)),'INVALID_PICKUP_CODE');
    update public.square_pickup_codes set expires_at=now()-interval '1 second' where order_id=oid;
    perform pg_temp.expect_pickup_error(format('select public.square_confirm_pickup(%L,%L,%L,%L)',oid,staff,biz,repeat('b',64)),'INVALID_PICKUP_CODE');
    update public.square_pickup_codes set expires_at=now()+interval '5 minutes' where order_id=oid;
    update public.square_orders set lease_until=now()+interval '1 minute' where id=oid;
    perform pg_temp.expect_pickup_error(format('select public.square_confirm_pickup(%L,%L,%L,%L)',oid,staff,biz,repeat('b',64)),'ORDER_BUSY');
    update public.square_orders set lease_until=null,paid_at=null where id=oid;
    perform pg_temp.expect_pickup_error(format('select public.square_confirm_pickup(%L,%L,%L,%L)',oid,staff,biz,repeat('b',64)),'PICKUP_NOT_READY');
    update public.square_orders set paid_at=now() where id=oid;
    result:=public.square_confirm_pickup(oid,staff,biz,repeat('b',64));
    repeated:=public.square_confirm_pickup(oid,staff,biz,repeat('b',64));
    if result->>'completed'<>'true' or repeated->>'alreadyConfirmed'<>'true' then raise exception 'Confirmation replay failed'; end if;
    if (select count(*) from public.loyalty_transactions where membership_id=membership)<>1 then
      raise exception 'Repeated pickup changed rewards more than once';
    end if;
    if kind='points' and (result->>'pointsAwarded')::integer<>25 then raise exception 'Points must exclude tax'; end if;
    if kind='visits' and (result->>'visitsAwarded')::integer<>1 then raise exception 'Pickup must earn one visit'; end if;
    if (select status from public.square_orders where id=oid)<>'completed' then raise exception 'Handoff not completed'; end if;
    if (select count(*) from public.notification_deliveries where entity_id=oid and order_status='completed')<>2 then
      raise exception 'Pickup confirmation must alert both sides';
    end if;
  end loop;
  perform set_config('request.jwt.claim.sub',customer::text,true);
  if public.order_notification_preference(false) then raise exception 'Order push opt-out was not saved'; end if;
  for claimed in select * from public.claim_pickup_notifications(100) loop
    claims:=claims+1;
    if claimed.notification_type<>'orders' or claimed.order_status<>'completed' or claimed.user_id=customer then
      raise exception 'Dispatcher claimed an unrelated, stale, or opted-out notification';
    end if;
  end loop;
  if claims<>2 then raise exception 'Expected one current business alert for each fixture'; end if;
  if has_table_privilege('authenticated','public.square_pickup_codes','SELECT')
    or has_function_privilege('authenticated','public.square_confirm_pickup(uuid,uuid,uuid,text)','EXECUTE') then
    raise exception 'Pickup secrets or trusted completion RPC exposed';
  end if;
end;
$$;
rollback;
