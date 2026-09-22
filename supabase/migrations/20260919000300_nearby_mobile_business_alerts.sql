begin;

create table public.nearby_alert_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_enabled boolean not null default false,
  radius_miles smallint not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nearby_alert_preferences_radius check (radius_miles in (1, 5, 10))
);

create table public.nearby_business_alert_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index nearby_business_alert_preferences_business_idx
  on public.nearby_business_alert_preferences (business_id, user_id);

create trigger nearby_alert_preferences_set_updated_at
before update on public.nearby_alert_preferences
for each row execute function public.set_updated_at();

create trigger nearby_business_alert_preferences_set_updated_at
before update on public.nearby_business_alert_preferences
for each row execute function public.set_updated_at();

alter table public.nearby_alert_preferences enable row level security;
alter table public.nearby_business_alert_preferences enable row level security;

create policy nearby_alert_preferences_owner_read
on public.nearby_alert_preferences for select to authenticated
using (user_id = (select auth.uid()));

create policy nearby_business_alert_preferences_owner_read
on public.nearby_business_alert_preferences for select to authenticated
using (user_id = (select auth.uid()));

revoke insert, update, delete on public.nearby_alert_preferences from authenticated;
revoke insert, update, delete on public.nearby_business_alert_preferences from authenticated;
grant select on public.nearby_alert_preferences to authenticated;
grant select on public.nearby_business_alert_preferences to authenticated;

create or replace function public.get_nearby_alert_preferences()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then null
    else jsonb_build_object(
      'enabled', coalesce(account.is_enabled, false),
      'radiusMiles', coalesce(account.radius_miles, 5),
      'businesses', coalesce(businesses.items, '[]'::jsonb)
    )
  end
  from (select 1) seed
  left join public.nearby_alert_preferences account on account.user_id = auth.uid()
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'businessId', business.id,
        'businessName', business.name,
        'businessSlug', business.slug,
        'enabled', coalesce(preference.is_enabled, true)
      ) order by business.name, business.id
    ) as items
    from public.business_follows follow
    join public.businesses business
      on business.id = follow.business_id
      and business.status = 'active'
      and business.business_type = 'mobile'
    left join public.nearby_business_alert_preferences preference
      on preference.user_id = follow.customer_id
      and preference.business_id = follow.business_id
    where follow.customer_id = auth.uid()
      and not exists (
        select 1 from public.blocked_businesses blocked
        where blocked.customer_id = follow.customer_id
          and blocked.business_id = follow.business_id
      )
  ) businesses on true;
$$;

create or replace function public.set_nearby_alert_preferences(
  p_enabled boolean default null,
  p_radius_miles integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved public.nearby_alert_preferences;
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_radius_miles is not null and p_radius_miles not in (1, 5, 10) then
    raise exception 'Choose a 1, 5, or 10 mile radius' using errcode = '22023';
  end if;

  insert into public.nearby_alert_preferences (user_id, is_enabled, radius_miles)
  values (current_user_id, coalesce(p_enabled, false), coalesce(p_radius_miles, 5))
  on conflict (user_id) do update set
    is_enabled = coalesce(p_enabled, public.nearby_alert_preferences.is_enabled),
    radius_miles = coalesce(p_radius_miles, public.nearby_alert_preferences.radius_miles),
    updated_at = now()
  returning * into saved;

  return jsonb_build_object('enabled', saved.is_enabled, 'radiusMiles', saved.radius_miles);
end;
$$;

create or replace function public.set_nearby_business_alert_preference(
  p_business_id uuid,
  p_is_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.business_follows follow
    join public.businesses business on business.id = follow.business_id
    where follow.customer_id = current_user_id
      and follow.business_id = p_business_id
      and business.status = 'active'
      and business.business_type = 'mobile'
      and not exists (
        select 1 from public.blocked_businesses blocked
        where blocked.customer_id = current_user_id
          and blocked.business_id = p_business_id
      )
  ) then
    raise exception 'Follow this mobile business before changing nearby alerts'
      using errcode = '42501';
  end if;

  insert into public.nearby_business_alert_preferences (user_id, business_id, is_enabled)
  values (current_user_id, p_business_id, p_is_enabled)
  on conflict (user_id, business_id) do update set
    is_enabled = excluded.is_enabled,
    updated_at = now();
end;
$$;

create or replace function public.get_nearby_alert_stops()
returns table (
  business_id uuid,
  business_name varchar,
  business_slug varchar,
  business_type public.business_type,
  stop_id uuid,
  stop_title varchar,
  address_text varchar,
  latitude double precision,
  longitude double precision,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone varchar,
  followed boolean,
  blocked boolean,
  business_alerts_enabled boolean,
  published boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    business.id,
    business.name,
    business.slug,
    business.business_type,
    stop.id,
    stop.title,
    stop.address_text,
    stop.latitude,
    stop.longitude,
    stop.starts_at,
    stop.ends_at,
    stop.timezone,
    true,
    false,
    coalesce(preference.is_enabled, true),
    stop.is_published
  from public.business_follows follow
  join public.businesses business
    on business.id = follow.business_id
    and business.status = 'active'
    and business.business_type = 'mobile'
  join public.business_location_stops stop
    on stop.business_id = business.id
    and stop.is_published
    and stop.ends_at >= now() - interval '10 minutes'
    and stop.starts_at <= now() + interval '7 days'
  left join public.nearby_business_alert_preferences preference
    on preference.user_id = follow.customer_id
    and preference.business_id = follow.business_id
  where follow.customer_id = auth.uid()
    and coalesce(preference.is_enabled, true)
    and not exists (
      select 1 from public.blocked_businesses blocked_record
      where blocked_record.customer_id = follow.customer_id
        and blocked_record.business_id = follow.business_id
    )
  order by stop.starts_at, business.id, stop.id;
$$;

revoke all on function public.get_nearby_alert_preferences() from public;
revoke all on function public.set_nearby_alert_preferences(boolean, integer) from public;
revoke all on function public.set_nearby_business_alert_preference(uuid, boolean) from public;
revoke all on function public.get_nearby_alert_stops() from public;
grant execute on function public.get_nearby_alert_preferences() to authenticated;
grant execute on function public.set_nearby_alert_preferences(boolean, integer) to authenticated;
grant execute on function public.set_nearby_business_alert_preference(uuid, boolean) to authenticated;
grant execute on function public.get_nearby_alert_stops() to authenticated;

commit;
