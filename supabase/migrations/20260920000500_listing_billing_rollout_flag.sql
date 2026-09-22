begin;

insert into public.platform_settings (key, value, description)
values (
  'business_listing_billing',
  '{"enabled":false}'::jsonb,
  'Requires an active store entitlement when an owner submits a business for publication.'
)
on conflict (key) do nothing;

create or replace function public.get_my_listing_billing()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target_account public.billing_accounts%rowtype;
  target_entitlement public.listing_entitlements%rowtype;
  target_plan public.billing_plans%rowtype;
  used_listings integer := 0;
  active_access boolean := false;
  billing_enabled boolean := false;
  assigned_business_ids jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select coalesce((value ->> 'enabled')::boolean, false)
    into billing_enabled
  from public.platform_settings
  where key = 'business_listing_billing';

  select * into target_account
  from public.billing_accounts
  where owner_id = (select auth.uid());

  if target_account.id is null then
    return jsonb_build_object(
      'billingEnabled', billing_enabled,
      'planCode', null,
      'planName', null,
      'status', 'none',
      'canPublish', false,
      'listingLimit', 0,
      'usedListings', 0,
      'availableListings', 0,
      'currentPeriodEnd', null,
      'willRenew', false,
      'provider', null,
      'productId', null,
      'businessIds', '[]'::jsonb
    );
  end if;

  select * into target_entitlement
  from public.listing_entitlements
  where billing_account_id = target_account.id;

  if target_entitlement.billing_account_id is not null then
    select * into target_plan
    from public.billing_plans
    where code = target_entitlement.plan_code and is_active;
    active_access := public.billing_entitlement_is_active(
      target_entitlement.status,
      target_entitlement.current_period_end
    );
  end if;

  select count(*)::integer,
         coalesce(jsonb_agg(assignment.business_id order by assignment.assigned_at), '[]'::jsonb)
    into used_listings, assigned_business_ids
  from public.business_listing_assignments assignment
  where assignment.billing_account_id = target_account.id;

  return jsonb_build_object(
    'billingEnabled', billing_enabled,
    'planCode', target_entitlement.plan_code,
    'planName', target_plan.name,
    'status', coalesce(target_entitlement.status, 'none'),
    'canPublish', active_access and target_plan.code is not null,
    'listingLimit', case when active_access then coalesce(target_plan.listing_limit, 0) else 0 end,
    'usedListings', used_listings,
    'availableListings', case
      when active_access then greatest(coalesce(target_plan.listing_limit, 0) - used_listings, 0)
      else 0
    end,
    'currentPeriodEnd', target_entitlement.current_period_end,
    'willRenew', coalesce(target_entitlement.will_renew, false),
    'provider', target_entitlement.provider,
    'productId', target_entitlement.product_id,
    'businessIds', assigned_business_ids
  );
end;
$$;

create or replace function public.submit_business_for_review(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  readiness jsonb;
  assigned_account_id uuid;
  entitlement_is_active boolean := false;
  billing_enabled boolean := false;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  select public.get_business_readiness(p_business_id) into readiness;
  if not (readiness ->> 'ready')::boolean then
    raise exception 'Complete every readiness item before submitting' using errcode = '22023';
  end if;

  select coalesce((value ->> 'enabled')::boolean, false)
    into billing_enabled
  from public.platform_settings
  where key = 'business_listing_billing';

  if billing_enabled then
    select assignment.billing_account_id into assigned_account_id
    from public.business_listing_assignments assignment
    where assignment.business_id = p_business_id;

    if assigned_account_id is null then
      perform public.assign_my_business_listing(p_business_id);
      select assignment.billing_account_id into assigned_account_id
      from public.business_listing_assignments assignment
      where assignment.business_id = p_business_id;
    end if;

    select public.billing_entitlement_is_active(entitlement.status, entitlement.current_period_end)
      into entitlement_is_active
    from public.listing_entitlements entitlement
    where entitlement.billing_account_id = assigned_account_id;

    if not coalesce(entitlement_is_active, false) then
      raise exception 'An active listing plan is required to publish' using errcode = 'P0001';
    end if;
  end if;

  update public.businesses
  set
    status = 'pending_review',
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    review_feedback = null
  where id = p_business_id
    and status = 'draft';

  if not found then
    raise exception 'Only a draft can be submitted' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.get_my_listing_billing() from public;
grant execute on function public.get_my_listing_billing() to authenticated;
revoke all on function public.submit_business_for_review(uuid) from public;
grant execute on function public.submit_business_for_review(uuid) to authenticated;

commit;
