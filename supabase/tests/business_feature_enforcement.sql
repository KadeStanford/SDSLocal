-- Local-only transactional fixtures: no email, external provider, or live data.
begin;
do $$
<<feature_fixture>>
declare
  owner_id uuid := gen_random_uuid();
  staff_id uuid := gen_random_uuid();
  stranger_id uuid := gen_random_uuid();
  business_id uuid;
  account_id uuid;
  snapshot jsonb;
  denied boolean;
  tier text;
  second_business_id uuid;
begin
  insert into auth.users(id,raw_user_meta_data) values
    (owner_id,'{}'),(staff_id,'{}'),(stranger_id,'{}');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  update public.platform_settings set value = '{"enabled":false}'
    where key = 'business_listing_billing';
  business_id := (public.create_business_with_owner_v3(
    p_request_id => gen_random_uuid(),p_name => 'Feature boundary fixture',
    p_requested_slug => 'features-' || left(owner_id::text,8),p_slug_customized => false,
    p_business_type => 'services')->>'businessId')::uuid;
  insert into public.business_members(business_id,user_id,role,is_active)
    values(business_id,staff_id,'staff',true);
  insert into public.billing_accounts(owner_id) values(owner_id) returning id into account_id;
  insert into public.business_listing_assignments(business_id,billing_account_id,assigned_by)
    values(business_id,account_id,owner_id);
  update public.billing_plans set is_active = true where code in ('essentials','growth','pro','single','multi');
  insert into public.listing_entitlements(billing_account_id,provider,product_id,plan_code,status,
    environment,current_period_end,last_provider_event_id)
    values(account_id,'apple','listing_pro_monthly_v1','pro','active','sandbox',now()+interval '1 day','feature-fixture');

  -- Installing the migration alone does not silently activate the rollout.
  snapshot := public.get_business_feature_access(business_id);
  if (snapshot->>'enforced')::boolean or not (snapshot->'featureCodes' ? 'appointments') then
    raise exception 'Dormant rollout changed existing access';
  end if;
  update public.platform_settings set value =
    '{"enabled":true,"featureEnforcement":true,"environment":"sandbox"}'
    where key = 'business_listing_billing';
  second_business_id := (public.create_business_with_owner_v3(
    p_request_id => gen_random_uuid(),p_name => 'Second feature fixture',
    p_requested_slug => 'second-features-' || left(owner_id::text,8),p_slug_customized => false,
    p_business_type => 'services')->>'businessId')::uuid;
  -- Transactions share now(); make slot ordering explicit for the downgrade test.
  update public.business_listing_assignments a set assigned_at = now()-interval '1 second'
    where a.business_id = feature_fixture.business_id;
  foreach tier in array array['essentials','growth','pro','single','multi'] loop
    update public.listing_entitlements set plan_code = tier where billing_account_id = account_id;
    snapshot := public.get_business_feature_access(business_id);
    if not (snapshot->'featureCodes' ? 'business_page')
      or (snapshot->'featureCodes' ? 'loyalty') <> (tier <> 'essentials')
      or (snapshot->'featureCodes' ? 'appointments') <> (tier in ('pro','single','multi')) then
      raise exception 'Wrong capabilities for %',tier;
    end if;
  end loop;
  update public.listing_entitlements set plan_code = 'single' where billing_account_id = account_id;
  if public.business_feature_snapshot(second_business_id)->'featureCodes' <> '[]'::jsonb then
    raise exception 'A one-slot legacy plan unlocked its second assigned business';
  end if;
  update public.listing_entitlements set plan_code = 'multi' where billing_account_id = account_id;
  -- Staff uses the business payer's subscription, not their personal subscription.
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  if public.get_business_feature_access(business_id)->'featureCodes' <> snapshot->'featureCodes' then
    raise exception 'Staff received different business capabilities';
  end if;
  perform set_config('request.jwt.claim.sub',stranger_id::text,true);
  denied := false;
  begin perform public.get_business_feature_access(business_id);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'A stranger read private business capabilities'; end if;

  update public.platform_settings set value = value || '{"environment":"production"}'
    where key = 'business_listing_billing';
  denied := false;
  begin perform public.assert_business_feature(business_id,'pickup_ordering');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Sandbox entitlement unlocked production'; end if;
  update public.listing_entitlements set environment = 'production',status = 'expired'
    where billing_account_id = account_id;
  denied := false;
  begin perform public.assert_business_feature(business_id,'appointments');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Expired entitlement unlocked bookings'; end if;
  update public.listing_entitlements set status = 'active',current_period_end = null
    where billing_account_id = account_id;
  if public.business_feature_snapshot(business_id)->'featureCodes' <> '[]'::jsonb then
    raise exception 'An unbounded entitlement granted indefinite access';
  end if;
  update public.listing_entitlements set status = 'grace_period',current_period_end = now()+interval '1 hour'
    where billing_account_id = account_id;
  perform public.assert_business_feature(business_id,'appointments');

  -- A direct configuration insert cannot bypass the server's plan matrix.
  update public.listing_entitlements set plan_code = 'essentials' where billing_account_id = account_id;
  denied := false;
  begin insert into public.appointment_settings(business_id,timezone) values(business_id,'America/Chicago');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Direct configuration bypassed the plan'; end if;

  update public.listing_entitlements set plan_code = 'pro' where billing_account_id = account_id;
  insert into public.appointment_settings(business_id,timezone,enabled)
    values(business_id,'America/Chicago',true);
  update public.listing_entitlements set status = 'expired' where billing_account_id = account_id;
  update public.appointment_settings settings set enabled = false where settings.business_id = feature_fixture.business_id;
  denied := false;
  begin
    update public.appointment_settings settings set enabled = false,timezone = 'America/New_York'
      where settings.business_id = feature_fixture.business_id;
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Disable-only exemption allowed configuration edits'; end if;

  -- The staging rollout follows the business payer's sandbox eligibility,
  -- including when a staff member makes the request.
  update public.platform_settings set value =
    '{"enabled":false,"sandboxCheckout":true,"featureEnforcement":true,"environment":"sandbox"}'
    where key = 'business_listing_billing';
  update public.listing_entitlements set environment='sandbox',status='active',plan_code='essentials',
    current_period_end=now()+interval '1 day' where billing_account_id=account_id;
  if (public.business_feature_snapshot(business_id)->>'enforced')::boolean then
    raise exception 'Sandbox enforcement escaped the tester rollout';
  end if;
  insert into public.business_subscription_sandbox_testers(owner_id) values(owner_id);
  perform set_config('request.jwt.claim.sub',staff_id::text,true);
  snapshot := public.get_business_feature_access(business_id);
  if not (snapshot->>'enforced')::boolean or snapshot->'featureCodes' ? 'appointments' then
    raise exception 'Sandbox tester plan restrictions were not enforced for staff';
  end if;
  denied := false;
  begin perform public.assert_business_feature(business_id,'appointments');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Sandbox essentials plan unlocked appointments'; end if;

  if has_function_privilege('authenticated','public.assert_business_feature(uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.business_feature_snapshot(uuid)','EXECUTE') then
    raise exception 'Internal capability functions are publicly callable';
  end if;
end $$;
select 'business feature enforcement checks passed' as result;
rollback;
