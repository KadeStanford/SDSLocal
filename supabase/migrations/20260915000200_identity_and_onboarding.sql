begin;

create or replace function public.create_business_with_owner(
  p_name text,
  p_slug text,
  p_business_type public.business_type,
  p_description text default '',
  p_category_ids smallint[] default '{}',
  p_hours jsonb default '[]'::jsonb,
  p_phone text default null,
  p_email text default null,
  p_website_url text default null,
  p_address_line_1 text default null,
  p_address_line_2 text default null,
  p_city text default null,
  p_region_code text default null,
  p_postal_code text default null,
  p_country_code text default 'US',
  p_service_area text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_primary_color text default '#176B4D',
  p_accent_color text default '#E99B45'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_business_id uuid;
  requested_category_count integer;
  valid_category_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Latitude and longitude must be provided together' using errcode = '22023';
  end if;

  if p_latitude is not null and (p_latitude < -90 or p_latitude > 90) then
    raise exception 'Latitude is outside the valid range' using errcode = '22023';
  end if;

  if p_longitude is not null and (p_longitude < -180 or p_longitude > 180) then
    raise exception 'Longitude is outside the valid range' using errcode = '22023';
  end if;

  select count(*) into requested_category_count
  from (select distinct unnest(coalesce(p_category_ids, '{}'))) requested;

  select count(*) into valid_category_count
  from public.categories c
  where c.id = any(coalesce(p_category_ids, '{}'))
    and c.is_active
    and (c.business_type is null or c.business_type = p_business_type);

  if requested_category_count <> valid_category_count then
    raise exception 'One or more categories are invalid for this business type' using errcode = '22023';
  end if;

  insert into public.businesses (
    created_by,
    slug,
    name,
    business_type,
    description,
    phone,
    email,
    website_url,
    address_line_1,
    address_line_2,
    city,
    region_code,
    postal_code,
    country_code,
    service_area,
    location,
    primary_color,
    accent_color
  )
  values (
    current_user_id,
    p_slug,
    p_name,
    p_business_type,
    coalesce(p_description, ''),
    nullif(p_phone, ''),
    nullif(p_email, ''),
    nullif(p_website_url, ''),
    nullif(p_address_line_1, ''),
    nullif(p_address_line_2, ''),
    nullif(p_city, ''),
    nullif(p_region_code, ''),
    nullif(p_postal_code, ''),
    upper(p_country_code),
    nullif(p_service_area, ''),
    case
      when p_latitude is null then null
      else extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography
    end,
    p_primary_color,
    p_accent_color
  )
  returning id into new_business_id;

  insert into public.business_members (business_id, user_id, role)
  values (new_business_id, current_user_id, 'owner');

  insert into public.business_categories (business_id, category_id, is_primary)
  select
    new_business_id,
    category_id,
    row_number() over (order by array_position(p_category_ids, category_id)) = 1
  from unnest(coalesce(p_category_ids, '{}')) category_id
  group by category_id;

  insert into public.business_hours (
    business_id,
    day_of_week,
    interval_number,
    opens_at,
    closes_at,
    is_closed
  )
  select
    new_business_id,
    hour.day_of_week,
    coalesce(hour.interval_number, 1),
    hour.opens_at,
    hour.closes_at,
    hour.is_closed
  from jsonb_to_recordset(coalesce(p_hours, '[]'::jsonb)) as hour(
    day_of_week smallint,
    interval_number smallint,
    opens_at time,
    closes_at time,
    is_closed boolean
  );

  return new_business_id;
end;
$$;

revoke all on function public.create_business_with_owner(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, text, double precision, double precision, text, text
) from public;

grant execute on function public.create_business_with_owner(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, text, double precision, double precision, text, text
) to authenticated;

comment on function public.create_business_with_owner(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, text, double precision, double precision, text, text
) is 'Atomically creates a draft business, its owner membership, categories, and hours.';

commit;
