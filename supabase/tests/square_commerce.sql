\set ON_ERROR_STOP on
begin;

create function pg_temp.expect_square_error(statement text, expected text)
returns void language plpgsql as $$
begin
  begin
    execute statement;
  exception when others then
    if position(expected in sqlerrm) > 0 then return; end if;
    raise exception 'Unexpected failure: %', sqlerrm;
  end;
  raise exception 'Expected failure was not raised: %', expected;
end $$;

do $$
declare owner_id uuid := gen_random_uuid(); staff_id uuid := gen_random_uuid(); biz uuid := gen_random_uuid();
  payload jsonb; reserved public.square_orders; retry public.square_orders; pickup timestamptz;
  state_key text := repeat('a',64); editor uuid; relation text; row_count integer; lease uuid := gen_random_uuid();
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

  foreach relation in array array['square_connections','square_oauth_states','square_ordering_settings','square_catalog','square_quotes','square_orders','square_order_items','square_order_events','square_webhook_inbox','square_request_buckets'] loop
    if has_table_privilege('anon','public.'||relation,'SELECT') or has_table_privilege('authenticated','public.'||relation,'SELECT')
      or has_table_privilege('authenticated','public.'||relation,'UPDATE') then raise exception 'Commerce table exposed: %',relation; end if;
    if not (select relrowsecurity from pg_class where oid=('public.'||relation)::regclass) then raise exception 'RLS missing: %',relation; end if;
  end loop;
  if has_function_privilege('anon','public.square_reserve_order(jsonb,jsonb)','EXECUTE') or has_function_privilege('authenticated','public.square_consume_oauth_state(text)','EXECUTE') then raise exception 'Private RPC exposed'; end if;

  insert into public.square_oauth_states(state_hash,user_id,business_id,environment,expires_at) values
    (state_key,owner_id,biz,'sandbox',now()+interval '10 minutes'),
    (repeat('b',64),staff_id,biz,'sandbox',now()+interval '10 minutes'),
    (repeat('c',64),owner_id,biz,'sandbox',now()-interval '1 second');
  select count(*) into row_count from public.square_consume_oauth_state(state_key);
  if row_count <> 1 then raise exception 'Owner callback did not consume state'; end if;
  select count(*) into row_count from public.square_consume_oauth_state(state_key);
  if row_count <> 0 then raise exception 'State replay accepted'; end if;
  select count(*) into row_count from public.square_consume_oauth_state(repeat('b',64));
  if row_count <> 0 then raise exception 'Staff callback accepted'; end if;
  select count(*) into row_count from public.square_consume_oauth_state(repeat('c',64));
  if row_count <> 0 then raise exception 'Expired callback accepted'; end if;
  if not exists(select 1 from public.square_oauth_states where state_hash=state_key and user_id=owner_id and business_id=biz and environment='sandbox' and consumed_at is not null) then raise exception 'State binding was lost'; end if;

  pickup := to_timestamp(ceil(extract(epoch from now()+interval '2 hours')/900)*900);
  payload := jsonb_build_object('id',gen_random_uuid(),'business_id',biz,'business_name','Historical name','customer_id',staff_id,
    'guest_hash',repeat('d',64),'merchant_id','fixture-merchant','location_id','fixture-location','pickup_at',pickup,
    'pickup_timezone','UTC','pickup_address','Local fixture address','recipient',jsonb_build_object('display_name','Customer'),
    'subtotal_minor',1000,'tax_minor',100,'total_minor',1100,'currency','USD','idempotency_key',gen_random_uuid(),'request_hash',repeat('e',64),'provider_request','{}'::jsonb);
  reserved := public.square_reserve_order(payload,'[{"name":"Historical coffee","quantity":"1","base_price_money":{"amount":1000,"currency":"USD"}}]');
  retry := public.square_reserve_order(payload,'[]');
  if retry.id <> reserved.id then raise exception 'Duplicate reservation created'; end if;
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('guest_hash','other'),'[]'),'IDEMPOTENCY_CONFLICT');
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'SLOT_FULL');
  update public.square_orders set expires_at=now()-interval '1 hour' where id=reserved.id;
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]'),'SLOT_FULL');
  update public.square_orders set status='checkout_expired' where id=reserved.id;
  retry := public.square_reserve_order(payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid()),'[]');
  if retry.id=reserved.id then raise exception 'Provider-confirmed expiration did not release slot'; end if;
  select count(*) into row_count from public.square_order_lease(retry.id,lease,retry.version);
  if row_count <> 1 then raise exception 'Lease was not acquired'; end if;
  select count(*) into row_count from public.square_order_lease(retry.id,gen_random_uuid(),null);
  if row_count <> 0 then raise exception 'Concurrent order operation acquired lease'; end if;
  if (select version from public.square_orders where id=retry.id) <> retry.version then raise exception 'Lease incorrectly invalidated client version'; end if;
  update public.square_ordering_settings set is_open=false where business_id=biz;
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'pickup_at',pickup+interval '1 hour'),'[]'),'ORDERING_CLOSED');
  update public.square_ordering_settings set is_open=true where business_id=biz;
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'pickup_at',now()),'[]'),'INVALID_SLOT');
  perform pg_temp.expect_square_error(format('select public.square_reserve_order(%L::jsonb,%L::jsonb)',payload||jsonb_build_object('id',gen_random_uuid(),'idempotency_key',gen_random_uuid(),'location_id','other'),'[]'),'ORDERING_CLOSED');

  insert into public.offering_sections(business_id,name) values(biz,'Editorial') returning id into editor;
  insert into public.offering_items(business_id,section_id,name,description,price_minor) values(biz,editor,'Owner menu','Keep this description',1000);
  perform public.square_replace_catalog(biz,'fixture-location','[{"id":"v","type":"ITEM_VARIATION","version":1}]','{"variations":1}');
  perform public.square_replace_catalog(biz,'fixture-location','[{"id":"v","type":"ITEM_VARIATION","version":2}]','{"variations":1}');
  if not exists(select 1 from public.offering_items where business_id=biz and description='Keep this description') then raise exception 'Editorial content changed'; end if;
  if (select version from public.square_catalog where business_id=biz and object_id='v') <> 2 then raise exception 'Catalog version not replaced'; end if;
  if not exists(select 1 from public.square_order_items where order_id=reserved.id and snapshot->>'name'='Historical coffee') then raise exception 'Historical snapshot changed'; end if;

  insert into public.square_webhook_inbox(event_id,event_type,merchant_id,occurred_at,signature_verified) values('local-square-event','payment.updated','fixture',now(),true);
  select count(*) into row_count from public.square_webhook_claim('local-square-event');
  if row_count <> 1 then raise exception 'Event not claimed'; end if;
  select count(*) into row_count from public.square_webhook_claim('local-square-event');
  if row_count <> 0 then raise exception 'Duplicate event claimed'; end if;
  update public.square_webhook_inbox set lease_until=null,last_error='RETRY' where event_id='local-square-event';
  perform public.square_webhook_claim('local-square-event');
  if (select attempts from public.square_webhook_inbox where event_id='local-square-event') <> 2 then raise exception 'Retry count wrong'; end if;
  update public.square_webhook_inbox set processed_at=now(),lease_until=null where event_id='local-square-event';
  select count(*) into row_count from public.square_webhook_claim('local-square-event');
  if row_count <> 0 then raise exception 'Processed replay claimed'; end if;

  perform pg_temp.expect_square_error(format('delete from public.businesses where id=%L',biz),'Settle active pickup orders');
  update public.square_orders set status='checkout_expired' where business_id=biz;
  delete from auth.users where id=staff_id;
  if exists(select 1 from public.square_orders where customer_id=staff_id)
    or exists(select 1 from public.square_orders where business_id=biz and (recipient<>'{}'::jsonb or guest_hash is not null)) then raise exception 'Customer deletion did not anonymize settled orders'; end if;
  update public.square_connections set state='disconnected' where business_id=biz;
  delete from public.businesses where id=biz;
  if not exists(select 1 from public.square_orders where id=reserved.id and business_id is null and recipient='{}'::jsonb and guest_hash is null) then raise exception 'Deletion did not retain anonymized history'; end if;
  if not exists(select 1 from public.square_order_items where order_id=reserved.id) or not exists(select 1 from public.square_order_events where order_id=reserved.id) then raise exception 'Deletion lost history'; end if;
end $$;
rollback;
