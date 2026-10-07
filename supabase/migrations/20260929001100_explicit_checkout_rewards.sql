begin;
alter table public.loyalty_programs
 add column checkout_reward_enabled boolean not null default false,
 add column checkout_reward_items jsonb not null default '[]',
 add column checkout_reward_revision integer not null default 1;
alter table public.loyalty_programs drop constraint loyalty_checkout_reward_configuration;
alter table public.loyalty_programs add constraint loyalty_checkout_reward_configuration check (
 checkout_reward_type in ('free_item','bogo','percent_discount','item_discount')
 and (checkout_reward_type not in ('percent_discount','item_discount') or coalesce(checkout_reward_percent between 1 and 100,false))
 and jsonb_typeof(checkout_reward_items)='array' and jsonb_array_length(checkout_reward_items)<=30
 and (not checkout_reward_enabled or checkout_reward_type='percent_discount' or jsonb_array_length(checkout_reward_items)>0)
);
-- Only migrate definitive existing offers; blank auto-selection is intentionally not carried forward.
update public.loyalty_programs p set checkout_reward_enabled=true,
 checkout_reward_items=case when p.checkout_reward_type='percent_discount' then '[]'::jsonb
 else jsonb_build_array(jsonb_build_object('provider',coalesce((select provider from public.ordering_provider_selections where business_id=p.business_id),'square'),'variationId',p.checkout_reward_variation_id)) end
where p.checkout_reward_type='percent_discount' or nullif(p.checkout_reward_variation_id,'') is not null;
create function public.version_checkout_reward_configuration() returns trigger
language plpgsql set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(new.checkout_reward_items)<>'array' then raise exception 'REWARD_ITEMS_INVALID'; end if;
 for item in select value from jsonb_array_elements(new.checkout_reward_items) loop
  if coalesce(item->>'provider','') not in ('square','stripe') or length(coalesce(item->>'variationId','')) not between 1 and 100 then raise exception 'REWARD_ITEMS_INVALID'; end if;
 end loop;
 if (select count(*) from jsonb_array_elements(new.checkout_reward_items))<>(select count(distinct (value->>'provider',value->>'variationId')) from jsonb_array_elements(new.checkout_reward_items)) then raise exception 'REWARD_ITEMS_DUPLICATED'; end if;
 if tg_op='INSERT' then new.checkout_reward_revision:=1;
 elsif row(new.checkout_reward_enabled,new.checkout_reward_type,new.checkout_reward_percent,new.checkout_reward_items,new.is_active,new.stamps_required,new.points_required,new.program_type,new.reward_description)
 is distinct from row(old.checkout_reward_enabled,old.checkout_reward_type,old.checkout_reward_percent,old.checkout_reward_items,old.is_active,old.stamps_required,old.points_required,old.program_type,old.reward_description) then
 new.checkout_reward_revision:=old.checkout_reward_revision+1;
 else new.checkout_reward_revision:=old.checkout_reward_revision; end if;
 return new;
end $$;
revoke all on function public.version_checkout_reward_configuration() from public,anon,authenticated;
create trigger checkout_reward_configuration_version before insert or update on public.loyalty_programs for each row execute function public.version_checkout_reward_configuration();

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
  if program.id is null or program.checkout_reward_type is distinct from reward_type then
    raise exception 'REWARD_CHANGED' using errcode = '22023';
  end if;
  if p_reward->>'version'='2' then
    if not program.checkout_reward_enabled or (p_reward->>'programId')::uuid is distinct from program.id
      or (p_reward->>'revision')::integer is distinct from program.checkout_reward_revision
      or not exists(select 1 from public.square_orders o where o.id=p_order and o.business_id=membership.business_id and o.customer_id=p_customer and o.provider=p_reward->>'provider')
      then raise exception 'REWARD_CHANGED'; end if;
    if reward_type<>'percent_discount' and not exists(select 1 from jsonb_array_elements(program.checkout_reward_items) i where i->>'provider'=p_reward->>'provider' and i->>'variationId'=p_reward->>'variationId') then raise exception 'REWARD_CHANGED'; end if;
    if reward_type in ('percent_discount','item_discount') and program.checkout_reward_percent is distinct from (p_reward->>'percent')::integer then raise exception 'REWARD_CHANGED'; end if;
  else
    -- Legacy in-flight quotes remain bounded by their existing configured item.
    if reward_type='percent_discount' and program.checkout_reward_percent is distinct from (p_reward->>'percent')::integer then raise exception 'REWARD_CHANGED'; end if;
    if reward_type in ('free_item','bogo') and (nullif(btrim(p_reward->>'variationId'),'') is null or (program.checkout_reward_variation_id is not null and program.checkout_reward_variation_id is distinct from p_reward->>'variationId')) then raise exception 'REWARD_CHANGED'; end if;
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


