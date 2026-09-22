begin;

-- Event reminders can be one-off or repeat on a predictable cadence until the event.
alter table public.event_saves
  drop constraint if exists event_saves_reminder_window;
alter table public.event_saves
  drop constraint if exists event_saves_reminder_frequency;

alter table public.event_saves
  add column if not exists reminder_frequency varchar(16) not null default 'once';

alter table public.event_saves
  add constraint event_saves_reminder_window check (
    reminder_minutes_before in (60, 180, 1440, 2880, 10080, 43200, 129600)
  ),
  add constraint event_saves_reminder_frequency check (
    reminder_frequency in ('once', 'daily', 'weekly', 'monthly')
  );

-- The existing events.media_asset_id remains the single optimized cover image.
-- This table stores up to ten additional optimized gallery images in display order.
create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  media_asset_id uuid not null references public.media_assets (id) on delete restrict,
  caption varchar(240),
  display_order smallint not null default 1,
  created_at timestamptz not null default now(),
  unique (event_id, media_asset_id),
  constraint event_photos_display_order_positive check (display_order >= 1)
);

create index if not exists event_photos_event_order_idx
  on public.event_photos (event_id, display_order, created_at);

alter table public.event_photos enable row level security;

drop policy if exists event_photos_read on public.event_photos;
create policy event_photos_read on public.event_photos for select to anon, authenticated
  using (
    exists (
      select 1
      from public.events event_record
      join public.businesses business on business.id = event_record.business_id
      where event_record.id = event_id
        and event_record.archived_at is null
        and (
          (event_record.is_published and business.status = 'active')
          or public.is_business_member(event_record.business_id, (select auth.uid()))
        )
    )
  );

