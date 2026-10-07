begin;

-- Appointment data is private. Clients never read or write these tables directly;
-- the Square commerce Edge Function enforces the caller's role/capability.
create table public.appointment_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  enabled boolean not null default false,
  timezone text not null,
  minimum_notice_minutes integer not null default 120 check (minimum_notice_minutes between 0 and 43200),
  booking_horizon_days integer not null default 60 check (booking_horizon_days between 1 and 365),
  slot_interval_minutes integer not null default 15 check (slot_interval_minutes in (5,10,15,20,30,60)),
  automatically_confirm boolean not null default true,
  cancellation_cutoff_minutes integer not null default 1440 check (cancellation_cutoff_minutes between 0 and 43200),
  cancellation_terms varchar(1200) not null default '',
  public_instructions varchar(1200) not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.appointment_services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  offering_item_id uuid references public.offering_items(id) on delete set null,
  name varchar(120) not null,
  description varchar(1000) not null default '',
  duration_minutes integer not null check (duration_minutes between 5 and 600),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 240),
  price_minor integer not null default 0 check (price_minor between 0 and 100000000),
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  price_is_fixed boolean not null default true,
  payment_policy text not null default 'pay_in_person'
    check (payment_policy in ('pay_in_person','fixed_deposit','percentage_deposit','full_prepayment')),
  deposit_minor integer check (deposit_minor between 1 and 100000000),
  deposit_percent integer check (deposit_percent between 1 and 100),
  capacity integer not null default 1 check (capacity between 1 and 100),
  requires_resource boolean not null default false,
  requires_approval boolean not null default false,
  is_bookable boolean not null default false,
  public_instructions varchar(1200) not null default '',
  internal_notes varchar(1200) not null default '',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_services_deposit_policy check (
    (payment_policy = 'pay_in_person' and deposit_minor is null and deposit_percent is null)
    or (payment_policy = 'fixed_deposit' and deposit_minor is not null and deposit_percent is null)
    or (payment_policy = 'percentage_deposit' and deposit_minor is null and deposit_percent is not null)
    or (payment_policy = 'full_prepayment' and deposit_minor is null and deposit_percent is null)
  ),
  constraint appointment_services_price_policy check (
    (price_is_fixed or payment_policy = 'pay_in_person')
    and (payment_policy = 'pay_in_person' or price_minor > 0)
  ),
  constraint appointment_services_deposit_within_price check (
    deposit_minor is null or deposit_minor <= price_minor
  ),
  constraint appointment_services_name_nonempty check (char_length(trim(name)) between 1 and 120),
  unique (id, business_id)
);
create index appointment_services_public on public.appointment_services(business_id, name)
  where is_bookable and archived_at is null;
create unique index appointment_services_offering_unique on public.appointment_services(offering_item_id)
  where offering_item_id is not null and archived_at is null;
create trigger appointment_services_set_updated_at
before update on public.appointment_services
for each row execute function public.set_updated_at();

create table public.appointment_resources (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name varchar(120) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_resources_name_nonempty check (char_length(trim(name)) between 1 and 120),
  unique (business_id, user_id),
  unique (id, business_id)
);
create index appointment_resources_active on public.appointment_resources(business_id, name)
  where is_active;
create trigger appointment_resources_set_updated_at
before update on public.appointment_resources
for each row execute function public.set_updated_at();

create table public.appointment_service_resources (
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null,
  resource_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (service_id, resource_id),
  foreign key (service_id, business_id) references public.appointment_services(id, business_id) on delete cascade,
  foreign key (resource_id, business_id) references public.appointment_resources(id, business_id) on delete cascade
);

create table public.appointment_weekly_windows (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid,
  resource_id uuid,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at time not null,
  closes_at time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at),
  foreign key (service_id, business_id) references public.appointment_services(id, business_id) on delete cascade,
  foreign key (resource_id, business_id) references public.appointment_resources(id, business_id) on delete cascade
);
create index appointment_weekly_windows_lookup on public.appointment_weekly_windows
  (business_id, day_of_week, service_id, resource_id, opens_at);
create trigger appointment_weekly_windows_set_updated_at
before update on public.appointment_weekly_windows
for each row execute function public.set_updated_at();

