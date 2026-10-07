begin;

create or replace function public.get_public_business_review_summaries(p_business_ids uuid[])
returns table(business_id uuid, review_count bigint, average_rating numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if coalesce(cardinality(p_business_ids), 0) > 200 then
    raise exception 'Request at most 200 businesses' using errcode = '22023';
  end if;
  return query
  with selected as (
    select business.id from public.businesses business
    where business.status = 'active' and business.id = any(p_business_ids)
  ), reviews as (
    select review.business_id, review.rating
    from public.pickup_order_reviews review join selected on selected.id = review.business_id
    where review.moderation_status = 'published'
    union all
    select review.business_id, review.rating
    from public.verified_event_reviews review join selected on selected.id = review.business_id
    where review.moderation_status = 'published'
  )
  select selected.id, count(reviews.rating)::bigint,
    coalesce(round(avg(reviews.rating), 1), 0::numeric)
  from selected left join reviews on reviews.business_id = selected.id
  group by selected.id;
end;
$$;
revoke all on function public.get_public_business_review_summaries(uuid[]) from public;
grant execute on function public.get_public_business_review_summaries(uuid[]) to anon, authenticated;

commit;
