begin;

create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

create policy platform_admins_self_read on public.platform_admins
for select to authenticated
using (user_id = (select auth.uid()));

alter table public.businesses
  add column submitted_at timestamptz,
  add column reviewed_at timestamptz,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column review_feedback varchar(1000),
  add column offering_search_text text not null default '';

alter table public.offering_sections
  add column archived_at timestamptz;

alter table public.offering_items
  add column archived_at timestamptz;

drop index public.businesses_search_idx;
alter table public.businesses drop column search_document;
alter table public.businesses
  add column search_document tsvector generated always as (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category_summary, '') || ' ' ||
      coalesce(offering_search_text, '')
    )
  ) stored;
create index businesses_search_idx on public.businesses using gin (search_document);

create or replace function public.refresh_business_offering_search(p_business_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.businesses
  set offering_search_text = coalesce((
    select string_agg(searchable.text, ' ' order by searchable.sort_order, searchable.created_at)
    from (
      select
        section.display_order * 10000 as sort_order,
        section.created_at,
        concat_ws(' ', section.name, section.description) as text
      from public.offering_sections section
      where section.business_id = p_business_id
        and section.archived_at is null
        and section.is_visible

      union all

      select
        section.display_order * 10000 + item.display_order + 1 as sort_order,
        item.created_at,
        concat_ws(' ', item.name, item.description) as text
      from public.offering_items item
      join public.offering_sections section
        on section.id = item.section_id
       and section.business_id = item.business_id
      where item.business_id = p_business_id
        and item.archived_at is null
        and section.archived_at is null
        and item.is_visible
        and section.is_visible
    ) searchable
  ), '')
  where id = p_business_id;
$$;

revoke all on function public.refresh_business_offering_search(uuid) from public;

create or replace function public.sync_business_offering_search()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_business_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_business_id := old.business_id;
  else
    affected_business_id := new.business_id;
  end if;
  perform public.refresh_business_offering_search(affected_business_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger offering_sections_search_sync
after insert or update or delete on public.offering_sections
for each row execute function public.sync_business_offering_search();

create trigger offering_items_search_sync
after insert or update or delete on public.offering_items
for each row execute function public.sync_business_offering_search();

select public.refresh_business_offering_search(id)
from public.businesses;

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
  location_ready := case business_record.service_area_type
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
      jsonb_build_object('key', 'location', 'label', 'Complete location or service coverage', 'complete', location_ready),
      jsonb_build_object('key', 'hours', 'label', 'Hours set for all seven days', 'complete', hours_ready),
      jsonb_build_object('key', 'logo', 'label', 'Optimized logo image', 'complete', logo_ready),
      jsonb_build_object('key', 'cover', 'label', 'Optimized cover image', 'complete', cover_ready)
    )
  );
end;
$$;

revoke all on function public.get_business_readiness(uuid) from public;
grant execute on function public.get_business_readiness(uuid) to authenticated;

