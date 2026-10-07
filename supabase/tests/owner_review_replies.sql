-- Self-contained transactional regression; no hosted users or email.
begin;
\ir fixtures/business.sql
do $$
#variable_conflict use_variable
declare
  owner_id uuid; business_id uuid; other_business uuid; order_review uuid; event_id uuid;
  rsvp_id uuid; event_review uuid := gen_random_uuid(); result jsonb; prior_count bigint; saved_time timestamptz;
begin
  select fixture.owner_id into strict owner_id from database_test_fixture fixture;
  select r.id,r.business_id into strict order_review,business_id from public.pickup_order_reviews r
    join public.square_orders o on o.id=r.order_id where o.request_hash='local-review-fixture'
    and exists(select 1 from public.business_members m where m.business_id=r.business_id and m.user_id=owner_id and m.role='owner' and m.is_active) limit 1;
  select m.business_id into strict other_business from public.business_members m
    where m.user_id=owner_id and m.role='owner' and m.is_active and m.business_id<>business_id limit 1;
  insert into public.events(business_id,slug,title,starts_at) values(business_id,'reply-test-'||replace(event_review::text,'-',''),'Rolled-back reply fixture',now()-interval '1 day') returning id into event_id;
  insert into public.event_rsvps(event_id,customer_id,status) values(event_id,owner_id,'going') returning id into rsvp_id;
  insert into public.verified_event_reviews(id,event_id,rsvp_id,business_id,customer_id,rating,review_text)
    values(event_review,event_id,rsvp_id,business_id,owner_id,5,'Rolled-back event review');
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  result := public.reply_to_business_review(business_id,order_review,'order', E' \nReply regression test\t ');
  if result->>'merchantResponse'<>'Reply regression test' or result->>'source'<>'order' then raise exception 'Order reply contract'; end if;
  if not exists(select 1 from public.pickup_order_reviews where id=order_review and responded_by=owner_id and merchant_response='Reply regression test') then raise exception 'Order reply not saved'; end if;
  select count(*),max(created_at) into prior_count,saved_time from public.pickup_order_review_events where review_id=order_review and event_type='merchant_reply';
  if prior_count=0 then raise exception 'Reply audit missing'; end if;
  perform public.reply_to_business_review(business_id,order_review,'order','Reply regression test');
  if (select count(*) from public.pickup_order_review_events where review_id=order_review and event_type='merchant_reply')<>prior_count then raise exception 'Duplicate audit'; end if;
  result := public.reply_to_business_review(business_id,event_review,'event','Event reply test');
  if result->>'id'<>event_review::text or result->>'source'<>'event' or result->>'respondedAt' is null then raise exception 'Event reply contract'; end if;
  if not exists(select 1 from public.verified_event_review_events where review_id=event_review and actor_id=owner_id and event_type='merchant_reply') then raise exception 'Event audit missing'; end if;
  begin perform public.reply_to_business_review(other_business,order_review,'order','Wrong business'); raise exception 'Cross-business allowed'; exception when no_data_found then null; end;
  update public.pickup_order_reviews set moderation_status='hidden' where id=order_review;
  begin perform public.reply_to_business_review(business_id,order_review,'order','Hidden reply'); raise exception 'Hidden allowed'; exception when no_data_found then null; end;
  update public.pickup_order_reviews set moderation_status='published' where id=order_review;
  begin perform public.reply_to_business_review(business_id,order_review,'bogus','Valid text'); raise exception 'Bad source'; exception when invalid_parameter_value then null; end;
  begin perform public.reply_to_business_review(business_id,order_review,'order',repeat('x',1501)); raise exception 'Oversize'; exception when invalid_parameter_value then null; end;
  begin perform public.reply_to_business_review(business_id,order_review,'order',E'\n\t '); raise exception 'Blank reply'; exception when invalid_parameter_value then null; end;
  update public.business_members set role='staff' where business_members.business_id=business_id and user_id=owner_id;
  begin perform public.reply_to_business_review(business_id,order_review,'order','Staff reply'); raise exception 'Staff allowed'; exception when insufficient_privilege then null; end;
  update public.business_members set role='owner',is_active=false where business_members.business_id=business_id and user_id=owner_id;
  begin perform public.reply_to_business_review(business_id,order_review,'order','Inactive reply'); raise exception 'Inactive allowed'; exception when insufficient_privilege then null; end;
  update public.business_members set is_active=true where business_members.business_id=business_id and user_id=owner_id;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  begin perform public.reply_to_business_review(business_id,order_review,'order','Non-owner reply'); raise exception 'Non-owner allowed'; exception when insufficient_privilege then null; end;
  perform set_config('request.jwt.claim.sub','',true);
  begin perform public.reply_to_business_review(business_id,order_review,'order','Guest reply'); raise exception 'Guest allowed'; exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.reply_to_business_review(uuid,uuid,text,text)','execute') or not has_function_privilege('authenticated','public.reply_to_business_review(uuid,uuid,text,text)','execute') then raise exception 'Reply grants'; end if;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('test.reply_business',business_id::text,true);
  perform set_config('test.reply_review',order_review::text,true);
end;
$$;
set local role authenticated;
select public.reply_to_business_review(current_setting('test.reply_business')::uuid,current_setting('test.reply_review')::uuid,'order','Authenticated reply test')->>'merchantResponse' as authenticated_reply;
reset role;
rollback;
