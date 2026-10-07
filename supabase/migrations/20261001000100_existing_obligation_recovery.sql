begin;
-- Expiry must not strand earned rewards or existing appointment rescheduling.
-- Moderation suspensions and never-approved listings remain unavailable.
create or replace function public.business_allows_obligation_recovery(p_business_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.businesses b where b.id=p_business_id and
 (b.status='active' or (b.status='suspended' and b.suspension_reason='billing'
 and b.billing_suspension_previous_status='active' and b.approved_at is not null)));
$$;
revoke all on function public.business_allows_obligation_recovery(uuid) from public,anon,authenticated;
grant execute on function public.business_allows_obligation_recovery(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.get_loyalty_wallet()
 RETURNS TABLE(membership_id uuid, program_id uuid, business_id uuid, business_name character varying, business_slug character varying, primary_color character, program_name character varying, reward_description character varying, terms character varying, joined_at timestamp with time zone, earned_stamps integer, reversed_stamps integer, redeemed_rewards integer, available_stamps integer, rewards_ready integer, progress_stamps integer, stamps_required integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    and public.business_allows_obligation_recovery(b.id)
  order by m.joined_at desc;
$function$
;

CREATE OR REPLACE FUNCTION public.get_loyalty_wallet_v2()
 RETURNS TABLE(membership_id uuid, program_id uuid, business_id uuid, business_name character varying, business_slug character varying, primary_color character, program_name character varying, reward_description character varying, terms character varying, joined_at timestamp with time zone, program_type loyalty_program_type, points_per_dollar numeric, points_required integer, earned_points integer, redeemed_points integer, available_points integer, rewards_ready integer, progress_points integer, earned_stamps integer, available_stamps integer, progress_stamps integer, stamps_required integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    where m.customer_id = (select auth.uid()) and m.is_active and p.is_active and public.business_allows_obligation_recovery(b.id)
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
$function$
;

CREATE OR REPLACE FUNCTION public.process_loyalty_action(p_actor_id uuid, p_membership_id uuid, p_token_id uuid, p_action text, p_idempotency_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  where m.id = p_membership_id and m.is_active and p.is_active and (b.status = 'active' or (p_action = 'redemption' and public.business_allows_obligation_recovery(b.id)))
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
$function$
;

CREATE OR REPLACE FUNCTION public.reschedule_appointment_slot(p_appointment_id uuid, p_business_id uuid, p_actor_id uuid, p_guest_hash text, p_start_at timestamp with time zone, p_resource_id uuid, p_idempotency_key uuid, p_request_hash text, p_expected_version integer)
 RETURNS appointments
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  appointment_row public.appointments%rowtype;
  business_record public.businesses%rowtype;
  settings_row public.appointment_settings%rowtype;
  service_row public.appointment_services%rowtype;
  resource_row public.appointment_resources%rowtype;
  override_row public.appointment_date_overrides%rowtype;
  local_start timestamp;
  local_day date;
  day_index integer;
  start_minute integer;
  open_minute integer;
  close_minute integer;
  busy_count integer;
  local_window record;
  business_window record;
  has_resource_windows boolean;
  has_service_windows boolean;
  saved_hash text;
  saved_appointment_id uuid;
begin
  if p_idempotency_key is null or p_request_hash is null
    or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'IDEMPOTENCY_INVALID' using errcode = '22023';
  end if;
  select request_hash, appointment_id into saved_hash, saved_appointment_id
    from public.appointment_reschedule_keys where idempotency_key = p_idempotency_key;
  if found then
    if saved_hash <> p_request_hash or saved_appointment_id <> p_appointment_id then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    select * into appointment_row from public.appointments where id = p_appointment_id;
    return appointment_row;
  end if;

  select * into business_record from public.businesses
    where id = p_business_id and public.business_allows_obligation_recovery(id) and business_type = 'services' for update;
  if not found then raise exception 'BUSINESS_UNAVAILABLE' using errcode = 'P0002'; end if;
  select * into appointment_row from public.appointments
    where id = p_appointment_id and business_id = p_business_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if appointment_row.version <> p_expected_version then
    raise exception 'APPOINTMENT_CHANGED' using errcode = '40001';
  end if;
  if p_actor_id is not null then
    if appointment_row.customer_id is distinct from p_actor_id then
      raise exception 'APPOINTMENT_ACCESS' using errcode = '42501';
    end if;
  elsif appointment_row.guest_hash is null or appointment_row.guest_hash is distinct from p_guest_hash then
    raise exception 'APPOINTMENT_ACCESS' using errcode = '42501';
  end if;
  if appointment_row.status not in ('requested','confirmed')
    or appointment_row.payment_status not in ('none','paid') then
    raise exception 'APPOINTMENT_TRANSITION_INVALID' using errcode = '22023';
  end if;
  if appointment_row.starts_at < now() + make_interval(mins =>
      coalesce((appointment_row.policy_snapshot->>'cancellationCutoffMinutes')::integer,1440)) then
    raise exception 'CANCELLATION_CUTOFF' using errcode = '22023';
  end if;
  select * into settings_row from public.appointment_settings where business_id = p_business_id;
  select * into service_row from public.appointment_services
    where id = appointment_row.service_id and business_id = p_business_id
      and is_bookable and archived_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023'; end if;
  if p_resource_id is not null then
    select * into resource_row from public.appointment_resources
      where id = p_resource_id and business_id = p_business_id and is_active;
    if not found or not exists (
      select 1 from public.appointment_service_resources mapping
      where mapping.business_id = p_business_id and mapping.service_id = service_row.id
        and mapping.resource_id = p_resource_id
    ) then raise exception 'RESOURCE_UNAVAILABLE' using errcode = '22023'; end if;
  elsif service_row.requires_resource then
    raise exception 'RESOURCE_REQUIRED' using errcode = '22023';
  end if;

  local_start := p_start_at at time zone settings_row.timezone;
  local_day := local_start::date;
  if local_start at time zone settings_row.timezone <> p_start_at
    or extract(second from local_start) <> 0 then
    raise exception 'INVALID_LOCAL_TIME' using errcode = '22023';
  end if;
  if p_start_at < now() + make_interval(mins => settings_row.minimum_notice_minutes)
    or p_start_at > now() + make_interval(days => settings_row.booking_horizon_days) then
    raise exception 'OUTSIDE_BOOKING_WINDOW' using errcode = '22023';
  end if;
  if p_start_at = appointment_row.starts_at and p_resource_id is not distinct from appointment_row.resource_id then
    raise exception 'RESCHEDULE_SAME_SLOT' using errcode = '22023';
  end if;
  day_index := extract(dow from local_start)::integer;
  start_minute := extract(hour from local_start)::integer * 60 + extract(minute from local_start)::integer;

  select * into override_row from public.appointment_date_overrides date_override
  where date_override.business_id = p_business_id and date_override.local_date = local_day
    and (date_override.service_id is null or date_override.service_id = service_row.id)
    and (date_override.resource_id is null or date_override.resource_id = p_resource_id)
  order by (date_override.resource_id is not null) desc, (date_override.service_id is not null) desc
  limit 1;
  if found then
    if override_row.is_closed then raise exception 'DATE_CLOSED' using errcode = '22023'; end if;
    open_minute := extract(hour from override_row.opens_at)::integer * 60 + extract(minute from override_row.opens_at)::integer;
    close_minute := extract(hour from override_row.closes_at)::integer * 60 + extract(minute from override_row.closes_at)::integer;
  else
    select exists (
      select 1 from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.resource_id = p_resource_id and p_resource_id is not null
        and (weekly_window.service_id is null or weekly_window.service_id = service_row.id)
    ) into has_resource_windows;
    select exists (
      select 1 from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id = service_row.id and weekly_window.resource_id is null
    ) into has_service_windows;
    if has_resource_windows then
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.resource_id = p_resource_id
        and (weekly_window.service_id is null or weekly_window.service_id = service_row.id)
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by (weekly_window.service_id is not null) desc, weekly_window.opens_at limit 1;
    elsif has_service_windows then
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id = service_row.id and weekly_window.resource_id is null
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by weekly_window.opens_at limit 1;
    else
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id is null and weekly_window.resource_id is null
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by weekly_window.opens_at limit 1;
    end if;
    if not found then raise exception 'NO_AVAILABILITY' using errcode = '22023'; end if;
    open_minute := extract(hour from local_window.opens_at)::integer * 60 + extract(minute from local_window.opens_at)::integer;
    close_minute := extract(hour from local_window.closes_at)::integer * 60 + extract(minute from local_window.closes_at)::integer;
  end if;
  if start_minute < open_minute
    or start_minute + service_row.duration_minutes + service_row.buffer_minutes > close_minute
    or mod(start_minute - open_minute, settings_row.slot_interval_minutes) <> 0 then
    raise exception 'INVALID_SLOT' using errcode = '22023';
  end if;
  select hours.opens_at, hours.closes_at into business_window
  from public.business_hours hours
  where hours.business_id = p_business_id and hours.day_of_week = day_index and not hours.is_closed
    and start_minute >= extract(hour from hours.opens_at)::integer * 60 + extract(minute from hours.opens_at)::integer
    and start_minute + service_row.duration_minutes + service_row.buffer_minutes
      <= extract(hour from hours.closes_at)::integer * 60 + extract(minute from hours.closes_at)::integer
  order by hours.interval_number limit 1;
  if not found then raise exception 'BUSINESS_CLOSED' using errcode = '22023'; end if;

  if service_row.capacity > 1 then
    select count(*) into busy_count from public.appointments other
    where other.business_id = p_business_id and other.service_id = service_row.id
      and other.id <> appointment_row.id and other.status not in ('cancelled','no_show')
      and other.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
      and other.blocked_until > p_start_at;
    if busy_count >= service_row.capacity then raise exception 'SLOT_FULL' using errcode = '23505'; end if;
    if p_resource_id is not null and exists (
      select 1 from public.appointments other where other.business_id = p_business_id
        and other.id <> appointment_row.id and other.resource_id = p_resource_id
        and other.status not in ('cancelled','no_show')
        and other.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
        and other.blocked_until > p_start_at
    ) then raise exception 'SLOT_FULL' using errcode = '23505'; end if;
  elsif exists (
    select 1 from public.appointments other where other.business_id = p_business_id
      and other.id <> appointment_row.id and other.status not in ('cancelled','no_show')
      and other.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
      and other.blocked_until > p_start_at
      and ((p_resource_id is not null and other.resource_id = p_resource_id)
        or (p_resource_id is null and other.service_id = service_row.id and other.resource_id is null))
  ) then raise exception 'SLOT_FULL' using errcode = '23505';
  end if;

  update public.appointments set resource_id = p_resource_id,
    resource_snapshot = case when p_resource_id is null then '{}'::jsonb
      else jsonb_build_object('id',resource_row.id,'name',resource_row.name,'userId',resource_row.user_id) end,
    starts_at = p_start_at,
    ends_at = p_start_at + make_interval(mins => service_row.duration_minutes),
    blocked_until = p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes),
    version = version + 1
  where id = appointment_row.id returning * into appointment_row;
  insert into public.appointment_reschedule_keys(idempotency_key,appointment_id,request_hash,result_version)
    values(p_idempotency_key,p_appointment_id,p_request_hash,appointment_row.version);
  insert into public.appointment_events(appointment_id,actor_type,actor_id,event_type,details)
    values(p_appointment_id,case when p_actor_id is null then 'guest' else 'customer' end,p_actor_id,
      'rescheduled',jsonb_build_object('newStartAt',p_start_at,'newResourceId',p_resource_id));
  return appointment_row;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.square_confirm_pickup(p_order uuid, p_actor uuid, p_business uuid, p_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  o public.square_orders;
  receipt public.square_pickup_confirmations;
  membership record;
  earned integer := 0;
  visits integer := 0;
  transaction_id uuid;
begin
  if not exists(select 1 from public.business_members m where m.business_id=p_business
    and m.user_id=p_actor and m.is_active and m.role in ('owner','staff')) then
    raise exception 'OPERATOR_REQUIRED';
  end if;
  select * into o from public.square_orders where id=p_order and business_id=p_business for update;
  if o.id is null then raise exception 'INVALID_PICKUP_CODE'; end if;
  select * into receipt from public.square_pickup_confirmations where order_id=o.id;
  if receipt.order_id is not null then
    if receipt.token_hash<>p_hash then raise exception 'INVALID_PICKUP_CODE'; end if;
    return jsonb_build_object('orderId',o.id,'completed',true,'alreadyConfirmed',true,
      'pointsAwarded',receipt.points_awarded,'visitsAwarded',receipt.visits_awarded);
  end if;
  if not exists(select 1 from public.square_pickup_codes c where c.order_id=o.id
    and c.token_hash=p_hash and c.expires_at>now()) then raise exception 'INVALID_PICKUP_CODE'; end if;
  if o.status<>'ready' or o.paid_at is null or (o.square_payment_id is null and not (o.total_minor=0 and o.provider_status='REWARD_COVERED')) then
    raise exception 'PICKUP_NOT_READY';
  end if;
  if o.lease_until>now() then raise exception 'ORDER_BUSY'; end if;
  select m.id,m.business_id,p.program_type,p.points_per_dollar into membership
    from public.loyalty_memberships m
    join public.loyalty_programs p on p.id=m.program_id and p.business_id=m.business_id
    join public.businesses b on b.id=m.business_id
    where m.business_id=o.business_id and m.customer_id=o.customer_id
      and m.is_active and p.is_active and public.business_allows_obligation_recovery(b.id)
    for update of m;
  if membership.id is not null and o.total_minor>0 then
    if membership.program_type='points' then
      -- Item subtotal only: tax and tips never earn points.
      earned := floor(o.subtotal_minor::numeric * membership.points_per_dollar / 100)::integer;
      if earned>0 then
        insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
          amount,points_amount,spend_minor,actor_id,idempotency_key,token_id,note,square_order_id)
        values(membership.id,o.business_id,'points_earned',1,earned,o.subtotal_minor::integer,
          p_actor,o.id,gen_random_uuid(),'Pickup order '||o.order_number,o.id)
        returning id into transaction_id;
      end if;
    else
      visits := 1;
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
        amount,points_amount,actor_id,idempotency_key,token_id,note,square_order_id)
      values(membership.id,o.business_id,'stamp',1,0,p_actor,o.id,gen_random_uuid(),
        'Pickup order '||o.order_number,o.id) returning id into transaction_id;
    end if;
  end if;
  update public.square_orders set status='completed',completed_at=now() where id=o.id;
  insert into public.square_pickup_confirmations(order_id,actor_id,token_hash,transaction_id,points_awarded,visits_awarded)
    values(o.id,p_actor,p_hash,transaction_id,earned,visits);
  insert into public.square_order_events(order_id,actor_type,actor_id,from_state,to_state)
    values(o.id,'pickup_scan',p_actor,'ready','completed');
  return jsonb_build_object('orderId',o.id,'completed',true,'alreadyConfirmed',false,
    'pointsAwarded',earned,'visitsAwarded',visits);
end;
$function$
;
commit;
