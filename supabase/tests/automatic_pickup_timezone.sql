-- Transactional fixtures only: no emails, payments, or existing order changes.
begin;
do $$
declare
  fixture_owner uuid := gen_random_uuid();
  biz uuid := gen_random_uuid();
begin
  insert into auth.users(id, raw_user_meta_data)
    values(fixture_owner, '{"display_name":"Timezone fixture"}');
  insert into public.businesses(id, created_by, slug, name, business_type, timezone)
    values(biz, fixture_owner, 'timezone-'||biz, 'Timezone fixture', 'food_drink', 'America/Chicago');
  insert into public.square_connections(business_id, merchant_id, merchant_name, location_id,
    location_snapshot, key_version, expires_at, state)
    values(biz, 'timezone-fixture', 'Fixture', 'location',
      '{"timezone":"America/New_York"}', 'fixture', now()+interval '1 day', 'connected');
  insert into public.square_ordering_settings(business_id, timezone)
    values(biz, 'Pacific/Honolulu');
  if (select timezone from public.square_ordering_settings where business_id=biz) <> 'America/New_York' then
    raise exception 'Selected Square location zone was not applied';
  end if;
  update public.square_ordering_settings set timezone='America/Los_Angeles', preparation_minutes=25 where business_id=biz;
  if not exists(select 1 from public.square_ordering_settings where business_id=biz and timezone='America/New_York' and preparation_minutes=25) then
    raise exception 'Client zone overrode location or timing edit was lost';
  end if;
  update public.square_connections set location_snapshot='{"timezone":"America/Denver"}' where business_id=biz;
  if (select timezone from public.square_ordering_settings where business_id=biz) <> 'America/Denver' then
    raise exception 'Location change did not update settings';
  end if;
  update public.square_connections set location_snapshot='{"timezone":"UTC"}' where business_id=biz;
  if (select timezone from public.square_ordering_settings where business_id=biz) <> 'America/Chicago' then
    raise exception 'Generic Square default must fall back to business zone';
  end if;
  update public.square_connections set location_id=null, location_snapshot=null where business_id=biz;
  if (select timezone from public.square_ordering_settings where business_id=biz) <> 'America/Chicago' then
    raise exception 'Disconnected setup did not use business zone';
  end if;
  update public.businesses set timezone='America/Phoenix' where id=biz;
  if (select timezone from public.square_ordering_settings where business_id=biz) <> 'America/Phoenix' then
    raise exception 'Business zone changes must refresh the fallback';
  end if;
  if extract(hour from timestamptz '2026-01-15 15:00:00+00' at time zone 'America/Chicago') <> 9
    or extract(hour from timestamptz '2026-07-15 14:00:00+00' at time zone 'America/Chicago') <> 9 then
    raise exception 'Daylight saving conversion incorrect';
  end if;
end $$;
rollback;
