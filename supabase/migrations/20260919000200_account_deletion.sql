begin;

create table public.account_deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  status varchar(24) not null default 'pending',
  impact jsonb not null,
  storage_targets jsonb not null default '[]'::jsonb,
  last_error varchar(500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint account_deletion_jobs_status_check check (
    status in ('pending', 'data_deleted', 'cleanup_pending', 'completed')
  ),
  constraint account_deletion_jobs_storage_targets_array check (
    jsonb_typeof(storage_targets) = 'array'
  )
);

create index account_deletion_jobs_cleanup_idx
  on public.account_deletion_jobs (updated_at)
  where status in ('data_deleted', 'cleanup_pending');

alter table public.account_deletion_jobs enable row level security;
revoke all on table public.account_deletion_jobs from anon, authenticated;
grant select, insert, update on table public.account_deletion_jobs to service_role;

create or replace function public.get_account_deletion_impact(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with memberships as (
    select
      business.id,
      business.name,
      member.role,
      member.is_active,
      business.created_by,
      (
        select owner.user_id
        from public.business_members owner
        where owner.business_id = business.id
          and owner.role = 'owner'
          and owner.is_active
          and owner.user_id <> p_user_id
        order by owner.created_at, owner.user_id
        limit 1
      ) as remaining_owner_id
    from public.businesses business
    left join public.business_members member
      on member.business_id = business.id and member.user_id = p_user_id
    where (member.is_active and member.role in ('owner', 'staff'))
       or business.created_by = p_user_id
  ), impacts as (
    select
      id,
      name,
      case
        when role = 'staff' and created_by <> p_user_id then 'staff'
        else 'owner'
      end as relationship,
      case
        when role = 'staff' and created_by <> p_user_id then 'remove_access'
        when remaining_owner_id is not null then 'preserve_and_transfer'
        else 'delete_business'
      end as action,
      remaining_owner_id
    from memberships
  )
  select jsonb_build_object(
    'businesses', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'relationship', relationship,
          'action', action,
          'remainingOwnerId', remaining_owner_id
        ) order by name, id
      ),
      '[]'::jsonb
    ),
    'soleOwnedBusinessCount', count(*) filter (where action = 'delete_business'),
    'preservedOwnedBusinessCount', count(*) filter (where action = 'preserve_and_transfer'),
    'staffMembershipCount', count(*) filter (where action = 'remove_access')
  )
  from impacts;
$$;

revoke all on function public.get_account_deletion_impact(uuid) from public;
grant execute on function public.get_account_deletion_impact(uuid) to service_role;

create or replace function public.begin_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_impact jsonb;
  targets jsonb;
  job public.account_deletion_jobs%rowtype;
begin
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  deletion_impact := public.get_account_deletion_impact(p_user_id);
  select coalesce(
    jsonb_agg(
      jsonb_build_object('bucket', asset.bucket, 'path', asset.storage_path)
      order by asset.bucket, asset.storage_path
    ),
    '[]'::jsonb
  ) into targets
  from public.media_assets asset
  where asset.business_id in (
    select business.id
    from public.businesses business
    left join public.business_members member
      on member.business_id = business.id and member.user_id = p_user_id
    where ((member.is_active and member.role = 'owner') or business.created_by = p_user_id)
      and not exists (
        select 1
        from public.business_members owner
        where owner.business_id = business.id
          and owner.role = 'owner'
          and owner.is_active
          and owner.user_id <> p_user_id
      )
  );

  insert into public.account_deletion_jobs (user_id, impact, storage_targets)
  values (p_user_id, deletion_impact, targets)
  on conflict (user_id) do update
    set impact = case
          when public.account_deletion_jobs.status = 'pending' then excluded.impact
          else public.account_deletion_jobs.impact
        end,
        storage_targets = case
          when public.account_deletion_jobs.status = 'pending' then excluded.storage_targets
          else public.account_deletion_jobs.storage_targets
        end,
        updated_at = now()
  returning * into job;

  return jsonb_build_object(
    'jobId', job.id,
    'status', job.status,
    'impact', job.impact,
    'storageTargets', job.storage_targets
  );
end;
$$;

revoke all on function public.begin_account_deletion(uuid) from public;
grant execute on function public.begin_account_deletion(uuid) to service_role;

create or replace function public.set_account_deletion_storage_targets(
  p_user_id uuid,
  p_job_id uuid,
  p_storage_targets jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if jsonb_typeof(p_storage_targets) <> 'array' then
    raise exception 'Storage targets must be an array' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_storage_targets) target
    where target ->> 'bucket' not in ('business-media', 'media-staging')
       or nullif(target ->> 'path', '') is null
       or (target ->> 'bucket' = 'media-staging' and target ->> 'path' not like p_user_id::text || '/%')
  ) then
    raise exception 'A storage cleanup target was rejected' using errcode = '22023';
  end if;

  update public.account_deletion_jobs
  set storage_targets = p_storage_targets, updated_at = now()
  where id = p_job_id and user_id = p_user_id and status = 'pending';
  if not found then
    raise exception 'Pending deletion was not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_account_deletion_storage_targets(uuid, uuid, jsonb) from public;
