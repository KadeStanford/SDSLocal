-- Real account deletion/retry/cleanup and privilege checks; fixture transaction rolls back.
begin;
\ir fixtures/business.sql
do $$
declare f database_test_fixture; job jsonb; result jsonb; denied boolean := false;
begin
  select * into f from database_test_fixture;
  if has_function_privilege('authenticated', 'public.execute_account_deletion(uuid,uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.execute_account_deletion(uuid,uuid)', 'EXECUTE') then
    raise exception 'Untrusted caller can execute account deletion';
  end if;
  insert into public.business_follows(business_id,customer_id) values(f.business_id,f.customer_id);
  job := public.begin_account_deletion(f.customer_id);
  begin
    perform public.set_account_deletion_storage_targets(f.customer_id,(job->>'jobId')::uuid,
      jsonb_build_array(jsonb_build_object('bucket','media-staging','path',f.owner_id::text||'/other-user.webp')));
  exception when invalid_parameter_value then denied := true; end;
  if not denied then raise exception 'Deletion accepted another account staging path'; end if;
  result := public.execute_account_deletion(f.customer_id,(job->>'jobId')::uuid);
  if exists(select 1 from auth.users where id=f.customer_id)
    or exists(select 1 from public.profiles where id=f.customer_id)
    or exists(select 1 from public.business_follows where customer_id=f.customer_id)
    or exists(select 1 from public.event_rsvps where customer_id=f.customer_id) then
    raise exception 'Deleted identity or private customer association remains';
  end if;
  if not exists(select 1 from public.businesses where id=f.business_id and created_by=f.owner_id) then
    raise exception 'Customer deletion removed an unrelated merchant business';
  end if;
  result := public.execute_account_deletion(f.customer_id,(job->>'jobId')::uuid);
  if not (result->>'alreadyDeleted')::boolean then raise exception 'Deletion retry is not idempotent'; end if;
  perform public.finish_account_deletion_cleanup((job->>'jobId')::uuid,'Synthetic storage failure');
  if not exists(select 1 from public.claim_account_deletion_cleanup(10) where job_id=(job->>'jobId')::uuid) then
    raise exception 'Pending storage cleanup cannot be retried';
  end if;
  perform public.finish_account_deletion_cleanup((job->>'jobId')::uuid,null);
  if not exists(select 1 from public.account_deletion_jobs where id=(job->>'jobId')::uuid and status='completed') then
    raise exception 'Successful storage retry did not finish deletion job';
  end if;
end $$;
rollback;
