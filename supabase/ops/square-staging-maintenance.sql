-- STAGING ONLY. Run after migration/function deployment. Store the same
-- SQUARE_MAINTENANCE_SECRET in Supabase Vault as square_maintenance_bearer using
-- the Dashboard; never paste its value into source control or SQL history.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='square_maintenance_bearer') then
    raise exception 'Create the square_maintenance_bearer Vault secret before scheduling.';
  end if;
end $$;
select cron.schedule(
  'square-sandbox-maintenance',
  '* * * * *',
  $job$
  select net.http_post(
    url := 'https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/square-maintenance',
    headers := jsonb_build_object('Content-Type','application/json','Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='square_maintenance_bearer' limit 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
