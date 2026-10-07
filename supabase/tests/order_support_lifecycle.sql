\set ON_ERROR_STOP on
begin;
do $$
declare owner_id uuid := gen_random_uuid(); business_id uuid := gen_random_uuid();
  order_id uuid := gen_random_uuid(); request_id uuid; state text;
begin
  insert into auth.users(id,raw_user_meta_data) values(owner_id,'{"display_name":"Order support fixture"}');
  insert into public.businesses(id,created_by,slug,name,business_type,status)
    values(business_id,owner_id,'support-test-'||business_id,'Support fixture','food_drink','draft');
  insert into public.square_orders(id,business_id,business_name,merchant_id,location_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,status,idempotency_key,request_hash,provider_request)
    values(order_id,business_id,'Support fixture','fixture-merchant','fixture-location',now()+interval '1 hour','America/Chicago','Fixture address','{}',100,0,100,'USD','placed',gen_random_uuid(),'fixture','{}');
  insert into public.square_order_support_requests(order_id,business_id,request_type,message)
    values(order_id,business_id,'cancel','Please cancel my order.') returning id into request_id;
  if (public.square_queue_counts(business_id)->>'requests')::integer <> 1 then raise exception 'Missing active request'; end if;
  update public.square_orders set status='refund_pending', refund_amount_minor=50 where id=order_id;
  update public.square_orders set status='payment_review', refunded_minor=50 where id=order_id;
  if (select status from public.square_order_support_requests where id=request_id) <> 'open' then raise exception 'Partial refund incorrectly closed request'; end if;
  update public.square_orders set status='refunded', refunded_minor=100 where id=order_id;
  if not exists(select 1 from public.square_order_support_requests where id=request_id and status='resolved' and resolved_at is not null and response is not null) then raise exception 'Settled refund did not resolve request'; end if;
  if (public.square_queue_counts(business_id)->>'requests')::integer <> 0 then raise exception 'Refunded request still counted'; end if;
  begin
    insert into public.square_order_support_requests(order_id,business_id,request_type,message)
      values(order_id,business_id,'issue','Please reopen this order.');
    raise exception 'Ended order accepted a request';
  exception when raise_exception then
    if sqlerrm <> 'ORDER_COMPLETE' then raise; end if;
  end;
  foreach state in array array['checkout_expired','checkout_failed','dispute_lost'] loop
    update public.square_orders set status='placed', refunded_minor=0 where id=order_id;
    insert into public.square_order_support_requests(order_id,business_id,request_type,message)
      values(order_id,business_id,'change','Please change this order.') returning id into request_id;
    update public.square_orders set status=state where id=order_id;
    if (select status from public.square_order_support_requests where id=request_id) <> 'resolved' then raise exception 'Ended request stayed open: %',state; end if;
  end loop;
end $$;
rollback;
