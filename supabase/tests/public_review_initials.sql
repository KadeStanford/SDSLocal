-- Self-contained transactional regression; no hosted users or email.
begin;
\ir fixtures/business.sql
do $$
declare b uuid; r uuid; customer uuid; result record; payload jsonb;
begin
  select v.business_id, v.id, v.customer_id into strict b,r,customer
    from public.verified_event_reviews v join public.businesses b on b.id=v.business_id
    where b.status='active' and v.moderation_status='published' limit 1;
  update public.profiles set display_name='Jordan Avery Morgan' where id=customer;
  select * into strict result from public.get_public_business_reviews(b,100,0) where id=r;
  if result.reviewer_initials <> 'JM' then raise exception 'First/last initials mismatch'; end if;
  payload := to_jsonb(result);
  if payload ? 'customer_id' or payload ? 'display_name' or payload::text like '%Jordan Avery%' then raise exception 'Private identity leaked'; end if;
  update public.verified_event_reviews set moderation_status='hidden' where id=r;
  if exists(select 1 from public.get_public_business_reviews(b,100,0) where id=r) then raise exception 'Hidden review exposed'; end if;
  update public.businesses set status='suspended' where id=b;
  if exists(select 1 from public.get_public_business_reviews(b,100,0)) then raise exception 'Inactive business reviews exposed'; end if;
  if not has_function_privilege('anon','public.get_public_business_reviews(uuid,integer,integer)','execute') then raise exception 'Missing anon access'; end if;
end $$;
set local role anon;
select count(*) as anonymous_read_succeeded from public.get_public_business_reviews('00000000-0000-0000-0000-000000000000',5,0);
reset role;
rollback;
