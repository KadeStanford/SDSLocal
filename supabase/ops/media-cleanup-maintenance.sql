-- STAGING ONLY. Apply after the bounded media-staging migration and Edge
-- Function are deployed. Store the Supabase service-role key in Vault as
-- media_cleanup_bearer; never paste it into this file or SQL history.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (
    select 1 from vault.decrypted_secrets where name = 'media_cleanup_bearer'
  ) then
    raise exception 'Create the media_cleanup_bearer Vault secret before scheduling.';
  end if;
end $$;

select cron.unschedule(jobid)
  from cron.job
 where jobname = 'media-staging-cleanup';

select cron.schedule(
  'media-staging-cleanup',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/media-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret
          from vault.decrypted_secrets
         where name = 'media_cleanup_bearer'
         limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $job$
);
