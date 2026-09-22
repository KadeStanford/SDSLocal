begin;

-- All commerce access goes through manually authorized Edge Functions. In
-- particular, even encrypted credentials are never available to API clients.
create table public.square_connections (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null default 'square' check (provider = 'square'),
  environment text not null default 'sandbox' check (environment = 'sandbox'),
  merchant_id text not null,
  merchant_name text not null,
  location_id text,
  location_snapshot jsonb,
  access_cipher jsonb,
  refresh_cipher jsonb,
  key_version text not null,
  expires_at timestamptz not null,
  refreshed_at timestamptz not null default now(),
  state text not null check (state in ('connected','revoked','disconnected','error')),
  last_contact_at timestamptz,
  last_error text,
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  unique (merchant_id, location_id)
);
create table public.square_oauth_states (
  state_hash text primary key check (length(state_hash) = 64),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  environment text not null check (environment = 'sandbox'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.square_ordering_settings (
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
create table public.square_catalog (
  business_id uuid not null references public.businesses(id) on delete cascade,
  location_id text not null,
  object_id text not null,
  object_type text not null,
  version bigint not null,
  payload jsonb not null,
  offering_item_id uuid references public.offering_items(id) on delete set null,
  synced_at timestamptz not null default now(),
  primary key (business_id, object_id)
);
create table public.square_quotes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  guest_hash text not null,
  payload jsonb not null,
  expires_at timestamptz not null default now() + interval '5 minutes',
  created_at timestamptz not null default now()
);
create table public.square_orders (
  id uuid primary key,
  order_number text not null unique default ('S-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
  business_id uuid references public.businesses(id) on delete set null,
  business_name text not null,
  customer_id uuid references auth.users(id) on delete set null,
  guest_hash text,
  merchant_id text not null,
  location_id text not null,
  square_order_id text unique,
  square_payment_id text unique,
  payment_link_id text,
  checkout_url text,
  square_refund_id text unique,
  refund_key uuid,
  stop_id uuid references public.business_location_stops(id) on delete set null,
  pickup_at timestamptz not null,
  pickup_timezone text not null,
  pickup_address text not null,
  recipient jsonb not null,
  subtotal_minor bigint not null check (subtotal_minor between 0 and 10000000),
  tax_minor bigint not null check (tax_minor between 0 and 10000000),
  tip_minor bigint not null default 0 check (tip_minor = 0),
  platform_fee_minor bigint not null default 0 check (platform_fee_minor = 0),
  total_minor bigint not null check (total_minor between 1 and 10000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'checkout_pending' check (status in (
    'checkout_pending','checkout_expired','checkout_failed','payment_review',
    'placed','accepted','preparing','ready','completed','refund_pending','refund_failed','refunded'
  )),
  provider_status text,
  idempotency_key uuid not null unique,
  request_hash text not null,
  provider_request jsonb not null,
  expires_at timestamptz not null default now() + interval '10 minutes',
  version integer not null default 1,
  lease_id uuid,
  lease_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  anonymized_at timestamptz,
  last_reconciled_at timestamptz,
  check (subtotal_minor + tax_minor + tip_minor + platform_fee_minor = total_minor)
);
create index square_orders_queue on public.square_orders (business_id, status, pickup_at);
create index square_orders_expiry on public.square_orders (expires_at) where status = 'checkout_pending';
create table public.square_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.square_orders(id) on delete restrict,
  snapshot jsonb not null
);
create table public.square_order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.square_orders(id) on delete restrict,
  actor_type text not null,
  actor_id uuid references auth.users(id) on delete set null,
  from_state text,
  to_state text not null,
  provider_event_id text,
  created_at timestamptz not null default now()
);
create table public.square_webhook_inbox (
  event_id text primary key,
  event_type text not null,
  merchant_id text not null,
  object_id text,
  signature_verified boolean not null check (signature_verified),
  received_at timestamptz not null default now(),
  occurred_at timestamptz not null,
  processed_at timestamptz,
  attempts integer not null default 0,
  lease_until timestamptz,
  last_error text
);
create table public.square_request_buckets (
  bucket text primary key,
  started_at timestamptz not null default now(),
  requests integer not null default 1
);

insert into public.platform_settings(key,value,description) values
  ('square_commerce', '{"enabled":false,"business_ids":[]}', 'Square Sandbox pickup pilot; allowlisted businesses only. Production is disabled in server code.')
on conflict (key) do nothing;

do $$
declare relation text;
begin
  foreach relation in array array['square_connections','square_oauth_states','square_ordering_settings',
    'square_catalog','square_quotes','square_orders','square_order_items','square_order_events','square_webhook_inbox','square_request_buckets'] loop
    execute format('alter table public.%I enable row level security', relation);
    execute format('revoke all on public.%I from public, anon, authenticated', relation);
    execute format('grant all on public.%I to service_role', relation);
  end loop;
end $$;
grant usage, select on sequence public.square_order_events_id_seq to service_role;

create function public.square_rate_limit(p_bucket text,p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare count_now integer;
begin
  insert into public.square_request_buckets(bucket) values(p_bucket)
  on conflict(bucket) do update set
    requests=case when square_request_buckets.started_at < now()-interval '1 minute' then 1 else square_request_buckets.requests+1 end,
    started_at=case when square_request_buckets.started_at < now()-interval '1 minute' then now() else square_request_buckets.started_at end
  returning requests into count_now;
  return count_now <= least(greatest(p_limit,1),300);
end;
$$;

create function public.square_consume_oauth_state(p_hash text)
returns setof public.square_oauth_states language sql security definer set search_path = '' as $$
  update public.square_oauth_states s set consumed_at = now()
  where s.state_hash = p_hash and s.consumed_at is null and s.expires_at > now()
    and s.environment = 'sandbox'
    and exists(select 1 from public.business_members m where m.business_id=s.business_id
      and m.user_id=s.user_id and m.role='owner' and m.is_active)
  returning s.*;
$$;

-- Serialized capacity and idempotency are database invariants, not UI promises.
create function public.square_reserve_order(p_order jsonb, p_items jsonb)
returns public.square_orders language plpgsql security definer set search_path = '' as $$
declare existing public.square_orders; settings public.square_ordering_settings;
  result public.square_orders; target_business uuid := (p_order->>'business_id')::uuid;
  pickup timestamptz := (p_order->>'pickup_at')::timestamptz; stop public.business_location_stops;
  local_pickup timestamp; rollout jsonb;
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
  -- Expired but still payable links KEEP their reservation until maintenance
  -- has reconciled payment and deleted the provider link successfully.
  if (select count(*) from public.square_orders where business_id = target_business and pickup_at = pickup
      and status not in ('checkout_expired','checkout_failed','refunded')) >= settings.max_orders_per_slot
    then raise exception 'SLOT_FULL'; end if;
  insert into public.square_orders (id,business_id,business_name,customer_id,guest_hash,merchant_id,location_id,
    stop_id,pickup_at,pickup_timezone,pickup_address,recipient,subtotal_minor,tax_minor,total_minor,currency,
    idempotency_key,request_hash,provider_request)
  values ((p_order->>'id')::uuid,target_business,p_order->>'business_name',(p_order->>'customer_id')::uuid,
    p_order->>'guest_hash',p_order->>'merchant_id',p_order->>'location_id',(p_order->>'stop_id')::uuid,
    pickup,p_order->>'pickup_timezone',p_order->>'pickup_address',p_order->'recipient',
    (p_order->>'subtotal_minor')::bigint,(p_order->>'tax_minor')::bigint,(p_order->>'total_minor')::bigint,
    p_order->>'currency',(p_order->>'idempotency_key')::uuid,p_order->>'request_hash',p_order->'provider_request')
  returning * into result;
  insert into public.square_order_items(order_id,snapshot) select result.id,value from jsonb_array_elements(p_items);
  insert into public.square_order_events(order_id,actor_type,actor_id,to_state) values(result.id,'customer',result.customer_id,'checkout_pending');
  return result;
end;
$$;

create function public.square_order_lease(p_id uuid, p_lease uuid, p_version integer default null)
returns setof public.square_orders language sql security definer set search_path = '' as $$
  update public.square_orders set lease_id = p_lease, lease_until = now() + interval '90 seconds'
  where id = p_id and (lease_until is null or lease_until < now()) and (p_version is null or version = p_version)
  returning *;
$$;
create function public.square_connection_lease(p_id uuid, p_lease uuid)
returns setof public.square_connections language sql security definer set search_path = '' as $$
  update public.square_connections set lease_id = p_lease, lease_until = now() + interval '90 seconds'
  where business_id = p_id and (lease_until is null or lease_until < now()) returning *;
$$;
create function public.square_webhook_claim(p_id text)
returns setof public.square_webhook_inbox language sql security definer set search_path = '' as $$
  update public.square_webhook_inbox set lease_until = now() + interval '90 seconds', attempts = attempts + 1
  where event_id = p_id and processed_at is null and (lease_until is null or lease_until < now()) returning *;
$$;

create function public.square_replace_catalog(p_business uuid,p_location text,p_objects jsonb,p_summary jsonb)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.square_connections where business_id=p_business and location_id=p_location and state='connected' for update;
  if not found then raise exception 'CONNECTION_CHANGED'; end if;
  delete from public.square_catalog where business_id=p_business;
  insert into public.square_catalog(business_id,location_id,object_id,object_type,version,payload)
    select p_business,p_location,value->>'id',value->>'type',coalesce((value->>'version')::bigint,0),value from jsonb_array_elements(p_objects);
  update public.square_ordering_settings set synced_at=now(),catalog_revision=gen_random_uuid(),sync_summary=p_summary where business_id=p_business;
end;
$$;

create function public.square_audit_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.status <> new.status then
    insert into public.square_order_events(order_id,actor_type,from_state,to_state)
      values(new.id,'server',old.status,new.status);
  end if;
  if (to_jsonb(old) - array['lease_id','lease_until','last_reconciled_at','updated_at','version'])
    is distinct from (to_jsonb(new) - array['lease_id','lease_until','last_reconciled_at','updated_at','version']) then
    new.version := old.version + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
create trigger square_order_audit before update on public.square_orders for each row execute function public.square_audit_transition();

-- Sole-owner deletion must revoke first; history survives the business FK.
create function public.square_business_deletion_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists(select 1 from public.square_connections where business_id=old.id and state='connected')
    or exists(select 1 from public.square_orders where business_id=old.id and status not in ('completed','refunded','checkout_expired','checkout_failed'))
    then raise exception 'Settle active pickup orders and disconnect Square before deleting this business.'; end if;
  update public.square_orders set recipient='{}',guest_hash=null,checkout_url=null,provider_request='{}',anonymized_at=now() where business_id=old.id;
  return old;
end;
$$;
create trigger square_business_delete before delete on public.businesses for each row execute function public.square_business_deletion_guard();
create function public.square_customer_anonymize()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.square_orders set recipient='{}',guest_hash=null,provider_request='{}',checkout_url=null,anonymized_at=now()
    where customer_id=old.id and status in ('completed','refunded','checkout_expired','checkout_failed');
  return old;
end;
$$;
create trigger square_customer_delete before delete on auth.users for each row execute function public.square_customer_anonymize();

do $$
declare fn record;
begin
  for fn in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'square\_%' escape '\' loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end $$;
commit;
