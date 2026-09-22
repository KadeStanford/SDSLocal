begin;

-- The active payment provider is a business-level choice. Provider connection
-- and pickup settings remain independent so connecting or configuring one can
-- never overwrite the other.
create table public.ordering_provider_selections (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null check (provider in ('square','stripe')),
  selected_at timestamptz not null default now(),
  selected_by uuid references auth.users(id) on delete set null
);

create table public.stripe_ordering_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default false,
  is_open boolean not null default false,
  preparation_minutes integer not null default 20 check (preparation_minutes between 5 and 240),
  minimum_notice_minutes integer not null default 15 check (minimum_notice_minutes between 5 and 1440),
  slot_minutes integer not null default 15 check (slot_minutes in (15,30,60)),
  max_orders_per_slot integer not null default 5 check (max_orders_per_slot between 1 and 100),
  timezone text not null default 'America/Chicago',
  pickup_windows jsonb not null default '[]'::jsonb check (jsonb_typeof(pickup_windows) = 'array'),
  allow_upcoming_stops boolean not null default false,
  platform_fee_minor integer not null default 0 check (platform_fee_minor = 0),
  synced_at timestamptz,
  catalog_revision uuid,
  sync_summary jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ordering_provider_selections enable row level security;
alter table public.stripe_ordering_settings enable row level security;
revoke all on public.ordering_provider_selections, public.stripe_ordering_settings
  from public, anon, authenticated;
grant all on public.ordering_provider_selections, public.stripe_ordering_settings to service_role;

-- Preserve already-configured Stripe pickup state before restoring the Square
-- tables to their original single-provider meaning.
insert into public.stripe_ordering_settings (
  business_id, enabled, is_open, preparation_minutes, minimum_notice_minutes,
  slot_minutes, max_orders_per_slot, timezone, pickup_windows,
  allow_upcoming_stops, platform_fee_minor, synced_at, catalog_revision,
  sync_summary, updated_at
)
select business_id, enabled, is_open, preparation_minutes, minimum_notice_minutes,
  slot_minutes, max_orders_per_slot, timezone, pickup_windows,
  allow_upcoming_stops, platform_fee_minor, synced_at, catalog_revision,
  sync_summary, updated_at
from public.square_ordering_settings
where provider = 'stripe'
on conflict (business_id) do update set
  enabled=excluded.enabled, is_open=excluded.is_open,
  preparation_minutes=excluded.preparation_minutes,
  minimum_notice_minutes=excluded.minimum_notice_minutes,
  slot_minutes=excluded.slot_minutes,
  max_orders_per_slot=excluded.max_orders_per_slot,
  timezone=excluded.timezone, pickup_windows=excluded.pickup_windows,
  allow_upcoming_stops=excluded.allow_upcoming_stops,
  synced_at=excluded.synced_at, catalog_revision=excluded.catalog_revision,
  sync_summary=excluded.sync_summary, updated_at=excluded.updated_at;

insert into public.ordering_provider_selections (business_id, provider)
select business_id, provider
from public.square_ordering_settings
where provider in ('square','stripe')
on conflict (business_id) do nothing;

insert into public.ordering_provider_selections (business_id, provider)
select business_id, 'stripe' from public.stripe_account_states
where state <> 'revoked'
on conflict (business_id) do nothing;

insert into public.ordering_provider_selections (business_id, provider)
select business_id, 'square' from public.square_connections
where provider = 'square' and state <> 'revoked'
on conflict (business_id) do nothing;

delete from public.square_ordering_settings where provider = 'stripe';
delete from public.square_connections where provider = 'stripe';

alter table public.square_ordering_settings
  drop constraint if exists square_ordering_settings_provider_check;
alter table public.square_ordering_settings
  add constraint square_ordering_settings_provider_check check (provider = 'square');
alter table public.square_connections
  drop constraint if exists square_connections_provider_check;
alter table public.square_connections
  add constraint square_connections_provider_check check (provider = 'square');

create or replace function public.stripe_set_pickup_timezone()
returns trigger language plpgsql set search_path = public, pg_temp as $$
declare zone text;
begin
  select timezone into zone from public.businesses where id=new.business_id;
  if not exists(select 1 from pg_timezone_names where name=zone) then
    raise exception 'INVALID_TIMEZONE';
  end if;
  new.timezone := zone;
  return new;
end;
$$;
create trigger stripe_automatic_pickup_timezone
before insert or update on public.stripe_ordering_settings
for each row execute function public.stripe_set_pickup_timezone();
revoke all on function public.stripe_set_pickup_timezone() from public, anon, authenticated;

create or replace function public.refresh_business_pickup_timezones()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.square_ordering_settings set timezone=timezone,updated_at=now()
    where business_id=new.id;
  update public.stripe_ordering_settings set timezone=timezone,updated_at=now()
    where business_id=new.id;
  return new;
