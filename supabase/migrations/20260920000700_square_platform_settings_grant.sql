begin;

-- Square Edge Functions use the service-role client to read the private
-- rollout allowlist. platform_settings intentionally has no client SELECT
-- grant, so expose it only to the trusted server role.
grant select on table public.platform_settings to service_role;

commit;

notify pgrst, 'reload schema';
