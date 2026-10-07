begin;

-- A media reservation moves permission, target, slot, and storage-cap checks
-- ahead of any public Storage write. The final media RPCs remain the authority
-- that commits associations, while this row reserves capacity during upload.
create table public.media_upload_reservations (
  asset_group_id uuid primary key,
  business_id uuid not null references public.businesses (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('logo', 'cover', 'gallery', 'offering', 'event', 'event_gallery')),
  target_id uuid,
  reserved_bytes integer not null check (reserved_bytes > 0),
  status text not null default 'active' check (status in ('active', 'consumed', 'released')),
  result jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  constraint media_upload_reservation_target check (
    (role in ('offering', 'event', 'event_gallery') and target_id is not null)
    or (role in ('logo', 'cover', 'gallery') and target_id is null)
  )
);

create index media_upload_reservations_business_active_idx
  on public.media_upload_reservations (business_id, role, expires_at)
  where status = 'active';

alter table public.media_upload_reservations enable row level security;
revoke all on public.media_upload_reservations from public, anon, authenticated, service_role;
grant select on public.media_upload_reservations to service_role;

create table public.media_object_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null check (bucket_id = 'business-media'),
  storage_path text not null,
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (bucket_id, storage_path)
);

create index media_object_cleanup_due_idx
  on public.media_object_cleanup_queue (next_attempt_at, claimed_at);

