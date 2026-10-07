-- Group RSVPs count seats, retain a transactional FIFO waitlist, and give
-- business owners a private attendee/check-in workflow.
alter table public.event_rsvps
  add column id uuid not null default gen_random_uuid() unique,
  add column party_size smallint not null default 1,
  add column checked_in_at timestamptz,
  add column checked_in_by uuid references public.profiles(id) on delete set null,
  add constraint event_rsvps_party_size check (party_size between 1 and 10),
  add constraint event_rsvps_check_in_pair check (
    (checked_in_at is null and checked_in_by is null)
    or checked_in_at is not null
  );

create index event_rsvps_owner_list_idx
  on public.event_rsvps (event_id, status, created_at, customer_id);

create or replace function public.get_event_rsvp_summary(p_event_id uuid)
returns table (going_count bigint, waitlist_count bigint, rsvp_limit integer, my_status text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(rsvp.party_size)::bigint from public.event_rsvps rsvp
      where rsvp.event_id = event.id and rsvp.status = 'going'), 0),
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

create or replace function public.get_event_rsvp_group_summary(p_event_id uuid)
returns table (
  going_count bigint,
  waitlist_count bigint,
  rsvp_limit integer,
  my_status text,
  my_party_size integer,
  my_waitlist_position bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(rsvp.party_size)::bigint from public.event_rsvps rsvp
      where rsvp.event_id = event.id and rsvp.status = 'going'), 0),
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = event.id and rsvp.status = 'waitlisted'),
    event.rsvp_limit,
    mine.status,
    mine.party_size::integer,
    case when mine.status = 'waitlisted' then (
      select count(*) from public.event_rsvps earlier
      where earlier.event_id = event.id and earlier.status = 'waitlisted'
        and (earlier.created_at, earlier.customer_id) <= (mine.created_at, mine.customer_id)
    ) end
  from public.events event
  join public.businesses business on business.id = event.business_id
  left join public.event_rsvps mine
    on mine.event_id = event.id and mine.customer_id = auth.uid()
    and mine.status in ('going','waitlisted')
  where event.id = p_event_id and event.is_published and event.archived_at is null
    and business.status = 'active';
$$;
revoke all on function public.get_event_rsvp_group_summary(uuid) from public;
grant execute on function public.get_event_rsvp_group_summary(uuid) to anon, authenticated;

create or replace function public.get_business_event_rsvp_counts(p_business_id uuid)
returns table (event_id uuid, going_count bigint, waitlist_count bigint, rsvp_limit integer)
language sql
stable
security definer
set search_path = ''
as $$
  select event.id,
    coalesce(sum(rsvp.party_size) filter (where rsvp.status = 'going'), 0)::bigint,
    count(*) filter (where rsvp.status = 'waitlisted'),
    event.rsvp_limit
  from public.events event
  left join public.event_rsvps rsvp on rsvp.event_id = event.id
  where event.business_id = p_business_id
    and public.is_business_member(p_business_id, auth.uid())
    and event.archived_at is null
  group by event.id, event.rsvp_limit;
$$;