create or replace function public.submit_business_for_review(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  readiness jsonb;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;

  select public.get_business_readiness(p_business_id) into readiness;
  if not (readiness ->> 'ready')::boolean then
    raise exception 'Complete every readiness item before submitting' using errcode = '22023';
  end if;

  update public.businesses
  set
    status = 'pending_review',
    submitted_at = now(),
    reviewed_at = null,
    reviewed_by = null,
    review_feedback = null
  where id = p_business_id
    and status = 'draft';

  if not found then
    raise exception 'Only a draft can be submitted' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.submit_business_for_review(uuid) from public;
grant execute on function public.submit_business_for_review(uuid) to authenticated;

create or replace function public.approve_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  readiness jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select public.get_business_readiness(p_business_id) into readiness;
  if not (readiness ->> 'ready')::boolean then
    raise exception 'Business is no longer ready for approval' using errcode = '22023';
  end if;

  update public.businesses
  set
    status = 'active',
    approved_at = now(),
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    review_feedback = null
  where id = p_business_id
    and status = 'pending_review';

  if not found then
    raise exception 'Business is not pending review' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.reject_business(p_business_id uuid, p_feedback text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if char_length(trim(coalesce(p_feedback, ''))) < 10 then
    raise exception 'Provide a clear correction reason' using errcode = '22023';
  end if;

  update public.businesses
  set
    status = 'draft',
    reviewed_at = now(),
    reviewed_by = (select auth.uid()),
    review_feedback = left(trim(p_feedback), 1000)
  where id = p_business_id
    and status = 'pending_review';

  if not found then
    raise exception 'Business is not pending review' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.approve_business(uuid) from public;
revoke all on function public.reject_business(uuid, text) from public;
grant execute on function public.approve_business(uuid) to authenticated;
grant execute on function public.reject_business(uuid, text) to authenticated;

create or replace function public.return_pending_business_to_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending_review'
    and new.status = 'pending_review'
    and row(
      old.slug, old.name, old.business_type, old.description, old.phone, old.email,
      old.website_url, old.address_line_1, old.address_line_2, old.city,
      old.region_code, old.postal_code, old.service_area, old.service_area_type,
      old.service_area_regions, old.service_radius_miles, old.primary_color,
      old.accent_color, old.page_theme, old.font_pair, old.button_style
    ) is distinct from row(
      new.slug, new.name, new.business_type, new.description, new.phone, new.email,
      new.website_url, new.address_line_1, new.address_line_2, new.city,
      new.region_code, new.postal_code, new.service_area, new.service_area_type,
      new.service_area_regions, new.service_radius_miles, new.primary_color,
      new.accent_color, new.page_theme, new.font_pair, new.button_style
    ) then
    new.status := 'draft';
    new.submitted_at := null;
    new.review_feedback := 'Business details changed after submission. Review and submit again.';
  end if;
  return new;
end;
$$;

create trigger businesses_pending_content_change
before update on public.businesses
for each row execute function public.return_pending_business_to_draft();

create or replace function public.return_related_business_to_draft()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_business_id uuid;
begin
  if tg_op = 'DELETE' then
    affected_business_id := old.business_id;
  else
    affected_business_id := new.business_id;
  end if;

  update public.businesses
  set
    status = 'draft',
    submitted_at = null,
    review_feedback = 'Business content changed after submission. Review and submit again.'
  where id = affected_business_id
    and status = 'pending_review';

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger business_categories_pending_change
after insert or update or delete on public.business_categories
for each row execute function public.return_related_business_to_draft();
create trigger business_hours_pending_change
after insert or update or delete on public.business_hours
for each row execute function public.return_related_business_to_draft();
create trigger business_photos_pending_change
after insert or update or delete on public.business_photos
for each row execute function public.return_related_business_to_draft();
create trigger offering_sections_pending_change
after insert or update or delete on public.offering_sections
for each row execute function public.return_related_business_to_draft();
create trigger offering_items_pending_change
after insert or update or delete on public.offering_items
for each row execute function public.return_related_business_to_draft();

create or replace function public.move_offering_section(
  p_business_id uuid,
  p_section_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_order smallint;
  neighbor_id uuid;
  neighbor_order smallint;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  select display_order into current_order
  from public.offering_sections
  where id = p_section_id and business_id = p_business_id and archived_at is null
  for update;

  if p_direction = 'up' then
    select id, display_order into neighbor_id, neighbor_order
    from public.offering_sections
    where business_id = p_business_id and archived_at is null and display_order < current_order
    order by display_order desc, created_at desc limit 1 for update;
  else
    select id, display_order into neighbor_id, neighbor_order
    from public.offering_sections
    where business_id = p_business_id and archived_at is null and display_order > current_order
    order by display_order, created_at limit 1 for update;
  end if;

  if neighbor_id is not null then
    update public.offering_sections
    set display_order = case when id = p_section_id then neighbor_order else current_order end
    where id in (p_section_id, neighbor_id);
  end if;
end;
$$;

create or replace function public.move_offering_item(
  p_business_id uuid,
  p_item_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_section_id uuid;
  current_order smallint;
  neighbor_id uuid;
  neighbor_order smallint;
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  select section_id, display_order into current_section_id, current_order
  from public.offering_items
  where id = p_item_id and business_id = p_business_id and archived_at is null
  for update;

  if p_direction = 'up' then
    select id, display_order into neighbor_id, neighbor_order
    from public.offering_items
    where business_id = p_business_id and section_id = current_section_id
      and archived_at is null and display_order < current_order
    order by display_order desc, created_at desc limit 1 for update;
  else
    select id, display_order into neighbor_id, neighbor_order
    from public.offering_items
    where business_id = p_business_id and section_id = current_section_id
      and archived_at is null and display_order > current_order
    order by display_order, created_at limit 1 for update;
  end if;

  if neighbor_id is not null then
    update public.offering_items
    set display_order = case when id = p_item_id then neighbor_order else current_order end
    where id in (p_item_id, neighbor_id);
  end if;
end;
$$;

revoke all on function public.move_offering_section(uuid, uuid, text) from public;
revoke all on function public.move_offering_item(uuid, uuid, text) from public;
grant execute on function public.move_offering_section(uuid, uuid, text) to authenticated;
grant execute on function public.move_offering_item(uuid, uuid, text) to authenticated;

create policy businesses_admin_read on public.businesses
for select to authenticated using (public.is_platform_admin());
create policy business_categories_admin_read on public.business_categories
for select to authenticated using (public.is_platform_admin());
create policy business_hours_admin_read on public.business_hours
for select to authenticated using (public.is_platform_admin());
create policy media_assets_admin_read on public.media_assets
for select to authenticated using (public.is_platform_admin());
create policy business_photos_admin_read on public.business_photos
for select to authenticated using (public.is_platform_admin());
create policy offering_sections_admin_read on public.offering_sections
for select to authenticated using (public.is_platform_admin());
create policy offering_items_admin_read on public.offering_items
for select to authenticated using (public.is_platform_admin());

commit;
