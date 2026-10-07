-- Self-contained transactional regression; no hosted users or email.
begin;
\ir fixtures/business.sql
do $$
declare
  owner_id uuid;
  business record;
  summary record;
  expected record;
  review_id uuid;
  prior_count bigint;
begin
  select fixture.owner_id into strict owner_id from database_test_fixture fixture;
  for business in select b.id,b.status from public.businesses b
    join public.business_members m on m.business_id=b.id
    where m.user_id=owner_id and m.role='owner' and m.is_active
  loop
    select * into summary from public.get_public_business_review_summaries(array[business.id]);
    if business.status <> 'active' then
      if found then raise exception 'Private business rating exposed'; end if;
      continue;
    end if;
    select count(*) as review_count, coalesce(round(avg(rating),1),0) as average_rating into expected
    from (select rating from public.pickup_order_reviews where business_id=business.id and moderation_status='published'
      union all select rating from public.verified_event_reviews where business_id=business.id and moderation_status='published') reviews;
    if summary.review_count <> expected.review_count or summary.average_rating <> expected.average_rating
      then raise exception 'Published aggregate mismatch'; end if;
    prior_count := summary.review_count;
    select r.id into review_id from public.pickup_order_reviews r
      where r.business_id=business.id and r.moderation_status='published'
      order by r.id limit 1;
    if review_id is null then continue; end if;
    update public.pickup_order_reviews set moderation_status='hidden' where id=review_id;
    select * into summary from public.get_public_business_review_summaries(array[business.id]);
    if summary.review_count <> prior_count-1 then raise exception 'Hidden review counted'; end if;
  end loop;
  if not has_function_privilege('anon','public.get_public_business_review_summaries(uuid[])','execute')
    or not has_function_privilege('authenticated','public.get_public_business_review_summaries(uuid[])','execute')
  then raise exception 'Public rating grants missing'; end if;
  begin
    perform public.get_public_business_review_summaries(array_fill(gen_random_uuid(),array[201]));
    raise exception 'Oversized public request accepted';
  exception when invalid_parameter_value then null;
  end;
end;
$$;
set local role anon;
select count(*) as anonymous_summary_rows from public.get_public_business_review_summaries(
  array['11111111-1111-4111-8111-111111111111'::uuid,'88888888-8888-4888-8888-888888888888'::uuid]
);
reset role;
rollback;
