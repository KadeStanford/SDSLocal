begin;

-- All client creation RPC versions insert here. Hold the billing-account lock
-- through the owner-membership insert so concurrent creations cannot overbook.
create or replace function public.guard_business_creation_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  billing_enabled boolean;
  account_id uuid;
  active_limit integer;
  used_slots integer;
begin
  -- Trusted SQL/Admin fixtures do not impersonate a client purchase.
  if auth.uid() is null or auth.role() = 'service_role' then return new; end if;
  if new.created_by is distinct from auth.uid() then
    raise exception 'Create a business only for your own account' using errcode = '42501';
  end if;
  select coalesce((value->>'enabled')::boolean, false) into billing_enabled
  from public.platform_settings where key = 'business_listing_billing';
  if not coalesce(billing_enabled, false) then return new; end if;

  select id into account_id from public.billing_accounts
  where owner_id = auth.uid() for update;
  select plan.listing_limit into active_limit
  from public.listing_entitlements entitlement
  join public.billing_plans plan on plan.code = entitlement.plan_code and plan.is_active
  where entitlement.billing_account_id = account_id
    and public.billing_entitlement_is_active(entitlement.status, entitlement.current_period_end);
  if active_limit is null then
    raise exception 'An active business subscription is required before creating a business'
      using errcode = 'P0001';
  end if;
  select count(*) into used_slots from public.business_listing_assignments
  where billing_account_id = account_id;
  if used_slots >= active_limit then
    raise exception 'Your business subscription has no available business slots'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger business_creation_subscription_guard
before insert on public.businesses
for each row execute function public.guard_business_creation_subscription();

create or replace function public.assign_created_business_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  billing_enabled boolean;
begin
  if auth.uid() is null or auth.role() = 'service_role' then return new; end if;
  select coalesce((value->>'enabled')::boolean, false) into billing_enabled
  from public.platform_settings where key = 'business_listing_billing';
  if coalesce(billing_enabled, false) and new.role = 'owner' and new.is_active
     and new.user_id = auth.uid() and exists (
       select 1 from public.businesses
       where id = new.business_id and created_by = new.user_id and status = 'draft'
     ) then
    perform public.assign_my_business_listing(new.business_id);
  end if;
  return new;
end;
$$;

create trigger created_business_subscription_assignment
after insert on public.business_members
for each row execute function public.assign_created_business_subscription();

-- Creation must atomically add the initial owner and consume a slot through the
-- existing RPCs. Direct inserts would leave unowned drafts and evade allocation.
revoke insert on table public.businesses from anon, authenticated;
revoke all on function public.guard_business_creation_subscription() from public, anon, authenticated;
revoke all on function public.assign_created_business_subscription() from public, anon, authenticated;

update public.platform_settings
set description = 'Requires a verified store subscription and available slot before business creation and publication.'
where key = 'business_listing_billing';

commit;
