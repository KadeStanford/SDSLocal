begin;

-- Keep discovery coordinates public-business data only. Customer coordinates are
-- never accepted by this RPC and remain on the device for distance sorting.
create or replace function public.get_public_business_discovery_locations()
returns table (
  business_id uuid,
  latitude double precision,
  longitude double precision,
  location_kind text,
  starts_at timestamptz,
  ends_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select business.id,
    extensions.st_y(business.location::extensions.geometry),
    extensions.st_x(business.location::extensions.geometry),
    'business'::text,
    null::timestamptz,
    null::timestamptz
  from public.businesses business
  where business.status = 'active'
    and business.business_type <> 'mobile'
    and business.location is not null
  union all
  select stop.business_id, stop.latitude, stop.longitude,
    'mobile_stop'::text, stop.starts_at, stop.ends_at
  from public.business_location_stops stop
  join public.businesses business on business.id = stop.business_id
  where business.status = 'active'
    and business.business_type = 'mobile'
    and stop.is_published
    and stop.ends_at >= now()
    and stop.starts_at <= now() + interval '90 days';
$$;
revoke all on function public.get_public_business_discovery_locations() from public;
grant execute on function public.get_public_business_discovery_locations() to anon, authenticated;

-- Anonymous discovery analytics use a random install/session UUID, which is
-- hashed before storage. This table lets daily unique visitors be counted
-- without retaining the supplied identifier.
create table public.analytics_daily_visitors (
  business_id uuid not null references public.businesses(id) on delete cascade,
  metric_date date not null,
  visitor_hash bytea not null,
  created_at timestamptz not null default now(),
  primary key (business_id, metric_date, visitor_hash)
);
alter table public.analytics_daily_visitors enable row level security;
revoke all on public.analytics_daily_visitors from public, anon, authenticated;

create index analytics_recent_visitor_event_idx
  on public.analytics_recent_events (business_id, visitor_hash, event_name, occurred_at desc);

create or replace function public.record_business_analytics_event(
  p_business_id uuid,
  p_event_name text,
  p_visitor_id uuid,
  p_source text default null,
  p_subject_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_date date;
  visitor_digest bytea;
  new_visitor integer := 0;
  event_page_views integer := 0;
  event_qr_scans integer := 0;
  event_offering_views integer := 0;
  event_event_views integer := 0;
  event_phone_clicks integer := 0;
  event_directions_clicks integer := 0;
  event_social_clicks integer := 0;
begin
  if p_visitor_id is null then
    raise exception 'A visitor token is required.' using errcode = '22023';
  end if;
  if p_event_name not in (
    'page_view', 'qr_scan', 'offering_view', 'event_view',
    'phone_click', 'directions_click', 'social_click'
  ) then
    raise exception 'This event cannot be recorded from a public client.' using errcode = '22023';
  end if;

  select (now() at time zone business.timezone)::date
    into event_date
  from public.businesses business
  where business.id = p_business_id and business.status = 'active';
  if event_date is null then
    return false;
  end if;

  if p_event_name = 'offering_view' and not exists (
    select 1 from public.offering_items item
    where item.id = p_subject_id and item.business_id = p_business_id
      and item.is_visible and item.is_available
  ) then
    return false;
  end if;
  if p_event_name = 'event_view' and not exists (
    select 1 from public.events event
    where event.id = p_subject_id and event.business_id = p_business_id
      and event.is_published and event.archived_at is null
  ) then
    return false;
  end if;

  visitor_digest := extensions.digest(convert_to(p_visitor_id::text, 'UTF8'), 'sha256');
  -- Ignore accidental repeated renders within five minutes for the same
  -- visitor, business, event and target.
  if exists (
    select 1 from public.analytics_recent_events event
    where event.business_id = p_business_id
      and event.visitor_hash = visitor_digest
      and event.event_name = p_event_name::public.analytics_event_name
      and event.subject_id is not distinct from p_subject_id
      and event.occurred_at > now() - interval '5 minutes'
  ) then
    return false;
  end if;

  insert into public.analytics_daily_visitors (business_id, metric_date, visitor_hash)
  values (p_business_id, event_date, visitor_digest)
  on conflict do nothing;
  get diagnostics new_visitor = row_count;

  event_page_views := (p_event_name = 'page_view')::integer;
  event_qr_scans := (p_event_name = 'qr_scan')::integer;
  event_offering_views := (p_event_name = 'offering_view')::integer;
  event_event_views := (p_event_name = 'event_view')::integer;
  event_phone_clicks := (p_event_name = 'phone_click')::integer;
  event_directions_clicks := (p_event_name = 'directions_click')::integer;
  event_social_clicks := (p_event_name = 'social_click')::integer;

  insert into public.analytics_recent_events (
    business_id, event_name, subject_id, visitor_hash, source, occurred_at, expires_at
  ) values (
    p_business_id,
    p_event_name::public.analytics_event_name,
    p_subject_id,
    visitor_digest,
    left(nullif(trim(p_source), ''), 40),
    now(),
    now() + interval '45 days'
  );

  insert into public.analytics_daily (
    business_id, metric_date, page_views, unique_visitors, qr_scans,
    offering_views, event_views, phone_clicks, directions_clicks, social_clicks
  ) values (
    p_business_id, event_date, event_page_views, new_visitor, event_qr_scans,
    event_offering_views, event_event_views, event_phone_clicks,
    event_directions_clicks, event_social_clicks
  )
  on conflict (business_id, metric_date) do update set
    page_views = public.analytics_daily.page_views + excluded.page_views,
    unique_visitors = public.analytics_daily.unique_visitors + excluded.unique_visitors,
    qr_scans = public.analytics_daily.qr_scans + excluded.qr_scans,
    offering_views = public.analytics_daily.offering_views + excluded.offering_views,
    event_views = public.analytics_daily.event_views + excluded.event_views,
    phone_clicks = public.analytics_daily.phone_clicks + excluded.phone_clicks,
    directions_clicks = public.analytics_daily.directions_clicks + excluded.directions_clicks,
    social_clicks = public.analytics_daily.social_clicks + excluded.social_clicks,
    updated_at = now();

  return true;
end;
$$;
revoke all on function public.record_business_analytics_event(uuid, text, uuid, text, uuid) from public;
grant execute on function public.record_business_analytics_event(uuid, text, uuid, text, uuid)
  to anon, authenticated;

-- Structured service enquiries are account-backed and visible only to the
-- requesting customer and the business's active staff/owners.
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  offering_item_id uuid references public.offering_items(id) on delete set null,
  idempotency_key uuid not null,
  customer_name varchar(100) not null,
  customer_email varchar(254),
  request_message varchar(2000) not null,
  preferred_timing varchar(200),
  status varchar(20) not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_message_length check (char_length(trim(request_message)) between 10 and 2000),
  constraint service_requests_name_length check (char_length(trim(customer_name)) between 1 and 100),
  constraint service_requests_email_length check (customer_email is null or char_length(customer_email) <= 254),
  constraint service_requests_timing_length check (preferred_timing is null or char_length(preferred_timing) <= 200),
  constraint service_requests_status check (status in ('new','in_review','contacted','completed','cancelled')),
  unique (customer_id, idempotency_key)
);
create index service_requests_business_queue_idx
  on public.service_requests (business_id, status, created_at desc);
create index service_requests_customer_idx
  on public.service_requests (customer_id, created_at desc);
create trigger service_requests_set_updated_at
before update on public.service_requests
for each row execute function public.set_updated_at();
alter table public.service_requests enable row level security;
create policy service_requests_participant_read on public.service_requests
for select to authenticated
using (customer_id = (select auth.uid()) or public.is_business_member(business_id, (select auth.uid())));
revoke all on public.service_requests from public, anon, authenticated;
grant select on public.service_requests to authenticated;

create or replace function public.submit_service_request(
  p_business_id uuid,
  p_idempotency_key uuid,
  p_request_message text,
  p_offering_item_id uuid default null,
  p_preferred_timing text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid := auth.uid();
  result_id uuid;
  display_label text;
  email_address text;
begin
  if requester is null then
    raise exception 'Sign in to contact this business.' using errcode = '42501';
  end if;
  if p_idempotency_key is null then
    raise exception 'Retry key is required.' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_request_message, ''))) not between 10 and 2000 then
    raise exception 'Add a little more detail (10–2000 characters).' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_preferred_timing, ''))) > 200 then
    raise exception 'Preferred timing is too long.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.businesses business
    where business.id = p_business_id and business.status = 'active'
      and business.business_type = 'services'
  ) then
    raise exception 'This service business is unavailable.' using errcode = 'P0002';
  end if;
  if p_offering_item_id is not null and not exists (
    select 1 from public.offering_items item
    where item.id = p_offering_item_id and item.business_id = p_business_id
      and item.is_visible and item.is_available
  ) then
    raise exception 'That service is no longer available.' using errcode = '22023';
  end if;

  select nullif(trim(profile.display_name), ''), nullif(trim(auth_user.email), '')
    into display_label, email_address
  from public.profiles profile
  left join auth.users auth_user on auth_user.id = profile.id
  where profile.id = requester;
  display_label := coalesce(display_label, split_part(coalesce(email_address, 'Customer'), '@', 1));
  if email_address is null then
    raise exception 'Add an email address to your account so the business can reply.' using errcode = '22023';
  end if;

  select request.id into result_id
  from public.service_requests request
  where request.customer_id = requester and request.idempotency_key = p_idempotency_key;
  if result_id is not null then return result_id; end if;

  if (select count(*) from public.service_requests request
      where request.customer_id = requester
        and request.status in ('new','in_review','contacted')
        and request.created_at >= now() - interval '24 hours') >= 5 then
    raise exception 'You have reached today’s request limit. Try again tomorrow.' using errcode = '54000';
  end if;

  insert into public.service_requests (
    business_id, customer_id, offering_item_id, idempotency_key,
    customer_name, customer_email, request_message, preferred_timing
  ) values (
    p_business_id, requester, p_offering_item_id, p_idempotency_key,
    left(display_label, 100), email_address, trim(p_request_message),
    nullif(trim(p_preferred_timing), '')
  ) returning id into result_id;

  return result_id;
