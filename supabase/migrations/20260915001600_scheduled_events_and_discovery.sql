begin;

alter table public.events
  add column publish_at timestamptz,
  add constraint events_one_publication_mode check (
    not (is_published and publish_at is not null)
  );

alter table public.businesses
  add constraint businesses_timezone_supported check (
    timezone in (
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu'
    )
  );

create index events_scheduled_publication_idx
  on public.events (publish_at)
  where not is_published and publish_at is not null and archived_at is null;

drop policy events_read on public.events;
create policy events_read on public.events for select to anon, authenticated
  using (
    (
      (is_published or publish_at <= now())
      and archived_at is null
      and exists (
        select 1 from public.businesses b
        where b.id = business_id and b.status = 'active'
      )
    )
    or public.is_business_member(business_id, (select auth.uid()))
  );

drop policy event_saves_insert on public.event_saves;
create policy event_saves_insert on public.event_saves for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1
      from public.events e
      join public.businesses b on b.id = e.business_id
      where e.id = event_id
        and (e.is_published or e.publish_at <= now())
        and e.archived_at is null
        and b.status = 'active'
    )
  );

drop policy follows_insert on public.business_follows;
create policy follows_insert on public.business_follows for insert to authenticated
  with check (
    customer_id = (select auth.uid())
    and exists (
      select 1 from public.businesses b
      where b.id = business_id and b.status = 'active'
    )
  );