alter table public.media_object_cleanup_queue enable row level security;
revoke all on public.media_object_cleanup_queue from public, anon, authenticated, service_role;

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

  -- Reservations and final media inserts use the same per-business lock. This
  -- makes both quota and gallery-slot reservations serializable for a business.
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

  if p_role = 'event' and not exists (
    select 1 from public.events event_record
    where event_record.id = p_target_id and event_record.business_id = p_business_id
  ) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  if p_role = 'event_gallery' and not exists (
    select 1 from public.events event_record
    where event_record.id = p_target_id
      and event_record.business_id = p_business_id
      and event_record.archived_at is null
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
      return jsonb_build_object(
        'alreadyFinalized', true,
        'media', existing_reservation.result
      );
    end if;
    raise exception 'This image upload has already been attempted. Please choose the photo again.'
      using errcode = '23505';
  end if;

  if exists (
    select 1 from public.media_assets asset
    where asset.asset_group_id = p_asset_group_id
  ) then
    raise exception 'This image upload has already been attempted. Please choose the photo again.'
      using errcode = '23505';
  end if;

  if p_role = 'gallery' then
    select coalesce((value ->> 'value')::integer, gallery_limit)
      into gallery_limit
      from public.platform_settings
     where key = 'gallery_image_limit';
    if (select count(*) from public.business_photos photo
        where photo.business_id = p_business_id and photo.role = 'gallery')
       + (select count(*) from public.media_upload_reservations reservation
          where reservation.business_id = p_business_id
            and reservation.role = 'gallery'
            and reservation.status = 'active'
            and reservation.expires_at > now()) >= coalesce(gallery_limit, 10) then
      raise exception 'Gallery image limit reached' using errcode = '54000';
    end if;
  elsif p_role = 'event_gallery' then
    select coalesce((value ->> 'value')::integer, 10)
      into gallery_limit
      from public.platform_settings
     where key = 'event_gallery_image_limit';
    if (select count(*) from public.event_photos photo where photo.event_id = p_target_id)
       + (select count(*) from public.media_upload_reservations reservation
          where reservation.business_id = p_business_id
            and reservation.role = 'event_gallery'
            and reservation.target_id = p_target_id
            and reservation.status = 'active'
            and reservation.expires_at > now()) >= coalesce(gallery_limit, 10) then
      raise exception 'Event gallery limit reached' using errcode = '54000';
    end if;
  end if;

  reserve_size := case p_role
    when 'logo' then 716800
    when 'cover' then 921600
    when 'event' then 512000
    else 1228800
  end;

  select coalesce(sum(asset.byte_size), 0)
    into ready_bytes
    from public.media_assets asset
   where asset.business_id = p_business_id
     and asset.status = 'ready'
     and not (
       (p_role in ('logo', 'cover') and exists (
         select 1
           from public.business_photos photo
           join public.media_assets previous on previous.id = photo.media_asset_id
          where photo.business_id = p_business_id
            and photo.role::text = p_role
            and previous.asset_group_id = asset.asset_group_id
       ))
       or (p_role = 'offering' and exists (
         select 1
           from public.offering_items item
           join public.media_assets previous on previous.id = item.media_asset_id
          where item.id = p_target_id
            and item.business_id = p_business_id
            and previous.asset_group_id = asset.asset_group_id
       ))
       or (p_role = 'event' and exists (
         select 1
           from public.events event_record
           join public.media_assets previous on previous.id = event_record.media_asset_id
          where event_record.id = p_target_id
            and event_record.business_id = p_business_id
            and previous.asset_group_id = asset.asset_group_id
       ))
     );

  select coalesce(sum(reservation.reserved_bytes), 0)
    into other_reserved_bytes
    from public.media_upload_reservations reservation
   where reservation.business_id = p_business_id
     and reservation.status = 'active'
     and reservation.expires_at > now();

  select coalesce((value ->> 'value')::bigint, review_limit)
    into review_limit
    from public.platform_settings
   where key = 'media_review_bytes';

  if ready_bytes + other_reserved_bytes + reserve_size > coalesce(review_limit, 52428800) then
    raise exception 'Business media storage limit reached' using errcode = '54000';
  end if;

  insert into public.media_upload_reservations (
    asset_group_id, business_id, actor_id, role, target_id,
    reserved_bytes, expires_at
  ) values (
    p_asset_group_id, p_business_id, p_actor_id, p_role, p_target_id,
    reserve_size, reservation_expiry
  );

  -- Record all possible public paths before the Edge Function can write one.
  -- A worker may claim them only after the reservation expires or is released.
  foreach variant_name in array case p_role
    when 'logo' then array['logo_small', 'logo_standard', 'logo_high_density']
    when 'cover' then array['cover']
    when 'event' then array['event_card']
    else array['thumbnail', 'card', 'full']
  end
  loop
    insert into public.media_object_cleanup_queue (bucket_id, storage_path, next_attempt_at)
    values (
      'business-media',
      p_business_id::text || '/' || p_asset_group_id::text || '/' || variant_name || '.webp',
      reservation_expiry
    );
  end loop;

  return jsonb_build_object('reservedBytes', reserve_size, 'expiresInSeconds', 1200);
end;
$$;

revoke all on function public.reserve_business_media_upload(uuid, uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_business_media_upload(uuid, uuid, uuid, text, uuid)
  to service_role;

create or replace function public.release_business_media_upload(
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
begin
  update public.media_upload_reservations
     set status = 'released', completed_at = now()
   where actor_id = p_actor_id
     and business_id = p_business_id
     and asset_group_id = p_asset_group_id
     and status = 'active';

  update public.media_object_cleanup_queue
     set next_attempt_at = now() + interval '1 minute', claimed_at = null
   where bucket_id = 'business-media'
     and storage_path like p_business_id::text || '/' || p_asset_group_id::text || '/%';
end;
$$;

revoke all on function public.release_business_media_upload(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.release_business_media_upload(uuid, uuid, uuid)
  to service_role;

create or replace function public.finalize_reserved_business_media_upload(
  p_actor_id uuid,
  p_business_id uuid,
  p_asset_group_id uuid,
  p_role text,
  p_target_id uuid,
  p_alt_text text,
  p_caption text,
  p_display_order smallint,
  p_variants jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  reservation public.media_upload_reservations%rowtype;
  finalized_result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select * into reservation
    from public.media_upload_reservations
   where asset_group_id = p_asset_group_id
   for update;
  if reservation.asset_group_id is null
     or reservation.business_id <> p_business_id
     or reservation.actor_id <> p_actor_id
     or reservation.role <> p_role
     or reservation.target_id is distinct from p_target_id then
    raise exception 'The image upload reservation is invalid or expired. Please choose the photo again.'
      using errcode = '42501';
  end if;

  if reservation.status = 'consumed' and reservation.result is not null then
    return reservation.result;
  end if;
  if reservation.status <> 'active' or reservation.expires_at <= now() then
    raise exception 'The image upload reservation is invalid or expired. Please choose the photo again.'
      using errcode = '42501';
  end if;

  finalized_result := case p_role
    when 'offering' then public.finalize_offering_media(
      p_actor_id, p_business_id, p_target_id, p_asset_group_id, p_alt_text, p_variants
    )
    when 'event' then public.finalize_event_media(
      p_actor_id, p_business_id, p_target_id, p_asset_group_id, p_alt_text, p_variants
    )
    when 'event_gallery' then public.finalize_event_gallery_media(
      p_actor_id, p_business_id, p_target_id, p_asset_group_id, p_alt_text,
      p_caption, p_display_order, p_variants
    )
    else public.finalize_business_media(
      p_actor_id, p_business_id, p_asset_group_id, p_role, p_alt_text, p_variants
    )
  end;

  update public.media_upload_reservations
     set status = 'consumed', result = finalized_result, completed_at = now()
   where asset_group_id = p_asset_group_id;

  delete from public.media_object_cleanup_queue
   where bucket_id = 'business-media'
     and storage_path like p_business_id::text || '/' || p_asset_group_id::text || '/%';

  return finalized_result;
end;
$$;

revoke all on function public.finalize_reserved_business_media_upload(
  uuid, uuid, uuid, text, uuid, text, text, smallint, jsonb
) from public, anon, authenticated;
grant execute on function public.finalize_reserved_business_media_upload(
  uuid, uuid, uuid, text, uuid, text, text, smallint, jsonb
) to service_role;

-- This insert guard closes the gap between separate upload reservations and
-- finalization. Other live reservations count against the same business cap;
-- the current group's own reservation is replaced by its actual stored bytes.
create or replace function public.enforce_media_upload_reserved_quota()
returns trigger
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
declare
  committed_bytes bigint := 0;
  reserved_bytes bigint := 0;
  review_limit bigint := 52428800;
begin
  if new.status <> 'ready' then return new; end if;

  perform pg_advisory_xact_lock(hashtextextended(new.business_id::text, 0));

  select coalesce(sum(asset.byte_size), 0)
    into committed_bytes
    from public.media_assets asset
   where asset.business_id = new.business_id
     and asset.status = 'ready';

  select coalesce(sum(reservation.reserved_bytes), 0)
    into reserved_bytes
    from public.media_upload_reservations reservation
   where reservation.business_id = new.business_id
     and reservation.asset_group_id <> new.asset_group_id
     and reservation.status = 'active'
     and reservation.expires_at > now();

  select coalesce((value ->> 'value')::bigint, review_limit)
    into review_limit
    from public.platform_settings
   where key = 'media_review_bytes';

  if committed_bytes + new.byte_size + reserved_bytes > coalesce(review_limit, 52428800) then
    raise exception 'Business media storage limit reached' using errcode = '54000';
  end if;

  return new;
end;
$$;

create trigger media_assets_reserved_quota_guard
before insert on public.media_assets
for each row execute function public.enforce_media_upload_reserved_quota();

revoke all on function public.enforce_media_upload_reserved_quota() from public, anon, authenticated;
grant execute on function public.enforce_media_upload_reserved_quota() to service_role;

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
         select 1 from public.media_assets asset where asset.storage_path = queue.storage_path
       )
       and not exists (
         select 1 from public.media_upload_reservations reservation
          where queue.storage_path like
                reservation.business_id::text || '/' || reservation.asset_group_id::text || '/%'
            and reservation.status = 'active'
            and reservation.expires_at > now()
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

create or replace function public.finish_media_object_cleanup(p_id uuid, p_deleted boolean)
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if p_deleted then
    delete from public.media_object_cleanup_queue where id = p_id;
  else
    update public.media_object_cleanup_queue
       set attempts = attempts + 1,
           next_attempt_at = now() + interval '5 minutes',
           claimed_at = null
     where id = p_id;
  end if;
end;
$$;

revoke all on function public.finish_media_object_cleanup(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.finish_media_object_cleanup(uuid, boolean)
  to service_role;

commit;
notify pgrst, 'reload schema';
