begin;

alter table public.event_saves
  add column reminder_minutes_before integer not null default 1440,
  add constraint event_saves_reminder_window check (
    reminder_minutes_before in (60, 180, 1440, 2880, 10080)
  );

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid references public.businesses (id) on delete cascade,
  notification_type varchar(32) not null,
  entity_type varchar(32) not null,
  entity_id uuid not null,
  dedupe_key varchar(180) not null unique,
  title varchar(160) not null,
  body varchar(500) not null,
  url varchar(500) not null,
  deliver_after timestamptz not null default now(),
  expires_at timestamptz,
  status varchar(16) not null default 'queued',
  attempt_count smallint not null default 0,
  next_attempt_at timestamptz not null default now(),
  expo_tickets jsonb not null default '[]'::jsonb,
  last_error varchar(500),
  sent_at timestamptz,
  receipt_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_type check (
    notification_type in ('events', 'loyalty', 'general_updates', 'operational')
  ),
  constraint notification_deliveries_entity check (
    entity_type in ('event', 'loyalty_membership', 'account')
  ),
  constraint notification_deliveries_status check (
    status in ('queued', 'sending', 'sent', 'failed', 'skipped')
  ),
  constraint notification_deliveries_attempts check (attempt_count between 0 and 10),
  constraint notification_deliveries_expiry check (
    expires_at is null or expires_at > deliver_after
  )
);

create index notification_deliveries_dispatch_idx
  on public.notification_deliveries (next_attempt_at, deliver_after, created_at)
  where status = 'queued';
create index notification_deliveries_receipts_idx
  on public.notification_deliveries (sent_at)
  where status = 'sent' and receipt_checked_at is null;
create index notification_deliveries_user_idx
  on public.notification_deliveries (user_id, created_at desc);
create index push_tokens_active_user_idx
  on public.push_tokens (user_id, last_seen_at desc)
  where is_active;

alter table public.notification_deliveries enable row level security;

drop policy push_tokens_owner_all on public.push_tokens;
drop policy notification_preferences_owner_all on public.notification_preferences;

create policy push_tokens_owner_read on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_owner_read on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy notification_deliveries_owner_read on public.notification_deliveries
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.push_tokens from authenticated;
revoke insert, update, delete on public.notification_preferences from authenticated;
revoke insert, update, delete on public.notification_deliveries from authenticated;

create or replace function public.notification_enabled(
  p_user_id uuid,
  p_business_id uuid,
  p_notification_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select preference.is_enabled
      from public.notification_preferences preference
      where preference.user_id = p_user_id
        and preference.business_id = p_business_id
        and preference.notification_type = p_notification_type
    ),
    (
      select preference.is_enabled
      from public.notification_preferences preference
      where preference.user_id = p_user_id
        and preference.business_id is null
        and preference.notification_type = p_notification_type
    ),
    true
  );
$$;

revoke all on function public.notification_enabled(uuid, uuid, text) from public;
grant execute on function public.notification_enabled(uuid, uuid, text) to service_role;