create table public.appointment_date_overrides (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid,
  resource_id uuid,
  local_date date not null,
  is_closed boolean not null default false,
  opens_at time,
  closes_at time,
  note varchar(300) not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (is_closed and opens_at is null and closes_at is null)
    or (not is_closed and opens_at is not null and closes_at is not null and closes_at > opens_at)
  ),
  foreign key (service_id, business_id) references public.appointment_services(id, business_id) on delete cascade,
  foreign key (resource_id, business_id) references public.appointment_resources(id, business_id) on delete cascade
);
create unique index appointment_date_overrides_scope_unique
  on public.appointment_date_overrides(business_id, local_date, coalesce(service_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(resource_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index appointment_date_overrides_lookup on public.appointment_date_overrides
  (business_id, local_date, service_id, resource_id);
create trigger appointment_date_overrides_set_updated_at
before update on public.appointment_date_overrides
for each row execute function public.set_updated_at();

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  service_id uuid references public.appointment_services(id) on delete set null,
  resource_id uuid references public.appointment_resources(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  guest_hash text check (guest_hash is null or guest_hash ~ '^[a-f0-9]{64}$'),
  customer_name varchar(100) not null,
  customer_phone varchar(32) not null,
  customer_email varchar(254),
  customer_notes varchar(1200) not null default '',
  service_snapshot jsonb not null,
  resource_snapshot jsonb not null default '{}'::jsonb,
  policy_snapshot jsonb not null,
  timezone text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  blocked_until timestamptz not null,
  status text not null check (status in (
    'requested','payment_pending','confirmed','checked_in','in_service','completed',
    'cancellation_pending','cancelled','no_show','payment_review'
  )),
  payment_status text not null check (payment_status in (
    'none','pending','paid','refund_pending','refund_failed','refunded','reimbursed_external','review'
  )),
  total_minor integer not null check (total_minor between 0 and 100000000),
  amount_due_minor integer not null check (amount_due_minor between 0 and 100000000),
  refunded_minor integer not null default 0 check (refunded_minor between 0 and 100000000),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  square_order_id text unique,
  square_payment_id text unique,
  square_payment_link_id text unique,
  square_refund_id text unique,
  square_refund_key uuid,
  external_reimbursement_confirmed_at timestamptz,
  external_reimbursement_confirmed_by uuid references auth.users(id) on delete set null,
  checkout_url text,
  provider_request jsonb not null default '{}'::jsonb,
  operation_lease uuid,
  operation_lease_until timestamptz,
  hold_expires_at timestamptz,
  cancellation_requested_at timestamptz,
  confirmed_at timestamptz,
  checked_in_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  version integer not null default 1 check (version > 0),
  idempotency_key uuid not null unique,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  anonymized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (blocked_until >= ends_at),
  check (amount_due_minor <= total_minor),
  check (refunded_minor <= amount_due_minor),
  constraint appointments_customer_access_check check (
    customer_id is not null or guest_hash is not null or anonymized_at is not null
  ),
  check ((status = 'payment_pending') = (hold_expires_at is not null))
);
create index appointments_business_queue on public.appointments(business_id, status, starts_at);
create index appointments_resource_time on public.appointments(resource_id, starts_at, blocked_until)
  where resource_id is not null;
create index appointments_customer_history on public.appointments(customer_id, starts_at desc)
  where customer_id is not null;
create index appointments_guest_history on public.appointments(id, guest_hash) where guest_hash is not null;
create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function public.set_updated_at();

create or replace function public.appointment_profile_delete_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.appointments appointment
    where appointment.customer_id = old.id
      and (
        appointment.status not in ('cancelled','completed','no_show')
        or appointment.payment_status in ('pending','refund_pending','refund_failed','review')
      )
  ) then
    raise exception 'Resolve upcoming appointments and outstanding payments before deleting this account.'
      using errcode = '23503';
  end if;
  update public.appointments set
    customer_id = null, guest_hash = null, customer_name = 'Removed customer',
    customer_phone = '', customer_email = null, customer_notes = '', anonymized_at = now()
  where customer_id = old.id;
  return old;
end;
$$;
revoke all on function public.appointment_profile_delete_guard() from public;
create trigger appointment_customer_profile_delete
before delete on public.profiles
for each row execute function public.appointment_profile_delete_guard();

create or replace function public.appointment_business_delete_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from public.appointments appointment
    where appointment.business_id = old.id
      and (
        appointment.status not in ('cancelled','completed','no_show')
        or appointment.payment_status in ('pending','refund_pending','refund_failed','review')
      )
  ) then
    raise exception 'Resolve upcoming appointments and outstanding payments before deleting this business.'
      using errcode = '23503';
  end if;
  update public.appointments set
    business_id = null, guest_hash = null, customer_name = 'Removed business',
    customer_phone = '', customer_email = null, customer_notes = '', anonymized_at = now()
  where business_id = old.id;
  return old;
end;
$$;
revoke all on function public.appointment_business_delete_guard() from public;
create trigger appointment_business_delete
before delete on public.businesses
for each row execute function public.appointment_business_delete_guard();

create table public.appointment_holds (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid not null references public.appointment_services(id) on delete cascade,
  resource_id uuid references public.appointment_resources(id) on delete set null,
  starts_at timestamptz not null,
  blocked_until timestamptz not null,
  expires_at timestamptz not null,
  state text not null default 'active' check (state in ('active','consumed','expired','review')),
  created_at timestamptz not null default now(),
  check (blocked_until > starts_at)
);
create index appointment_holds_conflicts on public.appointment_holds
  (business_id, service_id, resource_id, starts_at, expires_at) where state = 'active';

create table public.appointment_events (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  actor_type text not null check (actor_type in ('customer','guest','operator','owner','provider','system')),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'created','payment_updated','confirmed','checked_in','started','completed',
    'cancel_requested','cancelled','rescheduled','no_show','refund_updated','note'
  )),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index appointment_events_history on public.appointment_events(appointment_id, created_at);

create table public.appointment_reschedule_keys (
  idempotency_key uuid primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  result_version integer not null,
  created_at timestamptz not null default now()
);

