-- Store account-deletion requirement: associated customer-authored UGC is removed.
-- Retained financial records need a separate disclosed retention policy; this checks public reviews only.
begin;
\ir fixtures/business.sql
do $$
declare f database_test_fixture; job jsonb;
begin
  select * into f from database_test_fixture;
  job := public.begin_account_deletion(f.customer_id);
  perform public.execute_account_deletion(f.customer_id,(job->>'jobId')::uuid);
  if exists(select 1 from public.pickup_order_reviews where id=f.order_review_id)
    or exists(select 1 from public.verified_event_reviews where id=f.event_review_id) then
    raise exception 'Account deleted but customer-authored pickup/event reviews remain as public UGC';
  end if;
end $$;
rollback;
