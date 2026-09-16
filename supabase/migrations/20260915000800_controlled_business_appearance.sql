begin;

alter table public.businesses
  add constraint businesses_font_pair_allowed
    check (font_pair in ('friendly_sans', 'modern_sans', 'classic_serif')),
  add constraint businesses_button_style_allowed
    check (button_style in ('rounded', 'soft', 'square'));

create or replace function public.update_business_details_v2(
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
  p_accent_color text,
  p_page_theme public.page_theme,
  p_font_pair text,
  p_button_style text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.update_business_details(
    p_business_id,
    p_name,
    p_slug,
    p_business_type,
    p_description,
    p_category_ids,
    p_hours,
    p_phone,
    p_email,
    p_website_url,
    p_address_line_1,
    p_address_line_2,
    p_city,
    p_region_code,
    p_postal_code,
    p_country_code,
    p_service_area_type,
    p_service_area_regions,
    p_service_radius_miles,
    p_service_area,
    p_primary_color,
    p_accent_color
  );

  update public.businesses
  set
    page_theme = p_page_theme,
    font_pair = p_font_pair,
    button_style = p_button_style
  where id = p_business_id;
end;
$$;

revoke all on function public.update_business_details_v2(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text, public.page_theme, text, text
) from public;

grant execute on function public.update_business_details_v2(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text, public.page_theme, text, text
) to authenticated;

comment on function public.update_business_details_v2(
  uuid, text, text, public.business_type, text, smallint[], jsonb, text, text, text,
  text, text, text, text, text, text, public.service_area_type, text[], smallint,
  text, text, text, public.page_theme, text, text
) is 'Atomically updates business details, categories, hours, and controlled appearance choices.';

commit;