create table public.appointment_refunds (
  square_refund_id text primary key,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  idempotency_key uuid not null,
  amount_minor integer not null check (amount_minor between 1 and 100000000),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  provider_status text not null check (provider_status in ('PENDING','COMPLETED','FAILED','REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (appointment_id, idempotency_key)
);
create index appointment_refunds_history on public.appointment_refunds(appointment_id, created_at desc);
create trigger appointment_refunds_set_updated_at
before update on public.appointment_refunds
for each row execute function public.set_updated_at();

alter table public.appointment_settings enable row level security;
alter table public.appointment_services enable row level security;
alter table public.appointment_resources enable row level security;
alter table public.appointment_service_resources enable row level security;
alter table public.appointment_weekly_windows enable row level security;
alter table public.appointment_date_overrides enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_holds enable row level security;
alter table public.appointment_events enable row level security;
alter table public.appointment_reschedule_keys enable row level security;
alter table public.appointment_refunds enable row level security;

revoke all on public.appointment_settings, public.appointment_services, public.appointment_resources,
  public.appointment_service_resources, public.appointment_weekly_windows,
  public.appointment_date_overrides, public.appointments, public.appointment_holds,
  public.appointment_events from public, anon, authenticated;
revoke all on public.appointment_reschedule_keys from public, anon, authenticated;
revoke all on public.appointment_refunds from public, anon, authenticated;
grant all on public.appointment_settings, public.appointment_services, public.appointment_resources,
  public.appointment_service_resources, public.appointment_weekly_windows,
  public.appointment_date_overrides, public.appointments, public.appointment_holds,
  public.appointment_events to service_role;
grant all on public.appointment_reschedule_keys to service_role;
grant all on public.appointment_refunds to service_role;

create or replace function public.get_appointment_capabilities(p_business_ids uuid[] default null)
returns table(business_id uuid, supports_appointments boolean)
language sql stable security definer set search_path = '' set row_security = off as $$
  select business.id, true
  from public.businesses business
  join public.appointment_settings settings on settings.business_id = business.id and settings.enabled
  join public.appointment_services service
    on service.business_id = business.id and service.is_bookable and service.archived_at is null
  join public.platform_settings rollout on rollout.key = 'appointment_booking'
  where business.status = 'active' and business.business_type = 'services'
    and (p_business_ids is null or business.id = any(p_business_ids))
    and rollout.value->'enabled' = 'true'::jsonb
    and coalesce(rollout.value->>'public_environment',rollout.value->>'environment')
      in ('development','staging','test')
    and (rollout.value->'business_ids') ? business.id::text
    and not exists (
      select 1 from public.blocked_businesses blocked
      where blocked.business_id = business.id and blocked.customer_id = (select auth.uid())
    )
  group by business.id
  limit 500;
$$;
revoke all on function public.get_appointment_capabilities(uuid[]) from public;
grant execute on function public.get_appointment_capabilities(uuid[]) to anon, authenticated;
alter function public.get_appointment_capabilities(uuid[]) set row_security = off;

create or replace function public.get_appointment_status(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' set row_security = off as $$
  select exists (
    select 1 from public.get_appointment_capabilities(array[p_business_id]) capability
    where capability.business_id = p_business_id
  );
$$;
revoke all on function public.get_appointment_status(uuid) from public;
grant execute on function public.get_appointment_status(uuid) to anon, authenticated;

create or replace function public.save_appointment_setup(
  p_business_id uuid,
  p_actor_id uuid,
  p_setup jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record public.businesses%rowtype;
  settings_json jsonb := p_setup->'settings';
  service_json jsonb;
  resource_json jsonb;
  window_json jsonb;
  override_json jsonb;
  service_id uuid;
  resource_id uuid;
  offering_id uuid;
  resource_user_id uuid;
  affected_rows integer;
  service_ids uuid[] := '{}';
  resource_ids uuid[] := '{}';
  services_json jsonb := coalesce(p_setup->'services','[]'::jsonb);
  resources_json jsonb := coalesce(p_setup->'resources','[]'::jsonb);
  windows_json jsonb := coalesce(p_setup->'windows','[]'::jsonb);
  overrides_json jsonb := coalesce(p_setup->'overrides','[]'::jsonb);
begin
  if p_actor_id is null or jsonb_typeof(p_setup) <> 'object'
    or jsonb_typeof(settings_json) <> 'object'
    or jsonb_typeof(services_json) <> 'array'
    or jsonb_typeof(resources_json) <> 'array'
    or jsonb_typeof(windows_json) <> 'array'
    or jsonb_typeof(overrides_json) <> 'array' then
    raise exception 'APPOINTMENT_SETUP_INVALID' using errcode = '22023';
  end if;
  if jsonb_array_length(services_json) > 30 or jsonb_array_length(resources_json) > 50
    or jsonb_array_length(windows_json) > 300 or jsonb_array_length(overrides_json) > 300 then
    raise exception 'APPOINTMENT_SETUP_TOO_LARGE' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id and member.user_id = p_actor_id
      and member.role = 'owner' and member.is_active
  ) then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
  select * into business_record from public.businesses
    where id = p_business_id and business_type = 'services' for update;
  if not found then raise exception 'BUSINESS_UNAVAILABLE' using errcode = 'P0002'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = settings_json->>'timezone') then
    raise exception 'INVALID_TIMEZONE' using errcode = '22023';
  end if;

  insert into public.appointment_settings(
    business_id,enabled,timezone,minimum_notice_minutes,booking_horizon_days,
    slot_interval_minutes,automatically_confirm,cancellation_cutoff_minutes,
    cancellation_terms,public_instructions,updated_by
  ) values (
    p_business_id,coalesce((settings_json->>'enabled')::boolean,false),settings_json->>'timezone',
    coalesce((settings_json->>'minimumNoticeMinutes')::integer,120),
    coalesce((settings_json->>'bookingHorizonDays')::integer,60),
    coalesce((settings_json->>'slotIntervalMinutes')::integer,15),
    coalesce((settings_json->>'automaticallyConfirm')::boolean,true),
    coalesce((settings_json->>'cancellationCutoffMinutes')::integer,1440),
    left(coalesce(settings_json->>'cancellationTerms',''),1200),
    left(coalesce(settings_json->>'publicInstructions',''),1200),p_actor_id
  ) on conflict (business_id) do update set
    enabled=excluded.enabled,timezone=excluded.timezone,
    minimum_notice_minutes=excluded.minimum_notice_minutes,
    booking_horizon_days=excluded.booking_horizon_days,
    slot_interval_minutes=excluded.slot_interval_minutes,
    automatically_confirm=excluded.automatically_confirm,
    cancellation_cutoff_minutes=excluded.cancellation_cutoff_minutes,
    cancellation_terms=excluded.cancellation_terms,
    public_instructions=excluded.public_instructions,
    updated_by=excluded.updated_by,updated_at=now();

  for resource_json in select value from jsonb_array_elements(resources_json) loop
    resource_id := coalesce(nullif(resource_json->>'id','')::uuid,gen_random_uuid());
    resource_user_id := nullif(resource_json->>'userId','')::uuid;
    if resource_user_id is not null and not exists (
      select 1 from public.business_members member
      where member.business_id=p_business_id and member.user_id=resource_user_id
        and member.is_active and member.role in ('owner','staff')
    ) then raise exception 'APPOINTMENT_RESOURCE_MEMBER_INVALID' using errcode = '22023'; end if;
    insert into public.appointment_resources(id,business_id,user_id,name,is_active)
      values(resource_id,p_business_id,resource_user_id,left(trim(resource_json->>'name'),120),
        coalesce((resource_json->>'isActive')::boolean,true))
      on conflict (id) do update set user_id=excluded.user_id,name=excluded.name,
        is_active=excluded.is_active,updated_at=now()
      where public.appointment_resources.business_id=excluded.business_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'APPOINTMENT_RESOURCE_INVALID' using errcode = '22023'; end if;
    resource_ids := array_append(resource_ids,resource_id);
  end loop;
  update public.appointment_resources set is_active=false,updated_at=now()
    where business_id=p_business_id and not (id=any(resource_ids));

  update public.appointment_services set is_bookable=false,archived_at=coalesce(archived_at,now()),updated_at=now()
    where business_id=p_business_id and archived_at is null;
  for service_json in select value from jsonb_array_elements(services_json) loop
    service_id := coalesce(nullif(service_json->>'id','')::uuid,gen_random_uuid());
    offering_id := nullif(service_json->>'offeringItemId','')::uuid;
    if offering_id is not null and not exists (
      select 1 from public.offering_items offering
      where offering.id=offering_id and offering.business_id=p_business_id
    ) then raise exception 'APPOINTMENT_OFFERING_INVALID' using errcode = '22023'; end if;
    insert into public.appointment_services(
      id,business_id,offering_item_id,name,description,duration_minutes,buffer_minutes,
      price_minor,currency,price_is_fixed,payment_policy,deposit_minor,deposit_percent,
      capacity,requires_resource,requires_approval,is_bookable,public_instructions,internal_notes,archived_at
    ) values (
      service_id,p_business_id,offering_id,left(trim(service_json->>'name'),120),
      left(coalesce(service_json->>'description',''),1000),
      (service_json->>'durationMinutes')::integer,
      coalesce((service_json->>'bufferMinutes')::integer,0),
      coalesce((service_json->>'priceMinor')::integer,0),upper(coalesce(service_json->>'currency','USD')),
      coalesce((service_json->>'priceIsFixed')::boolean,true),
      coalesce(service_json->>'paymentPolicy','pay_in_person'),
      nullif(service_json->>'depositMinor','')::integer,
      nullif(service_json->>'depositPercent','')::integer,
      coalesce((service_json->>'capacity')::integer,1),
      coalesce((service_json->>'requiresResource')::boolean,false),
      coalesce((service_json->>'requiresApproval')::boolean,false),
      coalesce((service_json->>'isBookable')::boolean,false),
      left(coalesce(service_json->>'publicInstructions',''),1200),
      left(coalesce(service_json->>'internalNotes',''),1200),null
    ) on conflict (id) do update set
      offering_item_id=excluded.offering_item_id,name=excluded.name,description=excluded.description,
      duration_minutes=excluded.duration_minutes,buffer_minutes=excluded.buffer_minutes,
      price_minor=excluded.price_minor,currency=excluded.currency,price_is_fixed=excluded.price_is_fixed,
      payment_policy=excluded.payment_policy,deposit_minor=excluded.deposit_minor,
      deposit_percent=excluded.deposit_percent,capacity=excluded.capacity,
      requires_resource=excluded.requires_resource,requires_approval=excluded.requires_approval,
      is_bookable=excluded.is_bookable,public_instructions=excluded.public_instructions,
      internal_notes=excluded.internal_notes,archived_at=null,updated_at=now()
      where public.appointment_services.business_id=excluded.business_id;
    get diagnostics affected_rows = row_count;
    if affected_rows = 0 then raise exception 'APPOINTMENT_SERVICE_INVALID' using errcode = '22023'; end if;
    service_ids := array_append(service_ids,service_id);
    delete from public.appointment_service_resources mapping where mapping.service_id=service_id;
    if jsonb_typeof(coalesce(service_json->'resourceIds','[]'::jsonb)) <> 'array' then
      raise exception 'APPOINTMENT_SETUP_INVALID' using errcode = '22023';
    end if;
    for resource_id in select value::uuid from jsonb_array_elements_text(coalesce(service_json->'resourceIds','[]'::jsonb)) loop
      if not (resource_id=any(resource_ids)) then raise exception 'APPOINTMENT_RESOURCE_INVALID' using errcode = '22023'; end if;
      insert into public.appointment_service_resources(business_id,service_id,resource_id)
        values(p_business_id,service_id,resource_id);
    end loop;
    if coalesce((service_json->>'requiresResource')::boolean,false)
      and not exists (select 1 from public.appointment_service_resources mapping where mapping.service_id=service_id) then
      raise exception 'APPOINTMENT_RESOURCE_REQUIRED' using errcode = '22023';
    end if;
  end loop;

  delete from public.appointment_weekly_windows where business_id=p_business_id;
  for window_json in select value from jsonb_array_elements(windows_json) loop
    insert into public.appointment_weekly_windows(
      business_id,service_id,resource_id,day_of_week,opens_at,closes_at
    ) values (
      p_business_id,nullif(window_json->>'serviceId','')::uuid,
      nullif(window_json->>'resourceId','')::uuid,
      (window_json->>'dayOfWeek')::smallint,(window_json->>'opensAt')::time,
      (window_json->>'closesAt')::time
    );
  end loop;
  delete from public.appointment_date_overrides
    where business_id=p_business_id and local_date >= current_date;
  for override_json in select value from jsonb_array_elements(overrides_json) loop
    insert into public.appointment_date_overrides(
      business_id,service_id,resource_id,local_date,is_closed,opens_at,closes_at,note
    ) values (
      p_business_id,nullif(override_json->>'serviceId','')::uuid,
      nullif(override_json->>'resourceId','')::uuid,(override_json->>'localDate')::date,
      coalesce((override_json->>'isClosed')::boolean,false),
      nullif(override_json->>'opensAt','')::time,nullif(override_json->>'closesAt','')::time,
      left(coalesce(override_json->>'note',''),300)
    );
  end loop;
  return true;
end;
$$;
revoke all on function public.save_appointment_setup(uuid,uuid,jsonb) from public;
grant execute on function public.save_appointment_setup(uuid,uuid,jsonb) to service_role;

-- The row lock serializes all bookings for this business while the function
-- recomputes schedule, policy, price, resource, capacity and conflicts in SQL.
create or replace function public.reserve_appointment_slot(
  p_business_id uuid,
  p_service_id uuid,
  p_resource_id uuid,
  p_start_at timestamptz,
  p_customer_id uuid,
  p_guest_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_notes text,
  p_idempotency_key uuid,
  p_request_hash text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record public.businesses%rowtype;
  settings_row public.appointment_settings%rowtype;
  service_row public.appointment_services%rowtype;
  resource_row public.appointment_resources%rowtype;
  existing_row public.appointments%rowtype;
  override_row public.appointment_date_overrides%rowtype;
  local_start timestamp;
  local_day date;
  day_index integer;
  start_minute integer;
  open_minute integer;
  close_minute integer;
  amount_due integer;
  next_status text;
  next_payment_status text;
  appointment_id uuid;
  hold_until timestamptz;
  busy_count integer;
  local_window record;
  business_window record;
  has_resource_windows boolean;
  has_service_windows boolean;
begin
  if p_idempotency_key is null or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'IDEMPOTENCY_INVALID' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_customer_name, ''))) not between 1 and 100
    or char_length(trim(coalesce(p_customer_phone, ''))) not between 7 and 32
    or char_length(coalesce(p_customer_email, '')) > 254
    or char_length(coalesce(p_notes, '')) > 1200 then
    raise exception 'CONTACT_INVALID' using errcode = '22023';
  end if;
  if p_customer_id is null and (p_guest_hash is null or p_guest_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'GUEST_ACCESS_REQUIRED' using errcode = '22023';
  end if;

  select * into existing_row from public.appointments
    where idempotency_key = p_idempotency_key;
  if found then
    if existing_row.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return existing_row.id;
  end if;

  select * into business_record from public.businesses
    where id = p_business_id and status = 'active' and business_type = 'services'
    for update;
  if not found then raise exception 'BUSINESS_UNAVAILABLE' using errcode = 'P0002'; end if;
  select * into existing_row from public.appointments
    where idempotency_key = p_idempotency_key;
  if found then
    if existing_row.request_hash <> p_request_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = '23505';
    end if;
    return existing_row.id;
  end if;
  select * into settings_row from public.appointment_settings
    where business_id = p_business_id and enabled;
  if not found then raise exception 'BOOKING_CLOSED' using errcode = '22023'; end if;
  select * into service_row from public.appointment_services
    where id = p_service_id and business_id = p_business_id
      and is_bookable and archived_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE' using errcode = '22023'; end if;

  if service_row.requires_resource then
    if p_resource_id is null then raise exception 'RESOURCE_REQUIRED' using errcode = '22023'; end if;
    select * into resource_row from public.appointment_resources
      where id = p_resource_id and business_id = p_business_id and is_active;
    if not found or not exists (
      select 1 from public.appointment_service_resources eligible
      where eligible.business_id = p_business_id and eligible.service_id = p_service_id
        and eligible.resource_id = p_resource_id
    ) then raise exception 'RESOURCE_UNAVAILABLE' using errcode = '22023'; end if;
  elsif p_resource_id is not null then
    select * into resource_row from public.appointment_resources
      where id = p_resource_id and business_id = p_business_id and is_active;
    if not found or not exists (
      select 1 from public.appointment_service_resources eligible
      where eligible.business_id = p_business_id and eligible.service_id = p_service_id
        and eligible.resource_id = p_resource_id
    ) then raise exception 'RESOURCE_UNAVAILABLE' using errcode = '22023'; end if;
  end if;

  local_start := p_start_at at time zone settings_row.timezone;
  local_day := local_start::date;
  -- PostgreSQL resolves repeated local times to standard time. Requiring this
  -- exact round trip rejects nonexistent local times and the duplicate DST copy.
  if local_start at time zone settings_row.timezone <> p_start_at then
    raise exception 'INVALID_LOCAL_TIME' using errcode = '22023';
  end if;
  if p_start_at < now() + make_interval(mins => settings_row.minimum_notice_minutes)
    or p_start_at > now() + make_interval(days => settings_row.booking_horizon_days) then
    raise exception 'OUTSIDE_BOOKING_WINDOW' using errcode = '22023';
  end if;
  day_index := extract(dow from local_start)::integer;
  start_minute := extract(hour from local_start)::integer * 60 + extract(minute from local_start)::integer;

  select * into override_row from public.appointment_date_overrides date_override
  where date_override.business_id = p_business_id and date_override.local_date = local_day
    and (date_override.service_id is null or date_override.service_id = p_service_id)
    and (date_override.resource_id is null or date_override.resource_id = p_resource_id)
  order by (date_override.resource_id is not null) desc, (date_override.service_id is not null) desc
  limit 1;
  if found then
    if override_row.is_closed then raise exception 'DATE_CLOSED' using errcode = '22023'; end if;
    open_minute := extract(hour from override_row.opens_at)::integer * 60
      + extract(minute from override_row.opens_at)::integer;
    close_minute := extract(hour from override_row.closes_at)::integer * 60
      + extract(minute from override_row.closes_at)::integer;
  else
    select exists (
      select 1 from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.resource_id = p_resource_id and p_resource_id is not null
        and (weekly_window.service_id is null or weekly_window.service_id = p_service_id)
    ) into has_resource_windows;
    select exists (
      select 1 from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id = p_service_id and weekly_window.resource_id is null
    ) into has_service_windows;
    if has_resource_windows then
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.resource_id = p_resource_id
        and (weekly_window.service_id is null or weekly_window.service_id = p_service_id)
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by (weekly_window.service_id is not null) desc, weekly_window.opens_at
      limit 1;
    elsif has_service_windows then
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id = p_service_id and weekly_window.resource_id is null
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by weekly_window.opens_at
      limit 1;
    else
      select weekly_window.opens_at, weekly_window.closes_at into local_window
      from public.appointment_weekly_windows weekly_window
      where weekly_window.business_id = p_business_id and weekly_window.day_of_week = day_index
        and weekly_window.service_id is null and weekly_window.resource_id is null
        and start_minute >= extract(hour from weekly_window.opens_at)::integer * 60 + extract(minute from weekly_window.opens_at)::integer
        and start_minute + service_row.duration_minutes + service_row.buffer_minutes
          <= extract(hour from weekly_window.closes_at)::integer * 60 + extract(minute from weekly_window.closes_at)::integer
      order by weekly_window.opens_at
      limit 1;
    end if;
    if not found then
      raise exception 'NO_AVAILABILITY' using errcode = '22023';
    end if;
    open_minute := extract(hour from local_window.opens_at)::integer * 60
      + extract(minute from local_window.opens_at)::integer;
    close_minute := extract(hour from local_window.closes_at)::integer * 60
      + extract(minute from local_window.closes_at)::integer;
  end if;
  if start_minute < open_minute or start_minute + service_row.duration_minutes
      + service_row.buffer_minutes > close_minute
    or mod(start_minute - open_minute, settings_row.slot_interval_minutes) <> 0 then
    raise exception 'INVALID_SLOT' using errcode = '22023';
  end if;
  select hours.opens_at, hours.closes_at into business_window
  from public.business_hours hours
  where hours.business_id = p_business_id and hours.day_of_week = day_index
    and not hours.is_closed
    and start_minute >= extract(hour from hours.opens_at)::integer * 60
      + extract(minute from hours.opens_at)::integer
    and start_minute + service_row.duration_minutes + service_row.buffer_minutes
      <= extract(hour from hours.closes_at)::integer * 60
        + extract(minute from hours.closes_at)::integer
  order by hours.interval_number
  limit 1;
  if not found then raise exception 'BUSINESS_CLOSED' using errcode = '22023'; end if;

  amount_due := case service_row.payment_policy
    when 'fixed_deposit' then service_row.deposit_minor
    when 'percentage_deposit' then ceil(service_row.price_minor * service_row.deposit_percent / 100.0)::integer
    when 'full_prepayment' then service_row.price_minor
    else 0 end;
  next_status := case
    when amount_due > 0 then 'payment_pending'
    when service_row.requires_approval or not settings_row.automatically_confirm then 'requested'
    else 'confirmed' end;
  next_payment_status := case when amount_due > 0 then 'pending' else 'none' end;
  hold_until := case when amount_due > 0 then now() + interval '20 minutes' else null end;

  if service_row.capacity > 1 then
    select count(*) into busy_count from public.appointments appointment
    where appointment.business_id = p_business_id and appointment.service_id = p_service_id
      and appointment.status not in ('cancelled','no_show')
      and appointment.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
      and appointment.blocked_until > p_start_at;
    if busy_count >= service_row.capacity then raise exception 'SLOT_FULL' using errcode = '23505'; end if;
    if p_resource_id is not null and exists (
      select 1 from public.appointments appointment
      where appointment.business_id = p_business_id and appointment.resource_id = p_resource_id
        and appointment.status not in ('cancelled','no_show')
        and appointment.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
        and appointment.blocked_until > p_start_at
    ) then raise exception 'SLOT_FULL' using errcode = '23505'; end if;
  else
    select count(*) into busy_count from public.appointments appointment
    where appointment.business_id = p_business_id
      and appointment.status not in ('cancelled','no_show')
      and appointment.starts_at < p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes)
      and appointment.blocked_until > p_start_at
      and (
        (p_resource_id is not null and appointment.resource_id = p_resource_id)
        or (p_resource_id is null and appointment.service_id = p_service_id and appointment.resource_id is null)
      );
    if busy_count > 0 then raise exception 'SLOT_FULL' using errcode = '23505'; end if;
  end if;

  appointment_id := gen_random_uuid();
  insert into public.appointments (
    id, business_id, service_id, resource_id, customer_id, guest_hash,
    customer_name, customer_phone, customer_email, customer_notes, service_snapshot, resource_snapshot, policy_snapshot,
    timezone, starts_at, ends_at, blocked_until, status, payment_status,
    total_minor, amount_due_minor, currency, hold_expires_at,
    idempotency_key, request_hash
  ) values (
    appointment_id, p_business_id, p_service_id, p_resource_id, p_customer_id, p_guest_hash,
    trim(p_customer_name), trim(p_customer_phone), nullif(trim(coalesce(p_customer_email,'')), ''),
    trim(coalesce(p_notes,'')),
    jsonb_build_object('name',service_row.name,'description',service_row.description,
      'durationMinutes',service_row.duration_minutes,'bufferMinutes',service_row.buffer_minutes,
      'priceMinor',service_row.price_minor,'currency',service_row.currency,
      'priceIsFixed',service_row.price_is_fixed,'publicInstructions',service_row.public_instructions,
      'requiresApproval',service_row.requires_approval,
      'automaticallyConfirm',settings_row.automatically_confirm),
    case when p_resource_id is null then '{}'::jsonb
      else jsonb_build_object('id',resource_row.id,'name',resource_row.name,'userId',resource_row.user_id) end,
    jsonb_build_object('paymentPolicy',service_row.payment_policy,'amountDueMinor',amount_due,
      'cancellationCutoffMinutes',settings_row.cancellation_cutoff_minutes,
      'cancellationTerms',settings_row.cancellation_terms,'preparation',service_row.public_instructions),
    settings_row.timezone, p_start_at,
    p_start_at + make_interval(mins => service_row.duration_minutes),
    p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes),
    next_status, next_payment_status, service_row.price_minor, amount_due, service_row.currency,
    hold_until, p_idempotency_key, p_request_hash
  );
  if amount_due > 0 then
    insert into public.appointment_holds (
      appointment_id,business_id,service_id,resource_id,starts_at,blocked_until,expires_at
    ) values (
      appointment_id,p_business_id,p_service_id,p_resource_id,p_start_at,
      p_start_at + make_interval(mins => service_row.duration_minutes + service_row.buffer_minutes),
      hold_until
    );
  end if;
  insert into public.appointment_events(appointment_id, actor_type, actor_id, event_type, details)
    values(appointment_id, case when p_customer_id is null then 'guest' else 'customer' end,
      p_customer_id, 'created', jsonb_build_object('status', next_status));
  return appointment_id;