alter table public.square_orders drop constraint square_orders_total_minor_check;
alter table public.square_orders add constraint square_orders_total_minor_check check (total_minor between 0 and 10000000 and (total_minor>0 or (customer_id is not null and coalesce(loyalty_reward->>'version'='2',false) and coalesce((loyalty_reward->>'discountMinor')::bigint,0)>0)));
create or replace function public.square_reserve_order(p_order jsonb, p_items jsonb)
returns public.square_orders language plpgsql security definer set search_path = '' as $$
declare
  existing public.square_orders;
  result public.square_orders;
  target_business uuid := (p_order->>'business_id')::uuid;
  pickup timestamptz := (p_order->>'pickup_at')::timestamptz;
  stop public.business_location_stops;
  local_pickup timestamp;
  rollout jsonb;
  settings jsonb;
  order_provider text := coalesce(p_order->>'provider','square');
  reward_transaction uuid;
begin
  if order_provider not in ('square','stripe') then raise exception 'ORDERING_CLOSED'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_business::text,731));
  select * into existing from public.square_orders
    where idempotency_key=(p_order->>'idempotency_key')::uuid;
  if found then
    if existing.guest_hash is distinct from p_order->>'guest_hash'
      or existing.request_hash <> p_order->>'request_hash'
      or existing.provider <> order_provider then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return existing;
  end if;
  if not exists(select 1 from public.ordering_provider_selections
    where business_id=target_business and provider=order_provider) then raise exception 'ORDERING_CLOSED'; end if;
  select value into rollout from public.platform_settings
    where key=case order_provider when 'stripe' then 'stripe_commerce' else 'square_commerce' end;
  if not coalesce((rollout->>'enabled')::boolean,false)
    or not coalesce((rollout->'business_ids') ? target_business::text,false)
    then raise exception 'ORDERING_CLOSED'; end if;
  if order_provider='stripe' then
    select to_jsonb(s) into settings from public.stripe_ordering_settings s
      where business_id=target_business for update;
  else
    select to_jsonb(s) into settings from public.square_ordering_settings s
      where business_id=target_business for update;
  end if;
  if settings is null
    or not coalesce((settings->>'enabled')::boolean,false)
    or not coalesce((settings->>'is_open')::boolean,false)
    or settings->>'synced_at' is null
    or not exists(select 1 from public.businesses where id=target_business and status='active')
    or (order_provider='square' and not exists(select 1 from public.square_connections
      where business_id=target_business and state='connected'
        and location_id=p_order->>'location_id' and merchant_id=p_order->>'merchant_id'))
    or (order_provider='stripe' and not exists(select 1 from public.stripe_account_states
      where business_id=target_business and state='connected' and charges_enabled
        and account_id=p_order->>'merchant_id'))
    then raise exception 'ORDERING_CLOSED'; end if;
  if pickup < now()+make_interval(mins=>greatest(
      (settings->>'preparation_minutes')::integer,
      (settings->>'minimum_notice_minutes')::integer))
    or pickup > now()+interval '7 days' then raise exception 'INVALID_SLOT'; end if;
  local_pickup := pickup at time zone (settings->>'timezone');
  if extract(second from local_pickup)<>0
    or mod(extract(minute from local_pickup)::integer,(settings->>'slot_minutes')::integer)<>0
    or not exists(select 1 from jsonb_array_elements(settings->'pickup_windows') w
      where (w->>'day')::integer=extract(dow from local_pickup)::integer
        and local_pickup::time >= (w->>'start')::time
        and local_pickup::time < (w->>'end')::time)
    then raise exception 'INVALID_SLOT'; end if;
  if exists(select 1 from public.businesses where id=target_business and business_type='mobile') then
    select * into stop from public.business_location_stops
      where id=(p_order->>'stop_id')::uuid and business_id=target_business;
    if stop.id is null or not stop.is_published or stop.ends_at<=now()
      or pickup<stop.starts_at or pickup>=stop.ends_at
      or (stop.starts_at>now() and not coalesce((settings->>'allow_upcoming_stops')::boolean,false))
      then raise exception 'INVALID_STOP'; end if;
  elsif p_order->>'stop_id' is not null then raise exception 'INVALID_STOP'; end if;
  if (select count(*) from public.square_orders where business_id=target_business
      and pickup_at=pickup and status not in ('checkout_expired','checkout_failed','refunded'))
    >= (settings->>'max_orders_per_slot')::integer then raise exception 'SLOT_FULL'; end if;
  insert into public.square_orders (
    id,business_id,business_name,customer_id,guest_hash,merchant_id,location_id,provider,
    stop_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,
    total_minor,currency,idempotency_key,request_hash,provider_request,
    loyalty_membership_id,loyalty_reward
  ) values (
    (p_order->>'id')::uuid,target_business,p_order->>'business_name',
    (p_order->>'customer_id')::uuid,p_order->>'guest_hash',p_order->>'merchant_id',
    p_order->>'location_id',order_provider,(p_order->>'stop_id')::uuid,pickup,
    p_order->>'pickup_timezone',p_order->>'pickup_address',p_order->'recipient',
    (p_order->>'subtotal_minor')::bigint,(p_order->>'tax_minor')::bigint,
    (p_order->>'total_minor')::bigint,p_order->>'currency',
    (p_order->>'idempotency_key')::uuid,p_order->>'request_hash',p_order->'provider_request',
    (p_order->>'loyalty_membership_id')::uuid,p_order->'loyalty_reward'
  ) returning * into result;
  insert into public.square_order_items(order_id,snapshot)
    select result.id,value from jsonb_array_elements(p_items);
  if p_order->'loyalty_reward' is not null and jsonb_typeof(p_order->'loyalty_reward')='object' then
    reward_transaction := public.square_redeem_checkout_reward(
      result.id,(p_order->>'loyalty_membership_id')::uuid,
      (p_order->>'customer_id')::uuid,p_order->'loyalty_reward');
  end if;
  if result.total_minor=0 then
    if reward_transaction is null or result.loyalty_reward->>'version'<>'2' then raise exception 'REWARD_CHANGED'; end if;
    update public.square_orders set status='placed',paid_at=now(),provider_status='REWARD_COVERED' where id=result.id returning * into result;
  end if;
  insert into public.square_order_events(order_id,actor_type,actor_id,to_state)
    values(result.id,'customer',result.customer_id,result.status);
  return result;
