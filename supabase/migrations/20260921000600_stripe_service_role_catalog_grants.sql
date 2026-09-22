begin;

-- Stripe owner status and catalog sync read the SDS menu through the
-- service-role Edge Function client. The public roles already have these
-- grants for storefront browsing, but the explicit service-role grants keep
-- the owner catalog path working on projects that revoke default table ACLs.
grant select on public.offering_sections, public.offering_items to service_role;

commit;
notify pgrst, 'reload schema';
