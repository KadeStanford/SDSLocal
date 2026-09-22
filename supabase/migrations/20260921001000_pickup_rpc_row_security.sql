begin;

-- These RPCs intentionally read provider connection/settings tables that are
-- not directly exposed to clients. Keep their execution pinned to the
-- SECURITY DEFINER owner even when PostgREST invokes them as anon/authenticated.
alter function public.get_pickup_capabilities(uuid[]) set row_security = off;
alter function public.get_pickup_status(uuid[]) set row_security = off;

commit;
notify pgrst, 'reload schema';