drop policy if exists event_photos_owner_all on public.event_photos;
create policy event_photos_owner_all on public.event_photos for all to authenticated
  using (
    exists (
      select 1 from public.events event_record
      where event_record.id = event_id
        and public.is_business_owner(event_record.business_id, (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.events event_record
      where event_record.id = event_id
        and public.is_business_owner(event_record.business_id, (select auth.uid()))
    )
  );

create or replace function public.finalize_event_gallery_media(
  p_actor_id uuid,
  p_business_id uuid,
  p_event_id uuid,
  p_asset_group_id uuid,
  p_alt_text text,
  p_caption text,
  p_display_order smallint,
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
  photo_id uuid;
  next_order smallint;
  total_new_bytes bigint := 0;
  current_bytes bigint := 0;
  review_limit bigint := 52428800;
  gallery_limit integer := 10;
begin
  if not exists (
    select 1 from public.business_members
    where business_id = p_business_id and user_id = p_actor_id
      and role = 'owner' and is_active
  ) then
    raise exception 'Only an active business owner can publish event media';
  end if;

  if not exists (
    select 1 from public.events
    where id = p_event_id and business_id = p_business_id and archived_at is null
  ) then
    raise exception 'Event not found';
  end if;

  if jsonb_typeof(p_variants) <> 'array'
    or jsonb_array_length(p_variants) <> 3
    or (select count(distinct value ->> 'variant') from jsonb_array_elements(p_variants)) <> 3 then
    raise exception 'Exactly one thumbnail, card, and full event gallery variant is required';
  end if;

  if (select coalesce((value ->> 'value')::integer, gallery_limit)
      from public.platform_settings where key = 'event_gallery_image_limit') is not null then
    select coalesce((value ->> 'value')::integer, gallery_limit)
      into gallery_limit from public.platform_settings where key = 'event_gallery_image_limit';
  end if;
  if (select count(*) from public.event_photos where event_id = p_event_id) >= gallery_limit then
    raise exception 'Event gallery limit reached';
  end if;
  select coalesce(max(display_order) + 1, 1)::smallint
    into next_order from public.event_photos where event_id = p_event_id;
  if p_display_order is not null and p_display_order >= 1 then
    next_order := least(p_display_order, next_order);
  end if;

  for item in select value from jsonb_array_elements(p_variants)
  loop
    variant_name := item ->> 'variant';
    if variant_name not in ('thumbnail', 'card', 'full')
      or item ->> 'mimeType' <> 'image/webp'
      or (item ->> 'storagePath') <> format('%s/%s/%s.webp', p_business_id, p_asset_group_id, variant_name)
      or (item ->> 'contentHash') !~ '^[0-9a-f]{64}$'
      or (item ->> 'width')::integer <= 0
      or (item ->> 'height')::integer <= 0
      or (item ->> 'byteSize')::integer <= 0 then
      raise exception 'Invalid event gallery media metadata';
    end if;
    if greatest((item ->> 'width')::integer, (item ->> 'height')::integer) > (
      case variant_name when 'thumbnail' then 320 when 'card' then 800 else 1600 end
    ) or (item ->> 'byteSize')::integer > (
      case variant_name when 'thumbnail' then 122880 when 'card' then 307200 else 819200 end
    ) then
      raise exception 'Event gallery image exceeds its optimized limit';
    end if;
    total_new_bytes := total_new_bytes + (item ->> 'byteSize')::integer;
  end loop;

  select coalesce(sum(byte_size), 0) into current_bytes
    from public.media_assets where business_id = p_business_id and status = 'ready';
  select coalesce((value ->> 'value')::bigint, review_limit) into review_limit
    from public.platform_settings where key = 'media_review_bytes';
  if current_bytes + total_new_bytes > coalesce(review_limit, 52428800) then
    raise exception 'Business media storage limit reached';
  end if;

  for item in select value from jsonb_array_elements(p_variants)
  loop
    variant_name := item ->> 'variant';
    insert into public.media_assets (
      asset_group_id, business_id, uploaded_by, storage_path, role, variant,
      status, mime_type, width, height, byte_size, content_hash, alt_text, ready_at
    ) values (
      p_asset_group_id, p_business_id, p_actor_id, item ->> 'storagePath', 'event',
      variant_name::public.media_variant, 'ready', item ->> 'mimeType',
      (item ->> 'width')::integer, (item ->> 'height')::integer,
      (item ->> 'byteSize')::integer, item ->> 'contentHash',
      nullif(left(trim(p_alt_text), 240), ''), now()
    ) returning id into photo_id;
    if variant_name = 'full' then representative_id := photo_id; end if;
  end loop;

  insert into public.event_photos (event_id, media_asset_id, caption, display_order)
  values (p_event_id, representative_id, nullif(left(trim(p_caption), 240), ''), next_order)
  returning id into photo_id;

  return jsonb_build_object('photoId', photo_id, 'mediaAssetId', representative_id);
end;
$$;

revoke all on function public.finalize_event_gallery_media(uuid, uuid, uuid, uuid, text, text, smallint, jsonb)
from public;
grant execute on function public.finalize_event_gallery_media(uuid, uuid, uuid, uuid, text, text, smallint, jsonb)
to service_role;

-- Queue one delivery for a one-off reminder, or a sequence up to the event start.
create or replace function public.queue_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record record;
  publish_time timestamptz;
  save_record record;
  reminder_at timestamptz;
  reminder_step interval;
  occurrences integer := 0;
begin
  select name, slug into business_record from public.businesses where id = new.business_id;
  update public.notification_deliveries
    set status = 'skipped', last_error = 'Event is no longer public', updated_at = now()
    where entity_type = 'event' and entity_id = new.id and status = 'queued';
  if new.archived_at is not null or (not new.is_published and new.publish_at is null) or new.starts_at <= now() then
    return new;
  end if;
  publish_time := case when new.is_published then now() else new.publish_at end;

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id, dedupe_key,
    title, body, url, deliver_after, expires_at
  )
  select follow.customer_id, new.business_id, 'events', 'event', new.id,
    'new-event:' || new.id::text || ':' || follow.customer_id::text,
    business_record.name || ' added an event', new.title,
    '/notification?type=event&id=' || new.id::text, publish_time, new.starts_at
  from public.business_follows follow
  where follow.business_id = new.business_id
    and public.notification_enabled(follow.customer_id, new.business_id, 'events')
  on conflict (dedupe_key) do update set
    title = excluded.title, body = excluded.body, url = excluded.url,
    deliver_after = excluded.deliver_after, expires_at = excluded.expires_at,
    status = 'queued', last_error = null, updated_at = now()
  where public.notification_deliveries.status in ('queued', 'skipped');

  for save_record in
    select event_save.customer_id, event_save.reminder_enabled,
      event_save.reminder_minutes_before, event_save.reminder_frequency
    from public.event_saves event_save
    where event_save.event_id = new.id and event_save.reminder_enabled
  loop
    if not public.notification_enabled(save_record.customer_id, new.business_id, 'events') then
      continue;
    end if;
    reminder_at := new.starts_at - make_interval(mins => save_record.reminder_minutes_before);
    reminder_step := case save_record.reminder_frequency
      when 'daily' then interval '1 day'
      when 'weekly' then interval '1 week'
      when 'monthly' then interval '1 month'
      else null
    end;
    loop
      exit when reminder_at >= new.starts_at;
      exit when occurrences >= 366;
      if reminder_at >= now() then
        insert into public.notification_deliveries (
          user_id, business_id, notification_type, entity_type, entity_id, dedupe_key,
          title, body, url, deliver_after, expires_at
        ) values (
          save_record.customer_id, new.business_id, 'events', 'event', new.id,
          'event-reminder:' || new.id::text || ':' || save_record.customer_id::text || ':' ||
            to_char(reminder_at, 'YYYYMMDDHH24MISS'),
          new.title || ' is coming up', business_record.name || ' · ' || new.title,
          '/notification?type=event&id=' || new.id::text, reminder_at, new.starts_at
        ) on conflict (dedupe_key) do update set
          deliver_after = excluded.deliver_after, expires_at = excluded.expires_at,
          status = 'queued', last_error = null, updated_at = now()
        where public.notification_deliveries.status in ('queued', 'skipped');
      end if;
      occurrences := occurrences + 1;
      exit when save_record.reminder_frequency = 'once';
      reminder_at := reminder_at + reminder_step;
    end loop;
  end loop;
  return new;
end;
$$;

create or replace function public.queue_event_save_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record record;
  reminder_at timestamptz;
  reminder_step interval;
  occurrences integer := 0;
begin
  if tg_op = 'DELETE' then
    update public.notification_deliveries
      set status = 'skipped', last_error = 'Event reminder removed', updated_at = now()
      where entity_type = 'event' and entity_id = old.event_id
        and user_id = old.customer_id and status = 'queued';
    return old;
  end if;
  select event_item.id, event_item.business_id, event_item.title, event_item.starts_at,
    event_item.is_published, event_item.publish_at, event_item.archived_at,
    business.name as business_name
  into event_record
  from public.events event_item join public.businesses business on business.id = event_item.business_id
  where event_item.id = new.event_id;
  update public.notification_deliveries set status = 'skipped', last_error = 'Event reminder updated', updated_at = now()
    where entity_type = 'event' and entity_id = new.event_id and user_id = new.customer_id and status = 'queued';
  if not new.reminder_enabled or event_record.id is null or event_record.archived_at is not null
    or event_record.starts_at <= now() or (not event_record.is_published and event_record.publish_at is null)
    or not public.notification_enabled(new.customer_id, event_record.business_id, 'events') then
    return new;
  end if;
  reminder_at := event_record.starts_at - make_interval(mins => new.reminder_minutes_before);
  reminder_step := case new.reminder_frequency
    when 'daily' then interval '1 day'
    when 'weekly' then interval '1 week'
    when 'monthly' then interval '1 month'
    else null
  end;
  loop
    exit when reminder_at >= event_record.starts_at;
    exit when occurrences >= 366;
    if reminder_at >= now() then
      insert into public.notification_deliveries (
        user_id, business_id, notification_type, entity_type, entity_id, dedupe_key,
        title, body, url, deliver_after, expires_at
      ) values (
        new.customer_id, event_record.business_id, 'events', 'event', new.event_id,
        'event-reminder:' || new.event_id::text || ':' || new.customer_id::text || ':' ||
          to_char(reminder_at, 'YYYYMMDDHH24MISS'),
        event_record.title || ' is coming up', event_record.business_name || ' · ' || event_record.title,
        '/notification?type=event&id=' || new.event_id::text, reminder_at, event_record.starts_at
      ) on conflict (dedupe_key) do update set
        deliver_after = excluded.deliver_after, expires_at = excluded.expires_at,
        status = 'queued', last_error = null, updated_at = now()
      where public.notification_deliveries.status in ('queued', 'skipped');
    end if;
    occurrences := occurrences + 1;
    exit when new.reminder_frequency = 'once';
    reminder_at := reminder_at + reminder_step;
  end loop;
  return new;
end;
$$;

drop trigger if exists event_saves_queue_reminder on public.event_saves;
create trigger event_saves_queue_reminder
after insert or update of reminder_enabled, reminder_minutes_before, reminder_frequency or delete
on public.event_saves for each row execute function public.queue_event_save_reminder();

insert into public.platform_settings (key, value, description)
values ('event_gallery_image_limit', '{"value":10}'::jsonb, 'Maximum optimized gallery images per event')
on conflict (key) do update set value = excluded.value;

commit;
