-- Local defensive candidate only. Apply after privacy004, never by itself.
-- Account deletion does not perform an implicit provider disconnect. Existing
-- owner disconnect flows keep their own explicit confirmation and obligations.
begin;

do $$ begin
  if to_regprocedure('public.account_deletion_safe_moderation_snapshot(jsonb)') is null then
    raise exception 'Account deletion privacy004 must be installed first';
  end if;
end $$;

-- Older data_deleted/cleanup_pending jobs may still contain a stale shared
-- business target. Preserve any exact object still referenced by a media row,
-- including a staging object transferred to a surviving owner. The ordinary
-- media lifecycle owns cleanup of those rows; an account retry must not remove
-- their bytes. Keep this helper private and reuse the existing worker RPC.
create function public.account_deletion_prune_retained_media_targets(
  p_user_id uuid,p_targets jsonb
) returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(target order by target->>'bucket',target->>'path'),'[]'::jsonb)
  from (
    select distinct target from jsonb_array_elements(p_targets) target
    where target->>'bucket' in ('business-media','media-staging')
      and nullif(target->>'path','') is not null
      and (target->>'bucket'<>'media-staging' or target->>'path' like p_user_id::text||'/%')
      and not exists(select 1 from public.media_assets asset
        where asset.bucket=target->>'bucket' and asset.storage_path=target->>'path')
  ) safe_targets;
$$;
revoke all on function public.account_deletion_prune_retained_media_targets(uuid,jsonb)
  from public,anon,authenticated,service_role;

-- A late connection change must be checked at the actual business deletion,
-- not just at an earlier HTTP preflight. Lock every existing provider row so
-- state updates serialize; the business parent lock blocks new FK inserts.
create function public.account_deletion_require_disconnected_providers(p_business_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.square_connections where business_id=p_business_id for update;
  perform 1 from public.stripe_account_states where business_id=p_business_id for update;
  if exists(select 1 from public.square_connections where business_id=p_business_id
      and state not in ('disconnected','revoked'))
    or exists(select 1 from public.stripe_account_states where business_id=p_business_id
      and state not in ('disconnected','revoked')) then
    raise exception 'Disconnect the sole-owned business provider before account deletion'
      using errcode='55000';
  end if;
end $$;
revoke all on function public.account_deletion_require_disconnected_providers(uuid)
  from public,anon,authenticated,service_role;

create function public.guard_business_deletion_provider_state()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  perform public.account_deletion_require_disconnected_providers(old.id);
  return old;
end $$;
revoke all on function public.guard_business_deletion_provider_state()
  from public,anon,authenticated,service_role;
create trigger businesses_require_disconnected_provider before delete on public.businesses
  for each row execute function public.guard_business_deletion_provider_state();

-- Preserve the reviewed privacy implementation verbatim behind a private
-- wrapper. This does not renumber any migration history or broaden client ACLs.
alter function public.execute_account_deletion(uuid,uuid)
  rename to execute_account_deletion_privacy_v1;
revoke all on function public.execute_account_deletion_privacy_v1(uuid,uuid)
  from public,anon,authenticated,service_role;

create function public.execute_account_deletion(p_user_id uuid,p_job_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  job public.account_deletion_jobs%rowtype;
  owned uuid[]; removed uuid[]; target_business uuid; result jsonb; targets jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text,0));
  select * into job from public.account_deletion_jobs
    where id=p_job_id and user_id=p_user_id for update;
  if job.id is null then raise exception 'Deletion request not found' using errcode='P0002'; end if;
  if job.status in ('data_deleted','cleanup_pending','completed') then
    targets:=public.account_deletion_prune_retained_media_targets(p_user_id,job.storage_targets);
    if targets is distinct from job.storage_targets then
      update public.account_deletion_jobs set storage_targets=targets,updated_at=now()
        where id=p_job_id;
    end if;
    return jsonb_build_object('jobId',job.id,'status',job.status,'alreadyDeleted',true,
      'storageTargets',targets,'cleanupProtocolVersion',1);
  end if;

  select coalesce(array_agg(id),'{}'::uuid[]) into owned from (
    select b.id from public.businesses b where b.created_by=p_user_id or exists(
      select 1 from public.business_members m where m.business_id=b.id
        and m.user_id=p_user_id and m.role='owner' and m.is_active)
    order by b.id for update of b
  ) locked;
  perform 1 from public.business_members where business_id=any(owned)
    order by business_id,user_id for update;
  select coalesce(array_agg(b.id),'{}'::uuid[]) into removed
    from public.businesses b where b.id=any(owned) and not exists(
      select 1 from public.business_members m where m.business_id=b.id
        and m.user_id<>p_user_id and m.role='owner' and m.is_active);
  foreach target_business in array removed loop
    perform public.account_deletion_require_disconnected_providers(target_business);
  end loop;

  -- An earlier sole-owned snapshot may now be shared. Cleanup targets must
  -- follow this final locked classification. Keep only this user's validated
  -- staged paths and live media belonging to businesses actually removed.
  select coalesce(jsonb_agg(t order by t->>'bucket',t->>'path'),'[]'::jsonb) into targets
  from (
    select distinct target as t from jsonb_array_elements(job.storage_targets) target
      where target->>'bucket'='media-staging'
        and target->>'path' like p_user_id::text||'/%'
    union
    select distinct jsonb_build_object('bucket',asset.bucket,'path',asset.storage_path)
      from public.media_assets asset where asset.business_id=any(removed)
  ) actual_targets;
  update public.account_deletion_jobs set impact=public.get_account_deletion_impact(p_user_id),
    storage_targets=targets,updated_at=now() where id=p_job_id;
  result:=public.execute_account_deletion_privacy_v1(p_user_id,p_job_id);
  -- Removed business rows/assets are gone now; retained media must survive even
  -- when its staging path still begins with the departing user's UUID.
  targets:=public.account_deletion_prune_retained_media_targets(p_user_id,targets);
  update public.account_deletion_jobs set storage_targets=targets where id=p_job_id;
  return result||jsonb_build_object('storageTargets',targets,'cleanupProtocolVersion',1);
