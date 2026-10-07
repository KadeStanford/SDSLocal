begin;

-- Cloud-created tables do not inherit local development's service-role grants.
-- Availability reads published stops before building fixed/mobile pickup slots.
-- RLS bypass does not itself grant permission to SELECT this relation.
grant select on table public.business_location_stops to service_role;

commit;
notify pgrst, 'reload schema';