end;
$$;
revoke all on function public.reserve_appointment_slot(uuid,uuid,uuid,timestamptz,uuid,text,text,text,text,text,uuid,text) from public;
grant execute on function public.reserve_appointment_slot(uuid,uuid,uuid,timestamptz,uuid,text,text,text,text,text,uuid,text) to service_role;

create or replace function public.appointment_payment_lease(p_appointment_id uuid, p_lease uuid)
returns setof public.appointments
language sql
security definer
set search_path = ''
as $$
  update public.appointments set operation_lease = p_lease,
    operation_lease_until = now() + interval '90 seconds'
  where id = p_appointment_id and status = 'payment_pending'
    and (operation_lease_until is null or operation_lease_until < now())
  returning *
$$;
revoke all on function public.appointment_payment_lease(uuid,uuid) from public;
grant execute on function public.appointment_payment_lease(uuid,uuid) to service_role;

create or replace function public.resolve_appointment_payment_hold(
  p_appointment_id uuid,
  p_payment_confirmed boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
begin
  select * into appointment_row from public.appointments
    where id = p_appointment_id for update;
  if not found or appointment_row.status <> 'payment_pending' then return false; end if;
  if p_payment_confirmed then
    update public.appointments set status = 'payment_review', payment_status = 'review',
      hold_expires_at = null, operation_lease = null, operation_lease_until = null,
      version = version + 1 where id = p_appointment_id;
    update public.appointment_holds set state = 'review' where appointment_id = p_appointment_id;
    insert into public.appointment_events(appointment_id, actor_type, event_type, details)
      values(p_appointment_id, 'provider', 'payment_updated', jsonb_build_object('state','late_payment_review'));
  else
    update public.appointments set status = 'cancelled', payment_status = 'none',
      hold_expires_at = null, cancelled_at = now(), operation_lease = null,
      operation_lease_until = null, version = version + 1 where id = p_appointment_id;
    update public.appointment_holds set state = 'expired' where appointment_id = p_appointment_id;
    insert into public.appointment_events(appointment_id, actor_type, event_type, details)
      values(p_appointment_id, 'system', 'cancelled', jsonb_build_object('state','payment_hold_expired'));
  end if;
  return true;
end;
$$;
revoke all on function public.resolve_appointment_payment_hold(uuid,boolean) from public;
grant execute on function public.resolve_appointment_payment_hold(uuid,boolean) to service_role;

-- Called only after Square order/payment retrieval has verified merchant,
-- location, amount, currency, reference ID, and payment state.
create or replace function public.apply_appointment_provider_payment(
  p_appointment_id uuid,
  p_square_order_id text,
  p_square_payment_id text,
  p_payment_state text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
  next_state text;
begin
  select * into appointment_row from public.appointments
    where id = p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if appointment_row.square_order_id is distinct from p_square_order_id then
    raise exception 'APPOINTMENT_PAYMENT_MISMATCH' using errcode = '23514';
  end if;
  if appointment_row.status <> 'payment_pending' then return appointment_row; end if;

  if p_payment_state = 'COMPLETED' and p_square_payment_id is not null then
    if appointment_row.hold_expires_at <= now() then
      update public.appointments set status = 'payment_review', payment_status = 'review',
        square_payment_id = p_square_payment_id, hold_expires_at = null,
        operation_lease = null, operation_lease_until = null, version = version + 1
      where id = p_appointment_id returning * into appointment_row;
      update public.appointment_holds set state = 'review' where appointment_id = p_appointment_id;
      insert into public.appointment_events(appointment_id, actor_type, event_type, details)
        values(p_appointment_id, 'provider', 'payment_updated', jsonb_build_object('state','late_payment_review'));
    else
      next_state := case
        when coalesce((appointment_row.service_snapshot->>'requiresApproval')::boolean, false)
          or coalesce((appointment_row.service_snapshot->>'automaticallyConfirm')::boolean, false) = false
          then 'requested' else 'confirmed' end;
      update public.appointments set status = next_state, payment_status = 'paid',
        square_payment_id = p_square_payment_id, hold_expires_at = null,
        confirmed_at = case when next_state = 'confirmed' then now() else confirmed_at end,
        operation_lease = null, operation_lease_until = null, version = version + 1
      where id = p_appointment_id returning * into appointment_row;
      update public.appointment_holds set state = 'consumed' where appointment_id = p_appointment_id;
      insert into public.appointment_events(appointment_id, actor_type, event_type, details)
        values(p_appointment_id, 'provider', 'payment_updated', jsonb_build_object('state','paid'));
    end if;
  elsif p_payment_state = 'CANCELED' and p_square_payment_id is null then
    update public.appointments set status = 'cancelled', payment_status = 'none',
      hold_expires_at = null, cancelled_at = now(), operation_lease = null,
      operation_lease_until = null, version = version + 1
    where id = p_appointment_id returning * into appointment_row;
    update public.appointment_holds set state = 'expired' where appointment_id = p_appointment_id;
    insert into public.appointment_events(appointment_id, actor_type, event_type, details)
      values(p_appointment_id, 'system', 'cancelled', jsonb_build_object('state','checkout_cancelled'));
  else
    raise exception 'APPOINTMENT_PAYMENT_STATE_INVALID' using errcode = '22023';
  end if;
  return appointment_row;
end;
$$;
revoke all on function public.apply_appointment_provider_payment(uuid,text,text,text) from public;
grant execute on function public.apply_appointment_provider_payment(uuid,text,text,text) to service_role;

create or replace function public.transition_appointment(
  p_appointment_id uuid,
  p_business_id uuid,
  p_actor_id uuid,
  p_actor_type text,
  p_action text,
  p_expected_version integer
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
  next_status text;
  cutoff_minutes integer;
begin
  select * into appointment_row from public.appointments
    where id = p_appointment_id and business_id = p_business_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if appointment_row.version <> p_expected_version then
    raise exception 'APPOINTMENT_CHANGED' using errcode = '40001';
  end if;
  if p_actor_type = 'owner' and not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id and member.user_id = p_actor_id
      and member.role = 'owner' and member.is_active
  ) then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
  if p_actor_type = 'customer' and appointment_row.customer_id is distinct from p_actor_id then
    raise exception 'APPOINTMENT_ACCESS' using errcode = '42501';
  end if;
  if p_actor_type not in ('owner','customer','guest') then
    raise exception 'APPOINTMENT_ACTOR_INVALID' using errcode = '22023';
  end if;

  if p_action = 'customer_cancel' and p_actor_type in ('customer','guest') then
    cutoff_minutes := coalesce((appointment_row.policy_snapshot->>'cancellationCutoffMinutes')::integer, 1440);
    if appointment_row.starts_at < now() + make_interval(mins => cutoff_minutes) then
      raise exception 'CANCELLATION_CUTOFF' using errcode = '22023';
    end if;
    if appointment_row.status in ('payment_pending','payment_review','completed','cancelled','no_show') then
      raise exception 'APPOINTMENT_TRANSITION_INVALID' using errcode = '22023';
    end if;
    next_status := case when appointment_row.payment_status = 'paid'
      then 'cancellation_pending' else 'cancelled' end;
  elsif p_actor_type = 'owner' then
    next_status := case
      when p_action = 'confirm' and appointment_row.status = 'requested' then 'confirmed'
      when p_action = 'decline' and appointment_row.status = 'requested'
        and appointment_row.payment_status <> 'paid' then 'cancelled'
      when p_action = 'cancel' and appointment_row.status in ('requested','confirmed','checked_in')
        and appointment_row.payment_status not in ('pending','refund_pending','refund_failed','review')
        then case when appointment_row.payment_status = 'paid'
          then 'cancellation_pending' else 'cancelled' end
      when p_action = 'check_in' and appointment_row.status = 'confirmed' then 'checked_in'
      when p_action = 'start' and appointment_row.status = 'checked_in' then 'in_service'
      when p_action = 'complete' and appointment_row.status in ('checked_in','in_service') then 'completed'
      when p_action = 'no_show' and appointment_row.status in ('confirmed','checked_in')
        and appointment_row.starts_at < now() then 'no_show'
      else null end;
  end if;
  if next_status is null then raise exception 'APPOINTMENT_TRANSITION_INVALID' using errcode = '22023'; end if;
  if next_status = 'cancelled' and appointment_row.payment_status = 'paid' then
    raise exception 'REFUND_REQUIRED' using errcode = '22023';
  end if;

  update public.appointments set status = next_status,
    confirmed_at = case when next_status = 'confirmed' then coalesce(confirmed_at,now()) else confirmed_at end,
    checked_in_at = case when next_status = 'checked_in' then now() else checked_in_at end,
    completed_at = case when next_status = 'completed' then now() else completed_at end,
    cancelled_at = case when next_status = 'cancelled' then now() else cancelled_at end,
    cancellation_requested_at = case when next_status = 'cancellation_pending' then now() else cancellation_requested_at end,
    version = version + 1
  where id = p_appointment_id returning * into appointment_row;
  insert into public.appointment_events(appointment_id,actor_type,actor_id,event_type,details)
    values(p_appointment_id,p_actor_type,p_actor_id,
      case next_status when 'checked_in' then 'checked_in' when 'in_service' then 'started'
        when 'completed' then 'completed' when 'cancellation_pending' then 'cancel_requested'
        when 'cancelled' then 'cancelled' when 'no_show' then 'no_show' else 'confirmed' end,
      jsonb_build_object('status',next_status));
  return appointment_row;
end;
$$;
revoke all on function public.transition_appointment(uuid,uuid,uuid,text,text,integer) from public;
grant execute on function public.transition_appointment(uuid,uuid,uuid,text,text,integer) to service_role;

-- Rescheduling locks the business row, so the new capacity is acquired before
-- the old interval is released. The RPC rechecks all rules from database data.
create or replace function public.reschedule_appointment_slot(
  p_appointment_id uuid,
  p_business_id uuid,
  p_actor_id uuid,
  p_guest_hash text,
  p_start_at timestamptz,
  p_resource_id uuid,
  p_idempotency_key uuid,
  p_request_hash text,
  p_expected_version integer
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
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
    where id = p_business_id and status = 'active' and business_type = 'services' for update;
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
$$;
revoke all on function public.reschedule_appointment_slot(uuid,uuid,uuid,text,timestamptz,uuid,uuid,text,integer) from public;
grant execute on function public.reschedule_appointment_slot(uuid,uuid,uuid,text,timestamptz,uuid,uuid,text,integer) to service_role;

create or replace function public.appointment_refund_lease(
  p_appointment_id uuid,
  p_lease uuid,
  p_refund_key uuid
)
returns setof public.appointments
language sql
security definer
set search_path = ''
as $$
  update public.appointments set operation_lease = p_lease,
    operation_lease_until = now() + interval '90 seconds',
    square_refund_key = coalesce(square_refund_key,p_refund_key),
    payment_status = 'refund_pending'
  where id = p_appointment_id and status = 'cancellation_pending'
    and payment_status in ('paid','refund_pending')
    and (operation_lease_until is null or operation_lease_until < now())
  returning *
$$;
revoke all on function public.appointment_refund_lease(uuid,uuid,uuid) from public;
grant execute on function public.appointment_refund_lease(uuid,uuid,uuid) to service_role;

create or replace function public.apply_appointment_provider_refund(
  p_appointment_id uuid,
  p_square_payment_id text,
  p_square_refund_id text,
  p_idempotency_key uuid,
  p_amount_minor integer,
  p_currency text,
  p_refund_state text
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
  saved_refund public.appointment_refunds%rowtype;
begin
  select * into appointment_row from public.appointments
    where id = p_appointment_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if appointment_row.square_payment_id is distinct from p_square_payment_id
    or appointment_row.amount_due_minor <> p_amount_minor
    or appointment_row.currency <> p_currency
    or p_refund_state not in ('PENDING','COMPLETED','FAILED','REJECTED') then
    raise exception 'APPOINTMENT_REFUND_MISMATCH' using errcode = '23514';
  end if;
  insert into public.appointment_refunds(
    square_refund_id,appointment_id,idempotency_key,amount_minor,currency,provider_status
  ) values (
    p_square_refund_id,p_appointment_id,p_idempotency_key,p_amount_minor,p_currency,p_refund_state
  ) on conflict (square_refund_id) do update set
    provider_status = case when public.appointment_refunds.provider_status in ('COMPLETED','FAILED','REJECTED')
      and excluded.provider_status = 'PENDING' then public.appointment_refunds.provider_status
      else excluded.provider_status end,
    updated_at = now()
  returning * into saved_refund;
  if saved_refund.appointment_id <> p_appointment_id
    or saved_refund.idempotency_key <> p_idempotency_key
    or saved_refund.amount_minor <> p_amount_minor
    or saved_refund.currency <> p_currency then
    raise exception 'APPOINTMENT_REFUND_MISMATCH' using errcode = '23514';
  end if;
  -- Replayed events for an older failed attempt are recorded but cannot undo
  -- the state of a newer idempotent refund attempt.
  if appointment_row.square_refund_key is distinct from p_idempotency_key then
    return appointment_row;
  end if;
  if appointment_row.payment_status = 'refunded' or (
    appointment_row.square_refund_id = p_square_refund_id and (
      (saved_refund.provider_status = 'PENDING' and appointment_row.payment_status = 'refund_pending')
      or (saved_refund.provider_status = 'COMPLETED' and appointment_row.payment_status = 'refunded')
      or (saved_refund.provider_status in ('FAILED','REJECTED') and appointment_row.payment_status = 'refund_failed')
    )
  ) then return appointment_row; end if;
  if saved_refund.provider_status = 'COMPLETED' then
    update public.appointments set payment_status = 'refunded', refunded_minor = amount_due_minor,
      square_refund_id = p_square_refund_id, status = 'cancelled', cancelled_at = now(),
      operation_lease = null, operation_lease_until = null, version = version + 1
    where id = p_appointment_id returning * into appointment_row;
  elsif saved_refund.provider_status = 'PENDING' then
    update public.appointments set payment_status = 'refund_pending',
      square_refund_id = p_square_refund_id, operation_lease = null,
      operation_lease_until = null,
      version = version + case when square_refund_id is distinct from p_square_refund_id then 1 else 0 end
    where id = p_appointment_id returning * into appointment_row;
  else
    update public.appointments set payment_status = 'refund_failed',
      square_refund_id = p_square_refund_id, operation_lease = null,
      operation_lease_until = null, version = version + 1
    where id = p_appointment_id returning * into appointment_row;
  end if;
  insert into public.appointment_events(appointment_id,actor_type,event_type,details)
    values(p_appointment_id,'provider','refund_updated',jsonb_build_object(
      'status',saved_refund.provider_status,'refundId',p_square_refund_id));
  return appointment_row;
end;
$$;
revoke all on function public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text) from public;
grant execute on function public.apply_appointment_provider_refund(uuid,text,text,uuid,integer,text,text) to service_role;

create or replace function public.record_appointment_external_reimbursement(
  p_appointment_id uuid,
  p_business_id uuid,
  p_actor_id uuid,
  p_expected_version integer
)
returns public.appointments
language plpgsql
security definer
set search_path = ''
as $$
declare
  appointment_row public.appointments%rowtype;
begin
  select * into appointment_row from public.appointments
    where id = p_appointment_id and business_id = p_business_id for update;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if appointment_row.version <> p_expected_version then
    raise exception 'APPOINTMENT_CHANGED' using errcode = '40001';
  end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id and member.user_id = p_actor_id
      and member.role = 'owner' and member.is_active
  ) then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;
  if appointment_row.status <> 'cancellation_pending'
    or appointment_row.payment_status <> 'refund_failed' then
    raise exception 'EXTERNAL_REIMBURSEMENT_NOT_READY' using errcode = '22023';
  end if;
  update public.appointments set status = 'cancelled', payment_status = 'reimbursed_external',
    cancelled_at = now(), external_reimbursement_confirmed_at = now(),
    external_reimbursement_confirmed_by = p_actor_id, version = version + 1
  where id = p_appointment_id returning * into appointment_row;
  insert into public.appointment_events(appointment_id,actor_type,actor_id,event_type,details)
    values(p_appointment_id,'owner',p_actor_id,'refund_updated',
      jsonb_build_object('status','reimbursed_external','squareRefunded',false));
  return appointment_row;
end;
$$;
revoke all on function public.record_appointment_external_reimbursement(uuid,uuid,uuid,integer) from public;
grant execute on function public.record_appointment_external_reimbursement(uuid,uuid,uuid,integer) to service_role;

create or replace function public.begin_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_impact jsonb;
  targets jsonb;
  job public.account_deletion_jobs%rowtype;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.appointments appointment
    where appointment.customer_id = p_user_id
      and (
        appointment.status not in ('cancelled','completed','no_show')
        or appointment.payment_status in ('pending','refund_pending','refund_failed','review')
      )
  ) then
    raise exception 'Resolve upcoming appointments and outstanding payments before deleting this account.'
      using errcode = '23503';
  end if;

  deletion_impact := public.get_account_deletion_impact(p_user_id);
  select coalesce(
    jsonb_agg(
      jsonb_build_object('bucket', asset.bucket, 'path', asset.storage_path)
      order by asset.bucket, asset.storage_path
    ),
    '[]'::jsonb
  ) into targets
  from public.media_assets asset
  where asset.business_id in (
    select business.id
    from public.businesses business
    left join public.business_members member
      on member.business_id = business.id and member.user_id = p_user_id
    where ((member.is_active and member.role = 'owner') or business.created_by = p_user_id)
      and not exists (
        select 1 from public.business_members owner
        where owner.business_id = business.id and owner.role = 'owner'
          and owner.is_active and owner.user_id <> p_user_id
      )
  );

  insert into public.account_deletion_jobs (user_id, impact, storage_targets)
  values (p_user_id, deletion_impact, targets)
  on conflict (user_id) do update
    set impact = case when public.account_deletion_jobs.status = 'pending' then excluded.impact
        else public.account_deletion_jobs.impact end,
        storage_targets = case when public.account_deletion_jobs.status = 'pending' then excluded.storage_targets
        else public.account_deletion_jobs.storage_targets end,
        updated_at = now()
  returning * into job;

  return jsonb_build_object(
    'jobId', job.id,'status', job.status,'impact', job.impact,'storageTargets', job.storage_targets
  );
end;
$$;
revoke all on function public.begin_account_deletion(uuid) from public;
grant execute on function public.begin_account_deletion(uuid) to service_role;

commit;
notify pgrst, 'reload schema';
