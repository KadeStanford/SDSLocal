-- Mobile businesses (food trucks, pop-ups, traveling services) are first-class
-- businesses. Their recurring service area can remain broad while individual
-- stops provide the precise place customers should visit.
begin;

insert into public.categories (slug, name, business_type, display_order)
values
  ('food-trucks', 'Food trucks', 'mobile', 110),
  ('mobile-food', 'Mobile food & drink', 'mobile', 111),
  ('catering', 'Catering', 'mobile', 112),
  ('pop-up-dining', 'Pop-up dining', 'mobile', 113),
  ('farmers-markets', 'Farmers markets', 'mobile', 114),
  ('pop-up-retail', 'Pop-up retail', 'mobile', 115),
  ('mobile-services', 'Mobile services', 'mobile', 116),
  ('mobile-beauty', 'Mobile beauty & wellness', 'mobile', 117),
  ('mobile-auto', 'Mobile auto care', 'mobile', 118),
  ('fitness-wellness', 'Fitness & wellness', 'services', 119),
  ('professional-consulting', 'Professional consulting', 'services', 120),
  ('home-improvement', 'Home improvement', 'services', 121),
  ('clothing-accessories', 'Clothing & accessories', 'retail', 122),
  ('gifts-specialty', 'Gifts & specialty goods', 'retail', 123),
  ('nightlife', 'Nightlife', 'entertainment_venue', 124),
  ('family-activities', 'Family activities', 'entertainment_venue', 125),
  ('sports-recreation', 'Sports & recreation', 'entertainment_venue', 126),
  ('community-organizations', 'Community organizations', 'general', 127),
  ('markets-fairs', 'Markets & fairs', 'general', 128)
on conflict (slug) do update
set name = excluded.name,
    business_type = excluded.business_type,
    display_order = excluded.display_order,
    is_active = true;

create table public.business_location_stops (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  title varchar(120) not null default 'Scheduled stop',
  address_text varchar(320),
  latitude double precision not null,
  longitude double precision not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone varchar(64) not null default 'America/Chicago',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_location_stops_title_length check (char_length(title) between 2 and 120),
  constraint business_location_stops_latitude check (latitude between -90 and 90),
  constraint business_location_stops_longitude check (longitude between -180 and 180),
  constraint business_location_stops_time_order check (ends_at > starts_at)
);

create index business_location_stops_schedule_idx
  on public.business_location_stops (business_id, starts_at);

create trigger business_location_stops_set_updated_at
before update on public.business_location_stops
for each row execute function public.set_updated_at();

alter table public.business_location_stops enable row level security;

create policy business_location_stops_public_read
on public.business_location_stops for select to anon, authenticated
using (
  is_published
  and exists (
    select 1 from public.businesses business
    where business.id = business_id and business.status = 'active'
  )
);

create policy business_location_stops_owner_all
on public.business_location_stops for all to authenticated
using (public.is_business_owner(business_id, (select auth.uid())))
with check (public.is_business_owner(business_id, (select auth.uid())));

create or replace function public.get_business_location_stops(
  p_business_id uuid,
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '90 days'
)
returns table (
  id uuid,
  title varchar,
  address_text varchar,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone varchar
)
language sql
stable
security definer
set search_path = ''
as $$
  select stop.id, stop.title, stop.address_text, stop.latitude, stop.longitude,
    stop.starts_at, stop.ends_at, stop.timezone
  from public.business_location_stops stop
  join public.businesses business on business.id = stop.business_id
  where stop.business_id = p_business_id
    and stop.is_published
    and business.status = 'active'
    and stop.ends_at >= coalesce(p_from, now())
    and stop.starts_at <= coalesce(p_to, now() + interval '90 days')
  order by stop.starts_at;
$$;

revoke all on function public.get_business_location_stops(uuid, timestamptz, timestamptz) from public;
grant execute on function public.get_business_location_stops(uuid, timestamptz, timestamptz) to anon, authenticated;

-- A points program keeps the existing visits program intact while allowing a
-- business to define points earned per dollar and the points needed to redeem.
create type public.loyalty_program_type as enum ('visits', 'points');

