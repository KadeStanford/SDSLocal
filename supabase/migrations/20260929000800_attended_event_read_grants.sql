begin;
-- The commerce endpoint authenticates the customer and filters these reads by
-- customer_id. Its server role needs the same read columns in empty and populated cases.
grant select (id,event_id,customer_id,status,checked_in_at) on public.event_rsvps to service_role;
grant select (id,business_id,title,starts_at,ends_at) on public.events to service_role;
notify pgrst, 'reload schema';
commit;
