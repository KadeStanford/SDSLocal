begin;

create table public.business_creation_requests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null,
  business_id uuid references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, request_id)
);

alter table public.business_creation_requests enable row level security;
revoke all on public.business_creation_requests from authenticated;

create or replace function public.is_business_page_address_available(p_requested_slug text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_slug text;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  normalized_slug := lower(trim(both '-' from regexp_replace(
    regexp_replace(coalesce(p_requested_slug, ''), '[^a-zA-Z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  )));
  if char_length(normalized_slug) < 3 or char_length(normalized_slug) > 80
    or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    return false;
  end if;
  return not exists (select 1 from public.businesses where slug = normalized_slug);
end;
$$;

revoke all on function public.is_business_page_address_available(text) from public;
grant execute on function public.is_business_page_address_available(text) to authenticated;

create or replace function public.create_business_with_owner_v3(
  p_request_id uuid,
  p_name text,
  p_requested_slug text,
  p_slug_customized boolean,
  p_business_type public.business_type,
  p_description text default '',
  p_category_ids smallint[] default '{}',
  p_address_line_1 text default null,
  p_city text default null,
  p_region_code text default null,
  p_postal_code text default null,
  p_country_code text default 'US',
  p_service_area_type public.service_area_type default 'at_location',
  p_service_area_regions text[] default '{}',
  p_service_radius_miles smallint default null,
  p_service_area text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.business_creation_requests%rowtype;
  base_slug text;
  allocated_slug text;
  suffix integer := 1;
  new_business_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_request_id is null then
    raise exception 'A creation request is required' using errcode = '22023';
  end if;

  insert into public.business_creation_requests (user_id, request_id)
  values (current_user_id, p_request_id)
  on conflict do nothing;

  select * into request_record
  from public.business_creation_requests
  where user_id = current_user_id and request_id = p_request_id
  for update;

  if request_record.business_id is not null then
    select slug into allocated_slug from public.businesses where id = request_record.business_id;
    return jsonb_build_object(
      'businessId', request_record.business_id,
      'pageAddress', allocated_slug,
      'created', false
    );
  end if;

  base_slug := lower(trim(both '-' from regexp_replace(
    regexp_replace(coalesce(nullif(trim(p_requested_slug), ''), 'local-business'),
      '[^a-zA-Z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  )));
  if char_length(base_slug) < 3 or char_length(base_slug) > 80
    or base_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Choose a valid page address' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(base_slug, 0));
  allocated_slug := base_slug;
  if p_slug_customized and exists (
    select 1 from public.businesses where slug = allocated_slug
  ) then
    raise exception 'That page address is already in use' using errcode = '23505';
  end if;

  while exists (select 1 from public.businesses where slug = allocated_slug) loop
    suffix := suffix + 1;
    allocated_slug := left(base_slug, 80 - char_length('-' || suffix::text)) || '-' || suffix::text;
  end loop;

  new_business_id := public.create_business_with_owner_v2(
    p_name => p_name,
    p_slug => allocated_slug,
    p_business_type => p_business_type,
    p_description => p_description,
    p_category_ids => p_category_ids,
    p_hours => '[]'::jsonb,
    p_phone => null,
    p_email => null,
    p_website_url => null,
    p_address_line_1 => p_address_line_1,
    p_address_line_2 => null,
    p_city => p_city,
    p_region_code => p_region_code,
    p_postal_code => p_postal_code,
    p_country_code => p_country_code,
    p_service_area_type => p_service_area_type,
    p_service_area_regions => p_service_area_regions,
    p_service_radius_miles => p_service_radius_miles,
    p_service_area => p_service_area,
    p_latitude => null,
    p_longitude => null,
    p_primary_color => '#176B4D',
    p_accent_color => '#E99B45'
  );

  update public.business_creation_requests
  set business_id = new_business_id
  where user_id = current_user_id and request_id = p_request_id;

  return jsonb_build_object(
    'businessId', new_business_id,
    'pageAddress', allocated_slug,
    'created', true
  );
end;
$$;

revoke all on function public.create_business_with_owner_v3(
  uuid, text, text, boolean, public.business_type, text, smallint[], text, text,
  text, text, text, public.service_area_type, text[], smallint, text
) from public;
grant execute on function public.create_business_with_owner_v3(
  uuid, text, text, boolean, public.business_type, text, smallint[], text, text,
  text, text, text, public.service_area_type, text[], smallint, text
) to authenticated;

create or replace function public.get_business_readiness(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  business_record public.businesses%rowtype;
  description_ready boolean;
  category_ready boolean;
  contact_ready boolean;
  location_ready boolean;
  hours_ready boolean;
  logo_ready boolean;
  cover_ready boolean;
begin
  if not (
    public.is_business_owner(p_business_id, (select auth.uid()))
    or public.is_platform_admin()
  ) then
    raise exception 'Owner or administrator access required' using errcode = '42501';
  end if;

  select * into business_record
  from public.businesses
  where id = p_business_id;

  if not found then
    raise exception 'Business not found' using errcode = 'P0002';
  end if;

  description_ready := char_length(trim(business_record.description)) >= 20;
  category_ready := exists (
    select 1 from public.business_categories where business_id = p_business_id
  );
  contact_ready := coalesce(
    nullif(trim(business_record.phone), ''),
    nullif(trim(business_record.email), ''),
    nullif(trim(business_record.website_url), '')
  ) is not null;
  location_ready := case
    when business_record.business_type = 'mobile' then exists (
      select 1
      from public.business_location_stops stop
      where stop.business_id = p_business_id
        and stop.latitude between -90 and 90
        and stop.longitude between -180 and 180
        and stop.ends_at > stop.starts_at
    )
    else case business_record.service_area_type
      when 'at_location' then
        business_record.address_line_1 is not null
        and business_record.city is not null
        and business_record.region_code is not null
      when 'radius' then
        business_record.address_line_1 is not null
        and business_record.city is not null
        and business_record.region_code is not null
        and business_record.service_radius_miles is not null
      when 'cities' then cardinality(business_record.service_area_regions) > 0
      when 'statewide' then business_record.region_code is not null
      when 'custom' then nullif(trim(business_record.service_area), '') is not null
    end
  end;
  hours_ready := (
    select count(distinct day_of_week) = 7
    from public.business_hours
    where business_id = p_business_id
  );
  logo_ready := exists (
    select 1
    from public.business_photos photo
    join public.media_assets asset on asset.id = photo.media_asset_id
    where photo.business_id = p_business_id
      and photo.role = 'logo'
      and asset.status = 'ready'
  );
  cover_ready := exists (
    select 1
    from public.business_photos photo
    join public.media_assets asset on asset.id = photo.media_asset_id
    where photo.business_id = p_business_id
      and photo.role = 'cover'
      and asset.status = 'ready'
  );

  return jsonb_build_object(
    'ready', description_ready and category_ready and contact_ready and location_ready
      and hours_ready and logo_ready and cover_ready,
    'checks', jsonb_build_array(
      jsonb_build_object('key', 'description', 'label', 'Description of at least 20 characters', 'complete', description_ready),
      jsonb_build_object('key', 'category', 'label', 'At least one category', 'complete', category_ready),
      jsonb_build_object('key', 'contact', 'label', 'Phone, public email, or website', 'complete', contact_ready),
      jsonb_build_object('key', 'location', 'label', case when business_record.business_type = 'mobile' then 'At least one scheduled stop' else 'Complete location or service coverage' end, 'complete', location_ready),
      jsonb_build_object('key', 'hours', 'label', 'Hours set for all seven days', 'complete', hours_ready),
      jsonb_build_object('key', 'logo', 'label', 'Optimized logo image', 'complete', logo_ready),
      jsonb_build_object('key', 'cover', 'label', 'Optimized cover image', 'complete', cover_ready)
    )
  );
end;
$$;

commit;
