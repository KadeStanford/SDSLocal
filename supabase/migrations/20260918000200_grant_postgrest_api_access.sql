-- Supabase Cloud does not grant PostgREST table privileges automatically for
-- tables created by migrations. RLS remains the source of truth for which
-- rows each role may access; these grants only allow the API roles to reach
-- the RLS checks in the first place.
grant usage on schema public to anon, authenticated;

-- Public discovery and business pages are read through these tables. The
-- corresponding policies still require an active/published row.
grant select on table
  public.categories,
  public.businesses,
  public.business_categories,
  public.business_hours,
  public.media_assets,
  public.business_photos,
  public.offering_sections,
  public.offering_items,
  public.events,
  public.event_photos,
  public.business_updates,
  public.business_location_stops,
  public.loyalty_programs
to anon, authenticated;

-- Authenticated customer actions and owner workspace edits. RLS policies on
-- each table restrict these operations to the current customer/owner/staff.
grant select, insert, update, delete on table
  public.businesses,
  public.business_categories,
  public.business_hours,
  public.business_photos,
  public.offering_sections,
  public.offering_items,
  public.events,
  public.event_photos,
  public.loyalty_programs,
  public.business_location_stops
to authenticated;

grant select, insert, delete on table public.business_follows to authenticated;
grant select, insert, update, delete on table public.event_saves to authenticated;
grant select, insert, update on table public.loyalty_memberships to authenticated;
grant select on table public.loyalty_transactions to authenticated;
grant select on table public.business_members to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, update on table public.notification_deliveries to authenticated;

-- Keep the category identity sequence usable for authenticated business
-- creation. The platform-admin audit sequence is written only by SECURITY
-- DEFINER functions and therefore does not need a client grant.
grant usage, select on sequence public.categories_id_seq to authenticated;
