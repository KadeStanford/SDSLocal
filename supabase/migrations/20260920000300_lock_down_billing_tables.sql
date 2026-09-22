begin;

-- Hosted Supabase projects may have broad default privileges for new public
-- tables. RLS is still enabled, but explicitly reduce the SQL privilege layer
-- so clients cannot even attempt trusted billing mutations.
revoke all on table public.billing_plans, public.billing_products,
  public.billing_accounts, public.listing_entitlements,
  public.business_listing_assignments, public.billing_webhook_events
  from anon, authenticated;

grant select on table public.billing_plans, public.billing_products,
  public.billing_accounts, public.listing_entitlements,
  public.business_listing_assignments to authenticated;

grant all on table public.billing_accounts, public.listing_entitlements,
  public.business_listing_assignments, public.billing_webhook_events to service_role;

commit;
