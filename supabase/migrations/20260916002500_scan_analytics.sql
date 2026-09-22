-- Keep scanner operations fast while giving business teams a trustworthy
-- history of what happened and where the flow needs attention. Raw QR values
-- are intentionally never persisted.
begin;

create type public.loyalty_scan_outcome as enum (
  'success',
  'invalid_code',
  'expired_code',
  'wrong_business',
  'duplicate',
  'no_reward',
  'invalid_amount',
  'permission_denied',
  'processing_error'
);

create table public.loyalty_scan_attempts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  membership_id uuid references public.loyalty_memberships (id) on delete set null,
  transaction_id uuid references public.loyalty_transactions (id) on delete set null,
  action varchar(24) not null,
  scan_source varchar(12) not null default 'camera',
  outcome public.loyalty_scan_outcome not null,
  points_amount integer not null default 0,
  spend_minor integer,
  created_at timestamptz not null default now(),
  constraint loyalty_scan_attempts_action check (action in ('stamp', 'earn_points', 'redemption')),
  constraint loyalty_scan_attempts_source check (scan_source in ('camera', 'manual')),
  constraint loyalty_scan_attempts_points check (points_amount >= 0),
  constraint loyalty_scan_attempts_spend check (spend_minor is null or spend_minor > 0)
);

create index loyalty_scan_attempts_business_date_idx
  on public.loyalty_scan_attempts (business_id, created_at desc);
create index loyalty_scan_attempts_actor_date_idx
  on public.loyalty_scan_attempts (actor_id, created_at desc);

alter table public.loyalty_scan_attempts enable row level security;

create policy loyalty_scan_attempts_member_read
on public.loyalty_scan_attempts for select to authenticated
using (public.is_business_member(business_id, (select auth.uid())));

create or replace function public.list_business_scan_log(
  p_business_id uuid,
  p_from timestamptz default now() - interval '24 hours',
  p_to timestamptz default now(),
  p_limit integer default 50
)
returns table (
  scan_id uuid,
  action varchar,
  scan_source varchar,
  outcome public.loyalty_scan_outcome,
  actor_name varchar,
  customer_name varchar,
  transaction_id uuid,
  points_amount integer,
  spend_minor integer,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_business_member(p_business_id, (select auth.uid())) then
    raise exception 'Business staff access required' using errcode = '42501';
  end if;
  return query
  select
    attempt.id,
    attempt.action,
    attempt.scan_source,
    attempt.outcome,
    coalesce(actor.display_name, 'Staff')::varchar,
    coalesce(customer.display_name, 'Customer')::varchar,
    attempt.transaction_id,
    attempt.points_amount,
    attempt.spend_minor,
    attempt.created_at
  from public.loyalty_scan_attempts attempt
  left join public.profiles actor on actor.id = attempt.actor_id
  left join public.loyalty_memberships membership on membership.id = attempt.membership_id
    and membership.business_id = attempt.business_id
  left join public.profiles customer on customer.id = membership.customer_id
  where attempt.business_id = p_business_id
    and attempt.created_at >= coalesce(p_from, now() - interval '24 hours')
    and attempt.created_at <= coalesce(p_to, now())
  order by attempt.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke all on function public.list_business_scan_log(uuid, timestamptz, timestamptz, integer) from public;
grant execute on function public.list_business_scan_log(uuid, timestamptz, timestamptz, integer) to authenticated;

create or replace function public.get_business_scan_stats(
  p_business_id uuid,
  p_from timestamptz default date_trunc('day', now()),
  p_to timestamptz default now()
)
returns table (
  total_scans bigint,
  completed_scans bigint,
  failed_scans bigint,
  duplicate_scans bigint,
  wrong_business_scans bigint,
  visits_added bigint,
  points_issued bigint,
  rewards_redeemed bigint,
  unique_customers bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_business_member(p_business_id, (select auth.uid())) then
    raise exception 'Business staff access required' using errcode = '42501';
  end if;
  return query
  select
    count(*)::bigint,
    count(*) filter (where attempt.outcome = 'success')::bigint,
    count(*) filter (where attempt.outcome <> 'success')::bigint,
    count(*) filter (where attempt.outcome = 'duplicate')::bigint,
    count(*) filter (where attempt.outcome = 'wrong_business')::bigint,
    count(*) filter (where attempt.outcome = 'success' and attempt.action = 'stamp')::bigint,
    coalesce(sum(attempt.points_amount) filter (
      where attempt.outcome = 'success' and attempt.action = 'earn_points'
    ), 0)::bigint,
    count(*) filter (where attempt.outcome = 'success' and attempt.action = 'redemption')::bigint,
    count(distinct attempt.membership_id) filter (where attempt.outcome = 'success')::bigint
  from public.loyalty_scan_attempts attempt
  where attempt.business_id = p_business_id
    and attempt.created_at >= coalesce(p_from, date_trunc('day', now()))
    and attempt.created_at <= coalesce(p_to, now());
end;
$$;

revoke all on function public.get_business_scan_stats(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_business_scan_stats(uuid, timestamptz, timestamptz) to authenticated;

commit;
