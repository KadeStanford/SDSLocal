begin;

do $$
declare
  owner_id uuid;
  first_request uuid := gen_random_uuid();
  second_request uuid := gen_random_uuid();
  manual_request uuid := gen_random_uuid();
  first_result jsonb;
  retry_result jsonb;
  collision_result jsonb;
  first_business uuid;
  mobile_request uuid := gen_random_uuid();
  mobile_result jsonb;
  readiness jsonb;
begin
  select id into owner_id from public.profiles order by created_at limit 1;
  if owner_id is null then
    raise exception 'Business onboarding test requires a seeded profile';
  end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);

  first_result := public.create_business_with_owner_v3(
    p_request_id => first_request,
    p_name => 'Onboarding Fixture',
    p_requested_slug => 'onboarding-fixture',
    p_slug_customized => false,
    p_business_type => 'services',
    p_description => 'A disposable onboarding fixture for database verification.',
    p_address_line_1 => '100 Test Street',
    p_city => 'Baton Rouge',
    p_region_code => 'LA'
  );
  first_business := (first_result->>'businessId')::uuid;

  if first_result->>'pageAddress' <> 'onboarding-fixture'
    or not (first_result->>'created')::boolean then
    raise exception 'Initial business creation returned an unexpected result: %', first_result;
  end if;
  if not exists (
    select 1 from public.business_members
    where business_id = first_business and user_id = owner_id and role = 'owner' and is_active
  ) then
    raise exception 'Business creator did not receive owner membership';
  end if;
  if public.is_business_page_address_available('onboarding-fixture') then
    raise exception 'Used page address was reported available';
  end if;
  if not public.is_business_page_address_available('onboarding-fixture-available') then
    raise exception 'Unused valid page address was reported unavailable';
  end if;

  retry_result := public.create_business_with_owner_v3(
    p_request_id => first_request,
    p_name => 'Ignored Retry Name',
    p_requested_slug => 'ignored-retry-slug',
    p_slug_customized => false,
    p_business_type => 'retail'
  );
  if retry_result->>'businessId' <> first_result->>'businessId'
    or (retry_result->>'created')::boolean then
    raise exception 'Creation retry was not idempotent: %', retry_result;
  end if;

  collision_result := public.create_business_with_owner_v3(
    p_request_id => second_request,
    p_name => 'Onboarding Fixture Two',
    p_requested_slug => 'onboarding-fixture',
    p_slug_customized => false,
    p_business_type => 'services'
  );
  if collision_result->>'pageAddress' <> 'onboarding-fixture-2' then
    raise exception 'Automatic page address collision was not resolved: %', collision_result;
  end if;

  begin
    perform public.create_business_with_owner_v3(
      p_request_id => manual_request,
      p_name => 'Manual Collision',
      p_requested_slug => 'onboarding-fixture',
      p_slug_customized => true,
      p_business_type => 'services'
    );
    raise exception 'A customized duplicate page address was accepted';
  exception when unique_violation then null;
  end;

  mobile_result := public.create_business_with_owner_v3(
    p_request_id => mobile_request,
    p_name => 'Mobile Onboarding Fixture',
    p_requested_slug => 'mobile-onboarding-fixture',
    p_slug_customized => false,
    p_business_type => 'mobile',
    p_city => 'Baton Rouge',
    p_region_code => 'LA'
  );
  readiness := public.get_business_readiness((mobile_result->>'businessId')::uuid);
  if (readiness->'checks'->3->>'complete')::boolean then
    raise exception 'Mobile business was location-ready before its first scheduled stop';
  end if;

  insert into public.business_location_stops (
    business_id, title, address_text, latitude, longitude, starts_at, ends_at, is_published
  ) values (
    (mobile_result->>'businessId')::uuid,
    'First scheduled stop',
    'Market Square',
    30.4515,
    -91.1871,
    now() + interval '1 day',
    now() + interval '1 day 3 hours',
    false
  );
  readiness := public.get_business_readiness((mobile_result->>'businessId')::uuid);
  if not (readiness->'checks'->3->>'complete')::boolean then
    raise exception 'A valid scheduled stop did not satisfy mobile location readiness';
  end if;

  if has_table_privilege('authenticated', 'public.business_creation_requests', 'SELECT')
    or has_table_privilege('authenticated', 'public.business_creation_requests', 'INSERT')
    or has_table_privilege('authenticated', 'public.business_creation_requests', 'UPDATE') then
    raise exception 'Authenticated clients received direct access to creation request state';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.business_creation_requests'::regclass) then
    raise exception 'Creation request RLS is not enabled';
  end if;
end;
$$;

select 'resumable business onboarding checks passed' as result;

rollback;