alter table public.loyalty_programs
  add column program_type public.loyalty_program_type not null default 'visits',
  add column points_per_dollar numeric(10, 2),
  add column points_required integer;

alter table public.loyalty_programs
  add constraint loyalty_points_configuration check (
    (program_type = 'visits' and points_per_dollar is null and points_required is null)
    or (program_type = 'points'
      and points_per_dollar is not null and points_per_dollar > 0 and points_per_dollar <= 1000
      and points_required is not null and points_required between 1 and 1000000)
  );

alter table public.loyalty_transactions
  add column points_amount integer not null default 0,
  add column spend_minor integer;

alter table public.loyalty_transactions
  drop constraint if exists loyalty_transaction_action_amount;

alter table public.loyalty_transactions
  add constraint loyalty_transaction_action_amount check (
    (transaction_type = 'stamp' and amount = 1 and points_amount = 0 and spend_minor is null)
    or (transaction_type = 'redemption' and amount = 1 and points_amount >= 0 and spend_minor is null)
    or (transaction_type = 'points_earned' and amount = 1 and points_amount > 0 and spend_minor > 0)
    or (transaction_type = 'reversal' and points_amount = 0 and spend_minor is null)
  );

create index loyalty_transactions_points_idx
  on public.loyalty_transactions (membership_id, transaction_type, created_at);

create or replace function public.get_loyalty_wallet_v2()
returns table (
  membership_id uuid,
  program_id uuid,
  business_id uuid,
  business_name varchar,
  business_slug varchar,
  primary_color char,
  program_name varchar,
  reward_description varchar,
  terms varchar,
  joined_at timestamptz,
  program_type public.loyalty_program_type,
  points_per_dollar numeric,
  points_required integer,
  earned_points integer,
  redeemed_points integer,
  available_points integer,
  rewards_ready integer,
  progress_points integer,
  earned_stamps integer,
  available_stamps integer,
  progress_stamps integer,
  stamps_required integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select m.id as membership_id, m.program_id, m.business_id, m.joined_at,
      p.program_type, p.points_per_dollar, p.points_required, p.stamps_required,
      b.name as business_name, b.slug as business_slug, b.primary_color,
      p.name as program_name, p.reward_description, p.terms,
      coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0)::integer as earned_points,
      coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0)::integer as redeemed_points,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'stamp'), 0)::integer as earned_stamps,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'reversal'), 0)::integer as reversed_stamps,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'redemption' and p.program_type = 'visits'), 0)::integer as redeemed_rewards
    from public.loyalty_memberships m
    join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
    join public.businesses b on b.id = m.business_id
    left join public.loyalty_transactions t on t.membership_id = m.id
    where m.customer_id = (select auth.uid()) and m.is_active and p.is_active and b.status = 'active'
    group by m.id, m.program_id, m.business_id, m.joined_at, p.program_type,
      p.points_per_dollar, p.points_required, p.stamps_required, b.name, b.slug,
      b.primary_color, p.name, p.reward_description, p.terms
  ), balances as (
    select *,
      greatest(earned_points - redeemed_points, 0)::integer as points_available,
      greatest(earned_stamps - reversed_stamps - (redeemed_rewards * stamps_required), 0)::integer as stamps_available
    from totals
  )
  select membership_id, program_id, business_id, business_name, business_slug, primary_color,
    program_name, reward_description, terms, joined_at, program_type, points_per_dollar,
    points_required, earned_points, redeemed_points, points_available,
    case when program_type = 'points' then floor(points_available::numeric / points_required)::integer else 0 end,
    case when program_type = 'points' then mod(points_available, points_required)::integer else 0 end,
    earned_stamps, stamps_available,
    case when program_type = 'visits' then mod(stamps_available, stamps_required)::integer else 0 end,
    stamps_required
  from balances
  order by joined_at desc;
$$;

revoke all on function public.get_loyalty_wallet_v2() from public;
grant execute on function public.get_loyalty_wallet_v2() to authenticated;

