begin;

create or replace function public.square_reserve_order(p_order jsonb, p_items jsonb)
returns public.square_orders language plpgsql security definer set search_path = '' as $$
declare
  existing public.square_orders;
  settings public.square_ordering_settings;
  result public.square_orders;
  target_business uuid := (p_order->>'business_id')::uuid;
  pickup timestamptz := (p_order->>'pickup_at')::timestamptz;
  stop public.business_location_stops;
  local_pickup timestamp;
  rollout jsonb;
  order_provider text := coalesce(p_order->>'provider','square');
  reward_transaction uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(target_business::text, 731));
  select * into existing from public.square_orders where idempotency_key = (p_order->>'idempotency_key')::uuid;
  if found then
    if existing.guest_hash is distinct from p_order->>'guest_hash' or existing.request_hash <> p_order->>'request_hash' then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return existing;
  end if;
  select value into rollout from public.platform_settings where key = case when order_provider = 'stripe' then 'stripe_commerce' else 'square_commerce' end;
  if not coalesce((rollout->>'enabled')::boolean,false) or not coalesce((rollout->'business_ids') ? target_business::text,false) then raise exception 'ORDERING_CLOSED'; end if;
  select * into settings from public.square_ordering_settings where business_id = target_business for update;
  if settings.business_id is null or not settings.enabled or not settings.is_open or settings.synced_at is null or settings.provider <> order_provider
    or not exists(select 1 from public.businesses where id = target_business and status = 'active')
    or not exists(select 1 from public.square_connections where business_id = target_business and provider = order_provider and state = 'connected' and location_id = p_order->>'location_id' and merchant_id = p_order->>'merchant_id')
    then raise exception 'ORDERING_CLOSED'; end if;
  if pickup < now() + make_interval(mins => greatest(settings.preparation_minutes,settings.minimum_notice_minutes)) or pickup > now() + interval '7 days' then raise exception 'INVALID_SLOT'; end if;
  local_pickup := pickup at time zone settings.timezone;
  if extract(second from local_pickup) <> 0 or mod(extract(minute from local_pickup)::integer,settings.slot_minutes) <> 0
    or not exists(select 1 from jsonb_array_elements(settings.pickup_windows) w where (w->>'day')::integer = extract(dow from local_pickup)::integer and local_pickup::time >= (w->>'start')::time and local_pickup::time < (w->>'end')::time)
    then raise exception 'INVALID_SLOT'; end if;
  if exists(select 1 from public.businesses where id = target_business and business_type = 'mobile') then
    select * into stop from public.business_location_stops where id = (p_order->>'stop_id')::uuid and business_id = target_business;
    if stop.id is null or not stop.is_published or stop.ends_at <= now() or pickup < stop.starts_at or pickup >= stop.ends_at or (stop.starts_at > now() and not settings.allow_upcoming_stops) then raise exception 'INVALID_STOP'; end if;
  elsif p_order->>'stop_id' is not null then raise exception 'INVALID_STOP'; end if;
  if (select count(*) from public.square_orders where business_id = target_business and pickup_at = pickup and status not in ('checkout_expired','checkout_failed','refunded')) >= settings.max_orders_per_slot then raise exception 'SLOT_FULL'; end if;
  insert into public.square_orders (id,business_id,business_name,customer_id,guest_hash,merchant_id,location_id,provider,stop_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,idempotency_key,request_hash,provider_request,loyalty_membership_id,loyalty_reward)
  values ((p_order->>'id')::uuid,target_business,p_order->>'business_name',(p_order->>'customer_id')::uuid,p_order->>'guest_hash',p_order->>'merchant_id',p_order->>'location_id',order_provider,(p_order->>'stop_id')::uuid,pickup,p_order->>'pickup_timezone',p_order->>'pickup_address',p_order->'recipient',(p_order->>'subtotal_minor')::bigint,(p_order->>'tax_minor')::bigint,(p_order->>'total_minor')::bigint,p_order->>'currency',(p_order->>'idempotency_key')::uuid,p_order->>'request_hash',p_order->'provider_request',(p_order->>'loyalty_membership_id')::uuid,p_order->'loyalty_reward') returning * into result;
  insert into public.square_order_items(order_id,snapshot) select result.id,value from jsonb_array_elements(p_items);
  if p_order->'loyalty_reward' is not null and jsonb_typeof(p_order->'loyalty_reward') = 'object' then reward_transaction := public.square_redeem_checkout_reward(result.id,(p_order->>'loyalty_membership_id')::uuid,(p_order->>'customer_id')::uuid,p_order->'loyalty_reward'); end if;
  insert into public.square_order_events(order_id,actor_type,actor_id,to_state) values(result.id,'customer',result.customer_id,'checkout_pending');
  return result;
end;
$$;

commit;
notify pgrst, 'reload schema';
