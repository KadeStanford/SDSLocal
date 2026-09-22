-- Edge Functions use the service role only after authenticating the caller.
-- Explicit table privileges are still required even though service_role bypasses RLS.
begin;

grant select on table
  public.profiles,
  public.businesses,
  public.business_members,
  public.loyalty_programs,
  public.loyalty_memberships,
  public.loyalty_transactions
to service_role;

grant select, insert on table public.loyalty_scan_attempts to service_role;

commit;
