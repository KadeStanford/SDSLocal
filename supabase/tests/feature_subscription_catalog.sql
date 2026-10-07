-- Local, transactional catalog checks; no email or provider transactions.
begin;

do $$
declare
  catalog_count integer;
  blocked boolean := false;
begin
  select count(*) into catalog_count
  from public.billing_plans
  where code in ('essentials', 'growth', 'pro') and listing_limit = 3;
  if catalog_count <> 3 then
    raise exception 'Feature tiers must each have three slots';
  end if;

  select count(*) into catalog_count
  from public.billing_products
  where plan_code in ('essentials', 'growth', 'pro');
  if catalog_count <> 18 then
    raise exception 'Expected eighteen provider/product/period mappings';
  end if;

  if not exists (
    select 1 from public.billing_plans
    where code = 'essentials' and service_level = 1
      and feature_codes = array['business_page', 'discovery', 'events', 'service_requests', 'basic_analytics']
  ) or not exists (
    select 1 from public.billing_plans
    where code = 'growth' and service_level = 2
      and 'loyalty' = any(feature_codes) and not ('pickup_ordering' = any(feature_codes))
  ) or not exists (
    select 1 from public.billing_plans
    where code = 'pro' and service_level = 3
      and 'pickup_ordering' = any(feature_codes) and 'appointments' = any(feature_codes)
  ) then
    raise exception 'Feature tier capabilities do not match the offering';
  end if;

  if not exists (
    select 1 from public.billing_plans
    where code = 'single' and listing_limit = 1 and 'appointments' = any(feature_codes)
  ) or not exists (
    select 1 from public.billing_plans
    where code = 'multi' and listing_limit = 3 and 'appointments' = any(feature_codes)
  ) then
    raise exception 'Legacy capacity or full feature access was not preserved';
  end if;

  if has_function_privilege('anon', 'public.get_my_business_subscription_features()', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_my_business_subscription_features()', 'EXECUTE')
     or has_table_privilege('authenticated', 'public.billing_plans', 'UPDATE') then
    raise exception 'Subscription capability privilege boundary is incorrect';
  end if;

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform public.get_my_business_subscription_features();
  exception when sqlstate '42501' then blocked := true;
  end;
  if not blocked then
    raise exception 'Anonymous capability lookup was accepted';
  end if;
end;
$$;

select 'feature subscription catalog checks passed' as result;
rollback;