create or replace function public.discover_events(
  p_starts_after timestamptz default now(),
  p_starts_before timestamptz default null,
  p_category_id bigint default null,
  p_city text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_miles integer default null,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  event_id uuid,
  event_slug varchar,
  title varchar,
  description varchar,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone varchar,
  location_mode varchar,
  address_text varchar,
  age_note varchar,
  capacity_text varchar,
  business_id uuid,
  business_name varchar,
  business_slug varchar,
  business_city varchar,
  business_region_code char,
  distance_miles double precision,
  image_path text,
  image_alt text,
  category_names text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.slug,
    e.title,
    e.description,
    e.starts_at,
    e.ends_at,
    e.timezone,
    e.location_mode,
    e.address_text,
    e.age_note,
    e.capacity_text,
    b.id,
    b.name,
    b.slug,
    b.city,
    b.region_code,
    case
      when p_latitude is not null and p_longitude is not null and b.location is not null
      then extensions.st_distance(
        b.location,
        extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
      ) / 1609.344
      else null
    end,
    media.storage_path,
    media.alt_text,
    coalesce((
      select array_agg(category.name order by category.name)
      from public.business_categories business_category
      join public.categories category on category.id = business_category.category_id
      where business_category.business_id = b.id
    ), '{}')
  from public.events e
  join public.businesses b on b.id = e.business_id
  left join public.media_assets media on media.id = e.media_asset_id and media.status = 'ready'
  where (e.is_published or e.publish_at <= now())
    and e.archived_at is null
    and b.status = 'active'
    and e.starts_at >= coalesce(p_starts_after, now())
    and (p_starts_before is null or e.starts_at <= p_starts_before)
    and (
      p_category_id is null
      or exists (
        select 1 from public.business_categories business_category
        where business_category.business_id = b.id
          and business_category.category_id = p_category_id
      )
    )
    and (nullif(trim(p_city), '') is null or lower(b.city) = lower(trim(p_city)))
    and (
      p_latitude is null
      or p_longitude is null
      or p_radius_miles is null
      or (
        b.location is not null
        and extensions.st_dwithin(
          b.location,
          extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
          p_radius_miles * 1609.344
        )
      )
    )
  order by e.starts_at, e.id
  limit least(greatest(coalesce(p_limit, 30), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

create or replace function public.discover_businesses(
  p_query text default null,
  p_category_id bigint default null,
  p_city text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_radius_miles integer default null,
  p_open_now boolean default false,
  p_has_loyalty boolean default false,
  p_has_events boolean default false,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  business_id uuid,
  business_name varchar,
  business_slug varchar,
  description varchar,
  business_type public.business_type,
  city varchar,
  region_code char,
  primary_color char,
  accent_color char,
  distance_miles double precision,
  image_path text,
  image_alt text,
  category_names text[],
  is_open boolean,
  has_loyalty boolean,
  has_upcoming_events boolean,
  relevance real
)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select
      b.*,
      case
        when nullif(trim(p_query), '') is null then 0::real
        else ts_rank(b.search_document, websearch_to_tsquery('english', trim(p_query)))
      end as search_rank,
      case
        when p_latitude is not null and p_longitude is not null and b.location is not null
        then extensions.st_distance(
          b.location,
          extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
        ) / 1609.344
        else null
      end as miles,
      exists (
        select 1 from public.business_hours h
        where h.business_id = b.id
          and h.day_of_week = extract(dow from now() at time zone b.timezone)::integer
          and not h.is_closed
          and (now() at time zone b.timezone)::time >= h.opens_at
          and (now() at time zone b.timezone)::time < h.closes_at
      ) as currently_open,
      exists (
        select 1 from public.loyalty_programs loyalty
        where loyalty.business_id = b.id and loyalty.is_active
      ) as loyalty_available,
      exists (
        select 1 from public.events event_record
        where event_record.business_id = b.id
          and (event_record.is_published or event_record.publish_at <= now())
          and event_record.archived_at is null
          and event_record.starts_at >= now()
      ) as events_available
    from public.businesses b
    where b.status = 'active'
  )
  select
    candidate.id,
    candidate.name,
    candidate.slug,
    candidate.description,
    candidate.business_type,
    candidate.city,
    candidate.region_code,
    candidate.primary_color,
    candidate.accent_color,
    candidate.miles,
    media.storage_path,
    media.alt_text,
    coalesce((
      select array_agg(category.name order by category.name)
      from public.business_categories business_category
      join public.categories category on category.id = business_category.category_id
      where business_category.business_id = candidate.id
    ), '{}'),
    candidate.currently_open,
    candidate.loyalty_available,
    candidate.events_available,
    candidate.search_rank
  from candidates candidate
  left join lateral (
    select variant.storage_path, variant.alt_text
    from public.business_photos photo
    join public.media_assets representative on representative.id = photo.media_asset_id
    join public.media_assets variant
      on variant.asset_group_id = representative.asset_group_id
      and variant.status = 'ready'
      and variant.variant::text in ('logo_small', 'thumbnail')
    where photo.business_id = candidate.id
      and photo.role::text in ('logo', 'gallery')
    order by case photo.role::text when 'logo' then 0 else 1 end, photo.display_order
    limit 1
  ) media on true
  where (
      nullif(trim(p_query), '') is null
      or candidate.search_document @@ websearch_to_tsquery('english', trim(p_query))
      or candidate.name ilike '%' || trim(p_query) || '%'
    )
    and (
      p_category_id is null
      or exists (
        select 1 from public.business_categories business_category
        where business_category.business_id = candidate.id
          and business_category.category_id = p_category_id
      )
    )
    and (nullif(trim(p_city), '') is null or lower(candidate.city) = lower(trim(p_city)))
    and (not p_open_now or candidate.currently_open)
    and (not p_has_loyalty or candidate.loyalty_available)
    and (not p_has_events or candidate.events_available)
    and (
      p_latitude is null
      or p_longitude is null
      or p_radius_miles is null
      or candidate.miles <= p_radius_miles
    )
  order by
    candidate.search_rank desc,
    candidate.miles asc nulls last,
    candidate.updated_at desc,
    candidate.id
  limit least(greatest(coalesce(p_limit, 24), 1), 60)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.discover_businesses(
  text, bigint, text, double precision, double precision, integer,
  boolean, boolean, boolean, integer, integer
) from public;
grant execute on function public.discover_businesses(
  text, bigint, text, double precision, double precision, integer,
  boolean, boolean, boolean, integer, integer
) to anon, authenticated;

commit;
