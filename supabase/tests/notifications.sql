begin;

do $$
declare
  target_user_id uuid;
  target_business_id uuid;
  target_event_id uuid;
  queued_count integer;
begin
  select profile.id into target_user_id
  from public.profiles profile
  order by profile.created_at
  limit 1;

  select business.id into target_business_id
  from public.businesses business
  where business.status = 'active'
  order by business.created_at
  limit 1;

  if target_user_id is null or target_business_id is null then
    raise exception 'Notification test requires a profile and an active business';
  end if;

  insert into public.business_follows (business_id, customer_id)
  values (target_business_id, target_user_id)
  on conflict do nothing;

  insert into public.events (
    business_id,
    slug,
    title,
    description,
    starts_at,
    timezone,
    location_mode,
    is_published
  ) values (
    target_business_id,
    'notification-test-' || left(replace(gen_random_uuid()::text, '-', ''), 12),
    'Notification test event',
    'A temporary event used to verify notification queue behavior.',
    now() + interval '3 days',
    'America/Chicago',
    'business',
    true
  ) returning id into target_event_id;

  select count(*) into queued_count
  from public.notification_deliveries delivery
  where delivery.user_id = target_user_id
    and delivery.entity_id = target_event_id
    and delivery.dedupe_key like 'new-event:%'
    and delivery.status = 'queued';
  if queued_count <> 1 then
    raise exception 'Expected one deduplicated new-event notification, got %', queued_count;
  end if;

  insert into public.event_saves (event_id, customer_id, reminder_enabled)
  values (target_event_id, target_user_id, true);

  select count(*) into queued_count
  from public.notification_deliveries delivery
  where delivery.user_id = target_user_id
    and delivery.entity_id = target_event_id
    and delivery.dedupe_key like 'event-reminder:%'
    and delivery.status = 'queued';
  if queued_count <> 1 then
    raise exception 'Expected one saved-event reminder, got %', queued_count;
  end if;

  perform set_config('request.jwt.claim.sub', target_user_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform public.set_notification_preference(target_business_id, 'events', false);

  if public.notification_enabled(target_user_id, target_business_id, 'events') then
    raise exception 'Disabled event preference was not respected';
  end if;
  if exists (
    select 1 from public.notification_deliveries delivery
    where delivery.user_id = target_user_id
      and delivery.business_id = target_business_id
      and delivery.notification_type = 'events'
      and delivery.status = 'queued'
  ) then
    raise exception 'Muted event deliveries remained queued';
  end if;
end;
$$;

select 'notification queue checks passed' as result;

rollback;
