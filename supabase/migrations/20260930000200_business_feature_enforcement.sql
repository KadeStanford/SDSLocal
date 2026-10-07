begin;

-- Installation does not activate billing or change the sandbox tester allowlist.
-- Enable only after the complete entitlement and obligation-recovery acceptance run.
update public.platform_settings
set value = jsonb_build_object('featureEnforcement', false) || value
where key = 'business_listing_billing';

create function public.business_feature_snapshot(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  config jsonb;
  business_owner uuid;
  account_owner uuid;
  assignment public.business_listing_assignments%rowtype;
  entitlement public.listing_entitlements%rowtype;
  plan public.billing_plans%rowtype;
  enforce boolean;
  has_slot boolean := false;
  features text[] := array['business_page','discovery','events','service_requests','basic_analytics',
    'loyalty','follower_updates','staff_scanning','pickup_ordering','appointments'];
begin
  select created_by into business_owner from public.businesses where id = p_business_id;
  if not found then raise exception 'Business not found' using errcode = 'P0002'; end if;
  select value into config from public.platform_settings where key = 'business_listing_billing';
  select * into assignment from public.business_listing_assignments where business_id = p_business_id;
  select owner_id into account_owner from public.billing_accounts where id = assignment.billing_account_id;
  -- Evaluate the business's billing owner, never the requesting customer/staff member.
  enforce := coalesce(config->>'featureEnforcement' = 'true', false) and (
    coalesce(config->>'enabled' = 'true', false) or (
      coalesce(config->>'sandboxCheckout' = 'true', false) and exists (
        select 1 from public.business_subscription_sandbox_testers t
        where t.owner_id = coalesce(account_owner, business_owner) and t.enabled
      )
    )
  );
  if enforce then
    features := '{}';
    select * into entitlement from public.listing_entitlements
      where billing_account_id = assignment.billing_account_id;
    select * into plan from public.billing_plans where code = entitlement.plan_code and is_active;
    -- A removed owner cannot keep granting another business benefits. Deterministic
    -- slots also prevent an old three-slot assignment from bypassing a one-slot plan.
    select exists (
      select 1 from (
        select a.business_id from public.business_listing_assignments a
        where a.billing_account_id = assignment.billing_account_id
        order by a.assigned_at, a.business_id limit coalesce(plan.listing_limit, 0)
      ) slots where slots.business_id = p_business_id
    ) into has_slot;
    if plan.code is not null and has_slot
      and entitlement.environment = config->>'environment'
      and (config->>'environment' = 'sandbox' or entitlement.provider in ('apple','google'))
      and entitlement.current_period_end is not null
      and public.billing_entitlement_is_active(entitlement.status, entitlement.current_period_end)
      and exists (select 1 from public.business_members m where m.business_id = p_business_id
        and m.user_id = account_owner and m.role = 'owner' and m.is_active)
    then features := plan.feature_codes; end if;
  end if;
  return jsonb_build_object('businessId',p_business_id,'enforced',enforce,
    'planCode',case when enforce then plan.code else null end,'featureCodes',to_jsonb(features));
end $$;
revoke all on function public.business_feature_snapshot(uuid) from public, anon, authenticated;
grant execute on function public.business_feature_snapshot(uuid) to service_role;

create function public.get_business_feature_access(p_business_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not public.is_business_member(p_business_id, auth.uid()) then
    raise exception 'Business membership required' using errcode = '42501';
  end if;
  return public.business_feature_snapshot(p_business_id);
end $$;
revoke all on function public.get_business_feature_access(uuid) from public, anon;
grant execute on function public.get_business_feature_access(uuid) to authenticated;

-- This check is additive to RLS and operation-specific authorization, never a
-- replacement for owner/staff/customer authorization. Only trusted servers call it.
create function public.assert_business_feature(p_business_id uuid, p_feature text)
returns void language plpgsql stable security definer set search_path = '' as $$
declare snapshot jsonb;
begin
  if p_feature is null or p_feature <> all(array['business_page','discovery','events',
    'service_requests','basic_analytics','loyalty','follower_updates','staff_scanning',
    'pickup_ordering','appointments']) then
    raise exception 'Unknown business feature' using errcode = '22023';
  end if;
  snapshot := public.business_feature_snapshot(p_business_id);
  if not (snapshot->'featureCodes' ? p_feature) then
    raise exception 'This business subscription does not include this feature'
      using errcode = '42501', detail = 'BUSINESS_FEATURE_REQUIRED';
  end if;
end $$;
revoke all on function public.assert_business_feature(uuid,text) from public, anon, authenticated;
grant execute on function public.assert_business_feature(uuid,text) to service_role;

create function public.guard_business_feature_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Turning a tool off must remain possible after expiry (including disconnect).
  -- Compare all other fields so this cannot smuggle an edit through a disable.
  if tg_op = 'UPDATE' then
    if tg_table_name in ('square_ordering_settings','stripe_ordering_settings')
      and to_jsonb(new)->>'enabled' = 'false' and to_jsonb(new)->>'is_open' = 'false'
      and (to_jsonb(new) - array['enabled','is_open','updated_at','updated_by']) =
          (to_jsonb(old) - array['enabled','is_open','updated_at','updated_by']) then return new;
    end if;
    if tg_table_name = 'appointment_settings' and to_jsonb(new)->>'enabled' = 'false'
      and (to_jsonb(new) - array['enabled','updated_at','updated_by']) =
          (to_jsonb(old) - array['enabled','updated_at','updated_by']) then return new;
    end if;
  end if;
  perform public.assert_business_feature(new.business_id, tg_argv[0]);
  if tg_op = 'UPDATE' and old.business_id is distinct from new.business_id then
    perform public.assert_business_feature(old.business_id, tg_argv[0]);
  end if;
  return new;
end $$;
revoke all on function public.guard_business_feature_write() from public, anon, authenticated;

-- Protect direct table writes and RPCs alike, including service-role writes.
-- Inserts create new obligations. Updates/deletes of existing obligations remain
-- available for fulfillment, refunds, cancellation, support and privacy cleanup.
create trigger subscription_new_pickup before insert on public.square_orders
  for each row execute function public.guard_business_feature_write('pickup_ordering');
create trigger subscription_new_quote before insert on public.square_quotes
  for each row execute function public.guard_business_feature_write('pickup_ordering');
create trigger subscription_new_appointment before insert on public.appointments
  for each row execute function public.guard_business_feature_write('appointments');
create trigger subscription_new_request before insert on public.service_requests
  for each row execute function public.guard_business_feature_write('service_requests');
create trigger subscription_new_membership before insert on public.loyalty_memberships
  for each row execute function public.guard_business_feature_write('loyalty');

create function public.guard_new_loyalty_earnings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- Existing paid orders may finish earning their promised rewards. The private
  -- order/ledger RPCs still authorize and validate those linked transactions.
  if new.transaction_type in ('stamp','points_earned') and new.square_order_id is null
    and new.payment_adjustment is null then
    perform public.assert_business_feature(new.business_id,'loyalty');
    perform public.assert_business_feature(new.business_id,'staff_scanning');
  end if;
  return new;
end $$;
revoke all on function public.guard_new_loyalty_earnings() from public,anon,authenticated;
create trigger subscription_new_earnings before insert on public.loyalty_transactions
  for each row execute function public.guard_new_loyalty_earnings();

-- Configuration cannot bypass the tier check by calling the database directly.
do $$
declare entry record;
begin
  for entry in select * from (values
    ('offering_sections','business_page'), ('offering_items','business_page'),
    ('business_photos','business_page'), ('events','events'),
    ('business_location_stops','events'), ('service_request_forms','service_requests'),
    ('loyalty_programs','loyalty'), ('business_updates','follower_updates'),
    ('square_ordering_settings','pickup_ordering'), ('stripe_ordering_settings','pickup_ordering'),
    ('ordering_provider_selections','pickup_ordering'),
    ('appointment_settings','appointments'), ('appointment_services','appointments'),
    ('appointment_resources','appointments'), ('appointment_service_resources','appointments'),
    ('appointment_weekly_windows','appointments'), ('appointment_date_overrides','appointments')
  ) as entries(table_name,feature) loop
    execute format('create trigger subscription_configuration before insert or update on public.%I for each row execute function public.guard_business_feature_write(%L)',entry.table_name,entry.feature);
  end loop;
end $$;

commit;