end;
$$;
revoke all on function public.submit_service_request(uuid, uuid, text, uuid, text) from public;
grant execute on function public.submit_service_request(uuid, uuid, text, uuid, text) to authenticated;

create or replace function public.update_service_request_status(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_request public.service_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  if p_status not in ('in_review','contacted','completed') then
    raise exception 'Choose a supported request status.' using errcode = '22023';
  end if;
  select * into current_request from public.service_requests request
  where request.id = p_request_id for update;
  if not found then return false; end if;
  if not public.is_business_member(current_request.business_id, auth.uid()) then
    raise exception 'Business access is required.' using errcode = '42501';
  end if;
  if current_request.status not in ('new','in_review','contacted') then
    raise exception 'This request is already closed.' using errcode = '22023';
  end if;
  if current_request.status = 'contacted' and p_status = 'in_review' then
    raise exception 'A contacted request cannot move back to review.' using errcode = '22023';
  end if;
  update public.service_requests set status = p_status where id = p_request_id;
  return true;
end;
$$;
revoke all on function public.update_service_request_status(uuid, text) from public;
grant execute on function public.update_service_request_status(uuid, text) to authenticated;

create or replace function public.cancel_service_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required.' using errcode = '42501'; end if;
  update public.service_requests request set status = 'cancelled'
  where request.id = p_request_id and request.customer_id = auth.uid()
    and request.status in ('new','in_review');
  return found;
end;
$$;
revoke all on function public.cancel_service_request(uuid) from public;
grant execute on function public.cancel_service_request(uuid) to authenticated;

-- Capacity is enforced under an event-row lock so simultaneous RSVPs cannot
-- exceed the configured limit. Overflow joins a FIFO waitlist.
alter table public.events add column rsvp_limit integer;
alter table public.events add constraint events_rsvp_limit_nonnegative
  check (rsvp_limit is null or rsvp_limit between 0 and 100000);

create table public.event_rsvps (
  event_id uuid not null references public.events(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  status varchar(16) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (event_id, customer_id),
  constraint event_rsvps_status check (status in ('going','waitlisted','cancelled'))
);
create index event_rsvps_waitlist_idx on public.event_rsvps (event_id, created_at)
  where status = 'waitlisted';
create index event_rsvps_customer_idx on public.event_rsvps (customer_id, updated_at desc);
create trigger event_rsvps_set_updated_at
before update on public.event_rsvps
for each row execute function public.set_updated_at();
alter table public.event_rsvps enable row level security;
create policy event_rsvps_participant_read on public.event_rsvps
for select to authenticated
using (
  customer_id = (select auth.uid())
  or exists (
    select 1 from public.events event
    where event.id = event_id and public.is_business_member(event.business_id, (select auth.uid()))
  )
);
revoke all on public.event_rsvps from public, anon, authenticated;
grant select on public.event_rsvps to authenticated;

create or replace function public.get_event_rsvp_summary(p_event_id uuid)
returns table (going_count bigint, waitlist_count bigint, rsvp_limit integer, my_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = event.id and rsvp.status = 'going'),
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = event.id and rsvp.status = 'waitlisted'),
    event.rsvp_limit,
    (select rsvp.status from public.event_rsvps rsvp
      where rsvp.event_id = event.id and rsvp.customer_id = auth.uid()
      and rsvp.status in ('going','waitlisted'))
  from public.events event
  join public.businesses business on business.id = event.business_id
  where event.id = p_event_id and event.is_published and event.archived_at is null
    and business.status = 'active';
$$;
revoke all on function public.get_event_rsvp_summary(uuid) from public;
grant execute on function public.get_event_rsvp_summary(uuid) to anon, authenticated;

create or replace function public.get_business_event_rsvp_counts(p_business_id uuid)
returns table (event_id uuid, going_count bigint, waitlist_count bigint, rsvp_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select event.id,
    count(*) filter (where rsvp.status = 'going'),
    count(*) filter (where rsvp.status = 'waitlisted'),
    event.rsvp_limit
  from public.events event
  left join public.event_rsvps rsvp on rsvp.event_id = event.id
  where event.business_id = p_business_id
    and public.is_business_member(p_business_id, auth.uid())
    and event.archived_at is null
  group by event.id, event.rsvp_limit;
$$;
revoke all on function public.get_business_event_rsvp_counts(uuid) from public;
grant execute on function public.get_business_event_rsvp_counts(uuid) to authenticated;

create or replace function public.set_event_rsvp(p_event_id uuid, p_is_going boolean)
returns table (rsvp_status text, going_count bigint, waitlist_count bigint, rsvp_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.events%rowtype;
  existing_row public.event_rsvps%rowtype;
  promoted_row public.event_rsvps%rowtype;
  next_status text;
  going_total bigint;
begin
  if auth.uid() is null then raise exception 'Sign in to RSVP.' using errcode = '42501'; end if;
  if p_is_going is null then raise exception 'Choose whether to RSVP.' using errcode = '22023'; end if;
  select event.* into event_row
  from public.events event
  join public.businesses business on business.id = event.business_id
  where event.id = p_event_id and event.is_published and event.archived_at is null
    and event.starts_at > now() and business.status = 'active'
  for update of event;
  if not found then raise exception 'This event is unavailable for RSVP.' using errcode = 'P0002'; end if;

  select * into existing_row from public.event_rsvps rsvp
  where rsvp.event_id = p_event_id and rsvp.customer_id = auth.uid() for update;

  if p_is_going then
    if existing_row.status in ('going','waitlisted') then
      next_status := existing_row.status;
    else
      select count(*) into going_total from public.event_rsvps rsvp
      where rsvp.event_id = p_event_id and rsvp.status = 'going';
      next_status := case
        when event_row.rsvp_limit is null or going_total < event_row.rsvp_limit then 'going'
        else 'waitlisted'
      end;
      insert into public.event_rsvps (event_id, customer_id, status)
      values (p_event_id, auth.uid(), next_status)
      on conflict (event_id, customer_id) do update
        set status = excluded.status, created_at = now();
      insert into public.event_saves (event_id, customer_id, reminder_enabled, reminder_minutes_before)
      values (p_event_id, auth.uid(), true, 1440)
      on conflict (event_id, customer_id) do update set reminder_enabled = true;
    end if;
  else
    if existing_row.status in ('going','waitlisted') then
      next_status := 'cancelled';
      update public.event_rsvps set status = 'cancelled'
      where event_id = p_event_id and customer_id = auth.uid();
      update public.event_saves set reminder_enabled = false
      where event_id = p_event_id and customer_id = auth.uid();
      if existing_row.status = 'going' then
        select * into promoted_row from public.event_rsvps rsvp
        where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'
        order by rsvp.created_at, rsvp.customer_id
        for update skip locked limit 1;
        if found then
          update public.event_rsvps set status = 'going'
          where event_id = promoted_row.event_id and customer_id = promoted_row.customer_id;
          insert into public.event_saves (event_id, customer_id, reminder_enabled, reminder_minutes_before)
          values (p_event_id, promoted_row.customer_id, true, 1440)
          on conflict (event_id, customer_id) do update set reminder_enabled = true;
        end if;
      end if;
    else
      next_status := null;
    end if;
  end if;

  return query
  select case when next_status in ('going','waitlisted') then next_status else null end,
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = p_event_id and rsvp.status = 'going'),
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'),
    event_row.rsvp_limit;
end;
$$;
revoke all on function public.set_event_rsvp(uuid, boolean) from public;
grant execute on function public.set_event_rsvp(uuid, boolean) to authenticated;

create or replace function public.notify_service_request_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  event_title text;
begin
  if tg_op = 'UPDATE' and old.status = new.status then return new; end if;
  if tg_op = 'UPDATE' then
    update public.notification_deliveries delivery
      set status = 'skipped', last_error = 'Service request status changed', updated_at = now()
    where delivery.entity_type = 'service_request'
      and delivery.entity_id = new.id
      and delivery.service_request_status = old.status
      and delivery.status = 'queued';
  end if;

  if tg_op = 'INSERT' then
    for recipient in
      select member.user_id from public.business_members member
      where member.business_id = new.business_id and member.is_active
        and member.role in ('owner','staff') and member.user_id <> new.customer_id
    loop
      insert into public.notification_deliveries (
        user_id, business_id, notification_type, entity_type, entity_id,
        dedupe_key, title, body, url, expires_at, status, service_request_status
      ) values (
        recipient.user_id, new.business_id, 'operational', 'service_request', new.id,
        'service-request:new:' || new.id || ':' || recipient.user_id,
        'New service request', 'A customer sent a service request. Open requests to reply.',
        '/service-requests?businessId=' || new.business_id || '&requestId=' || new.id,
        now() + interval '30 days',
        case when public.notification_enabled(recipient.user_id, new.business_id, 'operational') then 'queued' else 'skipped' end,
        new.status
      ) on conflict (dedupe_key) do nothing;
    end loop;
    return new;
  end if;

  if auth.uid() = new.customer_id and new.status = 'cancelled' then return new; end if;
  select business.name into event_title from public.businesses business where business.id = new.business_id;
  if new.status in ('in_review','contacted','completed','cancelled') then
    insert into public.notification_deliveries (
      user_id, business_id, notification_type, entity_type, entity_id,
      dedupe_key, title, body, url, expires_at, status, service_request_status
    ) values (
      new.customer_id, new.business_id, 'general_updates', 'service_request', new.id,
      'service-request:customer:' || new.id || ':' || new.status || ':' || new.updated_at,
      case new.status when 'completed' then 'Request completed' when 'cancelled' then 'Request cancelled' else 'Request updated' end,
      coalesce(event_title, 'A business') || ' updated your service request.',
      '/my-service-requests?requestId=' || new.id,
      now() + interval '30 days',
      case when public.notification_enabled(new.customer_id, new.business_id, 'general_updates') then 'queued' else 'skipped' end,
      new.status
    ) on conflict (dedupe_key) do nothing;
  end if;
  return new;
end;
$$;

alter table public.notification_deliveries
  add column service_request_status text;
alter table public.notification_deliveries drop constraint notification_deliveries_entity;
alter table public.notification_deliveries add constraint notification_deliveries_entity
  check (entity_type in ('event','loyalty_membership','business_update','account','pickup_order','service_request'));
create index notification_service_request_inbox
  on public.notification_deliveries (user_id, created_at desc)
  where entity_type = 'service_request' and dismissed_at is null;

create or replace function public.service_request_notification_access(p_user_id uuid, p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.service_requests request
    where request.id = p_request_id
      and (p_user_id = (select auth.uid()) or (select auth.role()) = 'service_role')
      and (
      request.customer_id = p_user_id
      or exists (
        select 1 from public.business_members member
        where member.business_id = request.business_id
          and member.user_id = p_user_id and member.is_active
          and member.role in ('owner','staff')
      )
    )
  );
$$;
revoke all on function public.service_request_notification_access(uuid, uuid) from public;
grant execute on function public.service_request_notification_access(uuid, uuid) to authenticated, service_role;

create or replace function public.service_request_notification_sendable(p_delivery_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.notification_deliveries delivery
    join public.service_requests request on request.id = delivery.entity_id
    where delivery.id = p_delivery_id
      and delivery.entity_type = 'service_request'
      and delivery.status = 'sending'
      and delivery.service_request_status = request.status
      and (delivery.expires_at is null or delivery.expires_at > now())
      and public.service_request_notification_access(delivery.user_id, request.id)
      and public.notification_enabled(delivery.user_id, delivery.business_id, delivery.notification_type)
  );
$$;
revoke all on function public.service_request_notification_sendable(uuid) from public;
grant execute on function public.service_request_notification_sendable(uuid) to service_role;

create trigger service_request_notifications
after insert or update of status on public.service_requests
for each row execute function public.notify_service_request_changes();

drop policy notification_deliveries_owner_read on public.notification_deliveries;
create policy notification_deliveries_owner_read on public.notification_deliveries
for select to authenticated
using (
  user_id = (select auth.uid())
  and (
    (entity_type = 'pickup_order' and public.pickup_notification_access((select auth.uid()), entity_id, order_audience))
    or (entity_type = 'service_request' and public.service_request_notification_access((select auth.uid()), entity_id))
    or entity_type not in ('pickup_order','service_request')
  )
);

create or replace function public.notify_event_rsvp_promotion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_business uuid;
  event_name text;
begin
  if old.status <> 'waitlisted' or new.status <> 'going' then return new; end if;
  select event.business_id, event.title into event_business, event_name
  from public.events event where event.id = new.event_id;
  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, expires_at, status
  ) values (
    new.customer_id, event_business, 'events', 'event', new.event_id,
    'event-rsvp-promotion:' || new.event_id || ':' || new.customer_id || ':' || new.updated_at,
    'A place opened up', coalesce(event_name, 'This event') || ' can now include you.',
    '/notification?type=event&id=' || new.event_id, now() + interval '30 days',
    case when public.notification_enabled(new.customer_id, event_business, 'events') then 'queued' else 'skipped' end
  ) on conflict (dedupe_key) do nothing;
  return new;
end;
$$;
create trigger event_rsvp_promotion_notification
after update of status on public.event_rsvps
for each row execute function public.notify_event_rsvp_promotion();

commit;
