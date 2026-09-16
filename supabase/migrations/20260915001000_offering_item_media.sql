begin;

create or replace function public.finalize_offering_media(
  p_actor_id uuid,
  p_business_id uuid,
  p_offering_item_id uuid,
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
  variant_name text;
  representative_id uuid;
  asset_id uuid;
  previous_groups uuid[] := array[]::uuid[];
  previous_paths text[] := array[]::text[];
  total_new_bytes bigint := 0;
  current_bytes bigint := 0;
  review_limit bigint := 52428800;
begin
  if not exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = p_actor_id
      and role = 'owner'
      and is_active
  ) then
    raise exception 'Only an active business owner can publish offering media';
  end if;

  if not exists (
    select 1 from public.offering_items
    where id = p_offering_item_id and business_id = p_business_id
  ) then
    raise exception 'Offering item not found';
  end if;

  if jsonb_typeof(p_variants) <> 'array'
    or jsonb_array_length(p_variants) <> 3
    or (select count(distinct value ->> 'variant') from jsonb_array_elements(p_variants)) <> 3 then
    raise exception 'Incorrect or duplicate media variants';
  end if;

  for item in select value from jsonb_array_elements(p_variants)
  loop
    variant_name := item ->> 'variant';
    if variant_name not in ('thumbnail', 'card', 'full') then
      raise exception 'Variant does not match offering media';
    end if;
    if item ->> 'mimeType' <> 'image/webp'
      or (item ->> 'storagePath') <> format('%s/%s/%s.webp', p_business_id, p_asset_group_id, variant_name)
      or (item ->> 'contentHash') !~ '^[0-9a-f]{64}$'
      or (item ->> 'width')::integer <= 0
      or (item ->> 'height')::integer <= 0
      or (item ->> 'byteSize')::integer <= 0 then
      raise exception 'Invalid media metadata';
    end if;
    if greatest((item ->> 'width')::integer, (item ->> 'height')::integer) > (
      case variant_name when 'thumbnail' then 320 when 'card' then 800 else 1600 end
    ) then
      raise exception 'Media dimensions exceed the variant limit';
    end if;
    if (item ->> 'byteSize')::integer > (
      case variant_name when 'thumbnail' then 122880 when 'card' then 307200 else 819200 end
    ) then
      raise exception 'Media file exceeds the variant byte limit';
    end if;
    total_new_bytes := total_new_bytes + (item ->> 'byteSize')::integer;
  end loop;

  select coalesce(array_agg(distinct asset.asset_group_id), '{}')
  into previous_groups
  from public.offering_items offering
  join public.media_assets asset on asset.id = offering.media_asset_id
  where offering.id = p_offering_item_id
    and offering.business_id = p_business_id;

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

  for item in select value from jsonb_array_elements(p_variants)
  loop
    variant_name := item ->> 'variant';
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
      'offering',
      variant_name::public.media_variant,
      'ready',
      item ->> 'mimeType',
      (item ->> 'width')::integer,
      (item ->> 'height')::integer,
      (item ->> 'byteSize')::integer,
      item ->> 'contentHash',
      nullif(left(trim(p_alt_text), 240), ''),
      now()
    ) returning id into asset_id;

    if variant_name = 'card' then
      representative_id := asset_id;
    end if;
  end loop;

  update public.offering_items
  set media_asset_id = representative_id
  where id = p_offering_item_id
    and business_id = p_business_id;

  return jsonb_build_object(
    'mediaAssetId', representative_id,
    'previousPaths', to_jsonb(previous_paths)
  );
end;
$$;

revoke all on function public.finalize_offering_media(uuid, uuid, uuid, uuid, text, jsonb)
from public;
grant execute on function public.finalize_offering_media(uuid, uuid, uuid, uuid, text, jsonb)
to service_role;

comment on function public.finalize_offering_media(uuid, uuid, uuid, uuid, text, jsonb)
  is 'Atomically records verified offering image variants and replaces an item image.';

commit;
