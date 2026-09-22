begin;

-- Stripe Connect pickup ordering shares the existing server-authoritative order
-- state machine. The table names remain square_* for backwards compatibility
-- with the first provider implementation; provider identifies the payment rail.
alter table public.square_connections
  drop constraint if exists square_connections_provider_check;
alter table public.square_connections
  add constraint square_connections_provider_check
  check (provider in ('square', 'stripe'));

alter table public.square_ordering_settings
  add column if not exists provider text not null default 'square';
alter table public.square_ordering_settings
  add constraint square_ordering_settings_provider_check
  check (provider in ('square', 'stripe'));

alter table public.square_orders
  add column if not exists provider text not null default 'square';
alter table public.square_orders
  add constraint square_orders_provider_check
  check (provider in ('square', 'stripe'));
create index if not exists square_orders_provider_idx
  on public.square_orders (provider, business_id, status, created_at desc);

create table public.stripe_account_states (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  account_id text not null unique check (account_id ~ '^acct_[A-Za-z0-9]+$'),
  state text not null default 'pending'
    check (state in ('pending','connected','revoked','error')),
  details_submitted boolean not null default false,
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  last_error text,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.stripe_account_states enable row level security;
revoke all on public.stripe_account_states from public, anon, authenticated;
grant all on public.stripe_account_states to service_role;

create table public.stripe_onboarding_states (
  state_hash text primary key check (length(state_hash) = 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  account_id text not null check (account_id ~ '^acct_[A-Za-z0-9]+$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.stripe_onboarding_states enable row level security;
revoke all on public.stripe_onboarding_states from public, anon, authenticated;
grant all on public.stripe_onboarding_states to service_role;

create or replace function public.stripe_consume_onboarding_state(p_hash text)
returns setof public.stripe_onboarding_states
language sql security definer set search_path = '' as $$
  update public.stripe_onboarding_states s
     set consumed_at = now()
   where s.state_hash = p_hash
     and s.consumed_at is null
     and s.expires_at > now()
     and exists (
       select 1 from public.business_members m
        where m.business_id = s.business_id
          and m.user_id = s.user_id
          and m.role = 'owner'
          and m.is_active
     )
  returning s.*;
$$;
revoke all on function public.stripe_consume_onboarding_state(text) from public, anon, authenticated;
grant execute on function public.stripe_consume_onboarding_state(text) to service_role;

-- Public discovery is provider-neutral. The allowlist remains the existing
-- staging guard until Stripe production rollout is explicitly enabled.
create or replace function public.get_pickup_capabilities(p_business_ids uuid[] default null)
returns table (business_id uuid, supports_pickup_ordering boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_business_ids is not null and cardinality(p_business_ids) > 500 then
    raise exception 'Request at most 500 businesses at a time';
  end if;
  return query
    select b.id, true
      from public.businesses b
      join public.square_connections c on c.business_id = b.id
      join public.square_ordering_settings s on s.business_id = b.id
      join public.platform_settings flag on flag.key = 'square_commerce'
     where b.status = 'active'
       and (p_business_ids is null or b.id = any(p_business_ids))
       and flag.value->'enabled' = 'true'::jsonb
       and flag.value->>'public_environment' in ('development','staging')
       and (flag.value->'business_ids') ? b.id::text
       and c.environment = 'sandbox'
       and c.state = 'connected'
       and c.location_id is not null
       and s.enabled
       and s.synced_at is not null
       and case when jsonb_typeof(s.sync_summary->'variations') = 'number'
         then (s.sync_summary->>'variations')::numeric > 0 else false end
       and not exists (
         select 1 from public.blocked_businesses blocked
          where blocked.business_id = b.id
            and blocked.customer_id = (select auth.uid())
       )
     order by b.id
     limit 1000;
end;
$$;
revoke all on function public.get_pickup_capabilities(uuid[]) from public;
grant execute on function public.get_pickup_capabilities(uuid[]) to anon, authenticated, service_role;

insert into public.platform_settings(key, value, description)
values (
  'stripe_commerce',
  '{"enabled":false,"business_ids":[],"environment":"test"}'::jsonb,
  'Stripe Connect test-mode pickup pilot; allowlisted businesses only.'
)
on conflict (key) do nothing;

commit;
notify pgrst, 'reload schema';
