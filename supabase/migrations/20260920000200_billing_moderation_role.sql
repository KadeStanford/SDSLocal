begin;

-- Subscription lifecycle changes are trusted server operations, but they must
-- not weaken the moderation guard for authenticated clients. Give the webhook
-- RPC a narrow execution identity like the existing moderation RPC.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sds_billing_manager') then
    create role sds_billing_manager nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to sds_billing_manager;
grant select on public.profiles, public.billing_products, public.billing_plans,
  public.business_listing_assignments to sds_billing_manager;
grant select, insert, update on public.billing_accounts, public.listing_entitlements,
  public.billing_webhook_events to sds_billing_manager;
grant select on public.businesses to sds_billing_manager;
grant update (
  status,
  suspended_at,
  suspension_reason,
  billing_suspension_previous_status
) on public.businesses to sds_billing_manager;
grant execute on function public.billing_entitlement_is_active(text, timestamptz)
  to sds_billing_manager;

grant sds_billing_manager to current_user;
grant create on schema public to sds_billing_manager;
alter function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) owner to sds_billing_manager;
revoke create on schema public from sds_billing_manager;
revoke sds_billing_manager from current_user;

create or replace function public.protect_business_moderation_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    ) = 'authenticated'
    and current_user not in ('sds_business_moderator', 'sds_billing_manager') then
    if new.approved_at is distinct from old.approved_at
      or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Moderation timestamps are server-managed';
    end if;

    if new.status is distinct from old.status
      and not (
        (old.status = 'draft' and new.status = 'pending_review')
        or (old.status = 'pending_review' and new.status = 'draft')
      ) then
      raise exception 'This business status transition requires moderation';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) from public;
grant execute on function public.apply_listing_subscription_event(
  text, text, uuid, text, text, text, text, text, timestamptz, timestamptz, boolean, jsonb
) to service_role;

commit;
