begin;

do $$
declare
  owner_id uuid;
  first_business uuid;
  second_business uuid;
  billing_state jsonb;
  event_time_ms bigint := floor(extract(epoch from now()) * 1000)::bigint;
begin
  owner_id := gen_random_uuid();
  insert into auth.users(id,raw_user_meta_data)
  values(owner_id,'{"display_name":"Legacy billing fixture"}');
  -- Exercise grandfathered capacity independently of the current store rollout.
  update public.billing_plans set is_active=true where code in ('single','multi');
  update public.billing_products set is_active=true
  where provider='test_store' and plan_code in ('single','multi');

  insert into public.businesses (created_by, slug, name, business_type)
  values (
    owner_id,
    'billing-first-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'Billing First Fixture',
    'services'
  ) returning id into first_business;
  insert into public.businesses (created_by, slug, name, business_type)
  values (
    owner_id,
    'billing-second-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'Billing Second Fixture',
    'retail'
  ) returning id into second_business;
  insert into public.business_members (business_id, user_id, role)
  values (first_business, owner_id, 'owner'), (second_business, owner_id, 'owner');

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update public.platform_settings
  set value = '{"enabled":true}'::jsonb
  where key = 'business_listing_billing';

  if not exists (
    select 1 from public.billing_products
    where provider = 'google'
      and product_id = 'listing_multi_v1:yearly'
      and plan_code = 'multi'
      and billing_period = 'yearly'
  ) then
    raise exception 'Google subscription/base-plan mapping is missing';
  end if;

  begin
    perform public.assign_my_business_listing(first_business);
    raise exception 'A business was assigned without an active store entitlement';
  exception when sqlstate 'P0001' then null;
  end;

  perform public.apply_listing_subscription_event(
    'billing-event-initial' || owner_id,
    'INITIAL_PURCHASE',
    owner_id,
    'test_store',
    'listing_single_monthly_v1',
    'active',
    'sandbox',
    'billing-test-transaction' || owner_id,
    now(),
    now() + interval '1 month',
    true,
    jsonb_build_object('fixture', true, 'event', jsonb_build_object('event_timestamp_ms', event_time_ms))
  );

  billing_state := public.assign_my_business_listing(first_business);
  if not (billing_state->>'canPublish')::boolean
     or (billing_state->>'listingLimit')::integer <> 1
     or (billing_state->>'usedListings')::integer <> 1 then
    raise exception 'Single listing entitlement returned an unexpected state: %', billing_state;
  end if;

  begin
    perform public.assign_my_business_listing(second_business);
    raise exception 'Single plan accepted a second business assignment';
  exception when sqlstate 'P0001' then null;
  end;

  perform set_config('request.jwt.claim.role', 'service_role', true);
  update public.businesses
  set status = 'active', approved_at = now()
  where id = first_business;
  perform public.apply_listing_subscription_event(
    'billing-event-expired' || owner_id,
    'EXPIRATION',
    owner_id,
    'test_store',
    'listing_single_monthly_v1',
    'expired',
    'sandbox',
    'billing-test-transaction' || owner_id,
    now() - interval '1 month',
    now() - interval '1 second',
    false,
    jsonb_build_object('fixture', true, 'event', jsonb_build_object('event_timestamp_ms', event_time_ms + 1000))
  );
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  if not exists (
    select 1 from public.businesses
    where id = first_business and status = 'suspended' and suspension_reason = 'billing'
  ) then
    raise exception 'Expired entitlement did not unpublish its assigned active listing';
  end if;

  perform public.apply_listing_subscription_event(
    'billing-event-renewed' || owner_id,
    'RENEWAL',
    owner_id,
    'test_store',
    'listing_single_monthly_v1',
    'active',
    'sandbox',
    'billing-test-transaction' || owner_id,
    now(),
    now() + interval '1 month',
    true,
    jsonb_build_object('fixture', true, 'event', jsonb_build_object('event_timestamp_ms', event_time_ms + 2000))
  );
  if not exists (
    select 1 from public.businesses
    where id = first_business and status = 'active' and suspension_reason is null
  ) then
    raise exception 'Renewed entitlement did not restore its billing-suspended listing';
  end if;

  if has_table_privilege('authenticated', 'public.listing_entitlements', 'INSERT')
     or has_table_privilege('authenticated', 'public.listing_entitlements', 'UPDATE')
     or has_table_privilege('authenticated', 'public.billing_webhook_events', 'SELECT') then
    raise exception 'Authenticated clients received trusted billing mutation access';
  end if;
end;
$$;

select 'business listing billing checks passed' as result;

rollback;
