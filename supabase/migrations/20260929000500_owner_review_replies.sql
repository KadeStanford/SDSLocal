begin;
create or replace function public.reply_to_business_review(
  p_business_id uuid, p_review_id uuid, p_source text, p_response text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  review_order public.pickup_order_reviews%rowtype;
  review_event public.verified_event_reviews%rowtype;
  response_text text := regexp_replace(p_response, '^\s+|\s+$', '', 'g');
  actor uuid := auth.uid();
  response_time timestamptz;
begin
  if actor is null then raise exception 'Sign in as the business owner.' using errcode='42501'; end if;
  if not exists (select 1 from public.business_members m where m.business_id=p_business_id
    and m.user_id=actor and m.role='owner' and m.is_active) then
    raise exception 'Only an active business owner can reply to reviews.' using errcode='42501';
  end if;
  if p_source is null or p_source not in ('order','event') then
    raise exception 'Choose a valid review source.' using errcode='22023';
  end if;
  if response_text is null or char_length(response_text) not between 3 and 1500 then
    raise exception 'Your reply must contain 3 to 1,500 characters.' using errcode='22023';
  end if;
  if p_source='order' then
    select * into review_order from public.pickup_order_reviews r
      where r.id=p_review_id and r.business_id=p_business_id and r.moderation_status='published' for update;
    if not found then raise exception 'This review is no longer available.' using errcode='P0002'; end if;
    if review_order.merchant_response is distinct from response_text or review_order.responded_at is null then
      response_time := clock_timestamp();
      update public.pickup_order_reviews set merchant_response=response_text, responded_by=actor,
        responded_at=response_time where id=review_order.id;
      insert into public.pickup_order_review_events(review_id,order_id,actor_id,event_type,event_data)
        values(review_order.id,review_order.order_id,actor,'merchant_reply','{}'::jsonb);
    else response_time := review_order.responded_at;
    end if;
  else
    select * into review_event from public.verified_event_reviews r
      where r.id=p_review_id and r.business_id=p_business_id and r.moderation_status='published' for update;
    if not found then raise exception 'This review is no longer available.' using errcode='P0002'; end if;
    if review_event.merchant_response is distinct from response_text or review_event.responded_at is null then
      response_time := clock_timestamp();
      update public.verified_event_reviews set merchant_response=response_text, responded_by=actor,
        responded_at=response_time where id=review_event.id;
      insert into public.verified_event_review_events(review_id,event_id,actor_id,event_type,event_data)
        values(review_event.id,review_event.event_id,actor,'merchant_reply','{}'::jsonb);
    else response_time := review_event.responded_at;
    end if;
  end if;
  return jsonb_build_object('id',p_review_id,'source',p_source,
    'merchantResponse',response_text,'respondedAt',response_time);
end;
$$;
revoke all on function public.reply_to_business_review(uuid,uuid,text,text) from public, anon;
grant execute on function public.reply_to_business_review(uuid,uuid,text,text) to authenticated;
notify pgrst, 'reload schema';
commit;