end;
$$;
drop trigger if exists square_business_pickup_timezone on public.businesses;
create trigger provider_business_pickup_timezone
after update of timezone on public.businesses
for each row when (old.timezone is distinct from new.timezone)
execute function public.refresh_business_pickup_timezones();
revoke all on function public.refresh_business_pickup_timezones() from public, anon, authenticated;

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
    join public.ordering_provider_selections selected on selected.business_id=b.id
    join public.platform_settings flag
      on flag.key=case selected.provider when 'stripe' then 'stripe_commerce' else 'square_commerce' end
    left join public.square_connections square_connection
      on square_connection.business_id=b.id and selected.provider='square'
    left join public.square_ordering_settings square_settings
      on square_settings.business_id=b.id and selected.provider='square'
    left join public.stripe_account_states stripe_account
      on stripe_account.business_id=b.id and selected.provider='stripe'
    left join public.stripe_ordering_settings stripe_settings
      on stripe_settings.business_id=b.id and selected.provider='stripe'
    where b.status='active'
      and (p_business_ids is null or b.id=any(p_business_ids))
      and flag.value->'enabled'='true'::jsonb
      and coalesce(flag.value->>'public_environment',flag.value->>'environment')
        in ('development','staging','test')
      and (flag.value->'business_ids') ? b.id::text
      and case selected.provider
        when 'square' then
          square_connection.environment='sandbox'
          and square_connection.state='connected'
          and square_connection.location_id is not null
          and square_settings.enabled
          and square_settings.synced_at is not null
          and jsonb_typeof(square_settings.sync_summary->'variations')='number'
          and (square_settings.sync_summary->>'variations')::numeric > 0
        when 'stripe' then
          stripe_account.state='connected'
          and stripe_account.charges_enabled
          and stripe_settings.enabled
          and stripe_settings.synced_at is not null
          and jsonb_typeof(stripe_settings.sync_summary->'variations')='number'
          and (stripe_settings.sync_summary->>'variations')::numeric > 0
        else false
      end
      and not exists (
        select 1 from public.blocked_businesses blocked
        where blocked.business_id=b.id and blocked.customer_id=(select auth.uid())
      )
    order by b.id
    limit 1000;
end;
$$;
revoke all on function public.get_pickup_capabilities(uuid[]) from public;
grant execute on function public.get_pickup_capabilities(uuid[]) to anon, authenticated, service_role;

create or replace function public.get_pickup_status(p_business_ids uuid[] default null)
returns table(business_id uuid, supports_pickup_ordering boolean, pickup_status text)
language sql stable security definer set search_path = '' as $$
  select capability.business_id, capability.supports_pickup_ordering,
    case when case selected.provider
      when 'stripe' then stripe_settings.is_open
      else square_settings.is_open end
    then 'accepting' else 'paused' end
  from public.get_pickup_capabilities(p_business_ids) capability
  join public.ordering_provider_selections selected
    on selected.business_id=capability.business_id
  left join public.square_ordering_settings square_settings
    on square_settings.business_id=capability.business_id and selected.provider='square'
  left join public.stripe_ordering_settings stripe_settings
    on stripe_settings.business_id=capability.business_id and selected.provider='stripe';
$$;
revoke all on function public.get_pickup_status(uuid[]) from public;
grant execute on function public.get_pickup_status(uuid[]) to anon, authenticated, service_role;

create or replace function public.square_operator_businesses(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id, 'name',b.name, 'primaryColor',b.primary_color,
    'timezone',coalesce(stripe_settings.timezone,square_settings.timezone,b.timezone),
    'phone',b.phone,
    'logoPath',(select asset.storage_path from public.business_photos photo
      join public.media_assets asset on asset.id=photo.media_asset_id
      where photo.business_id=b.id and photo.role='logo' and asset.status='ready' limit 1),
    'canRefund',member.role='owner',
    'isOpen',case selected.provider when 'stripe' then coalesce(stripe_settings.is_open,false)
      else coalesce(square_settings.is_open,false) end,
    'orderingProvider',selected.provider,
    'orderingReady',case selected.provider
      when 'stripe' then coalesce(stripe_settings.enabled and stripe_settings.synced_at is not null,false)
      else coalesce(square_settings.enabled and square_settings.synced_at is not null,false) end,
    'counts',public.square_queue_counts(b.id)
  ) order by b.name,b.id),'[]'::jsonb)
  from public.business_members member
  join public.businesses b on b.id=member.business_id
  left join public.ordering_provider_selections selected on selected.business_id=b.id
  left join public.square_ordering_settings square_settings on square_settings.business_id=b.id
  left join public.stripe_ordering_settings stripe_settings on stripe_settings.business_id=b.id
  where member.user_id=p_user_id and member.is_active and member.role in ('owner','staff')
    and b.status in ('draft','pending_review','active');
$$;
revoke all on function public.square_operator_businesses(uuid) from public, anon, authenticated;
grant execute on function public.square_operator_businesses(uuid) to service_role;

-- Atomic reservation reads only the selected provider's settings and readiness.
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
  insert into public.square_order_events(order_id,actor_type,actor_id,to_state)
    values(result.id,'customer',result.customer_id,'checkout_pending');
  return result;
end;
$$;

create or replace function public.square_business_deletion_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.square_connections where business_id=old.id and state='connected')
    or exists(select 1 from public.stripe_account_states where business_id=old.id and state='connected')
    or exists(select 1 from public.square_orders where business_id=old.id
      and status not in ('completed','refunded','checkout_expired','checkout_failed'))
    then raise exception 'Settle active pickup orders and disconnect the payment provider before deleting this business.'; end if;
  update public.square_orders set recipient='{}',guest_hash=null,checkout_url=null,
    provider_request='{}',anonymized_at=now() where business_id=old.id;
  return old;
end;
$$;

commit;
notify pgrst, 'reload schema';