create or replace function public.list_business_loyalty_members_v2(p_business_id uuid)
returns table (
  membership_id uuid,
  customer_name varchar,
  joined_at timestamptz,
  program_type public.loyalty_program_type,
  rewards_ready integer,
  progress_stamps integer,
  stamps_required integer,
  available_points integer,
  progress_points integer,
  points_required integer
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
  select m.id,
    coalesce(profile.display_name, 'Customer')::varchar,
    m.joined_at,
    p.program_type,
    case when p.program_type = 'points' then floor(points.available_points::numeric / p.points_required)::integer else floor(stamps.available_stamps::numeric / p.stamps_required)::integer end,
    case when p.program_type = 'visits' then mod(stamps.available_stamps, p.stamps_required)::integer else 0 end,
    p.stamps_required::integer,
    points.available_points,
    case when p.program_type = 'points' then mod(points.available_points, p.points_required)::integer else 0 end,
    p.points_required
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.profiles profile on profile.id = m.customer_id
  cross join lateral (
    select greatest(coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0) - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0), 0)::integer as available_points
    from public.loyalty_transactions t where t.membership_id = m.id
  ) points
  cross join lateral (
    select greatest(coalesce(sum(t.amount) filter (where t.transaction_type = 'stamp'), 0) - coalesce(sum(t.amount) filter (where t.transaction_type = 'reversal'), 0) - (coalesce(sum(t.amount) filter (where t.transaction_type = 'redemption' and p.program_type = 'visits'), 0) * p.stamps_required), 0)::integer as available_stamps
    from public.loyalty_transactions t where t.membership_id = m.id
  ) stamps
  where m.business_id = p_business_id and m.is_active
  order by m.joined_at desc;
end;
$$;

revoke all on function public.list_business_loyalty_members_v2(uuid) from public;
grant execute on function public.list_business_loyalty_members_v2(uuid) to authenticated;

create or replace function public.process_loyalty_points_earn(
  p_actor_id uuid,
  p_membership_id uuid,
  p_token_id uuid,
  p_spend_minor integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  points_per_dollar numeric;
  points_awarded integer;
  result_id uuid;
  available_points integer;
  points_required integer;
begin
  if p_token_id is null or p_idempotency_key is null or p_spend_minor is null or p_spend_minor <= 0 then
    raise exception 'Enter a purchase amount greater than zero' using errcode = '22023';
  end if;
  select m.business_id, p.points_per_dollar, p.points_required
    into target_business_id, points_per_dollar, points_required
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.businesses b on b.id = m.business_id
  where m.id = p_membership_id and m.is_active and p.is_active and p.program_type = 'points' and b.status = 'active'
  for update of m;
  if target_business_id is null then raise exception 'This is not an active points rewards program' using errcode = '22023'; end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = target_business_id and member.user_id = p_actor_id
      and member.is_active and member.role in ('owner', 'staff')
  ) then raise exception 'Business staff access required' using errcode = '42501'; end if;
  if exists (select 1 from public.loyalty_transactions where token_id = p_token_id) then
    raise exception 'This loyalty code has already been used. Ask the customer to refresh it.' using errcode = '23505';
  end if;
  points_awarded := floor((p_spend_minor::numeric / 100) * points_per_dollar)::integer;
  if points_awarded < 1 then raise exception 'This purchase is too small to earn a point' using errcode = '22023'; end if;
  insert into public.loyalty_transactions (membership_id, business_id, transaction_type, amount, points_amount, spend_minor, actor_id, idempotency_key, token_id)
    values (p_membership_id, target_business_id, 'points_earned', 1, points_awarded, p_spend_minor, p_actor_id, p_idempotency_key, p_token_id)
    returning id into result_id;
  select greatest(coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0)
    - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0), 0)::integer
    into available_points from public.loyalty_transactions t where t.membership_id = p_membership_id;
  return jsonb_build_object('transactionId', result_id, 'action', 'earn_points', 'pointsAwarded', points_awarded,
    'availablePoints', available_points, 'pointsRequired', points_required,
    'rewardsReady', floor(available_points::numeric / points_required)::integer,
    'progressPoints', mod(available_points, points_required)::integer);
end;
$$;

