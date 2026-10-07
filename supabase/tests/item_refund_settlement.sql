-- Rolled-back database fixtures. No external provider calls or email delivery.
begin;
do $$
declare owner_id uuid := gen_random_uuid(); biz uuid := gen_random_uuid(); oid uuid;
  key_one uuid := gen_random_uuid(); key_two uuid := gen_random_uuid(); rail text; history jsonb;
begin
  insert into auth.users(id,raw_user_meta_data) values(owner_id,'{"display_name":"Item refund fixture"}');
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
    values(biz,owner_id,'refund-fixture-'||biz,'Item refund fixture','food_drink','active',now());
  foreach rail in array array['square','stripe'] loop
    oid := gen_random_uuid();
    insert into public.square_orders(id,provider,business_id,business_name,merchant_id,location_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,status,idempotency_key,request_hash,provider_request,paid_at)
      values(oid,rail,biz,'Fixture','fixture','fixture',now()+interval '1 hour','America/Chicago','Fixture','{}',900,100,1000,'USD','placed',gen_random_uuid(),repeat('a',64),'{}',now());
    history := jsonb_build_array(jsonb_build_object('key',key_one,'items',jsonb_build_array(jsonb_build_object('itemId',gen_random_uuid(),'quantity',1,'amount',400)),'amount',400,'before',0,'state','pending'));
    update public.square_orders set status='refund_pending',refund_key=key_one,refund_amount_minor=400,item_refunds=history where id=oid;
    update public.square_orders set square_refund_id='pending-fixture-'||oid where id=oid;
    if (select item_refunds->0->>'state' from public.square_orders where id=oid) <> 'pending' then raise exception 'Pending selection released'; end if;
    update public.square_orders set status='payment_review',refunded_minor=400 where id=oid;
    update public.square_orders set provider_status='PARTIAL_REFUND' where id=oid;
    if (select item_refunds->0->>'state' from public.square_orders where id=oid) <> 'completed' then raise exception 'Confirmed selection not settled for %',rail; end if;
    update public.square_orders set status='refund_pending',refund_key=key_two,refund_amount_minor=200,
      item_refunds=item_refunds || jsonb_build_array(jsonb_build_object('key',key_two,'items','[]'::jsonb,'amount',200,'before',400,'state','pending')) where id=oid;
    update public.square_orders set status='refund_failed' where id=oid;
    if (select item_refunds->1->>'state' from public.square_orders where id=oid) <> 'failed' then raise exception 'Confirmed failure did not release quantity'; end if;
    if (select item_refunds->0->>'state' from public.square_orders where id=oid) <> 'completed' then raise exception 'Previous selection changed'; end if;
    insert into public.square_order_support_requests(order_id,business_id,customer_id,request_type,message,status)
      values(oid,biz,owner_id,'issue','Fixture refund request','open');
  end loop;
  if public.square_queue_counts(biz)->>'requests' <> '2' then raise exception 'Requests count wrong'; end if;
  update public.square_order_support_requests set status='resolved',response='Fixture response',resolved_at=now() where business_id=biz;
  if public.square_queue_counts(biz)->>'requests' <> '0' then raise exception 'Resolved requests still counted'; end if;
  if has_table_privilege('authenticated','public.square_orders','update') or has_table_privilege('anon','public.square_orders','select') then raise exception 'Private refund ledger exposed'; end if;
  if has_function_privilege('authenticated','public.square_queue_counts(uuid)','execute') then raise exception 'Private business requests exposed'; end if;
end $$;
rollback;

