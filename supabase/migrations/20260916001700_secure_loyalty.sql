begin;

alter table public.loyalty_transactions
  add column token_id uuid;

create unique index loyalty_transactions_token_idx
  on public.loyalty_transactions (token_id)
  where token_id is not null;

alter table public.loyalty_transactions
  add constraint loyalty_transaction_action_amount check (
    (transaction_type = 'stamp' and amount = 1)
    or (transaction_type = 'redemption' and amount = 1)
    or transaction_type = 'reversal'
  );

drop policy loyalty_memberships_customer_update on public.loyalty_memberships;

create or replace function public.calculate_loyalty_balance(p_membership_id uuid)
returns table (
  earned_stamps integer,
  reversed_stamps integer,
  redeemed_rewards integer,
  available_stamps integer,
  rewards_ready integer,
  progress_stamps integer,
  stamps_required integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      coalesce(sum(t.amount) filter (where t.transaction_type = 'stamp'), 0)::integer as earned,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'reversal'), 0)::integer as reversed,
      coalesce(sum(t.amount) filter (where t.transaction_type = 'redemption'), 0)::integer as redeemed,
      p.stamps_required::integer as required
    from public.loyalty_memberships m
    join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
    left join public.loyalty_transactions t on t.membership_id = m.id
    where m.id = p_membership_id
    group by p.stamps_required
  ), balance as (
    select *, greatest(earned - reversed - (redeemed * required), 0)::integer as available
    from totals
  )
  select
    earned,
    reversed,
    redeemed,
    available,
    floor(available::numeric / required)::integer,
    mod(available, required)::integer,
    required
  from balance;
$$;

revoke all on function public.calculate_loyalty_balance(uuid) from public;

create or replace function public.get_loyalty_wallet()
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
  earned_stamps integer,
  reversed_stamps integer,
  redeemed_rewards integer,
  available_stamps integer,
  rewards_ready integer,
  progress_stamps integer,
  stamps_required integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    p.id,
    b.id,
    b.name,
    b.slug,
    b.primary_color,
    p.name,
    p.reward_description,
    p.terms,
    m.joined_at,
    balance.earned_stamps,
    balance.reversed_stamps,
    balance.redeemed_rewards,
    balance.available_stamps,
    balance.rewards_ready,
    balance.progress_stamps,
    balance.stamps_required
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.businesses b on b.id = m.business_id
  cross join lateral public.calculate_loyalty_balance(m.id) balance
  where m.customer_id = (select auth.uid())
    and m.is_active
    and p.is_active
    and b.status = 'active'
  order by m.joined_at desc;
$$;

revoke all on function public.get_loyalty_wallet() from public;
grant execute on function public.get_loyalty_wallet() to authenticated;

