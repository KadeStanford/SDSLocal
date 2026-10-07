-- Included after BEGIN. Temporary local fixtures, no email or hosted accounts.
create temporary table database_test_fixture (
  owner_id uuid, customer_id uuid, business_id uuid, other_business_id uuid,
  order_id uuid, order_review_id uuid, event_id uuid, past_event_id uuid, event_review_id uuid
) on commit drop;
insert into database_test_fixture select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
do $$
declare f database_test_fixture; rsvp uuid;
begin
  select * into f from database_test_fixture;
  insert into auth.users(id,raw_user_meta_data) values
    (f.owner_id,'{"display_name":"Local verification owner"}'),
    (f.customer_id,'{"display_name":"Local verification customer"}');
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
  values(f.business_id,f.owner_id,'verification-'||f.business_id,'Verification shop','general','active',now()),
    (f.other_business_id,f.owner_id,'verification-'||f.other_business_id,'Other verification shop','general','active',now());
  insert into public.business_members(business_id,user_id,role,is_active)
  values(f.business_id,f.owner_id,'owner',true),(f.other_business_id,f.owner_id,'owner',true);
  insert into public.square_orders(id,business_id,business_name,customer_id,merchant_id,location_id,
    pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,
    status,idempotency_key,request_hash,provider_request)
  values(f.order_id,f.business_id,'Verification shop',f.customer_id,'fixture-merchant','fixture-location',
    now(),'America/Chicago','Local fixture','{}',500,0,500,'USD','completed',gen_random_uuid(),'local-review-fixture','{}');
  insert into public.pickup_order_reviews(id,order_id,business_id,customer_id,rating,review_text)
    values(f.order_review_id,f.order_id,f.business_id,f.customer_id,5,'Local regression review');
  insert into public.events(id,business_id,slug,title,starts_at,is_published)
  values(f.event_id,f.business_id,'upcoming-'||f.event_id,'Future fixture',now()+interval '7 days',true),
    (f.past_event_id,f.business_id,'past-'||f.past_event_id,'Past fixture',now()-interval '7 days',true);
  insert into public.event_rsvps(event_id,customer_id,status)
    values(f.past_event_id,f.customer_id,'going') returning id into rsvp;
  insert into public.verified_event_reviews(id,event_id,rsvp_id,business_id,customer_id,rating,review_text)
    values(f.event_review_id,f.past_event_id,rsvp,f.business_id,f.customer_id,4,'Local event review');
end $$;
