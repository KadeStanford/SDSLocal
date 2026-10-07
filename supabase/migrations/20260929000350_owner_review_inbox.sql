begin;

-- Owner review reads are independent of payment-provider configuration.
create or replace function public.get_business_reviews(p_business_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'SIGN_IN_REQUIRED' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.business_members member
    where member.business_id = p_business_id and member.user_id = auth.uid()
      and member.role = 'owner' and member.is_active
  ) then raise exception 'OWNER_REQUIRED' using errcode = '42501'; end if;

  return jsonb_build_object('reviews', coalesce((
    select jsonb_agg(result.review order by result.created_at desc, result.id)
    from (
      select source.id, source.created_at, jsonb_build_object(
        'id', source.id, 'source', 'order', 'orderId', source.order_id,
        'eventId', null, 'eventTitle', null, 'rating', source.rating,
        'text', source.review_text, 'merchantResponse', source.merchant_response,
        'moderationStatus', source.moderation_status, 'createdAt', source.created_at
      ) review
      from (
        select * from public.pickup_order_reviews
        where business_id = p_business_id and moderation_status = 'published'
        order by created_at desc, id limit 100
      ) source
      union all
      select source.id, source.created_at, jsonb_build_object(
        'id', source.id, 'source', 'event', 'orderId', null,
        'eventId', source.event_id, 'eventTitle', coalesce(event.title, 'Event'),
        'rating', source.rating, 'text', source.review_text,
        'merchantResponse', source.merchant_response,
        'moderationStatus', source.moderation_status, 'createdAt', source.created_at
      ) review
      from (
        select * from public.verified_event_reviews
        where business_id = p_business_id and moderation_status = 'published'
        order by created_at desc, id limit 100
      ) source
      left join public.events event on event.id = source.event_id
    ) result
  ), '[]'::jsonb));
end;
$$;
revoke all on function public.get_business_reviews(uuid) from public, anon;
grant execute on function public.get_business_reviews(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
