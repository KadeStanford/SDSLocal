\set ON_ERROR_STOP on

begin;
\ir fixtures/business.sql

do $$
declare
  owner_id uuid;
  business_id uuid;
  unreferenced_id uuid;
  referenced_id uuid;
  claimed_count integer;
begin
  select business.id, business.created_by
  into business_id, owner_id
  from public.businesses business
  where business.status = 'active'
  order by business.created_at
  limit 1;

  if business_id is null or owner_id is null then
    raise exception 'Media cleanup test requires an active business';
  end if;

  insert into public.media_assets (
    asset_group_id, business_id, uploaded_by, storage_path, role, variant,
    status, mime_type, width, height, byte_size, delete_after
  ) values (
    gen_random_uuid(), business_id, owner_id,
    business_id::text || '/cleanup-test-unreferenced.webp', 'gallery', 'full',
    'pending_delete', 'image/webp', 100, 100, 100, now() - interval '1 minute'
  ) returning id into unreferenced_id;

  insert into public.media_assets (
    asset_group_id, business_id, uploaded_by, storage_path, role, variant,
    status, mime_type, width, height, byte_size, delete_after
  ) values (
    gen_random_uuid(), business_id, owner_id,
    business_id::text || '/cleanup-test-referenced.webp', 'gallery', 'full',
    'pending_delete', 'image/webp', 100, 100, 100, now() - interval '1 minute'
  ) returning id into referenced_id;

  insert into public.business_photos (business_id, media_asset_id, role)
  values (business_id, referenced_id, 'gallery');

  select count(*) into claimed_count
  from public.claim_media_cleanup(50)
  where id = unreferenced_id;
  if claimed_count <> 1 then
    raise exception 'Expected one unreferenced asset to be claimed, got %', claimed_count;
  end if;

  if exists (select 1 from public.claim_media_cleanup(50) where id = referenced_id) then
    raise exception 'Referenced media asset was incorrectly claimed for deletion';
  end if;
end;
$$;

rollback;

select 'media cleanup checks passed' as result;