end;
$$;

create or replace function public.square_confirm_pickup(p_order uuid,p_actor uuid,p_business uuid,p_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
      and m.is_active and p.is_active and b.status='active'
    for update of m;
  if membership.id is not null and o.total_minor>0 then
    if membership.program_type='points' then
      -- Item subtotal only: tax and tips never earn points.
      earned := floor(o.subtotal_minor::numeric * membership.points_per_dollar / 100)::integer;
      if earned>0 then
        insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
          amount,points_amount,spend_minor,actor_id,idempotency_key,token_id,note)
        values(membership.id,o.business_id,'points_earned',1,earned,o.subtotal_minor::integer,
          p_actor,o.id,gen_random_uuid(),'Pickup order '||o.order_number)
        returning id into transaction_id;
      end if;
    else
      visits := 1;
      insert into public.loyalty_transactions(membership_id,business_id,transaction_type,
        amount,points_amount,actor_id,idempotency_key,token_id,note)
      values(membership.id,o.business_id,'stamp',1,0,p_actor,o.id,gen_random_uuid(),
        'Pickup order '||o.order_number) returning id into transaction_id;
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
$$;
revoke all on function public.square_confirm_pickup(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.square_confirm_pickup(uuid,uuid,uuid,text) to service_role;
notify pgrst,'reload schema';

commit;
