begin;

-- A staging intent reserves the exact files a business owner may upload for
-- one media operation. Storage policies enforce the path, MIME type, file
-- size, and short expiry before any object is written.
alter table public.media_object_cleanup_queue
  drop constraint media_object_cleanup_queue_bucket_id_check;
alter table public.media_object_cleanup_queue
  add constraint media_object_cleanup_queue_bucket_id_check
  check (bucket_id in ('business-media', 'media-staging'));
alter table public.media_object_cleanup_queue
  add column expected_bytes bigint not null default 0 check (expected_bytes >= 0);

create table public.media_staging_upload_intents (
  asset_group_id uuid primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('logo', 'cover', 'gallery', 'offering', 'event', 'event_gallery')),
  target_id uuid,
  variant_paths jsonb not null check (jsonb_typeof(variant_paths) = 'object'),
  reserved_bytes integer not null check (reserved_bytes > 0),
  object_count smallint not null check (object_count > 0),
  status text not null default 'active' check (status in ('active', 'consumed', 'released', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint media_staging_intent_target check (
    (role in ('offering', 'event', 'event_gallery') and target_id is not null)
    or (role in ('logo', 'cover', 'gallery') and target_id is null)
  )
);

create index media_staging_upload_intents_active_idx
  on public.media_staging_upload_intents (business_id, expires_at)
  where status = 'active';
create index media_staging_upload_intents_actor_active_idx
  on public.media_staging_upload_intents (actor_id, expires_at)
  where status = 'active';
create index media_staging_upload_intents_actor_recent_idx
  on public.media_staging_upload_intents (actor_id, created_at desc);

alter table public.media_staging_upload_intents enable row level security;
revoke all on public.media_staging_upload_intents from public, anon, authenticated, service_role;

-- Reuse the F09 publication reservation when the client asks for a staging
-- intent, then let finalization encounter the same active reservation safely.
create or replace function public.reserve_business_media_upload(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid,
  p_role text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  reserve_size integer;
  ready_bytes bigint := 0;
  other_reserved_bytes bigint := 0;
  review_limit bigint := 52428800;
  gallery_limit integer := 10;
  variant_name text;
  reservation_expiry timestamptz := now() + interval '20 minutes';
  existing_reservation public.media_upload_reservations%rowtype;
begin
  if p_actor_id is null or p_business_id is null or p_asset_group_id is null
    or p_role is null
    or p_role not in ('logo', 'cover', 'gallery', 'offering', 'event', 'event_gallery')
    or (p_role in ('offering', 'event', 'event_gallery') and p_target_id is null)
    or (p_role in ('logo', 'cover', 'gallery') and p_target_id is not null) then
    raise exception 'Invalid media upload request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  if not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id
      and member.user_id = p_actor_id
      and member.role = 'owner'
      and member.is_active
  ) then
    raise exception 'Only an active business owner can upload media' using errcode = '42501';
  end if;

  if p_role = 'offering' and not exists (
    select 1 from public.offering_items item
    where item.id = p_target_id and item.business_id = p_business_id
  ) then
    raise exception 'Offering item not found' using errcode = 'P0002';
  end if;

  if p_role in ('event', 'event_gallery') and not exists (
    select 1 from public.events event_record
    where event_record.id = p_target_id
      and event_record.business_id = p_business_id
      and (p_role <> 'event_gallery' or event_record.archived_at is null)
  ) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  select * into existing_reservation
    from public.media_upload_reservations reservation
   where reservation.asset_group_id = p_asset_group_id
   for update;
  if existing_reservation.asset_group_id is not null then
    if existing_reservation.business_id = p_business_id
       and existing_reservation.actor_id = p_actor_id
       and existing_reservation.role = p_role
       and existing_reservation.target_id is not distinct from p_target_id
       and existing_reservation.status = 'consumed'
       and existing_reservation.result is not null then
      return jsonb_build_object('alreadyFinalized', true, 'media', existing_reservation.result);
    end if;
    if existing_reservation.business_id = p_business_id
       and existing_reservation.actor_id = p_actor_id
       and existing_reservation.role = p_role
       and existing_reservation.target_id is not distinct from p_target_id
       and existing_reservation.status = 'active'
       and existing_reservation.expires_at > now() then
      return jsonb_build_object(
        'alreadyReserved', true,
        'reservedBytes', existing_reservation.reserved_bytes,
        'expiresInSeconds', greatest(1, floor(extract(epoch from existing_reservation.expires_at - now()))::integer)
      );
    end if;
    raise exception 'This image upload has already been attempted. Please choose the photo again.'
      using errcode = '23505';
  end if;

  if exists (select 1 from public.media_assets asset where asset.asset_group_id = p_asset_group_id) then
    raise exception 'This image upload has already been attempted. Please choose the photo again.'
      using errcode = '23505';
  end if;

  if p_role = 'gallery' then
    select coalesce((value ->> 'value')::integer, gallery_limit)
      into gallery_limit from public.platform_settings where key = 'gallery_image_limit';
    if (select count(*) from public.business_photos photo
        where photo.business_id = p_business_id and photo.role = 'gallery')
       + (select count(*) from public.media_upload_reservations reservation
          where reservation.business_id = p_business_id and reservation.role = 'gallery'
            and reservation.status = 'active' and reservation.expires_at > now())
       >= coalesce(gallery_limit, 10) then
      raise exception 'Gallery image limit reached' using errcode = '54000';
    end if;
  elsif p_role = 'event_gallery' then
    select coalesce((value ->> 'value')::integer, 10)
      into gallery_limit from public.platform_settings where key = 'event_gallery_image_limit';
    if (select count(*) from public.event_photos photo where photo.event_id = p_target_id)
       + (select count(*) from public.media_upload_reservations reservation
          where reservation.business_id = p_business_id and reservation.role = 'event_gallery'
            and reservation.target_id = p_target_id
            and reservation.status = 'active' and reservation.expires_at > now())
       >= coalesce(gallery_limit, 10) then
      raise exception 'Event gallery limit reached' using errcode = '54000';
    end if;
  end if;

  reserve_size := case p_role
    when 'logo' then 716800
    when 'cover' then 921600
    when 'event' then 512000
    else 1249280
  end;

  select coalesce(sum(asset.byte_size), 0) into ready_bytes
    from public.media_assets asset
   where asset.business_id = p_business_id and asset.status = 'ready'
     and not (
       (p_role in ('logo', 'cover') and exists (
         select 1 from public.business_photos photo
         join public.media_assets previous on previous.id = photo.media_asset_id
         where photo.business_id = p_business_id and photo.role::text = p_role
           and previous.asset_group_id = asset.asset_group_id
       ))
       or (p_role = 'offering' and exists (
         select 1 from public.offering_items item
         join public.media_assets previous on previous.id = item.media_asset_id
         where item.id = p_target_id and item.business_id = p_business_id
           and previous.asset_group_id = asset.asset_group_id
       ))
       or (p_role = 'event' and exists (
         select 1 from public.events event_record
         join public.media_assets previous on previous.id = event_record.media_asset_id
         where event_record.id = p_target_id and event_record.business_id = p_business_id
           and previous.asset_group_id = asset.asset_group_id
       ))
     );

  select coalesce(sum(reservation.reserved_bytes), 0) into other_reserved_bytes
    from public.media_upload_reservations reservation
   where reservation.business_id = p_business_id and reservation.status = 'active'
     and reservation.expires_at > now();
  select coalesce((value ->> 'value')::bigint, review_limit)
    into review_limit from public.platform_settings where key = 'media_review_bytes';
  if ready_bytes + other_reserved_bytes + reserve_size > coalesce(review_limit, 52428800) then
    raise exception 'Business media storage limit reached' using errcode = '54000';
  end if;

  insert into public.media_upload_reservations (
    asset_group_id, business_id, actor_id, role, target_id, reserved_bytes, expires_at
  ) values (
    p_asset_group_id, p_business_id, p_actor_id, p_role, p_target_id, reserve_size, reservation_expiry
  );

  foreach variant_name in array case p_role
    when 'logo' then array['logo_small', 'logo_standard', 'logo_high_density']
    when 'cover' then array['cover']
    when 'event' then array['event_card']
    else array['thumbnail', 'card', 'full']
  end loop
    insert into public.media_object_cleanup_queue (bucket_id, storage_path, expected_bytes, next_attempt_at)
    values (
      'business-media',
      p_business_id::text || '/' || p_asset_group_id::text || '/' || variant_name || '.webp',
      case variant_name
        when 'logo_small' then 204800 when 'logo_standard' then 204800
        when 'logo_high_density' then 307200 when 'cover' then 921600
        when 'event_card' then 512000 when 'thumbnail' then 122880
        when 'card' then 307200 else 819200 end,
      reservation_expiry
    ) on conflict (bucket_id, storage_path) do nothing;
  end loop;

  return jsonb_build_object('reservedBytes', reserve_size, 'expiresInSeconds', 1200);
end;
$$;

revoke all on function public.reserve_business_media_upload(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_business_media_upload(uuid, uuid, uuid, text, uuid)
  to service_role;

create or replace function public.create_business_media_staging_intent(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid,
  p_role text,
  p_target_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  variant_paths jsonb;
  reserve_size integer;
  object_total smallint;
  recent_actor_intents integer;
  staging_limit bigint := 26214400;
  active_intent_limit integer := 10;
  active_object_limit integer := 30;
  actor_reserved_bytes bigint;
  business_reserved_bytes bigint;
  actor_reserved_objects bigint;
  business_reserved_objects bigint;
  actor_active_intents integer;
  business_active_intents integer;
  actor_untracked_bytes bigint;
  business_untracked_bytes bigint;
  actor_untracked_objects bigint;
  business_untracked_objects bigint;
  existing_intent public.media_staging_upload_intents%rowtype;
  expiry timestamptz := now() + interval '15 minutes';
  reservation_result jsonb;
  expected_path text;
  expected_bytes integer;
begin
  if p_actor_id is null or p_business_id is null or p_asset_group_id is null
    or p_role is null
    or p_role not in ('logo', 'cover', 'gallery', 'offering', 'event', 'event_gallery')
    or (p_role in ('offering', 'event', 'event_gallery') and p_target_id is null)
    or (p_role in ('logo', 'cover', 'gallery') and p_target_id is not null) then
    raise exception 'Invalid media upload request' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_actor_id::text, 1));

  reservation_result := public.reserve_business_media_upload(
    p_actor_id, p_business_id, p_asset_group_id, p_role, p_target_id
  );
  if coalesce((reservation_result ->> 'alreadyFinalized')::boolean, false) then
    raise exception 'This image was already saved. Refresh the workspace before uploading again.'
      using errcode = '23505';
  end if;
  reserve_size := (reservation_result ->> 'reservedBytes')::integer;

  select * into existing_intent from public.media_staging_upload_intents intent
   where intent.asset_group_id = p_asset_group_id for update;
  if existing_intent.asset_group_id is not null then
    if existing_intent.actor_id = p_actor_id and existing_intent.business_id = p_business_id
       and existing_intent.role = p_role
       and existing_intent.target_id is not distinct from p_target_id
       and existing_intent.status = 'active' and existing_intent.expires_at > now() then
      return jsonb_build_object(
        'variants', existing_intent.variant_paths,
        'expiresInSeconds', greatest(1, floor(extract(epoch from existing_intent.expires_at - now()))::integer)
      );
    end if;
    raise exception 'This upload intent is no longer available. Choose the photo again.'
      using errcode = '23505';
  end if;

  variant_paths := case p_role
    when 'logo' then jsonb_build_object(
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/logo_small.webp', jsonb_build_object('maxBytes', 204800, 'variant', 'logo_small'),
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/logo_standard.webp', jsonb_build_object('maxBytes', 204800, 'variant', 'logo_standard'),
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/logo_high_density.webp', jsonb_build_object('maxBytes', 307200, 'variant', 'logo_high_density')
    )
    when 'cover' then jsonb_build_object(
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/cover.webp', jsonb_build_object('maxBytes', 921600, 'variant', 'cover')
    )
    when 'event' then jsonb_build_object(
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/event_card.webp', jsonb_build_object('maxBytes', 512000, 'variant', 'event_card')
    )
    else jsonb_build_object(
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/thumbnail.webp', jsonb_build_object('maxBytes', 122880, 'variant', 'thumbnail'),
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/card.webp', jsonb_build_object('maxBytes', 307200, 'variant', 'card'),
      p_actor_id::text || '/' || p_business_id::text || '/' || p_asset_group_id::text || '/full.webp', jsonb_build_object('maxBytes', 819200, 'variant', 'full')
    )
  end;
  select count(*)::smallint into object_total from jsonb_object_keys(variant_paths);
  select coalesce(sum((value ->> 'maxBytes')::integer), 0)::integer
    into reserve_size from jsonb_each(variant_paths);

  select coalesce((value ->> 'value')::bigint, staging_limit)
    into staging_limit from public.platform_settings where key = 'media_staging_limit_bytes';
  select coalesce((value ->> 'value')::integer, active_intent_limit)
    into active_intent_limit from public.platform_settings where key = 'media_staging_active_intent_limit';
  select coalesce((value ->> 'value')::integer, active_object_limit)
    into active_object_limit from public.platform_settings where key = 'media_staging_active_object_limit';

  select count(*)::integer into recent_actor_intents
    from public.media_staging_upload_intents intent
   where intent.actor_id = p_actor_id and intent.created_at >= now() - interval '1 hour';

  select count(*)::integer, coalesce(sum(intent.reserved_bytes), 0),
         coalesce(sum(intent.object_count), 0)
    into actor_active_intents, actor_reserved_bytes, actor_reserved_objects
    from public.media_staging_upload_intents intent
   where intent.actor_id = p_actor_id and intent.status = 'active' and intent.expires_at > now();
  select count(*)::integer, coalesce(sum(intent.reserved_bytes), 0),
         coalesce(sum(intent.object_count), 0)
    into business_active_intents, business_reserved_bytes, business_reserved_objects
    from public.media_staging_upload_intents intent
   where intent.business_id = p_business_id and intent.status = 'active' and intent.expires_at > now();

  select coalesce(sum(case when object.metadata ->> 'size' ~ '^[0-9]{1,15}$'
                            then (object.metadata ->> 'size')::bigint else 0 end), 0),
         count(*)
    into actor_untracked_bytes, actor_untracked_objects
    from storage.objects object
   where object.bucket_id = 'media-staging'
     and split_part(object.name, '/', 1) = p_actor_id::text
     and not exists (
       select 1 from public.media_staging_upload_intents intent
        where intent.actor_id = p_actor_id and intent.status = 'active'
          and intent.expires_at > now() and intent.variant_paths ? object.name
     );
  select coalesce(sum(case when object.metadata ->> 'size' ~ '^[0-9]{1,15}$'
                            then (object.metadata ->> 'size')::bigint else 0 end), 0),
         count(*)
    into business_untracked_bytes, business_untracked_objects
    from storage.objects object
   where object.bucket_id = 'media-staging'
     and split_part(object.name, '/', 1) = p_actor_id::text
     and split_part(object.name, '/', 2) = p_business_id::text
     and not exists (
       select 1 from public.media_staging_upload_intents intent
        where intent.actor_id = p_actor_id and intent.business_id = p_business_id
          and intent.status = 'active' and intent.expires_at > now()
          and intent.variant_paths ? object.name
     );

  if recent_actor_intents >= 30 then
    update public.media_upload_reservations
       set status = 'released', completed_at = now()
     where asset_group_id = p_asset_group_id and status = 'active';
    raise exception 'Too many photo uploads were started recently. Wait a few minutes and try again.'
      using errcode = '54000';
  end if;

  if business_active_intents >= coalesce(active_intent_limit, 10)
     or actor_active_intents >= coalesce(active_intent_limit, 10)
     or business_reserved_objects + business_untracked_objects + object_total
       > coalesce(active_object_limit, 30)
     or actor_reserved_objects + actor_untracked_objects + object_total
       > coalesce(active_object_limit, 30)
     or business_reserved_bytes + business_untracked_bytes + reserve_size
       > coalesce(staging_limit, 26214400)
     or actor_reserved_bytes + actor_untracked_bytes + reserve_size
       > coalesce(staging_limit, 26214400) then
    update public.media_upload_reservations
       set status = 'released', completed_at = now()
     where asset_group_id = p_asset_group_id and status = 'active';
    raise exception 'Temporary photo storage is busy. Wait a few minutes and try again.'
      using errcode = '54000';
  end if;

  insert into public.media_staging_upload_intents (
    asset_group_id, business_id, actor_id, role, target_id, variant_paths,
    reserved_bytes, object_count, expires_at
  ) values (
    p_asset_group_id, p_business_id, p_actor_id, p_role, p_target_id,
    variant_paths, reserve_size, object_total, expiry
  );

  update public.media_upload_reservations
     set expires_at = expiry
   where asset_group_id = p_asset_group_id and status = 'active';
  update public.media_object_cleanup_queue
     set next_attempt_at = expiry
   where bucket_id = 'business-media'
     and storage_path like p_business_id::text || '/' || p_asset_group_id::text || '/%';

  for expected_path, expected_bytes in
    select key, (value ->> 'maxBytes')::integer from jsonb_each(variant_paths)
  loop
    insert into public.media_object_cleanup_queue (
      bucket_id, storage_path, expected_bytes, next_attempt_at
    ) values ('media-staging', expected_path, expected_bytes, expiry)
    on conflict (bucket_id, storage_path) do nothing;
  end loop;

  return jsonb_build_object(
    'variants', variant_paths,
    'expiresInSeconds', 900,
    'reservedBytes', reserve_size,
    'objectCount', object_total
  );
end;
$$;

revoke all on function public.create_business_media_staging_intent(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_business_media_staging_intent(uuid, uuid, uuid, text, uuid)
  to service_role;

create or replace function public.can_insert_business_media_staging_object(p_name text, p_metadata jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
set row_security = off
as $$
declare
  max_bytes integer;
  size_text text;
begin
  if auth.uid() is null or coalesce(p_metadata ->> 'mimetype', '') <> 'image/webp' then return false; end if;
  size_text := p_metadata ->> 'size';
  if size_text is null or size_text !~ '^[0-9]{1,10}$' then return false; end if;

  select (intent.variant_paths -> p_name ->> 'maxBytes')::integer into max_bytes
    from public.media_staging_upload_intents intent
   where intent.actor_id = auth.uid()
     and intent.status = 'active'
     and intent.expires_at > now()
     and intent.variant_paths ? p_name
     and exists (
       select 1 from public.business_members member
        where member.business_id = intent.business_id
          and member.user_id = intent.actor_id
          and member.role = 'owner'
          and member.is_active
     )
   limit 1;
  return max_bytes is not null and size_text::bigint > 0 and size_text::bigint <= max_bytes;
end;
$$;

revoke all on function public.can_insert_business_media_staging_object(text, jsonb)
  from public, anon;
grant execute on function public.can_insert_business_media_staging_object(text, jsonb)
  to authenticated;

drop policy media_staging_owner_insert on storage.objects;
create policy media_staging_intent_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media-staging'
    and public.can_insert_business_media_staging_object(name, metadata)
  );

-- Releasing or consuming the F09 publication reservation also closes the
-- staging intent and makes its paths immediately eligible for durable cleanup.
create or replace function public.close_business_media_staging_intent_after_reservation()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  stage_paths jsonb;
  next_status text;
  stage_path text;
begin
  if new.status = old.status or new.status not in ('consumed', 'released') then return new; end if;
  next_status := new.status;
  update public.media_staging_upload_intents intent
     set status = next_status
   where intent.asset_group_id = new.asset_group_id
     and intent.actor_id = new.actor_id
     and intent.business_id = new.business_id
     and intent.status = 'active'
   returning intent.variant_paths into stage_paths;
  if stage_paths is not null then
    for stage_path in select key from jsonb_each(stage_paths)
    loop
      update public.media_object_cleanup_queue queue
         set next_attempt_at = now(), claimed_at = null
       where queue.bucket_id = 'media-staging' and queue.storage_path = stage_path;
    end loop;
  end if;
  return new;
end;
$$;

revoke all on function public.close_business_media_staging_intent_after_reservation()
  from public, anon, authenticated, service_role;
create trigger close_business_media_staging_intent
after update of status on public.media_upload_reservations
for each row execute function public.close_business_media_staging_intent_after_reservation();

create or replace function public.release_business_media_staging_intent(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  stage_paths jsonb;
  stage_path text;
begin
  update public.media_upload_reservations
     set status = 'released', completed_at = now()
   where asset_group_id = p_asset_group_id and actor_id = p_actor_id
     and business_id = p_business_id and status = 'active';

  update public.media_staging_upload_intents
     set status = 'released'
   where asset_group_id = p_asset_group_id and actor_id = p_actor_id
     and business_id = p_business_id and status = 'active'
   returning variant_paths into stage_paths;
  if stage_paths is not null then
    for stage_path in select key from jsonb_each(stage_paths)
    loop
      update public.media_object_cleanup_queue queue
         set next_attempt_at = now(), claimed_at = null
       where queue.bucket_id = 'media-staging' and queue.storage_path = stage_path;
    end loop;
  end if;
end;
$$;

revoke all on function public.release_business_media_staging_intent(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.release_business_media_staging_intent(uuid, uuid, uuid)
  to service_role;

create or replace function public.finish_business_media_staging_cleanup(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid,
  p_removed boolean
)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  stage_paths jsonb;
  stage_path text;
begin
  select variant_paths into stage_paths from public.media_staging_upload_intents
   where asset_group_id = p_asset_group_id and actor_id = p_actor_id
     and business_id = p_business_id;
  if stage_paths is null then return; end if;

  for stage_path in select key from jsonb_each(stage_paths)
  loop
    if p_removed then
      delete from public.media_object_cleanup_queue queue
       where queue.bucket_id = 'media-staging' and queue.storage_path = stage_path;
    else
      update public.media_object_cleanup_queue queue
         set attempts = attempts + 1, next_attempt_at = now() + interval '5 minutes', claimed_at = null
       where queue.bucket_id = 'media-staging' and queue.storage_path = stage_path;
    end if;
  end loop;
end;
$$;

revoke all on function public.finish_business_media_staging_cleanup(uuid, uuid, uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.finish_business_media_staging_cleanup(uuid, uuid, uuid, boolean)
  to service_role;

-- Extend the F09 cleanup claim to protect only live staging intents and to
-- accept objects queued by the legacy staging TTL sweeper below.
create or replace function public.claim_media_object_cleanup(p_limit integer default 100)
returns table (id uuid, bucket_id text, storage_path text)
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  return query
  with candidates as (
    select queue.id
      from public.media_object_cleanup_queue queue
     where queue.next_attempt_at <= now()
       and (queue.claimed_at is null or queue.claimed_at < now() - interval '10 minutes')
       and not exists (
         select 1 from public.media_assets asset
          where queue.bucket_id = 'business-media' and asset.storage_path = queue.storage_path
       )
       and not exists (
         select 1 from public.media_upload_reservations reservation
          where queue.bucket_id = 'business-media'
            and queue.storage_path like reservation.business_id::text || '/' || reservation.asset_group_id::text || '/%'
            and reservation.status = 'active' and reservation.expires_at > now()
       )
       and not exists (
         select 1 from public.media_staging_upload_intents intent
          where queue.bucket_id = 'media-staging'
            and intent.variant_paths ? queue.storage_path
            and intent.status = 'active' and intent.expires_at > now()
       )
     order by queue.next_attempt_at, queue.created_at
     for update skip locked
     limit least(greatest(coalesce(p_limit, 100), 1), 500)
  ), claimed as (
    update public.media_object_cleanup_queue queue
       set claimed_at = now()
      from candidates
     where queue.id = candidates.id
    returning queue.id, queue.bucket_id, queue.storage_path
  )
  select claimed.id, claimed.bucket_id, claimed.storage_path from claimed;
end;
$$;

revoke all on function public.claim_media_object_cleanup(integer) from public, anon, authenticated;
grant execute on function public.claim_media_object_cleanup(integer) to service_role;

create or replace function public.enqueue_expired_media_staging_objects(p_limit integer default 100)
returns integer
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  queued_count integer := 0;
begin
  with candidates as (
    select object.name,
           case when object.metadata ->> 'size' ~ '^[0-9]{1,15}$'
                then (object.metadata ->> 'size')::bigint else 0 end as expected_bytes
      from storage.objects object
     where object.bucket_id = 'media-staging'
       and object.created_at < now() - interval '24 hours'
       and not exists (
         select 1 from public.media_staging_upload_intents intent
          where intent.variant_paths ? object.name
            and intent.status = 'active' and intent.expires_at > now()
       )
       and not exists (
         select 1 from public.media_object_cleanup_queue queue
          where queue.bucket_id = 'media-staging' and queue.storage_path = object.name
       )
     order by object.created_at
     limit least(greatest(coalesce(p_limit, 100), 1), 500)
  ), inserted as (
    insert into public.media_object_cleanup_queue (bucket_id, storage_path, expected_bytes, next_attempt_at)
    select 'media-staging', candidates.name, candidates.expected_bytes, now()
      from candidates
    on conflict (bucket_id, storage_path) do nothing
    returning 1
  )
  select count(*)::integer into queued_count from inserted;
  return queued_count;
end;
$$;

revoke all on function public.enqueue_expired_media_staging_objects(integer)
  from public, anon, authenticated;
grant execute on function public.enqueue_expired_media_staging_objects(integer) to service_role;

create or replace function public.media_storage_usage_summary()
returns table (
  business_id uuid,
  staging_reserved_bytes bigint,
  staging_actual_bytes bigint,
  staging_object_count bigint,
  published_ready_bytes bigint,
  pending_delete_bytes bigint,
  pending_delete_object_count bigint,
  intents_created_last_hour bigint
)
language sql
security definer
set search_path = ''
set row_security = off
as $$
  with business_ids as (
    select id from public.businesses
  ), staging_reserved as (
    select intent.business_id, sum(intent.reserved_bytes)::bigint as bytes
      from public.media_staging_upload_intents intent
     where intent.status = 'active' and intent.expires_at > now()
     group by intent.business_id
  ), staging_objects as (
    select case when split_part(object.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then split_part(object.name, '/', 2)::uuid end as business_id,
           coalesce(sum(case when object.metadata ->> 'size' ~ '^[0-9]{1,15}$'
                             then (object.metadata ->> 'size')::bigint else 0 end), 0)::bigint as bytes,
           count(*)::bigint as object_count
      from storage.objects object
     where object.bucket_id = 'media-staging'
       and split_part(object.name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     group by 1
  ), published as (
    select asset.business_id, coalesce(sum(asset.byte_size), 0)::bigint as bytes
      from public.media_assets asset where asset.status = 'ready'
     group by asset.business_id
  ), pending as (
    select case
             when queue.bucket_id = 'business-media'
               and split_part(queue.storage_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then split_part(queue.storage_path, '/', 1)::uuid
             when queue.bucket_id = 'media-staging'
               and split_part(queue.storage_path, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
               then split_part(queue.storage_path, '/', 2)::uuid
           end as business_id,
           coalesce(sum(case when object.id is null then 0
                             when object.metadata ->> 'size' ~ '^[0-9]{1,15}$'
                             then (object.metadata ->> 'size')::bigint else queue.expected_bytes end), 0)::bigint as bytes,
           count(object.id)::bigint as object_count
      from public.media_object_cleanup_queue queue
      left join storage.objects object
        on object.bucket_id = queue.bucket_id and object.name = queue.storage_path
     group by 1
  ), recent_intents as (
    select intent.business_id, count(*)::bigint as total
      from public.media_staging_upload_intents intent
     where intent.created_at >= now() - interval '1 hour'
     group by intent.business_id
  )
  select business_ids.id,
         coalesce(staging_reserved.bytes, 0),
         coalesce(staging_objects.bytes, 0),
         coalesce(staging_objects.object_count, 0),
         coalesce(published.bytes, 0),
         coalesce(pending.bytes, 0),
         coalesce(pending.object_count, 0),
         coalesce(recent_intents.total, 0)
    from business_ids
    left join staging_reserved on staging_reserved.business_id = business_ids.id
    left join staging_objects on staging_objects.business_id = business_ids.id
    left join published on published.business_id = business_ids.id
    left join pending on pending.business_id = business_ids.id
    left join recent_intents on recent_intents.business_id = business_ids.id
   where coalesce(staging_reserved.bytes, 0) > 0
      or coalesce(staging_objects.bytes, 0) > 0
      or coalesce(published.bytes, 0) > 0
      or coalesce(pending.bytes, 0) > 0
      or coalesce(recent_intents.total, 0) > 0;
$$;

revoke all on function public.media_storage_usage_summary() from public, anon, authenticated;
grant execute on function public.media_storage_usage_summary() to service_role;

drop policy media_staging_owner_read on storage.objects;
create policy media_staging_owner_read on storage.objects for select to authenticated
  using (bucket_id = 'media-staging' and (storage.foldername(name))[1] = (select auth.uid())::text);

update storage.buckets
   set file_size_limit = 921600,
       allowed_mime_types = array['image/webp']
 where id = 'media-staging';

commit;
notify pgrst, 'reload schema';