create or replace function public.set_event_rsvp_group(
  p_event_id uuid,
  p_is_going boolean,
  p_party_size integer
)
returns table (
  rsvp_status text,
  going_count bigint,
  waitlist_count bigint,
  rsvp_limit integer,
  my_party_size integer,
  my_waitlist_position bigint
)
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
  if p_is_going and (p_party_size is null or p_party_size not between 1 and 10) then
    raise exception 'Choose a group size from 1 to 10.' using errcode = '22023';
  end if;

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
    select coalesce(sum(rsvp.party_size), 0)::bigint into going_total
    from public.event_rsvps rsvp
    where rsvp.event_id = p_event_id and rsvp.status = 'going'
      and rsvp.customer_id <> auth.uid();

    if existing_row.status = 'waitlisted' then
      next_status := 'waitlisted';
    elsif existing_row.status = 'going'
      and (event_row.rsvp_limit is null or going_total + p_party_size <= event_row.rsvp_limit) then
      next_status := 'going';
    elsif event_row.rsvp_limit is null or going_total + p_party_size <= event_row.rsvp_limit then
      next_status := 'going';
    else
      next_status := 'waitlisted';
    end if;

    insert into public.event_rsvps (event_id, customer_id, status, party_size, checked_in_at, checked_in_by)
    values (p_event_id, auth.uid(), next_status, p_party_size, null, null)
    on conflict (event_id, customer_id) do update set
      status = excluded.status,
      party_size = excluded.party_size,
      created_at = case when public.event_rsvps.status = 'cancelled'
        or public.event_rsvps.status = 'going' and excluded.status = 'waitlisted'
        then now() else public.event_rsvps.created_at end,
      checked_in_at = null,
      checked_in_by = null;

    insert into public.event_saves (event_id, customer_id, reminder_enabled, reminder_minutes_before)
    values (p_event_id, auth.uid(), true, 1440)
    on conflict (event_id, customer_id) do update set reminder_enabled = true;

    -- Fill any available capacity after a party changes size, always in queue order.
    loop
      select * into promoted_row from public.event_rsvps rsvp
      where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'
      order by rsvp.created_at, rsvp.customer_id
      for update limit 1;
      exit when not found;
      select coalesce(sum(rsvp.party_size), 0)::bigint into going_total
      from public.event_rsvps rsvp
      where rsvp.event_id = p_event_id and rsvp.status = 'going';
      exit when event_row.rsvp_limit is not null
        and going_total + promoted_row.party_size > event_row.rsvp_limit;
      update public.event_rsvps set status = 'going'
      where event_id = p_event_id and customer_id = promoted_row.customer_id;
      insert into public.event_saves (event_id, customer_id, reminder_enabled, reminder_minutes_before)
      values (p_event_id, promoted_row.customer_id, true, 1440)
      on conflict (event_id, customer_id) do update set reminder_enabled = true;
    end loop;
  else
    if existing_row.status in ('going','waitlisted') then
      next_status := 'cancelled';
      update public.event_rsvps set status = 'cancelled', checked_in_at = null, checked_in_by = null
      where event_id = p_event_id and customer_id = auth.uid();
      update public.event_saves set reminder_enabled = false
      where event_id = p_event_id and customer_id = auth.uid();

      if existing_row.status = 'going' then
        loop
          select * into promoted_row from public.event_rsvps rsvp
          where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'
          order by rsvp.created_at, rsvp.customer_id
          for update limit 1;
          exit when not found;

          select coalesce(sum(rsvp.party_size), 0)::bigint into going_total
          from public.event_rsvps rsvp
          where rsvp.event_id = p_event_id and rsvp.status = 'going';
          exit when event_row.rsvp_limit is not null
            and going_total + promoted_row.party_size > event_row.rsvp_limit;

          update public.event_rsvps set status = 'going'
          where event_id = p_event_id and customer_id = promoted_row.customer_id;
          insert into public.event_saves (event_id, customer_id, reminder_enabled, reminder_minutes_before)
          values (p_event_id, promoted_row.customer_id, true, 1440)
          on conflict (event_id, customer_id) do update set reminder_enabled = true;
        end loop;
      end if;
    else
      next_status := null;
    end if;
  end if;

  return query
  select
    case when mine.status in ('going','waitlisted') then mine.status else null end,
    coalesce((select sum(rsvp.party_size)::bigint from public.event_rsvps rsvp
      where rsvp.event_id = p_event_id and rsvp.status = 'going'), 0),
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'),
    event_row.rsvp_limit,
    case when mine.status in ('going','waitlisted') then mine.party_size::integer end,
    case when mine.status = 'waitlisted' then (
      select count(*) from public.event_rsvps earlier
      where earlier.event_id = p_event_id and earlier.status = 'waitlisted'
        and (earlier.created_at, earlier.customer_id) <= (mine.created_at, mine.customer_id)
    ) end
  from public.event_rsvps mine
  where mine.event_id = p_event_id and mine.customer_id = auth.uid()
  union all
  select null, coalesce((select sum(rsvp.party_size)::bigint from public.event_rsvps rsvp
    where rsvp.event_id = p_event_id and rsvp.status = 'going'), 0),
    (select count(*) from public.event_rsvps rsvp where rsvp.event_id = p_event_id and rsvp.status = 'waitlisted'),
    event_row.rsvp_limit, null, null
  where not exists (select 1 from public.event_rsvps mine
    where mine.event_id = p_event_id and mine.customer_id = auth.uid());
