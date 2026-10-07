-- Rollback fixtures only. No email, real purchases, or durable user changes.
begin;

do $$
declare
  tester_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  blocked boolean := false;
  created_id uuid;
begin
  insert into auth.users(id, raw_user_meta_data)
  values (tester_id, '{"display_name":"Sandbox billing fixture"}'),
         (other_id, '{"display_name":"Preview billing fixture"}');
  insert into public.business_subscription_sandbox_testers(owner_id) values (tester_id);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', tester_id::text, true);

  update public.platform_settings set value = '{"enabled":false}'
  where key = 'business_listing_billing';
  if public.business_listing_billing_enabled_for_current_user() then
    raise exception 'Membership alone enabled sandbox checkout';
  end if;

  update public.platform_settings set value = '{"enabled":false,"sandboxCheckout":true}'
  where key = 'business_listing_billing';
  if not public.business_listing_billing_enabled_for_current_user()
     or not (public.get_my_listing_billing()->>'billingEnabled')::boolean then
    raise exception 'The selected tester cannot access checkout';
  end if;
  begin
    perform public.create_business_with_owner(
      p_name => 'Unsubscribed sandbox fixture',
      p_slug => 'sandbox-blocked-' || left(tester_id::text, 8),
      p_business_type => 'services'
    );
  exception when sqlstate 'P0001' then
    if sqlerrm not like '%active business subscription%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Tester created a business before subscribing'; end if;

  update public.billing_plans set is_active = true where code = 'essentials';
  update public.billing_products set is_active = true
  where provider = 'test_store' and product_id = 'listing_essentials_monthly_v1';
  perform public.apply_listing_subscription_event(
    'sandbox-rollout-' || tester_id, 'INITIAL_PURCHASE', tester_id, 'test_store',
    'listing_essentials_monthly_v1', 'active', 'sandbox', 'sandbox-rollout-transaction-' || tester_id,
    now(), now() + interval '1 month', true,
    jsonb_build_object('event', jsonb_build_object('event_timestamp_ms', (extract(epoch from now()) * 1000)::bigint))
  );
  created_id := public.create_business_with_owner(
    p_name => 'Verified sandbox fixture',
    p_slug => 'sandbox-verified-' || left(tester_id::text, 8),
    p_business_type => 'services'
  );
  if not exists (
    select 1 from public.business_listing_assignments assignment
    join public.billing_accounts account on account.id = assignment.billing_account_id
    where assignment.business_id = created_id and account.owner_id = tester_id
  ) then raise exception 'Selected tester did not atomically consume a business slot'; end if;

  perform set_config('request.jwt.claim.sub', other_id::text, true);
  if public.business_listing_billing_enabled_for_current_user()
     or (public.get_my_listing_billing()->>'billingEnabled')::boolean then
    raise exception 'Sandbox checkout leaked to another account';
  end if;
  perform public.create_business_with_owner(
    p_name => 'Free preview fixture',
    p_slug => 'sandbox-preview-' || left(other_id::text, 8),
    p_business_type => 'services'
  );

  perform set_config('request.jwt.claim.sub', tester_id::text, true);
  update public.business_subscription_sandbox_testers set enabled = false where owner_id = tester_id;
  if public.business_listing_billing_enabled_for_current_user() then
    raise exception 'A disabled tester still has checkout';
  end if;
  update public.platform_settings set value = '{"enabled":true}'
  where key = 'business_listing_billing';
  if not public.business_listing_billing_enabled_for_current_user() then
    raise exception 'The existing global rollout behavior changed';
  end if;

  if has_table_privilege('authenticated', 'public.business_subscription_sandbox_testers', 'SELECT')
     or has_table_privilege('authenticated', 'public.business_subscription_sandbox_testers', 'INSERT')
     or has_table_privilege('authenticated', 'public.business_subscription_sandbox_testers', 'UPDATE')
     or has_table_privilege('anon', 'public.business_subscription_sandbox_testers', 'SELECT') then
    raise exception 'Clients can inspect or change the sandbox tester list';
  end if;
  perform set_config('request.jwt.claim.sub', '', true);
  update public.platform_settings set value = '{"enabled":false,"sandboxCheckout":true}'
  where key = 'business_listing_billing';
  if public.business_listing_billing_enabled_for_current_user() then
    raise exception 'Anonymous requests have sandbox checkout';
  end if;
end;
$$;

select 'sandbox account rollout checks passed' as result;
rollback;