revoke all on function public.process_loyalty_points_earn(uuid, uuid, uuid, integer, uuid) from public;
grant execute on function public.process_loyalty_points_earn(uuid, uuid, uuid, integer, uuid) to service_role;

-- Extend the existing secure action to redeem points programs while retaining
-- the original five-argument API used by visit programs.
create or replace function public.process_loyalty_action(
  p_actor_id uuid,
  p_membership_id uuid,
  p_token_id uuid,
  p_action text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  target_program_type public.loyalty_program_type;
  target_customer_id uuid;
  required_stamps integer;
  points_required integer;
  balance_record record;
  available_points integer;
  result_id uuid;
begin
  if p_action not in ('stamp', 'redemption') then raise exception 'Unsupported loyalty action' using errcode = '22023'; end if;
  if p_token_id is null or p_idempotency_key is null then raise exception 'A secure token and idempotency key are required' using errcode = '22023'; end if;
  select m.business_id, m.customer_id, p.program_type, p.stamps_required, p.points_required
    into target_business_id, target_customer_id, target_program_type, required_stamps, points_required
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.businesses b on b.id = m.business_id
  where m.id = p_membership_id and m.is_active and p.is_active and b.status = 'active'
  for update of m;
  if target_business_id is null then raise exception 'This rewards membership is not active' using errcode = '22023'; end if;
  if not exists (select 1 from public.business_members member where member.business_id = target_business_id and member.user_id = p_actor_id and member.is_active and member.role in ('owner', 'staff')) then raise exception 'Business staff access required' using errcode = '42501'; end if;
  if exists (select 1 from public.loyalty_transactions where token_id = p_token_id) then raise exception 'This loyalty code has already been used. Ask the customer to refresh it.' using errcode = '23505'; end if;
  if target_program_type = 'points' and p_action = 'redemption' then
    select greatest(coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0) - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0), 0)::integer
      into available_points from public.loyalty_transactions t where t.membership_id = p_membership_id;
    if available_points < points_required then raise exception 'This customer does not have enough points for a reward' using errcode = '22023'; end if;
  elsif p_action = 'redemption' then
    select * into balance_record from public.calculate_loyalty_balance(p_membership_id);
    if coalesce(balance_record.rewards_ready, 0) < 1 then raise exception 'This customer does not have a reward ready' using errcode = '22023'; end if;
  elsif p_action = 'stamp' then
    if target_program_type <> 'visits' then raise exception 'Use points earning for this rewards program' using errcode = '22023'; end if;
    if exists (select 1 from public.loyalty_transactions stamp_record where stamp_record.membership_id = p_membership_id and stamp_record.transaction_type = 'stamp' and stamp_record.created_at > now() - interval '60 seconds' and not exists (select 1 from public.loyalty_transactions reversal where reversal.reversal_of = stamp_record.id)) then
      raise exception 'A stamp was already added in the last minute' using errcode = '22023';
    end if;
  end if;
  insert into public.loyalty_transactions (membership_id, business_id, transaction_type, amount, points_amount, actor_id, idempotency_key, token_id)
    values (p_membership_id, target_business_id, p_action::public.loyalty_transaction_type, 1,
      case when target_program_type = 'points' and p_action = 'redemption' then points_required else 0 end,
      p_actor_id, p_idempotency_key, p_token_id)
    returning id into result_id;
  if target_program_type = 'points' then
    select greatest(coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0) - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0), 0)::integer into available_points from public.loyalty_transactions t where t.membership_id = p_membership_id;
    return jsonb_build_object('transactionId', result_id, 'action', p_action, 'availablePoints', available_points, 'pointsRequired', points_required, 'rewardsReady', floor(available_points::numeric / points_required)::integer, 'progressPoints', mod(available_points, points_required)::integer);
  end if;
  select * into balance_record from public.calculate_loyalty_balance(p_membership_id);
  return jsonb_build_object('transactionId', result_id, 'action', p_action, 'availableStamps', balance_record.available_stamps, 'progressStamps', balance_record.progress_stamps, 'rewardsReady', balance_record.rewards_ready, 'stampsRequired', balance_record.stamps_required);
end;
$$;

commit;
