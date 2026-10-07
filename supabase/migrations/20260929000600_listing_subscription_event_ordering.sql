-- Prevent delayed webhook deliveries from undoing a renewal or revocation.
-- This does not activate subscriptions or change the rollout flag.
alter table public.listing_entitlements
  add column if not exists last_provider_event_at timestamptz;

update public.listing_entitlements entitlement
set last_provider_event_at = to_timestamp((event.payload #>> '{event,event_timestamp_ms}')::numeric / 1000)
from public.billing_webhook_events event
where event.provider_event_id = entitlement.last_provider_event_id
  and entitlement.last_provider_event_at is null
  and (event.payload #>> '{event,event_timestamp_ms}') ~ '^[0-9]{1,16}$'
  and (event.payload #>> '{event,event_timestamp_ms}')::numeric between 1 and 8640000000000000;

-- Temporarily inherit ownership for replacement; keep the existing narrow role.
grant sds_billing_manager to current_user;

create or replace function public.apply_listing_subscription_event(
  p_event_id text,
  p_event_type text,
  p_user_id uuid,
  p_provider text,
  p_product_id text,
  p_status text,
  p_environment text,
  p_original_transaction_id text,
  p_purchased_at timestamptz,
  p_current_period_end timestamptz,
  p_will_renew boolean,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_account_id uuid;
  mapped_plan_code text;
  existing_processed_at timestamptz;
  access_active boolean;
  incoming_event_at timestamptz;
  last_event_at timestamptz;
  timestamp_value text;
begin
  if p_provider not in ('apple', 'google', 'test_store')
     or p_status not in ('active', 'grace_period', 'billing_retry', 'paused', 'expired', 'revoked')
     or p_environment not in ('sandbox', 'production') then
    raise exception 'Invalid subscription event values' using errcode = '22023';
  end if;

  timestamp_value := p_payload #>> '{event,event_timestamp_ms}';
  if timestamp_value is null or timestamp_value !~ '^[0-9]+$' then
    return jsonb_build_object('processed', false, 'reason', 'invalid_event_timestamp');
  end if;
  if timestamp_value::numeric <= 0 or timestamp_value::numeric > 8640000000000000 then
    return jsonb_build_object('processed', false, 'reason', 'invalid_event_timestamp');
  end if;
  incoming_event_at := to_timestamp(timestamp_value::numeric / 1000);

  insert into public.billing_webhook_events (
    provider_event_id, event_type, app_user_id, environment, payload
  ) values (
    p_event_id, p_event_type, p_user_id, p_environment, p_payload
  )
  on conflict (provider_event_id) do nothing;

  select processed_at into existing_processed_at
  from public.billing_webhook_events
  where provider_event_id = p_event_id
  for update;

  if existing_processed_at is not null then
    return jsonb_build_object('processed', true, 'duplicate', true);
  end if;

  if not exists (select 1 from public.profiles where id = p_user_id) then
    update public.billing_webhook_events
    set
      processed_at = now(),
      processing_error = 'Ignored because the SDS Local account no longer exists'
    where provider_event_id = p_event_id;
    return jsonb_build_object('processed', true, 'ignored', 'deleted_user');
  end if;

  select plan_code into mapped_plan_code
  from public.billing_products
  where provider = p_provider and product_id = p_product_id and is_active;

  if mapped_plan_code is null then
    update public.billing_webhook_events
    set processing_error = 'Unrecognized product identifier'
    where provider_event_id = p_event_id;
    return jsonb_build_object('processed', false, 'reason', 'unrecognized_product');
  end if;

  insert into public.billing_accounts (owner_id)
  values (p_user_id)
  on conflict (owner_id) do update set updated_at = now()
  returning id into target_account_id;

  -- The billing-account upsert locks the account and serializes simultaneous deliveries.
  select last_provider_event_at into last_event_at
  from public.listing_entitlements where billing_account_id = target_account_id;
  if last_event_at is not null and incoming_event_at <= last_event_at then
    update public.billing_webhook_events
    set processed_at = now(), processing_error = 'Ignored stale subscription event'
    where provider_event_id = p_event_id;
    return jsonb_build_object('processed', true, 'ignored', 'stale_event');
  end if;

  insert into public.listing_entitlements (
    billing_account_id,
    provider,
    product_id,
    plan_code,
    status,
    environment,
    original_transaction_id,
    purchased_at,
    current_period_end,
    will_renew,
    last_provider_event_id,
    last_provider_event_at
  ) values (
    target_account_id,
    p_provider,
    p_product_id,
    mapped_plan_code,
    p_status,
    p_environment,
    nullif(p_original_transaction_id, ''),
    p_purchased_at,
    p_current_period_end,
    p_will_renew,
    p_event_id,
    incoming_event_at
  )
  on conflict (billing_account_id) do update set
    provider = excluded.provider,
    product_id = excluded.product_id,
    plan_code = excluded.plan_code,
    status = excluded.status,
    environment = excluded.environment,
    original_transaction_id = excluded.original_transaction_id,
    purchased_at = coalesce(excluded.purchased_at, public.listing_entitlements.purchased_at),
    current_period_end = excluded.current_period_end,
    will_renew = excluded.will_renew,
    last_provider_event_id = excluded.last_provider_event_id,
    last_provider_event_at = excluded.last_provider_event_at,
    updated_at = now();

  access_active := public.billing_entitlement_is_active(p_status, p_current_period_end);

  if access_active then
    update public.businesses business
    set
      status = case
        when business.billing_suspension_previous_status = 'active'
             and business.approved_at is not null then 'active'::public.business_status
        when business.billing_suspension_previous_status = 'pending_review'
          then 'pending_review'::public.business_status
        else 'draft'::public.business_status
      end,
      suspended_at = null,
      suspension_reason = null,
      billing_suspension_previous_status = null
    from public.business_listing_assignments assignment
    where assignment.billing_account_id = target_account_id
      and assignment.business_id = business.id
      and business.status = 'suspended'
      and business.suspension_reason = 'billing';
  else
    update public.businesses business
    set
      billing_suspension_previous_status = business.status,
      status = 'suspended',
      suspended_at = now(),
      suspension_reason = 'billing'
    from public.business_listing_assignments assignment
    where assignment.billing_account_id = target_account_id
      and assignment.business_id = business.id
      and business.status in ('active', 'pending_review')
      and business.suspension_reason is null;
  end if;

  update public.billing_webhook_events
  set processed_at = now(), processing_error = null
  where provider_event_id = p_event_id;

  return jsonb_build_object('processed', true, 'duplicate', false);
exception when others then
  update public.billing_webhook_events
  set processing_error = left(sqlerrm, 500)
  where provider_event_id = p_event_id;
  raise;
end;
$$;

revoke all on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) from public;
grant execute on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) to service_role;

revoke sds_billing_manager from current_user;