grant execute on function public.set_account_deletion_storage_targets(uuid, uuid, jsonb) to service_role;

create or replace function public.execute_account_deletion(p_user_id uuid, p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  job public.account_deletion_jobs%rowtype;
  business_record record;
  replacement_owner uuid;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select * into job
  from public.account_deletion_jobs
  where id = p_job_id and user_id = p_user_id
  for update;
  if job.id is null then
    raise exception 'Deletion request not found' using errcode = 'P0002';
  end if;
  if job.status in ('data_deleted', 'cleanup_pending', 'completed') then
    return jsonb_build_object('jobId', job.id, 'status', job.status, 'alreadyDeleted', true);
  end if;

  -- Customer loyalty history prevents membership deletion by design. Remove
  -- only transactions belonging to the deleting customer's memberships.
  delete from public.loyalty_transactions transaction
  where transaction.membership_id in (
    select membership.id
    from public.loyalty_memberships membership
    where membership.customer_id = p_user_id
  );

  for business_record in
    select distinct business.id
    from public.businesses business
    left join public.business_members member
      on member.business_id = business.id and member.user_id = p_user_id
    where (member.is_active and member.role = 'owner') or business.created_by = p_user_id
    order by business.id
  loop
    select owner.user_id into replacement_owner
    from public.business_members owner
    where owner.business_id = business_record.id
      and owner.role = 'owner'
      and owner.is_active
      and owner.user_id <> p_user_id
    order by owner.created_at, owner.user_id
    limit 1;

    if replacement_owner is null then
      delete from public.loyalty_transactions where business_id = business_record.id;
      delete from public.businesses where id = business_record.id;
    else
      update public.businesses
      set created_by = replacement_owner, updated_at = now()
      where id = business_record.id and created_by = p_user_id;
    end if;
  end loop;

  -- Preserve legitimate content and audit history for businesses that remain,
  -- while removing the departing person's attribution from restrictive keys.
  update public.media_assets asset
  set uploaded_by = business.created_by
  from public.businesses business
  where asset.business_id = business.id and asset.uploaded_by = p_user_id;

  update public.business_updates update_record
  set created_by = business.created_by
  from public.businesses business
  where update_record.business_id = business.id and update_record.created_by = p_user_id;

  update public.business_staff_invites invite
  set invited_by = business.created_by
  from public.businesses business
  where invite.business_id = business.id and invite.invited_by = p_user_id;

  update public.business_staff_invites
  set status = 'revoked', accepted_by = null, accepted_at = null, revoked_at = now()
  where accepted_by = p_user_id;

  update public.loyalty_transactions transaction
  set actor_id = business.created_by
  from public.businesses business
  where transaction.business_id = business.id and transaction.actor_id = p_user_id;

  delete from public.platform_admin_audit_log where actor_id = p_user_id;

  -- Deleting the Auth row and its profile happens in this same database
  -- transaction. All remaining personal rows use profile cascades/set-null.
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;

  update public.account_deletion_jobs
  set status = 'data_deleted', last_error = null, updated_at = now()
  where id = p_job_id;

  return jsonb_build_object('jobId', p_job_id, 'status', 'data_deleted', 'alreadyDeleted', false);
end;
$$;

revoke all on function public.execute_account_deletion(uuid, uuid) from public;
grant execute on function public.execute_account_deletion(uuid, uuid) to service_role;

create or replace function public.finish_account_deletion_cleanup(
  p_job_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.account_deletion_jobs
  set status = case when nullif(trim(coalesce(p_error, '')), '') is null
      then 'completed' else 'cleanup_pending' end,
      last_error = nullif(left(trim(coalesce(p_error, '')), 500), ''),
      completed_at = case when nullif(trim(coalesce(p_error, '')), '') is null
        then now() else completed_at end,
      updated_at = now()
  where id = p_job_id and status in ('data_deleted', 'cleanup_pending');
end;
$$;

revoke all on function public.finish_account_deletion_cleanup(uuid, text) from public;
grant execute on function public.finish_account_deletion_cleanup(uuid, text) to service_role;

create or replace function public.claim_account_deletion_cleanup(p_limit integer default 10)
returns table (job_id uuid, storage_targets jsonb)
language sql
security definer
set search_path = ''
as $$
  with claimed as (
    select job.id
    from public.account_deletion_jobs job
    where job.status in ('data_deleted', 'cleanup_pending')
    order by job.updated_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 10), 1), 50)
  )
  update public.account_deletion_jobs job
  set status = 'cleanup_pending', updated_at = now()
  from claimed
  where job.id = claimed.id
  returning job.id, job.storage_targets;
$$;

revoke all on function public.claim_account_deletion_cleanup(integer) from public;
grant execute on function public.claim_account_deletion_cleanup(integer) to service_role;

commit;
