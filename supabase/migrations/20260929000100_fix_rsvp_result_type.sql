begin;
-- PL/pgSQL requires an explicit cast from varchar status to the declared text result.
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
    (case when mine.status in ('going','waitlisted') then mine.status else null end)::text,
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
notify pgrst, 'reload schema';
commit;
