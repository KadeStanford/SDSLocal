-- Local transactional fixtures. No recipient addresses, email, or store calls.
begin;

do $$
declare
  fixture_owner_id uuid := gen_random_uuid();
  request_id uuid := gen_random_uuid();
  result jsonb;
  retry_result jsonb;
  created_id uuid;
  blocked boolean;
  slot integer;
  initial_count integer;
begin
  insert into auth.users(id, raw_user_meta_data)
  values(fixture_owner_id, '{"display_name":"Subscription creation fixture"}'::jsonb);
  perform set_config('request.jwt.claim.sub', fixture_owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  update public.platform_settings set value = '{"enabled":true}'::jsonb
  where key = 'business_listing_billing';

  blocked := false;
  begin
    perform public.create_business_with_owner_v3(
      p_request_id => request_id, p_name => 'Subscription fixture',
      p_requested_slug => 'subscription-fixture', p_slug_customized => false,
      p_business_type => 'services'
    );
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%active business subscription%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Unsubscribed creation was accepted'; end if;
  if exists(select 1 from public.business_creation_requests where user_id = fixture_owner_id) then
    raise exception 'Rejected creation left behind a request row';
  end if;

  -- Only these transactional test fixtures activate the prepared products.
  update public.billing_plans set is_active = true where code = 'growth';
  update public.billing_products set is_active = true
  where provider = 'test_store' and product_id = 'listing_growth_monthly_v1';
  perform public.apply_listing_subscription_event(
    'creation-initial-' || fixture_owner_id, 'INITIAL_PURCHASE', fixture_owner_id, 'test_store',
    'listing_growth_monthly_v1', 'active', 'sandbox', 'creation-transaction-' || fixture_owner_id,
    now(), now() + interval '1 month', true,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', (extract(epoch from now()) * 1000)::bigint))
  );
  result := public.create_business_with_owner_v3(
    p_request_id => request_id, p_name => 'Subscription fixture',
    p_requested_slug => 'subscription-fixture', p_slug_customized => false,
    p_business_type => 'services'
  );
  created_id := (result->>'businessId')::uuid;
  if not exists (
    select 1 from public.business_listing_assignments assignment
    join public.billing_accounts account on account.id = assignment.billing_account_id
    where assignment.business_id = created_id and account.owner_id = fixture_owner_id
  ) then raise exception 'Created draft did not atomically consume a subscription slot'; end if;

  retry_result := public.create_business_with_owner_v3(
    p_request_id => request_id, p_name => 'Ignored retry',
    p_requested_slug => 'ignored-retry', p_slug_customized => false, p_business_type => 'services'
  );
  if retry_result->>'businessId' <> result->>'businessId' or (retry_result->>'created')::boolean then
    raise exception 'Idempotent creation consumed another business slot';
  end if;

  -- The older RPC is protected by the same trigger.
  for slot in 2..3 loop
    perform public.create_business_with_owner(
      p_name => 'Legacy RPC fixture',
      p_slug => 'subscription-fixture-' || slot || '-' || left(fixture_owner_id::text, 8),
      p_business_type => 'services'
    );
  end loop;
  select count(*) into initial_count from public.businesses where created_by = fixture_owner_id;
  blocked := false;
  begin
    perform public.create_business_with_owner(
      p_name => 'Excess business', p_slug => 'subscription-excess-' || left(fixture_owner_id::text, 8),
      p_business_type => 'services'
    );
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%no available business slots%' then raise; end if;
    blocked := true;
  end;
  if not blocked or (select count(*) from public.businesses where created_by = fixture_owner_id) <> initial_count then
    raise exception 'Capacity rejection failed or left a partial business';
  end if;
  if has_table_privilege('authenticated', 'public.businesses', 'INSERT') then
    raise exception 'Raw business inserts can bypass atomic creation';
  end if;

  -- A grace period can use remaining slots, but an expired subscription cannot.
  delete from public.businesses where created_by = fixture_owner_id and id <> created_id;
  update public.listing_entitlements
  set status = 'grace_period', current_period_end = now() + interval '1 day'
  where billing_account_id = (select account.id from public.billing_accounts account where account.owner_id = fixture_owner_id);
  perform public.create_business_with_owner(
    p_name => 'Grace fixture', p_slug => 'subscription-grace-' || left(fixture_owner_id::text, 8),
    p_business_type => 'services'
  );
  update public.listing_entitlements
  set status = 'expired', current_period_end = now() - interval '1 second'
  where billing_account_id = (select id from public.billing_accounts account where account.owner_id = fixture_owner_id);
  blocked := false;
  begin
    perform public.create_business_with_owner(
      p_name => 'Expired fixture', p_slug => 'subscription-expired-' || left(fixture_owner_id::text, 8),
      p_business_type => 'services'
    );
  exception when sqlstate 'P0001' then blocked := true;
  end;
  if not blocked then raise exception 'Expired subscription created a new business'; end if;

  update public.platform_settings set value = '{"enabled":false}'::jsonb
  where key = 'business_listing_billing';
  perform public.create_business_with_owner(
    p_name => 'Preview fixture', p_slug => 'subscription-preview-' || left(fixture_owner_id::text, 8),
    p_business_type => 'services'
  );
end;
$$;

select 'business creation subscription checks passed' as result;
rollback;
