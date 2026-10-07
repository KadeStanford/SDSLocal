-- Requires the independently reviewed 070001 and an already installed pg_cron.
-- Does not enable automatic decisions, install extensions or add credentials.
begin;
create function public.run_scheduled_moderation_backup()
returns jsonb language plpgsql security definer set search_path=''
set lock_timeout='5s'
as $$
declare
  prior_role text:=current_setting('request.jwt.claim.role',true);
  result jsonb;
begin
  -- EXECUTE is owner-only. The claim exists only during this transaction-local
  -- call; no user identity, platform-admin row or persistent role is changed.
  begin
    perform set_config('request.jwt.claim.role','service_role',true);
    result:=public.run_moderation_backup(true,gen_random_uuid(),50);
  exception when others then
    perform set_config('request.jwt.claim.role',coalesce(prior_role,''),true);
    -- Avoid case IDs, customer content and underlying errors in cron logs.
    raise exception 'Scheduled moderation backup failed' using errcode='XX000';
  end;
  perform set_config('request.jwt.claim.role',coalesce(prior_role,''),true);
  return jsonb_build_object(
    'mode',result->'mode','dry_run',result->'dry_run',
    'busy',coalesce(result->'busy','false'::jsonb),
    'scanned',coalesce(result->'scanned','0'::jsonb),
    'applied',coalesce(result->'applied','0'::jsonb),
    'flagged',coalesce(result->'flagged','0'::jsonb),
    'manual_overrides',coalesce(result->'manual_overrides','0'::jsonb)
  );
end $$;
revoke all on function public.run_scheduled_moderation_backup()
from public,anon,authenticated,service_role;
comment on function public.run_scheduled_moderation_backup() is
'Owner-only bounded moderation worker. Counts-only result. Server policy defaults to check-only; explicit administrator configuration is required to enable reversible rules.';

-- SCHEDULER REGISTRATION: do not install an extension or overwrite a job.
do $$
begin
  if current_user<>'postgres' then
    raise exception 'Scheduler installation requires the verified postgres owner';
  end if;
  if not exists(select 1 from pg_catalog.pg_extension where extname='pg_cron')
    or to_regclass('cron.job') is null then
    raise exception 'pg_cron is not installed; stop for capability review';
  end if;
  if exists(select 1 from cron.job where jobname='parish-pass-moderation-backup') then
    raise exception 'Named moderation job already exists; inspect before any retry';
  end if;
  if (select mode from public.moderation_backup_policy where singleton) is distinct from 'dry_run' then
    raise exception 'Initial scheduler installation requires check-only policy';
  end if;
  perform cron.schedule('parish-pass-moderation-backup','*/5 * * * *',
    'set statement_timeout=''120s''; select public.run_scheduled_moderation_backup();');
end $$;
commit;
notify pgrst,'reload schema';
