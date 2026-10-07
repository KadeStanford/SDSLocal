begin;
-- Public review identities are initials only. Never expose customer IDs or full profile names.
create or replace function public.get_public_business_reviews(p_business_id uuid, p_limit integer default 5, p_offset integer default 0)
returns table(id uuid, source text, event_title text, reviewer_initials text, rating integer, review_text text, merchant_response text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  with reviews as (
    select r.id, 'order'::text source, null::text event_title, r.customer_id, r.rating::integer, r.review_text, r.merchant_response, r.created_at
    from public.pickup_order_reviews r join public.businesses b on b.id = r.business_id
    where r.business_id = p_business_id and b.status = 'active' and r.moderation_status = 'published'
    union all
    select r.id, 'event'::text, e.title, r.customer_id, r.rating::integer, r.review_text, r.merchant_response, r.created_at
    from public.verified_event_reviews r join public.businesses b on b.id = r.business_id
    left join public.events e on e.id = r.event_id
    where r.business_id = p_business_id and b.status = 'active' and r.moderation_status = 'published'
  )
  select r.id, r.source, r.event_title,
    nullif(upper(left(parts.names[1], 1) || case when cardinality(parts.names) > 1 then left(parts.names[cardinality(parts.names)], 1) else '' end), '') reviewer_initials,
    r.rating, r.review_text, r.merchant_response, r.created_at
  from reviews r left join public.profiles p on p.id = r.customer_id
  cross join lateral (select regexp_split_to_array(trim(coalesce(p.display_name, '')), '\s+') names) parts
  order by r.created_at desc, r.id
  limit greatest(1, least(coalesce(p_limit, 5), 100)) offset greatest(0, coalesce(p_offset, 0));
$$;
revoke all on function public.get_public_business_reviews(uuid, integer, integer) from public;
grant execute on function public.get_public_business_reviews(uuid, integer, integer) to anon, authenticated;
commit;
