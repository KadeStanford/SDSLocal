begin;

create unique index business_photos_one_logo_idx
  on public.business_photos (business_id)
  where role = 'logo';

create unique index business_photos_one_cover_idx
  on public.business_photos (business_id)
  where role = 'cover';

create or replace function public.finalize_business_media(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid,
  p_role text,
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
  expected_count integer;
  representative_variant text;
  representative_id uuid;
  photo_id uuid;
  previous_groups uuid[] := array[]::uuid[];
  previous_paths text[] := array[]::text[];
  total_new_bytes bigint := 0;
  current_bytes bigint := 0;
  review_limit bigint := 52428800;
  next_order smallint := 0;
begin
  if not exists (
    select 1
      from public.business_members
     where business_id = p_business_id
       and user_id = p_actor_id
       and role = 'owner'
       and is_active
  ) then
    raise exception 'Only an active business owner can publish media';
  end if;

  if p_role not in ('logo', 'cover', 'gallery') then
    raise exception 'Unsupported business media role';
  end if;

  if jsonb_typeof(p_variants) <> 'array' then
    raise exception 'Media variants must be an array';
  end if;

  expected_count := case p_role when 'logo' then 3 when 'cover' then 1 else 3 end;
  representative_variant := case p_role
    when 'logo' then 'logo_standard'
    when 'cover' then 'cover'
    else 'full'
  end;

  if jsonb_array_length(p_variants) <> expected_count
    or (select count(distinct value ->> 'variant') from jsonb_array_elements(p_variants)) <> expected_count then
    raise exception 'Incorrect or duplicate media variants';
  end if;

  for item in select value from jsonb_array_elements(p_variants)
  loop
    variant_name := item ->> 'variant';

    if (p_role = 'logo' and variant_name not in ('logo_small', 'logo_standard', 'logo_high_density'))
      or (p_role = 'cover' and variant_name <> 'cover')
      or (p_role = 'gallery' and variant_name not in ('thumbnail', 'card', 'full')) then
      raise exception 'Variant does not match its media role';
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
      case variant_name
        when 'logo_small' then 128
        when 'logo_standard' then 256
        when 'logo_high_density' then 512
        when 'thumbnail' then 320
        when 'card' then 800
        when 'full' then 1600
        when 'cover' then 1920
      end
    ) then
      raise exception 'Media dimensions exceed the variant limit';
    end if;

    if (item ->> 'byteSize')::integer > (
      case variant_name
        when 'logo_small' then 204800
        when 'logo_standard' then 204800
        when 'logo_high_density' then 307200
        when 'thumbnail' then 122880
        when 'card' then 307200
        when 'full' then 819200
        when 'cover' then 921600
      end
    ) then
      raise exception 'Media file exceeds the variant byte limit';
    end if;

    total_new_bytes := total_new_bytes + (item ->> 'byteSize')::integer;
  end loop;

  if p_role in ('logo', 'cover') then
    select coalesce(array_agg(distinct ma.asset_group_id), '{}')
      into previous_groups
      from public.business_photos bp
      join public.media_assets ma on ma.id = bp.media_asset_id
     where bp.business_id = p_business_id
       and bp.role::text = p_role;

    select coalesce(array_agg(storage_path), '{}')
      into previous_paths
      from public.media_assets
     where asset_group_id = any(previous_groups)
       and status = 'ready';

    delete from public.business_photos
     where business_id = p_business_id
       and role::text = p_role;

    update public.media_assets
       set status = 'pending_delete', delete_after = now()
     where asset_group_id = any(previous_groups)
       and status = 'ready';
  else
    if (select count(*) from public.business_photos where business_id = p_business_id and role = 'gallery') >=
      coalesce((select (value ->> 'value')::integer from public.platform_settings where key = 'gallery_image_limit'), 10) then
      raise exception 'Gallery image limit reached';
    end if;

    select coalesce(max(display_order) + 1, 0)::smallint
      into next_order
      from public.business_photos
     where business_id = p_business_id
       and role = 'gallery';
  end if;

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
      p_role::public.photo_role,
      variant_name::public.media_variant,
      'ready',
      item ->> 'mimeType',
      (item ->> 'width')::integer,
      (item ->> 'height')::integer,
      (item ->> 'byteSize')::integer,
      item ->> 'contentHash',
      nullif(left(trim(p_alt_text), 240), ''),
      now()
    ) returning id into photo_id;

    if variant_name = representative_variant then
      representative_id := photo_id;
    end if;
  end loop;

  insert into public.business_photos (
    business_id,
    media_asset_id,
    role,
    display_order
  ) values (
    p_business_id,
    representative_id,
    p_role::public.photo_role,
    next_order
  ) returning id into photo_id;

  return jsonb_build_object(
    'photoId', photo_id,
    'previousPaths', to_jsonb(previous_paths)
  );
end;
$$;

revoke all on function public.finalize_business_media(uuid, uuid, uuid, text, text, jsonb) from public;
grant execute on function public.finalize_business_media(uuid, uuid, uuid, text, text, jsonb) to service_role;

comment on function public.finalize_business_media(uuid, uuid, uuid, text, text, jsonb)
  is 'Atomically records verified business image variants; callable only from trusted server code.';

commit;
