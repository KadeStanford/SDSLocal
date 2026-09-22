begin;

/*
  Structured, owner-authored updates give businesses a small, useful broadcast
  surface without turning SDS Local into a social feed or a coupon engine.
  Events continue to use the existing automatic publication notification.
*/
create table public.business_updates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  update_type varchar(24) not null,
  title varchar(120) not null,
  body varchar(500) not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  constraint business_updates_type check (update_type in ('announcement', 'deal')),
  constraint business_updates_title_length check (char_length(btrim(title)) between 2 and 120),
  constraint business_updates_body_length check (char_length(btrim(body)) between 2 and 500),
  constraint business_updates_expiry check (expires_at is null or expires_at > created_at)
);

create index business_updates_business_idx
  on public.business_updates (business_id, created_at desc);

alter table public.business_updates enable row level security;

create policy business_updates_public_read on public.business_updates
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.businesses business
      where business.id = business_id
        and business.status = 'active'
    )
  );

create policy business_updates_owner_read on public.business_updates
  for select to authenticated
  using (public.is_business_member(business_id, (select auth.uid())));

revoke insert, update, delete on public.business_updates from anon, authenticated;

alter table public.notification_deliveries
  drop constraint notification_deliveries_entity,
  add constraint notification_deliveries_entity check (
    entity_type in ('event', 'loyalty_membership', 'business_update', 'account')
  );

create or replace function public.queue_business_update_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record record;
  notification_title text;
  notification_expiry timestamptz;
begin
  select business.name, business.status
    into business_record
  from public.businesses business
  where business.id = new.business_id;

  if business_record.status <> 'active' then
    return new;
  end if;

  notification_title := case new.update_type
    when 'deal' then business_record.name || ' has a special offer'
    else business_record.name || ' shared an update'
  end;
  notification_expiry := coalesce(new.expires_at, now() + interval '14 days');

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, deliver_after, expires_at
  )
  select
    follow.customer_id,
    new.business_id,
    'general_updates',
    'business_update',
    new.id,
    'business-update:' || new.id::text || ':' || follow.customer_id::text,
    left(notification_title, 160),
    left(new.title || ' · ' || new.body, 500),
    '/notification?type=business_update&id=' || new.id::text,
    now(),
    notification_expiry
  from public.business_follows follow
  where follow.business_id = new.business_id
    and public.notification_enabled(follow.customer_id, new.business_id, 'general_updates')
  on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

create trigger business_updates_queue_notifications
after insert on public.business_updates
for each row execute function public.queue_business_update_notifications();

create or replace function public.send_business_update(
  p_business_id uuid,
  p_update_type text,
  p_title text,
  p_body text,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  update_id uuid;
  business_status public.business_status;
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if not public.is_business_owner(p_business_id, current_user_id) then
    raise exception 'Only the business owner can send updates' using errcode = '42501';
  end if;
  if p_update_type not in ('announcement', 'deal') then
    raise exception 'Choose an announcement or special offer' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'Update title must be between 2 and 120 characters' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_body, ''))) not between 2 and 500 then
    raise exception 'Update message must be between 2 and 500 characters' using errcode = '22023';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'Update expiration must be in the future' using errcode = '22023';
  end if;

  select status into business_status
  from public.businesses
  where id = p_business_id;
  if business_status is null then
    raise exception 'Business not found' using errcode = '22023';
  end if;
  if business_status <> 'active' then
    raise exception 'Your business must be approved before sending follower updates' using errcode = '42501';
  end if;

  insert into public.business_updates (
    business_id, created_by, update_type, title, body, expires_at
  ) values (
    p_business_id,
    current_user_id,
    p_update_type,
    btrim(p_title),
    btrim(p_body),
    p_expires_at
  ) returning id into update_id;

  return update_id;
end;
$$;

revoke all on function public.send_business_update(uuid, text, text, text, timestamptz) from public;
grant execute on function public.send_business_update(uuid, text, text, text, timestamptz) to authenticated;

commit;
