begin;

alter table public.billing_plans
  add column feature_codes text[] not null default '{}',
  add column service_level smallint not null default 0;

-- Preserve existing purchases and their original one/three listing allowances.
update public.billing_plans
set feature_codes = array[
      'business_page', 'discovery', 'events', 'service_requests', 'basic_analytics',
      'loyalty', 'follower_updates', 'staff_scanning', 'pickup_ordering', 'appointments'
    ],
    service_level = 3,
    updated_at = now()
where code in ('single', 'multi');

-- Dormant until store configuration, feature enforcement, and sandbox acceptance.
-- No prices are stored here: checkout uses the localized storefront price.
insert into public.billing_plans
  (code, name, listing_limit, display_order, is_active, feature_codes, service_level)
values
  ('essentials', 'Essentials', 3, 10, false,
    array['business_page', 'discovery', 'events', 'service_requests', 'basic_analytics'], 1),
  ('growth', 'Growth', 3, 20, false,
    array['business_page', 'discovery', 'events', 'service_requests', 'basic_analytics',
      'loyalty', 'follower_updates', 'staff_scanning'], 2),
  ('pro', 'Pro', 3, 30, false,
    array['business_page', 'discovery', 'events', 'service_requests', 'basic_analytics',
      'loyalty', 'follower_updates', 'staff_scanning', 'pickup_ordering', 'appointments'], 3);

insert into public.billing_products
  (provider, product_id, plan_code, billing_period, is_active)
select provider,
  case when provider = 'google' then 'listing_' || plan_code || '_v1:' || period
       else 'listing_' || plan_code || '_' || period || '_v1' end,
  plan_code, period, false
from unnest(array['apple', 'google', 'test_store']) as providers(provider)
cross join unnest(array['essentials', 'growth', 'pro']) as plans(plan_code)
cross join unnest(array['monthly', 'yearly']) as periods(period);

-- Owner-only capability snapshot from server-verified billing. This is the
-- foundation for subsequent feature gates, not enforcement of existing tools.
create or replace function public.get_my_business_subscription_features()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  billing jsonb;
  feature_codes_value text[] := '{}';
begin
  billing := public.get_my_listing_billing(); -- Includes authentication check.
  if coalesce((billing->>'canPublish')::boolean, false) then
    select feature_codes into feature_codes_value
    from public.billing_plans
    where code = billing->>'planCode' and is_active;
  end if;
  return jsonb_build_object(
    'planCode', billing->>'planCode',
    'canPublish', coalesce((billing->>'canPublish')::boolean, false),
    'featureCodes', to_jsonb(coalesce(feature_codes_value, '{}'::text[]))
  );
end;
$$;

revoke all on function public.get_my_business_subscription_features() from public, anon;
grant execute on function public.get_my_business_subscription_features() to authenticated;

commit;