end;
$$;
revoke all on function public.set_event_rsvp_group(uuid, boolean, integer) from public;
grant execute on function public.set_event_rsvp_group(uuid, boolean, integer) to authenticated;

-- Preserve the previous RPC contract for older installed clients.
create or replace function public.set_event_rsvp(p_event_id uuid, p_is_going boolean)
returns table (rsvp_status text, going_count bigint, waitlist_count bigint, rsvp_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query select result.rsvp_status, result.going_count, result.waitlist_count, result.rsvp_limit
  from public.set_event_rsvp_group(p_event_id, p_is_going, 1) result;
end;
$$;

create or replace function public.get_business_event_rsvp_attendees(p_event_id uuid)
returns table (
  rsvp_id uuid,
  attendee_name text,
  party_size smallint,
  rsvp_status text,
  checked_in_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.events event
    where event.id = p_event_id and public.is_business_owner(event.business_id, auth.uid())
  ) then
    raise exception 'Only the business owner can view event attendees.' using errcode = '42501';
  end if;
  return query
  select rsvp.id,
    coalesce(nullif(btrim(profile.display_name), ''), 'Guest'),
    rsvp.party_size,
    rsvp.status::text,
    rsvp.checked_in_at,
    rsvp.created_at
  from public.event_rsvps rsvp
  join public.profiles profile on profile.id = rsvp.customer_id
  where rsvp.event_id = p_event_id and rsvp.status in ('going','waitlisted')
  order by case when rsvp.status = 'going' then 0 else 1 end, rsvp.created_at, rsvp.customer_id;
end;
$$;
revoke all on function public.get_business_event_rsvp_attendees(uuid) from public;
grant execute on function public.get_business_event_rsvp_attendees(uuid) to authenticated;

create or replace function public.set_event_rsvp_check_in(p_rsvp_id uuid, p_checked_in boolean)
returns table (rsvp_id uuid, checked_in_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rsvp_row public.event_rsvps%rowtype;
begin
  if auth.uid() is null or p_checked_in is null then
    raise exception 'Sign in and choose a check-in state.' using errcode = '42501';
  end if;
  select rsvp.* into rsvp_row
  from public.event_rsvps rsvp
  join public.events event on event.id = rsvp.event_id
  where rsvp.id = p_rsvp_id and rsvp.status = 'going'
    and public.is_business_owner(event.business_id, auth.uid())
  for update of rsvp;
  if not found then raise exception 'This attendee is unavailable.' using errcode = 'P0002'; end if;

  update public.event_rsvps set
    checked_in_at = case when p_checked_in then now() else null end,
    checked_in_by = case when p_checked_in then auth.uid() else null end
  where id = p_rsvp_id
  returning id, event_rsvps.checked_in_at into rsvp_id, checked_in_at;
  return next;
end;
$$;
revoke all on function public.set_event_rsvp_check_in(uuid, boolean) from public;
grant execute on function public.set_event_rsvp_check_in(uuid, boolean) to authenticated;

create or replace function public.prevent_event_rsvp_capacity_below_booked_seats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.rsvp_limit is not null and new.rsvp_limit < coalesce((
    select sum(rsvp.party_size) from public.event_rsvps rsvp
    where rsvp.event_id = new.id and rsvp.status = 'going'
  ), 0) then
    raise exception 'RSVP_CAPACITY_BELOW_BOOKED_SEATS';
  end if;
  return new;
end;
$$;
create trigger events_rsvp_capacity_guard
before update of rsvp_limit on public.events
for each row execute function public.prevent_event_rsvp_capacity_below_booked_seats();
