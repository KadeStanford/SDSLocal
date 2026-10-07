-- Transactional staging/local fixtures: no emails and no store calls.
begin;
do $$
declare
  fixture_owner uuid := gen_random_uuid();
  fixture_business uuid;
  fixture_account uuid;
  event_time bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  result jsonb;
  event_index integer;
begin
  insert into auth.users(id, raw_user_meta_data)
  values(fixture_owner, '{"display_name":"Subscription ordering fixture"}'::jsonb);
  insert into public.businesses(created_by, name, slug, business_type, status, approved_at)
  values(fixture_owner, 'Ordering fixture', 'ordering-' || fixture_owner, 'services', 'active', now())
  returning id into fixture_business;
  insert into public.business_members(business_id, user_id, role)
  values(fixture_business, fixture_owner, 'owner');
  update public.billing_plans set is_active = true where code = 'growth';
  update public.billing_products set is_active = true
  where provider = 'test_store' and product_id = 'listing_growth_monthly_v1';

  for event_index in 1..2 loop
    result := public.apply_listing_subscription_event(
      'ordering-renewal-' || event_index || '-' || fixture_owner, 'RENEWAL', fixture_owner,
      'test_store', 'listing_growth_monthly_v1', 'active', 'sandbox', 'ordering-' || fixture_owner,
      now(), now() + interval '1 month', true,
      jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', event_time + event_index * 1000))
    );
    if not (result->>'processed')::boolean then raise exception 'Renewal was rejected: %', result; end if;
  end loop;
  select id into fixture_account from public.billing_accounts where owner_id = fixture_owner;
  insert into public.business_listing_assignments(billing_account_id, business_id, assigned_by)
  values(fixture_account, fixture_business, fixture_owner);

  result := public.apply_listing_subscription_event(
    'ordering-old-expiration-' || fixture_owner, 'EXPIRATION', fixture_owner,
    'test_store', 'listing_growth_monthly_v1', 'expired', 'sandbox', 'ordering-' || fixture_owner,
    now() - interval '1 month', now() - interval '1 second', false,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', event_time + 1000))
  );
  if result->>'ignored' <> 'stale_event' then raise exception 'Delayed expiration was not ignored: %', result; end if;
  if not exists(select 1 from public.listing_entitlements where billing_account_id = fixture_account and status = 'active')
    or not exists(select 1 from public.businesses where id = fixture_business and status = 'active') then
    raise exception 'Delayed expiration removed renewed access';
  end if;

  result := public.apply_listing_subscription_event(
    'ordering-revocation-' || fixture_owner, 'EXPIRATION', fixture_owner,
    'test_store', 'listing_growth_monthly_v1', 'revoked', 'sandbox', 'ordering-' || fixture_owner,
    now(), now(), false,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', event_time + 3000))
  );
  if not exists(select 1 from public.businesses where id = fixture_business and status = 'suspended' and suspension_reason = 'billing') then
    raise exception 'Revocation failed to suspend the assigned business';
  end if;
  result := public.apply_listing_subscription_event(
    'ordering-old-active-' || fixture_owner, 'RENEWAL', fixture_owner,
    'test_store', 'listing_growth_monthly_v1', 'active', 'sandbox', 'ordering-' || fixture_owner,
    now(), now() + interval '1 month', true,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', event_time + 2000))
  );
  if result->>'ignored' <> 'stale_event' then raise exception 'Delayed active event was not ignored'; end if;
  if not exists(select 1 from public.listing_entitlements where billing_account_id = fixture_account and status = 'revoked')
    or not exists(select 1 from public.businesses where id = fixture_business and status = 'suspended') then
    raise exception 'Delayed event restored revoked access';
  end if;

  result := public.apply_listing_subscription_event(
    'ordering-revocation-' || fixture_owner, 'EXPIRATION', fixture_owner,
    'test_store', 'listing_growth_monthly_v1', 'revoked', 'sandbox', 'ordering-' || fixture_owner,
    now(), now(), false,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', event_time + 3000))
  );
  if not (result->>'duplicate')::boolean then raise exception 'Duplicate delivery was reapplied'; end if;
  result := public.apply_listing_subscription_event(
    'ordering-invalid-' || fixture_owner, 'RENEWAL', fixture_owner,
    'test_store', 'listing_growth_monthly_v1', 'active', 'sandbox', 'ordering-' || fixture_owner,
    now(), now() + interval '1 month', true, '{"event":{}}'::jsonb
  );
  if result->>'reason' <> 'invalid_event_timestamp' then raise exception 'Missing timestamp was accepted'; end if;
  if exists(select 1 from public.billing_webhook_events where provider_event_id = 'ordering-invalid-' || fixture_owner) then
    raise exception 'Invalid event was persisted';
  end if;
  if (select proowner::regrole::text from pg_proc where oid = 'public.apply_listing_subscription_event(text,text,uuid,text,text,text,text,text,timestamptz,timestamptz,boolean,jsonb)'::regprocedure) <> 'sds_billing_manager' then
    raise exception 'Billing RPC lost its narrow execution identity';
  end if;
end;
$$;
select 'subscription event ordering checks passed' as result;
rollback;