create or replace function public.get_loyalty_membership(p_membership_id uuid)
returns table (
  membership_id uuid,
  customer_id uuid,
  business_id uuid,
  business_name varchar,
  business_slug varchar,
  primary_color char,
  program_id uuid,
  program_name varchar,
  reward_description varchar,
  terms varchar,
  earned_stamps integer,
  reversed_stamps integer,
  redeemed_rewards integer,
  available_stamps integer,
  rewards_ready integer,
  progress_stamps integer,
  stamps_required integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.id,
    m.customer_id,
    b.id,
    b.name,
    b.slug,
    b.primary_color,
    p.id,
    p.name,
    p.reward_description,
    p.terms,
    balance.earned_stamps,
    balance.reversed_stamps,
    balance.redeemed_rewards,
    balance.available_stamps,
    balance.rewards_ready,
    balance.progress_stamps,
    balance.stamps_required
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.businesses b on b.id = m.business_id
  cross join lateral public.calculate_loyalty_balance(m.id) balance
  where m.id = p_membership_id
    and (
      m.customer_id = (select auth.uid())
      or public.is_business_member(m.business_id, (select auth.uid()))
    );
$$;

revoke all on function public.get_loyalty_membership(uuid) from public;
grant execute on function public.get_loyalty_membership(uuid) to authenticated;

create or replace function public.join_loyalty_program(p_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  result_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;

  select p.business_id into target_business_id
  from public.loyalty_programs p
  join public.businesses b on b.id = p.business_id
  where p.id = p_program_id and p.is_active and b.status = 'active';

  if target_business_id is null then
    raise exception 'This rewards program is not available' using errcode = '22023';
  end if;

  insert into public.loyalty_memberships (program_id, business_id, customer_id, is_active)
  values (p_program_id, target_business_id, (select auth.uid()), true)
  on conflict (program_id, customer_id)
  do update set is_active = true
  returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.leave_loyalty_program(p_membership_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.loyalty_memberships
  set is_active = false
  where id = p_membership_id and customer_id = (select auth.uid());
  if not found then
    raise exception 'Rewards membership not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.join_loyalty_program(uuid) from public;
revoke all on function public.leave_loyalty_program(uuid) from public;
grant execute on function public.join_loyalty_program(uuid) to authenticated;
grant execute on function public.leave_loyalty_program(uuid) to authenticated;

create or replace function public.list_business_loyalty_members(p_business_id uuid)
returns table (
  membership_id uuid,
  customer_name varchar,
  joined_at timestamptz,
  rewards_ready integer,
  progress_stamps integer,
  stamps_required integer
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
    m.id,
    coalesce(profile.display_name, 'Customer')::varchar,
    m.joined_at,
    balance.rewards_ready,
    balance.progress_stamps,
    balance.stamps_required
  from public.loyalty_memberships m
  join public.profiles profile on profile.id = m.customer_id
  cross join lateral public.calculate_loyalty_balance(m.id) balance
  where m.business_id = p_business_id and m.is_active
  order by m.joined_at desc;
end;
$$;

revoke all on function public.list_business_loyalty_members(uuid) from public;
grant execute on function public.list_business_loyalty_members(uuid) to authenticated;

create or replace function public.list_business_loyalty_transactions(
  p_business_id uuid,
  p_limit integer default 50
)
returns table (
  transaction_id uuid,
  membership_id uuid,
  transaction_type public.loyalty_transaction_type,
  amount smallint,
  customer_name varchar,
  actor_name varchar,
  note varchar,
  created_at timestamptz,
  is_reversed boolean
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
    transaction.id,
    transaction.membership_id,
    transaction.transaction_type,
    transaction.amount,
    coalesce(customer.display_name, 'Customer')::varchar,
    coalesce(actor.display_name, 'Staff')::varchar,
    transaction.note,
    transaction.created_at,
    exists (
      select 1 from public.loyalty_transactions reversal
      where reversal.reversal_of = transaction.id
    )
  from public.loyalty_transactions transaction
  join public.loyalty_memberships membership on membership.id = transaction.membership_id
  join public.profiles customer on customer.id = membership.customer_id
  join public.profiles actor on actor.id = transaction.actor_id
  where transaction.business_id = p_business_id
  order by transaction.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
end;
$$;

revoke all on function public.list_business_loyalty_transactions(uuid, integer) from public;
grant execute on function public.list_business_loyalty_transactions(uuid, integer) to authenticated;

create or replace function public.list_business_staff(p_business_id uuid)
returns table (
  member_id uuid,
  user_id uuid,
  display_name varchar,
  role public.business_role,
  is_active boolean,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  return query
  select
    member.id,
    member.user_id,
    coalesce(profile.display_name, 'Staff member')::varchar,
    member.role,
    member.is_active,
    member.created_at
  from public.business_members member
  join public.profiles profile on profile.id = member.user_id
  where member.business_id = p_business_id and member.role = 'staff'
  order by member.is_active desc, member.created_at;
end;
$$;

revoke all on function public.list_business_staff(uuid) from public;
grant execute on function public.list_business_staff(uuid) to authenticated;

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
  target_customer_id uuid;
  required_stamps integer;
  balance_record record;
  result_id uuid;
begin
  if p_action not in ('stamp', 'redemption') then
    raise exception 'Unsupported loyalty action' using errcode = '22023';
  end if;
  if p_token_id is null or p_idempotency_key is null then
    raise exception 'A secure token and idempotency key are required' using errcode = '22023';
  end if;

  select m.business_id, m.customer_id, p.stamps_required
  into target_business_id, target_customer_id, required_stamps
  from public.loyalty_memberships m
  join public.loyalty_programs p on p.id = m.program_id and p.business_id = m.business_id
  join public.businesses b on b.id = m.business_id
  where m.id = p_membership_id and m.is_active and p.is_active and b.status = 'active'
  for update of m;

  if target_business_id is null then
    raise exception 'This rewards membership is not active' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = target_business_id
      and member.user_id = p_actor_id
      and member.is_active
      and member.role in ('owner', 'staff')
  ) then
    raise exception 'Business staff access required' using errcode = '42501';
  end if;
  if exists (select 1 from public.loyalty_transactions where token_id = p_token_id) then
    raise exception 'This loyalty code has already been used. Ask the customer to refresh it.' using errcode = '23505';
  end if;

  select * into balance_record from public.calculate_loyalty_balance(p_membership_id);

  if p_action = 'stamp' and exists (
    select 1
    from public.loyalty_transactions stamp_record
    where stamp_record.membership_id = p_membership_id
      and stamp_record.transaction_type = 'stamp'
      and stamp_record.created_at > now() - interval '60 seconds'
      and not exists (
        select 1 from public.loyalty_transactions reversal
        where reversal.reversal_of = stamp_record.id
      )
  ) then
    raise exception 'A stamp was already added in the last minute' using errcode = '22023';
  end if;

  if p_action = 'redemption' and coalesce(balance_record.rewards_ready, 0) < 1 then
    raise exception 'This customer does not have a reward ready' using errcode = '22023';
  end if;

  insert into public.loyalty_transactions (
    membership_id, business_id, transaction_type, amount, actor_id,
    idempotency_key, token_id
  ) values (
    p_membership_id,
    target_business_id,
    p_action::public.loyalty_transaction_type,
    1,
    p_actor_id,
    p_idempotency_key,
    p_token_id
  )
  returning id into result_id;

  select * into balance_record from public.calculate_loyalty_balance(p_membership_id);
  return jsonb_build_object(
    'transactionId', result_id,
    'action', p_action,
    'availableStamps', balance_record.available_stamps,
    'progressStamps', balance_record.progress_stamps,
    'rewardsReady', balance_record.rewards_ready,
    'stampsRequired', balance_record.stamps_required
  );
end;
$$;

revoke all on function public.process_loyalty_action(uuid, uuid, uuid, text, uuid) from public;
grant execute on function public.process_loyalty_action(uuid, uuid, uuid, text, uuid) to service_role;

create or replace function public.reverse_loyalty_stamp(
  p_transaction_id uuid,
  p_idempotency_key uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_record public.loyalty_transactions%rowtype;
  result_id uuid;
begin
  select * into source_record
  from public.loyalty_transactions
  where id = p_transaction_id
  for update;

  if source_record.id is null or source_record.transaction_type <> 'stamp' then
    raise exception 'Only a stamp transaction can be reversed' using errcode = '22023';
  end if;
  if not public.is_business_owner(source_record.business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  if exists (select 1 from public.loyalty_transactions where reversal_of = source_record.id) then
    raise exception 'This stamp has already been reversed' using errcode = '23505';
  end if;

  insert into public.loyalty_transactions (
    membership_id, business_id, transaction_type, amount, actor_id,
    reversal_of, idempotency_key, note
  ) values (
    source_record.membership_id,
    source_record.business_id,
    'reversal',
    source_record.amount,
    (select auth.uid()),
    source_record.id,
    p_idempotency_key,
    nullif(left(trim(coalesce(p_note, '')), 240), '')
  )
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.reverse_loyalty_stamp(uuid, uuid, text) from public;
grant execute on function public.reverse_loyalty_stamp(uuid, uuid, text) to authenticated;

create or replace function public.add_business_staff(p_business_id uuid, p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  staff_user_id uuid;
  member_id uuid;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  select id into staff_user_id from auth.users where lower(email) = lower(trim(p_email));
  if staff_user_id is null then
    raise exception 'That person must create an SDS Local account before being added as staff' using errcode = 'P0002';
  end if;
  if staff_user_id = (select auth.uid()) then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;

  insert into public.business_members (business_id, user_id, role, is_active)
  values (p_business_id, staff_user_id, 'staff', true)
  on conflict (business_id, user_id)
  do update set role = 'staff', is_active = true
  returning id into member_id;
  return member_id;
end;
$$;

create or replace function public.remove_business_staff(p_business_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  update public.business_members
  set is_active = false
  where id = p_member_id and business_id = p_business_id and role = 'staff';
  if not found then
    raise exception 'Staff member not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.add_business_staff(uuid, text) from public;
revoke all on function public.remove_business_staff(uuid, uuid) from public;
grant execute on function public.add_business_staff(uuid, text) to authenticated;
grant execute on function public.remove_business_staff(uuid, uuid) to authenticated;

commit;
