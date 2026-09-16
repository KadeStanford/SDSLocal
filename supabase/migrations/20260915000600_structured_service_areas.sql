begin;

create type public.service_area_type as enum (
  'at_location',
  'radius',
  'cities',
  'statewide',
  'custom'
);

alter table public.businesses
  add column service_area_type public.service_area_type not null default 'at_location',
  add column service_area_regions text[] not null default '{}',
  add column service_radius_miles smallint;

update public.businesses
set service_area_type = 'custom'
where nullif(trim(service_area), '') is not null;

alter table public.businesses
  add constraint businesses_service_area_regions_limit
    check (cardinality(service_area_regions) <= 25),
  add constraint businesses_service_radius_allowed
    check (service_radius_miles is null or service_radius_miles in (5, 10, 15, 25, 50, 100)),
  add constraint businesses_service_area_shape
    check (
      (service_area_type = 'at_location'
        and service_radius_miles is null
        and cardinality(service_area_regions) = 0)
      or
      (service_area_type = 'radius'
        and service_radius_miles is not null
        and cardinality(service_area_regions) = 0)
      or
      (service_area_type = 'cities'
        and service_radius_miles is null
        and cardinality(service_area_regions) between 1 and 25)
      or
      (service_area_type = 'statewide'
        and region_code is not null
        and service_radius_miles is null
        and cardinality(service_area_regions) = 0)
      or
      (service_area_type = 'custom'
        and nullif(trim(service_area), '') is not null
        and service_radius_miles is null
        and cardinality(service_area_regions) = 0)
    );

create or replace function public.create_business_with_owner_v2(
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
  p_service_area_type public.service_area_type default 'at_location',
  p_service_area_regions text[] default '{}',
  p_service_radius_miles smallint default null,
  p_service_area text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_primary_color text default '#176B4D',
  p_accent_color text default '#E99B45'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_business_id uuid;
begin
  new_business_id := public.create_business_with_owner(
    p_name => p_name,
    p_slug => p_slug,
    p_business_type => p_business_type,
    p_description => p_description,
    p_category_ids => p_category_ids,
    p_hours => p_hours,
    p_phone => p_phone,
    p_email => p_email,
    p_website_url => p_website_url,
    p_address_line_1 => p_address_line_1,
    p_address_line_2 => p_address_line_2,
    p_city => p_city,
    p_region_code => p_region_code,
    p_postal_code => p_postal_code,
    p_country_code => p_country_code,
    p_service_area => case when p_service_area_type = 'custom' then p_service_area else null end,
    p_latitude => p_latitude,
    p_longitude => p_longitude,
    p_primary_color => p_primary_color,
    p_accent_color => p_accent_color
  );

  update public.businesses
  set
    service_area_type = p_service_area_type,
    service_area_regions = case
      when p_service_area_type = 'cities' then coalesce(p_service_area_regions, '{}')
      else '{}'
    end,
    service_radius_miles = case
      when p_service_area_type = 'radius' then p_service_radius_miles
      else null
    end,
    service_area = case
      when p_service_area_type = 'custom' then nullif(trim(p_service_area), '')
      else null
    end
  where id = new_business_id;

  return new_business_id;
end;
$$;

revoke all on function public.create_business_with_owner_v2(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, public.service_area_type, text[], smallint, text,
  double precision, double precision, text, text
) from public;

grant execute on function public.create_business_with_owner_v2(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, public.service_area_type, text[], smallint, text,
  double precision, double precision, text, text
) to authenticated;

comment on function public.create_business_with_owner_v2(
  text, text, public.business_type, text, smallint[], jsonb, text, text, text, text,
  text, text, text, text, text, public.service_area_type, text[], smallint, text,
  double precision, double precision, text, text
) is 'Atomically creates a draft business with a structured service area.';

commit;