end $$;
revoke all on function public.execute_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.execute_account_deletion(uuid,uuid) to service_role;

-- Versioned preflight makes an updated Edge fail closed against an older SQL
-- implementation. This prepares no network operation and holds no HTTP lock.
create function public.prepare_account_deletion(p_user_id uuid,p_job_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.account_deletion_jobs%rowtype; current_impact jsonb; target_business uuid; targets jsonb;
begin
  select * into job from public.account_deletion_jobs
    where id=p_job_id and user_id=p_user_id for update;
  if job.id is null then raise exception 'Deletion request not found' using errcode='P0002'; end if;
  if job.status='pending' then
    current_impact:=public.get_account_deletion_impact(p_user_id);
    for target_business in select (b->>'id')::uuid from jsonb_array_elements(current_impact->'businesses') b
      where b->>'action'='delete_business'
    loop
      perform 1 from public.businesses where id=target_business for update;
      -- Recheck after any parent lock wait; execution rechecks again atomically.
      if not exists(select 1 from public.business_members m where m.business_id=target_business
        and m.user_id<>p_user_id and m.role='owner' and m.is_active) then
        perform public.account_deletion_require_disconnected_providers(target_business);
      end if;
    end loop;
    current_impact:=public.get_account_deletion_impact(p_user_id);
    update public.account_deletion_jobs set impact=current_impact,updated_at=now() where id=p_job_id;
  else
    current_impact:=job.impact;
    targets:=public.account_deletion_prune_retained_media_targets(p_user_id,job.storage_targets);
    if targets is distinct from job.storage_targets then
      update public.account_deletion_jobs set storage_targets=targets,updated_at=now()
        where id=p_job_id returning * into job;
    end if;
  end if;
  return jsonb_build_object('jobId',job.id,'status',job.status,'impact',current_impact,
    'storageTargets',job.storage_targets,'cleanupProtocolVersion',1);
end $$;
revoke all on function public.prepare_account_deletion(uuid,uuid) from public,anon,authenticated;
grant execute on function public.prepare_account_deletion(uuid,uuid) to service_role;

-- Preserve the deployed return shape, service-only access, bound and SKIP LOCKED
-- claim behavior. Existing cleanup workers receive corrected persisted targets
-- without a new endpoint, role or worker deployment.
create or replace function public.claim_account_deletion_cleanup(p_limit integer default 10)
returns table(job_id uuid,storage_targets jsonb)
language sql security definer set search_path='' as $$
  with claimed as (
    select job.id from public.account_deletion_jobs job
    where job.status in ('data_deleted','cleanup_pending')
    order by job.updated_at
    for update skip locked
    limit least(greatest(coalesce(p_limit,10),1),50)
  )
  update public.account_deletion_jobs job
  set status='cleanup_pending',updated_at=now(),
    storage_targets=public.account_deletion_prune_retained_media_targets(job.user_id,job.storage_targets)
  from claimed where job.id=claimed.id
  returning job.id,job.storage_targets;
$$;
revoke all on function public.claim_account_deletion_cleanup(integer) from public,anon,authenticated;
grant execute on function public.claim_account_deletion_cleanup(integer) to service_role;
commit;
