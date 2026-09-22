begin;

-- Listing billing belongs to a person, not to a business membership. This lets
-- one owner pay for multiple businesses without giving staff billing access.
create table public.billing_plans (
  code varchar(32) primary key,
  name varchar(80) not null,
  listing_limit smallint not null check (listing_limit between 1 and 100),
  display_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_products (
  provider varchar(24) not null check (provider in ('apple', 'google', 'test_store')),
  product_id varchar(255) not null,
  plan_code varchar(32) not null references public.billing_plans (code) on delete restrict,
  billing_period varchar(16) not null check (billing_period in ('monthly', 'yearly')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (provider, product_id)
);

create table public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.listing_entitlements (
  billing_account_id uuid primary key references public.billing_accounts (id) on delete cascade,
  provider varchar(24) not null check (provider in ('apple', 'google', 'test_store')),
  product_id varchar(255) not null,
  plan_code varchar(32) not null references public.billing_plans (code) on delete restrict,
  status varchar(24) not null check (
    status in ('active', 'grace_period', 'billing_retry', 'paused', 'expired', 'revoked')
  ),
  environment varchar(16) not null check (environment in ('sandbox', 'production')),
  original_transaction_id varchar(255),
  purchased_at timestamptz,
  current_period_end timestamptz,
  will_renew boolean not null default true,
  last_provider_event_id varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, original_transaction_id)
);

create table public.business_listing_assignments (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  billing_account_id uuid not null references public.billing_accounts (id) on delete cascade,
  assigned_by uuid not null references public.profiles (id) on delete restrict,
  assigned_at timestamptz not null default now()
);

create table public.billing_webhook_events (
  provider_event_id varchar(255) primary key,
  event_type varchar(80) not null,
  app_user_id uuid,
  environment varchar(16),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error varchar(500)
);

insert into public.billing_plans (code, name, listing_limit, display_order)
values
  ('single', 'Single', 1, 10),
  ('multi', 'Multi', 3, 20);

insert into public.platform_settings (key, value, description)
values (
  'business_listing_billing',
  '{"enabled":false}'::jsonb,
  'Requires an active store entitlement when an owner submits a business for publication.'
)
on conflict (key) do nothing;

-- Keep the identifiers provider-neutral so the same catalog can be mirrored
-- in App Store Connect, Play Console and RevenueCat.
insert into public.billing_products (provider, product_id, plan_code, billing_period)
select 'apple', product_id, plan_code, billing_period
from (
  values
    ('listing_single_monthly_v1', 'single', 'monthly'),
    ('listing_single_yearly_v1', 'single', 'yearly'),
    ('listing_multi_monthly_v1', 'multi', 'monthly'),
    ('listing_multi_yearly_v1', 'multi', 'yearly')
) as product(product_id, plan_code, billing_period);

insert into public.billing_products (provider, product_id, plan_code, billing_period)
values
  ('google', 'listing_single_v1:monthly', 'single', 'monthly'),
  ('google', 'listing_single_v1:yearly', 'single', 'yearly'),
  ('google', 'listing_multi_v1:monthly', 'multi', 'monthly'),
  ('google', 'listing_multi_v1:yearly', 'multi', 'yearly'),
  ('test_store', 'listing_single_monthly_v1', 'single', 'monthly'),
  ('test_store', 'listing_single_yearly_v1', 'single', 'yearly'),
  ('test_store', 'listing_multi_monthly_v1', 'multi', 'monthly'),
  ('test_store', 'listing_multi_yearly_v1', 'multi', 'yearly');

alter table public.businesses
  add column billing_suspension_previous_status public.business_status,
  add column suspension_reason varchar(32),
  add constraint businesses_suspension_reason_check
    check (suspension_reason is null or suspension_reason in ('billing', 'moderation'));

create index business_listing_assignments_account_idx
  on public.business_listing_assignments (billing_account_id, assigned_at);
create index billing_webhook_events_unprocessed_idx
  on public.billing_webhook_events (received_at)
  where processed_at is null;

alter table public.billing_plans enable row level security;
alter table public.billing_products enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.listing_entitlements enable row level security;
alter table public.business_listing_assignments enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy billing_plans_authenticated_read on public.billing_plans
  for select to authenticated using (is_active);
create policy billing_products_authenticated_read on public.billing_products
  for select to authenticated using (is_active);
create policy billing_accounts_owner_read on public.billing_accounts
  for select to authenticated using (owner_id = (select auth.uid()));
create policy listing_entitlements_owner_read on public.listing_entitlements
  for select to authenticated using (
    exists (
      select 1 from public.billing_accounts account
      where account.id = billing_account_id and account.owner_id = (select auth.uid())
    )
  );
create policy business_listing_assignments_owner_read on public.business_listing_assignments
  for select to authenticated using (
    exists (
      select 1 from public.billing_accounts account
      where account.id = billing_account_id and account.owner_id = (select auth.uid())
    )
    or public.is_business_owner(business_id, (select auth.uid()))
  );

create or replace function public.billing_entitlement_is_active(
  p_status text,
  p_current_period_end timestamptz
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_status in ('active', 'grace_period', 'billing_retry')
    and (p_current_period_end is null or p_current_period_end > now());
$$;

revoke all on function public.billing_entitlement_is_active(text, timestamptz) from public;
grant execute on function public.billing_entitlement_is_active(text, timestamptz)
  to authenticated, service_role;

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
  assigned_business_ids jsonb := '[]'::jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into target_account
  from public.billing_accounts
  where owner_id = (select auth.uid());

  if target_account.id is null then
    return jsonb_build_object(
      'planCode', null,
      'billingEnabled', coalesce((
        select (value ->> 'enabled')::boolean
        from public.platform_settings where key = 'business_listing_billing'
      ), false),
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
    'planCode', target_entitlement.plan_code,
    'billingEnabled', coalesce((
      select (value ->> 'enabled')::boolean
      from public.platform_settings where key = 'business_listing_billing'
    ), false),
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

revoke all on function public.get_my_listing_billing() from public;
grant execute on function public.get_my_listing_billing() to authenticated;

create or replace function public.assign_my_business_listing(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_account public.billing_accounts%rowtype;
  target_entitlement public.listing_entitlements%rowtype;
  listing_limit_value integer;
  used_listings integer;
  existing_account_id uuid;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Only an owner can assign a listing plan' using errcode = '42501';
  end if;

  select billing_account_id into existing_account_id
  from public.business_listing_assignments
  where business_id = p_business_id;

  if existing_account_id is not null then
    if exists (
      select 1 from public.billing_accounts
      where id = existing_account_id and owner_id = (select auth.uid())
    ) then
      return public.get_my_listing_billing();
    end if;
    raise exception 'This business is assigned to another owner billing account'
      using errcode = '23505';
  end if;

  select * into target_account
  from public.billing_accounts
  where owner_id = (select auth.uid())
  for update;

  if target_account.id is null then
    raise exception 'Choose a listing plan before publishing' using errcode = 'P0001';
  end if;

  select * into target_entitlement
  from public.listing_entitlements
  where billing_account_id = target_account.id;

  if target_entitlement.billing_account_id is null
     or not public.billing_entitlement_is_active(
       target_entitlement.status,
       target_entitlement.current_period_end
     ) then
    raise exception 'An active listing plan is required to publish' using errcode = 'P0001';
  end if;

  select listing_limit into listing_limit_value
  from public.billing_plans
  where code = target_entitlement.plan_code and is_active;

  select count(*)::integer into used_listings
  from public.business_listing_assignments
  where billing_account_id = target_account.id;

  if used_listings >= coalesce(listing_limit_value, 0) then
    raise exception 'Your listing plan has no open business slots' using errcode = 'P0001';
  end if;

  insert into public.business_listing_assignments (business_id, billing_account_id, assigned_by)
  values (p_business_id, target_account.id, (select auth.uid()));

  return public.get_my_listing_billing();
end;
$$;

revoke all on function public.assign_my_business_listing(uuid) from public;
grant execute on function public.assign_my_business_listing(uuid) to authenticated;

create or replace function public.apply_listing_subscription_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_provider text,
  p_product_id text,
  p_status text,
  p_environment text,
  p_original_transaction_id text,
  p_purchased_at timestamptz,
  p_current_period_end timestamptz,
  p_will_renew boolean,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_account_id uuid;
  mapped_plan_code text;
  existing_processed_at timestamptz;
  access_active boolean;
begin
  if p_provider not in ('apple', 'google', 'test_store')
     or p_status not in ('active', 'grace_period', 'billing_retry', 'paused', 'expired', 'revoked')
     or p_environment not in ('sandbox', 'production') then
    raise exception 'Invalid subscription event values' using errcode = '22023';
  end if;

  insert into public.billing_webhook_events (
    provider_event_id, event_type, app_user_id, environment, payload
  ) values (
    p_event_id, p_event_type, p_user_id, p_environment, p_payload
  )
  on conflict (provider_event_id) do nothing;

  select processed_at into existing_processed_at
  from public.billing_webhook_events
  where provider_event_id = p_event_id
  for update;

  if existing_processed_at is not null then
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    update public.billing_webhook_events
    set
      processed_at = now(),
      processing_error = 'Ignored because the SDS Local account no longer exists'
    where provider_event_id = p_event_id;
    return jsonb_build_object('processed', true, 'ignored', 'deleted_user');
  end if;

  select plan_code into mapped_plan_code
  from public.billing_products
  where provider = p_provider and product_id = p_product_id and is_active;

  if mapped_plan_code is null then
    update public.billing_webhook_events
    set processing_error = 'Unrecognized product identifier'
    where provider_event_id = p_event_id;
    return jsonb_build_object('processed', false, 'reason', 'unrecognized_product');
  end if;

  insert into public.billing_accounts (owner_id)
  values (p_user_id)
  on conflict (owner_id) do update set updated_at = now()
  returning id into target_account_id;

  insert into public.listing_entitlements (
    billing_account_id,
    provider,
    product_id,
    plan_code,
    status,
    environment,
    original_transaction_id,
    purchased_at,
    current_period_end,
    will_renew,
    last_provider_event_id
  ) values (
    target_account_id,
    p_provider,
    p_product_id,
    mapped_plan_code,
    p_status,
    p_environment,
    nullif(p_original_transaction_id, ''),
    p_purchased_at,
    p_current_period_end,
    p_will_renew,
    p_event_id
  )
  on conflict (billing_account_id) do update set
    provider = excluded.provider,
    product_id = excluded.product_id,
    plan_code = excluded.plan_code,
    status = excluded.status,
    environment = excluded.environment,
    original_transaction_id = excluded.original_transaction_id,
    purchased_at = coalesce(excluded.purchased_at, public.listing_entitlements.purchased_at),
    current_period_end = excluded.current_period_end,
    will_renew = excluded.will_renew,
    last_provider_event_id = excluded.last_provider_event_id,
    updated_at = now();

  access_active := public.billing_entitlement_is_active(p_status, p_current_period_end);

  if access_active then
    update public.businesses business
    set
      status = case
        when business.billing_suspension_previous_status = 'active'
             and business.approved_at is not null then 'active'::public.business_status
        when business.billing_suspension_previous_status = 'pending_review'
          then 'pending_review'::public.business_status
        else 'draft'::public.business_status
      end,
      suspended_at = null,
      suspension_reason = null,
      billing_suspension_previous_status = null
    from public.business_listing_assignments assignment
    where assignment.billing_account_id = target_account_id
      and assignment.business_id = business.id
      and business.status = 'suspended'
      and business.suspension_reason = 'billing';
  else
    update public.businesses business
    set
      billing_suspension_previous_status = business.status,
      status = 'suspended',
      suspended_at = now(),
      suspension_reason = 'billing'
    from public.business_listing_assignments assignment
    where assignment.billing_account_id = target_account_id
      and assignment.business_id = business.id
      and business.status in ('active', 'pending_review')
      and business.suspension_reason is null;
  end if;

  update public.billing_webhook_events
  set processed_at = now(), processing_error = null
  where provider_event_id = p_event_id;

  return jsonb_build_object('processed', true, 'duplicate', false);
exception when others then
  update public.billing_webhook_events
  set processing_error = left(sqlerrm, 500)
  where provider_event_id = p_event_id;
  raise;
end;
$$;

revoke all on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) from public;
grant execute on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) to service_role;

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

revoke all on function public.submit_business_for_review(uuid) from public;
grant execute on function public.submit_business_for_review(uuid) to authenticated;

grant select on table public.billing_plans, public.billing_products to authenticated;
grant select on table public.billing_accounts, public.listing_entitlements,
  public.business_listing_assignments to authenticated;
grant all on table public.billing_accounts, public.listing_entitlements,
  public.business_listing_assignments, public.billing_webhook_events to service_role;

commit;
