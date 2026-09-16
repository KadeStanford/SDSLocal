begin;

alter table public.events
  add column archived_at timestamptz,
  add column timezone varchar(64) not null default 'America/Chicago',
  add column location_mode varchar(16) not null default 'business';

alter table public.events
  add constraint events_timezone_supported check (
    timezone in (
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Phoenix',
      'America/Los_Angeles',
      'America/Anchorage',
      'Pacific/Honolulu'
    )
  ),
  add constraint events_location_mode_supported check (
    location_mode in ('business', 'custom', 'online')
  ),
  add constraint events_custom_address_present check (
    location_mode <> 'custom' or nullif(trim(address_text), '') is not null
  );

create index events_public_discovery_idx
  on public.events (starts_at, business_id)
  where is_published and archived_at is null;

drop policy events_read on public.events;
create policy events_read on public.events for select to anon, authenticated
  using (
    (
      is_published
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
        and e.is_published
        and e.archived_at is null
        and b.status = 'active'
    )
  );

create trigger events_pending_content_change
after insert or update or delete on public.events
for each row execute function public.return_related_business_to_draft();

create or replace function public.finalize_event_media(
  p_actor_id uuid,
  p_business_id uuid,
  p_event_id uuid,
  p_asset_group_id uuid,
  p_alt_text text,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  asset_id uuid;
  previous_groups uuid[] := array[]::uuid[];
  previous_paths text[] := array[]::text[];
  total_new_bytes bigint;
  current_bytes bigint;
  review_limit bigint := 52428800;
begin
  if not exists (
    select 1 from public.business_members
    where business_id = p_business_id
      and user_id = p_actor_id
      and role = 'owner'
      and is_active
  ) then
    raise exception 'Only an active business owner can publish event media';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and business_id = p_business_id
  ) then
    raise exception 'Event not found';
  end if;

  if jsonb_typeof(p_variants) <> 'array'
    or jsonb_array_length(p_variants) <> 1
    or (p_variants -> 0 ->> 'variant') <> 'event_card' then
    raise exception 'Exactly one event_card variant is required';
  end if;

  item := p_variants -> 0;
  if item ->> 'mimeType' <> 'image/webp'
    or (item ->> 'storagePath') <> format('%s/%s/event_card.webp', p_business_id, p_asset_group_id)
    or (item ->> 'contentHash') !~ '^[0-9a-f]{64}$'
    or (item ->> 'width')::integer <= 0
    or (item ->> 'height')::integer <= 0
    or (item ->> 'byteSize')::integer <= 0 then
    raise exception 'Invalid event media metadata';
  end if;

  if greatest((item ->> 'width')::integer, (item ->> 'height')::integer) > 1200
    or (item ->> 'byteSize')::integer > 512000 then
    raise exception 'Event image exceeds its optimized limit';
  end if;
  total_new_bytes := (item ->> 'byteSize')::integer;

  select coalesce(array_agg(distinct asset.asset_group_id), '{}')
  into previous_groups
  from public.events event_record
  join public.media_assets asset on asset.id = event_record.media_asset_id
  where event_record.id = p_event_id
    and event_record.business_id = p_business_id;

  select coalesce(array_agg(storage_path), '{}')
  into previous_paths
  from public.media_assets
  where asset_group_id = any(previous_groups)
    and status = 'ready';

  update public.media_assets
  set status = 'pending_delete', delete_after = now()
  where asset_group_id = any(previous_groups)
    and status = 'ready';

  select coalesce(sum(byte_size), 0)
  into current_bytes
  from public.media_assets
  where business_id = p_business_id
    and status = 'ready';

  select coalesce((value ->> 'value')::bigint, review_limit)
  into review_limit
  from public.platform_settings
  where key = 'media_review_bytes';

  if current_bytes + total_new_bytes > coalesce(review_limit, 52428800) then
    raise exception 'Business media storage limit reached';
  end if;

  insert into public.media_assets (
    asset_group_id,
    business_id,
    uploaded_by,
    storage_path,
    role,
    variant,
    status,
    mime_type,
    width,
    height,
    byte_size,
    content_hash,
    alt_text,
    ready_at
  ) values (
    p_asset_group_id,
    p_business_id,
    p_actor_id,
    item ->> 'storagePath',
    'event',
    'event_card',
    'ready',
    item ->> 'mimeType',
    (item ->> 'width')::integer,
    (item ->> 'height')::integer,
    total_new_bytes,
    item ->> 'contentHash',
    nullif(left(trim(p_alt_text), 240), ''),
    now()
  ) returning id into asset_id;

  update public.events
  set media_asset_id = asset_id
  where id = p_event_id
    and business_id = p_business_id;

  return jsonb_build_object(
    'mediaAssetId', asset_id,
    'previousPaths', to_jsonb(previous_paths)
  );
end;
$$;

revoke all on function public.finalize_event_media(uuid, uuid, uuid, uuid, text, jsonb)
from public;
grant execute on function public.finalize_event_media(uuid, uuid, uuid, uuid, text, jsonb)
to service_role;

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
  where e.is_published
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

revoke all on function public.discover_events(
  timestamptz, timestamptz, bigint, text, double precision, double precision, integer, integer, integer
) from public;
grant execute on function public.discover_events(
  timestamptz, timestamptz, bigint, text, double precision, double precision, integer, integer, integer
) to anon, authenticated;

commit;
