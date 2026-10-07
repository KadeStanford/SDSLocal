-- Explicit staging-only demo fixtures. Never include in a production migration/seed.
-- No customer account, hosted email, provider order or payment is created.
begin;
do $$
declare
  owner_id uuid;
  business record;
  sample integer;
  fixture_order_id uuid;
  sample_rating smallint;
begin
  select id into strict owner_id from auth.users where email='kade20413@gmail.com';
  for business in
    select b.id,b.name,coalesce(b.timezone,'America/Chicago') timezone
    from public.businesses b join public.business_members m on m.business_id=b.id
    where m.user_id=owner_id and m.role='owner' and m.is_active
  loop
    for sample in 1..3 loop
      fixture_order_id := md5('staging-owner-review-v1:'||business.id::text||':'||sample::text)::uuid;
      sample_rating := case sample when 2 then 4 else 5 end;
      insert into public.square_orders (
        id,order_number,business_id,business_name,merchant_id,location_id,
        pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,
        total_minor,currency,status,provider_status,idempotency_key,request_hash,provider_request,completed_at
      ) values (
        fixture_order_id,'TEST-REV-'||left(business.id::text,8)||'-'||sample,business.id,business.name,
        'STAGING_REVIEW_FIXTURE','STAGING_REVIEW_FIXTURE',
        now()-sample*interval '1 day',business.timezone,'Staging fixture — no actual pickup',
        '{"name":"Staging review fixture","note":"No customer payment or pickup"}'::jsonb,
        1,0,1,'USD','completed','STAGING_FIXTURE_NO_PAYMENT',fixture_order_id,
        'staging-owner-review-v1',jsonb_build_object('fixture','staging-owner-review-v1','sample',sample),
        now()-sample*interval '1 day'
      ) on conflict (id) do nothing;
      insert into public.pickup_order_reviews (
        id,order_id,business_id,rating,review_text,moderation_status,created_at
      ) values (
        md5('staging-owner-review-text-v1:'||fixture_order_id::text)::uuid,fixture_order_id,business.id,sample_rating,
        '[Staging test review — not a real customer purchase] '||
          case sample when 1 then 'Sample positive feedback for testing the reviews inbox and star display.'
            when 2 then 'Sample four-star feedback for testing an unreplied review and average rating.'
            else 'Sample longer feedback to check how review text wraps on a narrow screen. This is test content for staging only.' end,
        'published',now()-sample*interval '1 day'
      ) on conflict (order_id) do nothing;
    end loop;
  end loop;
end;
$$;
commit;
