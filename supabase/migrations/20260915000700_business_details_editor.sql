begin;

create or replace function public.update_business_details(
  p_business_id uuid,
  p_name text,
  p_slug text,
  p_business_type public.business_type,
  p_description text,
  p_category_ids smallint[],
  p_hours jsonb,
  p_phone text,
  p_email text,
  p_website_url text,
  p_address_line_1 text,
  p_address_line_2 text,
  p_city text,
  p_region_code text,
  p_postal_code text,
  p_country_code text,
  p_service_area_type public.service_area_type,
  p_service_area_regions text[],
  p_service_radius_miles smallint,
  p_service_area text,
  p_primary_color text,
  p_accent_color text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  requested_category_count integer;
  valid_category_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members member
    where member.business_id = p_business_id
      and member.user_id = current_user_id
      and member.role = 'owner'
      and member.is_active
  ) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  select count(*) into requested_category_count
  from (select distinct unnest(coalesce(p_category_ids, '{}'))) requested;

  if requested_category_count > 5 then
    raise exception 'Choose no more than five categories' using errcode = '22023';
  end if;

  select count(*) into valid_category_count
  from public.categories category
  where category.id = any(coalesce(p_category_ids, '{}'))
    and category.is_active
    and (category.business_type is null or category.business_type = p_business_type);

  if requested_category_count <> valid_category_count then
    raise exception 'One or more categories are invalid for this business type' using errcode = '22023';
  end if;

  update public.businesses
  set
    name = trim(p_name),
    slug = trim(p_slug),
    business_type = p_business_type,
    description = coalesce(trim(p_description), ''),
    phone = nullif(trim(p_phone), ''),
    email = nullif(trim(p_email), ''),
    website_url = nullif(trim(p_website_url), ''),
    address_line_1 = nullif(trim(p_address_line_1), ''),
    address_line_2 = nullif(trim(p_address_line_2), ''),
    city = nullif(trim(p_city), ''),
    region_code = nullif(trim(p_region_code), ''),
    postal_code = nullif(trim(p_postal_code), ''),
    country_code = upper(p_country_code),
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
    end,
    primary_color = p_primary_color,
    accent_color = p_accent_color
  where id = p_business_id;

  delete from public.business_categories
  where business_id = p_business_id;

  insert into public.business_categories (business_id, category_id, is_primary)
  select
    p_business_id,
    category_id,
    row_number() over (order by array_position(p_category_ids, category_id)) = 1
  from unnest(coalesce(p_category_ids, '{}')) category_id
  group by category_id;

  update public.businesses
  set category_summary = (
    select string_agg(category.name, ', ' order by array_position(p_category_ids, category.id))
    from public.categories category
    where category.id = any(coalesce(p_category_ids, '{}'))
  )
  where id = p_business_id;

  delete from public.business_hours
  where business_id = p_business_id;

  insert into public.business_hours (
    business_id,
    day_of_week,
    interval_number,
    opens_at,
    closes_at,
    is_closed
  )
  select
    p_business_id,
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
end;
$$;

revoke all on function public.update_business_details(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text
) from public;

grant execute on function public.update_business_details(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text
) to authenticated;

comment on function public.update_business_details(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text
) is 'Atomically updates an owner-managed business, its categories, and regular hours.';

commit;