create or replace function public.register_push_token(
  p_expo_push_token text,
  p_platform text,
  p_device_id_hash text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  token_id uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception 'Unsupported push platform' using errcode = '22023';
  end if;
  if p_expo_push_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' then
    raise exception 'Invalid Expo push token' using errcode = '22023';
  end if;
  if p_device_id_hash is not null and p_device_id_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid device identifier' using errcode = '22023';
  end if;

  insert into public.push_tokens (
    user_id, expo_push_token, platform, device_id_hash, is_active, last_seen_at
  ) values (
    current_user_id,
    p_expo_push_token,
    p_platform,
    p_device_id_hash,
    true,
    now()
  )
  on conflict (expo_push_token) do update set
    user_id = excluded.user_id,
    platform = excluded.platform,
    device_id_hash = excluded.device_id_hash,
    is_active = true,
    last_seen_at = now()
  returning id into token_id;

  return token_id;
end;
$$;

create or replace function public.deactivate_push_tokens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  update public.push_tokens
  set is_active = false, last_seen_at = now()
  where user_id = auth.uid() and is_active;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.register_push_token(text, text, text) from public;
revoke all on function public.deactivate_push_tokens() from public;
grant execute on function public.register_push_token(text, text, text) to authenticated;
grant execute on function public.deactivate_push_tokens() to authenticated;

create or replace function public.set_notification_preference(
  p_business_id uuid,
  p_notification_type text,
  p_is_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_notification_type not in ('events', 'loyalty', 'general_updates', 'operational') then
    raise exception 'Unsupported notification preference' using errcode = '22023';
  end if;
  if p_business_id is not null and not exists (
    select 1 from public.businesses where id = p_business_id
  ) then
    raise exception 'Business not found' using errcode = '22023';
  end if;

  insert into public.notification_preferences (
    user_id, business_id, notification_type, is_enabled
  ) values (
    current_user_id, p_business_id, p_notification_type, p_is_enabled
  )
  on conflict (user_id, business_id, notification_type) do update set
    is_enabled = excluded.is_enabled,
    updated_at = now();

  if not p_is_enabled then
    update public.notification_deliveries
    set status = 'skipped', last_error = 'Disabled by notification preference', updated_at = now()
    where user_id = current_user_id
      and status = 'queued'
      and notification_type = p_notification_type
      and (p_business_id is null or business_id = p_business_id);
  end if;
end;
$$;

revoke all on function public.set_notification_preference(uuid, text, boolean) from public;
grant execute on function public.set_notification_preference(uuid, text, boolean) to authenticated;

create or replace function public.get_notification_settings()
returns table (
  business_id uuid,
  business_name varchar,
  events_enabled boolean,
  loyalty_enabled boolean,
  general_updates_enabled boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with relevant_businesses as (
    select follow.business_id
    from public.business_follows follow
    where follow.customer_id = auth.uid()
    union
    select membership.business_id
    from public.loyalty_memberships membership
    where membership.customer_id = auth.uid() and membership.is_active
    union
    select event_record.business_id
    from public.event_saves save_record
    join public.events event_record on event_record.id = save_record.event_id
    where save_record.customer_id = auth.uid()
  )
  select
    business.id,
    business.name,
    public.notification_enabled(auth.uid(), business.id, 'events'),
    public.notification_enabled(auth.uid(), business.id, 'loyalty'),
    public.notification_enabled(auth.uid(), business.id, 'general_updates')
  from relevant_businesses relevant
  join public.businesses business on business.id = relevant.business_id
  order by business.name;
$$;

revoke all on function public.get_notification_settings() from public;
grant execute on function public.get_notification_settings() to authenticated;

create or replace function public.queue_event_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  business_record record;
  publish_time timestamptz;
begin
  select name, slug into business_record
  from public.businesses where id = new.business_id;

  update public.notification_deliveries
  set status = 'skipped', last_error = 'Event is no longer public', updated_at = now()
  where entity_type = 'event'
    and entity_id = new.id
    and status = 'queued';

  if new.archived_at is not null
    or (not new.is_published and new.publish_at is null)
    or new.starts_at <= now() then
    return new;
  end if;

  publish_time := case when new.is_published then now() else new.publish_at end;

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, deliver_after, expires_at
  )
  select
    follow.customer_id,
    new.business_id,
    'events',
    'event',
    new.id,
    'new-event:' || new.id::text || ':' || follow.customer_id::text,
    business_record.name || ' added an event',
    new.title,
    '/notification?type=event&id=' || new.id::text,
    publish_time,
    new.starts_at
  from public.business_follows follow
  where follow.business_id = new.business_id
    and public.notification_enabled(follow.customer_id, new.business_id, 'events')
  on conflict (dedupe_key) do update set
    title = excluded.title,
    body = excluded.body,
    url = excluded.url,
    deliver_after = excluded.deliver_after,
    expires_at = excluded.expires_at,
    status = 'queued',
    last_error = null,
    updated_at = now()
  where public.notification_deliveries.status in ('queued', 'skipped');

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, deliver_after, expires_at
  )
  select
    save_record.customer_id,
    new.business_id,
    'events',
    'event',
    new.id,
    'event-reminder:' || new.id::text || ':' || save_record.customer_id::text,
    new.title || ' is coming up',
    business_record.name || ' · ' || new.title,
    '/notification?type=event&id=' || new.id::text,
    greatest(now(), new.starts_at - make_interval(mins => save_record.reminder_minutes_before)),
    new.starts_at
  from public.event_saves save_record
  where save_record.event_id = new.id
    and save_record.reminder_enabled
    and public.notification_enabled(save_record.customer_id, new.business_id, 'events')
  on conflict (dedupe_key) do update set
    title = excluded.title,
    body = excluded.body,
    url = excluded.url,
    deliver_after = excluded.deliver_after,
    expires_at = excluded.expires_at,
    status = 'queued',
    last_error = null,
    updated_at = now()
  where public.notification_deliveries.status in ('queued', 'skipped');

  return new;
end;
$$;

create trigger events_queue_notifications
after insert or update of title, starts_at, is_published, publish_at, archived_at
on public.events for each row execute function public.queue_event_notifications();

create or replace function public.queue_event_save_reminder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_record record;
begin
  if tg_op = 'DELETE' then
    update public.notification_deliveries
    set status = 'skipped', last_error = 'Event reminder removed', updated_at = now()
    where dedupe_key = 'event-reminder:' || old.event_id::text || ':' || old.customer_id::text
      and status = 'queued';
    return old;
  end if;

  select event_item.id, event_item.business_id, event_item.title, event_item.starts_at,
    event_item.is_published, event_item.publish_at, event_item.archived_at,
    business.name as business_name
  into event_record
  from public.events event_item
  join public.businesses business on business.id = event_item.business_id
  where event_item.id = new.event_id;

  update public.notification_deliveries
  set status = 'skipped', last_error = 'Event reminder disabled', updated_at = now()
  where dedupe_key = 'event-reminder:' || new.event_id::text || ':' || new.customer_id::text
    and status = 'queued';

  if not new.reminder_enabled
    or event_record.id is null
    or event_record.archived_at is not null
    or event_record.starts_at <= now()
    or (not event_record.is_published and event_record.publish_at is null)
    or not public.notification_enabled(new.customer_id, event_record.business_id, 'events') then
    return new;
  end if;

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, deliver_after, expires_at
  ) values (
    new.customer_id,
    event_record.business_id,
    'events',
    'event',
    new.event_id,
    'event-reminder:' || new.event_id::text || ':' || new.customer_id::text,
    event_record.title || ' is coming up',
    event_record.business_name || ' · ' || event_record.title,
    '/notification?type=event&id=' || new.event_id::text,
    greatest(now(), event_record.starts_at - make_interval(mins => new.reminder_minutes_before)),
    event_record.starts_at
  )
  on conflict (dedupe_key) do update set
    deliver_after = excluded.deliver_after,
    expires_at = excluded.expires_at,
    status = 'queued',
    last_error = null,
    updated_at = now()
  where public.notification_deliveries.status in ('queued', 'skipped');

  return new;
