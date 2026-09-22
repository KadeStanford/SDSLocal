-- Pickup hours are wall-clock hours at the selected Square location. Never use
-- the owner's/customer's device zone, and never rewrite existing order snapshots.
create or replace function public.square_set_pickup_timezone()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  zone text;
begin
  select case
    when coalesce(c.location_snapshot->>'timezone', '') in ('', 'UTC', 'Etc/UTC', 'GMT', 'Etc/GMT')
      then b.timezone
    else c.location_snapshot->>'timezone'
    end
    into zone
    from public.businesses b
    left join public.square_connections c on c.business_id = b.id and c.location_id is not null
    where b.id = new.business_id;
  if not exists (select 1 from pg_timezone_names where name = zone) then
    raise exception 'INVALID_TIMEZONE';
  end if;
  new.timezone := zone;
  return new;
end;
$$;

create trigger square_automatic_pickup_timezone
before insert or update on public.square_ordering_settings
for each row execute function public.square_set_pickup_timezone();

create or replace function public.square_refresh_pickup_timezone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.square_ordering_settings
     set timezone = timezone, updated_at = now()
   where business_id = new.business_id;
  return new;
end;
$$;

create trigger square_location_pickup_timezone
after update of location_id, location_snapshot on public.square_connections
for each row
when (old.location_id is distinct from new.location_id
   or old.location_snapshot->>'timezone' is distinct from new.location_snapshot->>'timezone')
execute function public.square_refresh_pickup_timezone();

create or replace function public.square_refresh_business_pickup_timezone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.square_ordering_settings
     set timezone = timezone, updated_at = now()
   where business_id = new.id;
  return new;
end;
$$;

create trigger square_business_pickup_timezone
after update of timezone on public.businesses
for each row when (old.timezone is distinct from new.timezone)
execute function public.square_refresh_business_pickup_timezone();

-- Existing connected businesses adopt their selected location automatically.
update public.square_ordering_settings set timezone = timezone;

revoke all on function public.square_set_pickup_timezone() from public, anon, authenticated;
revoke all on function public.square_refresh_pickup_timezone() from public, anon, authenticated;
revoke all on function public.square_refresh_business_pickup_timezone() from public, anon, authenticated;
