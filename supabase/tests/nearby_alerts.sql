begin;

do $$
declare
  first_user uuid;
  second_user uuid;
  mobile_business uuid;
  fixed_business uuid;
  stop_id uuid;
  settings jsonb;
  visible_count integer;
begin
  select id into first_user from public.profiles order by created_at limit 1;
  select id into second_user from public.profiles where id <> first_user order by created_at limit 1;
  if first_user is null or second_user is null then
    raise exception 'Nearby alerts test requires two seeded profiles';
  end if;

  insert into public.businesses (
    created_by, slug, name, business_type, status, approved_at
  ) values (
    first_user, 'nearby-mobile-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'Nearby Mobile Fixture', 'mobile', 'active', now()
  ) returning id into mobile_business;

  insert into public.businesses (
    created_by, slug, name, business_type, status, approved_at
  ) values (
    first_user, 'nearby-fixed-' || left(replace(gen_random_uuid()::text, '-', ''), 10),
    'Nearby Fixed Fixture', 'food_drink', 'active', now()
  ) returning id into fixed_business;

  insert into public.business_follows (business_id, customer_id)
  values (mobile_business, first_user), (fixed_business, first_user);

  insert into public.business_location_stops (
    business_id, title, address_text, latitude, longitude,
    starts_at, ends_at, is_published
  ) values (
    mobile_business, 'Market Square', '1 Market Square', 30, -90,
    now() - interval '5 minutes', now() + interval '2 hours', true
  ) returning id into stop_id;

  perform set_config('request.jwt.claim.sub', first_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  settings := public.get_nearby_alert_preferences();
  if (settings->>'enabled')::boolean or (settings->>'radiusMiles')::integer <> 5 then
    raise exception 'Nearby alerts must default off at five miles';
  end if;
  if jsonb_array_length(settings->'businesses') <> 1 then
    raise exception 'Only followed mobile businesses may be configured';
  end if;

  perform public.set_nearby_alert_preferences(true, 1);
  if (public.get_nearby_alert_preferences()->>'radiusMiles')::integer <> 1 then
    raise exception 'One mile preference was not saved';
  end if;
  perform public.set_nearby_alert_preferences(null, 5);
  perform public.set_nearby_alert_preferences(null, 10);
  perform public.set_nearby_alert_preferences(null, 13);
  perform public.set_nearby_alert_preferences(null, 25);
  if (public.get_nearby_alert_preferences()->>'radiusMiles')::integer <> 25 then
    raise exception 'Twenty-five mile preference was not saved';
  end if;

  begin
    perform public.set_nearby_alert_preferences(null, 26);
    raise exception 'Radius above twenty-five miles was accepted';
  exception when sqlstate '22023' then null;
  end;

  begin
    perform public.set_nearby_alert_preferences(null, 0);
    raise exception 'Radius below one mile was accepted';
  exception when sqlstate '22023' then null;
  end;

  select count(*) into visible_count from public.get_nearby_alert_stops();
  if visible_count <> 1 then raise exception 'Expected one eligible published stop'; end if;

  perform public.set_nearby_business_alert_preference(mobile_business, false);
  select count(*) into visible_count from public.get_nearby_alert_stops();
  if visible_count <> 0 then raise exception 'Disabled business remained eligible'; end if;
  perform public.set_nearby_business_alert_preference(mobile_business, true);

  insert into public.blocked_businesses (customer_id, business_id)
  values (first_user, mobile_business);
  select count(*) into visible_count from public.get_nearby_alert_stops();
  if visible_count <> 0 then raise exception 'Blocked business remained eligible'; end if;
  delete from public.blocked_businesses
  where customer_id = first_user and business_id = mobile_business;

  delete from public.business_follows
  where customer_id = first_user and business_id = mobile_business;
  select count(*) into visible_count from public.get_nearby_alert_stops();
  if visible_count <> 0 then raise exception 'Unfollowed business remained eligible'; end if;

  perform set_config('request.jwt.claim.sub', second_user::text, true);
  settings := public.get_nearby_alert_preferences();
  if (settings->>'enabled')::boolean or jsonb_array_length(settings->'businesses') <> 0 then
    raise exception 'Nearby preference RPC leaked another user''s settings';
  end if;
  if has_table_privilege('authenticated', 'public.nearby_alert_preferences', 'UPDATE')
    or has_table_privilege('authenticated', 'public.nearby_business_alert_preferences', 'UPDATE') then
    raise exception 'Authenticated clients must not receive direct preference mutation grants';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nearby_alert_preferences'
      and policyname = 'nearby_alert_preferences_owner_read'
      and qual like '%auth.uid()%'
  ) then raise exception 'Account preference owner-only RLS policy is missing'; end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'nearby_business_alert_preferences'
      and policyname = 'nearby_business_alert_preferences_owner_read'
      and qual like '%auth.uid()%'
  ) then raise exception 'Business preference owner-only RLS policy is missing'; end if;
end;
$$;

select 'nearby alert preference and eligibility checks passed' as result;

rollback;