end;
$$;

create trigger event_saves_queue_reminder
after insert or update of reminder_enabled, reminder_minutes_before or delete
on public.event_saves for each row execute function public.queue_event_save_reminder();

create or replace function public.queue_reward_earned_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_record record;
  balance_record record;
begin
  if new.transaction_type <> 'stamp' then
    return new;
  end if;

  select membership.customer_id, membership.business_id,
    business.name as business_name, program.reward_description
  into membership_record
  from public.loyalty_memberships membership
  join public.loyalty_programs program
    on program.id = membership.program_id and program.business_id = membership.business_id
  join public.businesses business on business.id = membership.business_id
  where membership.id = new.membership_id;

  select * into balance_record from public.calculate_loyalty_balance(new.membership_id);
  if coalesce(balance_record.rewards_ready, 0) < 1
    or coalesce(balance_record.progress_stamps, -1) <> 0
    or not public.notification_enabled(
      membership_record.customer_id, membership_record.business_id, 'loyalty'
    ) then
    return new;
  end if;

  insert into public.notification_deliveries (
    user_id, business_id, notification_type, entity_type, entity_id,
    dedupe_key, title, body, url, deliver_after, expires_at
  ) values (
    membership_record.customer_id,
    membership_record.business_id,
    'loyalty',
    'loyalty_membership',
    new.membership_id,
    'reward-earned:' || new.id::text,
    'Reward ready at ' || membership_record.business_name,
    membership_record.reward_description,
    '/rewards',
    now(),
    now() + interval '30 days'
  ) on conflict (dedupe_key) do nothing;

  return new;
end;
$$;

create trigger loyalty_transactions_queue_reward
after insert on public.loyalty_transactions
for each row execute function public.queue_reward_earned_notification();

create or replace function public.claim_notification_deliveries(p_limit integer default 25)
returns setof public.notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.notification_deliveries
  set status = 'queued', next_attempt_at = now(), updated_at = now()
  where status = 'sending' and updated_at < now() - interval '10 minutes';

  update public.notification_deliveries
  set status = 'skipped', last_error = 'Notification expired', updated_at = now()
  where status = 'queued' and expires_at is not null and expires_at <= now();

  update public.notification_deliveries delivery
  set status = 'skipped', last_error = 'Disabled by notification preference', updated_at = now()
  where delivery.status = 'queued'
    and not public.notification_enabled(
      delivery.user_id, delivery.business_id, delivery.notification_type
    );

  return query
  with picked as (
    select delivery.id
    from public.notification_deliveries delivery
    where delivery.status = 'queued'
      and delivery.deliver_after <= now()
      and delivery.next_attempt_at <= now()
    order by delivery.deliver_after, delivery.created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), 100)
  )
  update public.notification_deliveries delivery
  set status = 'sending',
      attempt_count = delivery.attempt_count + 1,
      updated_at = now()
  from picked
  where delivery.id = picked.id
  returning delivery.*;
end;
$$;

revoke all on function public.claim_notification_deliveries(integer) from public;
grant execute on function public.claim_notification_deliveries(integer) to service_role;

commit;
