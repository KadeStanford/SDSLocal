begin;

-- Structured offers let a rewards program be used during pickup checkout while
-- keeping the existing visits/points balance as the source of truth.
alter table public.loyalty_programs
  add column if not exists checkout_reward_type text not null default 'free_item',
  add column if not exists checkout_reward_variation_id text,
  add column if not exists checkout_reward_percent smallint;

alter table public.loyalty_programs
  drop constraint if exists loyalty_checkout_reward_configuration;
alter table public.loyalty_programs
  add constraint loyalty_checkout_reward_configuration check (
    checkout_reward_type in ('free_item', 'bogo', 'percent_discount')
    and (checkout_reward_type <> 'percent_discount'
      or (checkout_reward_percent is not null and checkout_reward_percent between 1 and 100))
  );

alter table public.square_orders
  add column if not exists loyalty_membership_id uuid references public.loyalty_memberships(id) on delete set null,
  add column if not exists loyalty_reward jsonb;

alter table public.loyalty_transactions
  add column if not exists square_order_id uuid references public.square_orders(id) on delete set null;

create unique index if not exists loyalty_transactions_square_order_redemption_idx
  on public.loyalty_transactions(square_order_id)
  where square_order_id is not null and transaction_type = 'redemption';

-- The reservation RPC calls this inside the same transaction as the order
-- insert. A retry therefore cannot spend the reward twice.
create or replace function public.square_redeem_checkout_reward(
  p_order uuid,
  p_membership uuid,
  p_customer uuid,
  p_reward jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership public.loyalty_memberships;
  program public.loyalty_programs;
  available_points integer;
  available_stamps integer;
  required integer;
  result_id uuid;
  reward_type text := p_reward->>'type';
begin
  if p_order is null or p_membership is null or p_customer is null then
    raise exception 'REWARD_SIGN_IN' using errcode = '22023';
  end if;
  select * into membership from public.loyalty_memberships
    where id = p_membership and customer_id = p_customer and is_active for update;
  if membership.id is null then raise exception 'REWARD_UNAVAILABLE' using errcode = '22023'; end if;
  select * into program from public.loyalty_programs
    where id = membership.program_id and business_id = membership.business_id and is_active for update;
  if program.id is null or program.checkout_reward_type <> reward_type then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  if reward_type = 'percent_discount' and program.checkout_reward_percent <> (p_reward->>'percent')::integer then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  if reward_type in ('free_item','bogo') and program.checkout_reward_variation_id is distinct from p_reward->>'variationId' then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  select coalesce(sum(t.points_amount) filter (where t.transaction_type = 'points_earned'), 0)
    - coalesce(sum(t.points_amount) filter (where t.transaction_type = 'redemption'), 0)
    into available_points from public.loyalty_transactions t where t.membership_id = membership.id;
  select coalesce(sum(t.amount) filter (where t.transaction_type = 'stamp'), 0)
    - coalesce(sum(t.amount) filter (where t.transaction_type = 'reversal'), 0)
    - coalesce(sum(t.amount) filter (where t.transaction_type = 'redemption'), 0) * program.stamps_required
    into available_stamps from public.loyalty_transactions t where t.membership_id = membership.id;
  required := case when program.program_type = 'points' then program.points_required else program.stamps_required end;
  if (program.program_type = 'points' and available_points < required)
     or (program.program_type = 'visits' and available_stamps < required) then
    raise exception 'REWARD_NOT_READY' using errcode = '22023';
  end if;
  insert into public.loyalty_transactions
    (membership_id, business_id, transaction_type, amount, points_amount, actor_id, idempotency_key, square_order_id, note)
  values
    (membership.id, membership.business_id, 'redemption', 1,
     case when program.program_type = 'points' then required else 0 end,
     p_customer, gen_random_uuid(), p_order, 'Pickup checkout reward')
  returning id into result_id;
  return result_id;
end;
$$;

revoke all on function public.square_redeem_checkout_reward(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.square_redeem_checkout_reward(uuid, uuid, uuid, jsonb) to service_role;

-- Add optional loyalty metadata to the existing serialized reservation.
create or replace function public.square_reserve_order(p_order jsonb, p_items jsonb)
returns public.square_orders language plpgsql security definer set search_path = '' as $$
declare existing public.square_orders; settings public.square_ordering_settings;
  result public.square_orders; target_business uuid := (p_order->>'business_id')::uuid;
  pickup timestamptz := (p_order->>'pickup_at')::timestamptz; stop public.business_location_stops;
  local_pickup timestamp; rollout jsonb; reward_transaction uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_business::text, 731));
  select * into existing from public.square_orders where idempotency_key = (p_order->>'idempotency_key')::uuid;
  if found then
    if existing.guest_hash is distinct from p_order->>'guest_hash' or existing.request_hash <> p_order->>'request_hash'
      then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return existing;
  end if;
  select value into rollout from public.platform_settings where key = 'square_commerce';
  if not coalesce((rollout->>'enabled')::boolean,false)
    or not coalesce((rollout->'business_ids') ? target_business::text,false) then raise exception 'ORDERING_CLOSED'; end if;
  select * into settings from public.square_ordering_settings where business_id = target_business for update;
  if settings.business_id is null or not settings.enabled or not settings.is_open or settings.synced_at is null
    or not exists(select 1 from public.businesses where id = target_business and status = 'active')
    or not exists(select 1 from public.square_connections where business_id = target_business and state = 'connected'
      and location_id = p_order->>'location_id' and merchant_id = p_order->>'merchant_id')
    then raise exception 'ORDERING_CLOSED'; end if;
  if pickup < now() + make_interval(mins => greatest(settings.preparation_minutes,settings.minimum_notice_minutes))
    or pickup > now() + interval '7 days' then raise exception 'INVALID_SLOT'; end if;
  local_pickup := pickup at time zone settings.timezone;
  if extract(second from local_pickup) <> 0 or mod(extract(minute from local_pickup)::integer,settings.slot_minutes) <> 0
    or not exists(select 1 from jsonb_array_elements(settings.pickup_windows) w
      where (w->>'day')::integer = extract(dow from local_pickup)::integer
        and local_pickup::time >= (w->>'start')::time and local_pickup::time < (w->>'end')::time)
    then raise exception 'INVALID_SLOT'; end if;
  if exists(select 1 from public.businesses where id = target_business and business_type = 'mobile') then
    select * into stop from public.business_location_stops where id = (p_order->>'stop_id')::uuid and business_id = target_business;
    if stop.id is null or not stop.is_published or stop.ends_at <= now() or pickup < stop.starts_at or pickup >= stop.ends_at
      or (stop.starts_at > now() and not settings.allow_upcoming_stops) then raise exception 'INVALID_STOP'; end if;
  elsif p_order->>'stop_id' is not null then raise exception 'INVALID_STOP'; end if;
  if (select count(*) from public.square_orders where business_id = target_business and pickup_at = pickup
      and status not in ('checkout_expired','checkout_failed','refunded')) >= settings.max_orders_per_slot
    then raise exception 'SLOT_FULL'; end if;
  insert into public.square_orders (id,business_id,business_name,customer_id,guest_hash,merchant_id,location_id,
    stop_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,
    idempotency_key,request_hash,provider_request,loyalty_membership_id,loyalty_reward)
  values ((p_order->>'id')::uuid,target_business,p_order->>'business_name',(p_order->>'customer_id')::uuid,
    p_order->>'guest_hash',p_order->>'merchant_id',p_order->>'location_id',(p_order->>'stop_id')::uuid,
    pickup,p_order->>'pickup_timezone',p_order->>'pickup_address',p_order->'recipient',
    (p_order->>'subtotal_minor')::bigint,(p_order->>'tax_minor')::bigint,(p_order->>'total_minor')::bigint,
    p_order->>'currency',(p_order->>'idempotency_key')::uuid,p_order->>'request_hash',p_order->'provider_request',
    (p_order->>'loyalty_membership_id')::uuid,p_order->'loyalty_reward')
  returning * into result;
  insert into public.square_order_items(order_id,snapshot) select result.id,value from jsonb_array_elements(p_items);
  if p_order->'loyalty_reward' is not null and jsonb_typeof(p_order->'loyalty_reward') = 'object' then
    reward_transaction := public.square_redeem_checkout_reward(
      result.id, (p_order->>'loyalty_membership_id')::uuid, (p_order->>'customer_id')::uuid, p_order->'loyalty_reward');
  end if;
  insert into public.square_order_events(order_id,actor_type,actor_id,to_state) values(result.id,'customer',result.customer_id,'checkout_pending');
  return result;
end;
$$;

commit;
