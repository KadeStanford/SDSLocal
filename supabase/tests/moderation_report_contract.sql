begin;
\ir fixtures/business.sql
do $$
declare f database_test_fixture; result record; seen integer := 0; denied boolean := false;
begin
  select * into f from database_test_fixture;
  insert into public.pickup_order_review_reports(review_id,reporter_id,reason,details)
    values(f.order_review_id,f.owner_id,'spam','Local report fixture');
  insert into public.verified_event_review_reports(review_id,reporter_id,reason,details)
    values(f.event_review_id,f.owner_id,'other','Local event report fixture');
  perform set_config('request.jwt.claim.sub',f.owner_id::text,true);
  begin perform public.list_pickup_review_reports();
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Non-admin accessed the moderation queue'; end if;
  insert into public.platform_admins(user_id) values(f.owner_id);
  for result in select * from public.list_pickup_review_reports() loop
    if result.review_id in (f.order_review_id,f.event_review_id) then
      if result.business_name <> 'Verification shop' or result.status <> 'open' then
        raise exception 'Moderation result contract changed';
      end if;
      seen := seen+1;
    end if;
  end loop;
  if seen <> 2 then raise exception 'Both review types must appear in the moderation queue'; end if;
end $$;
rollback;
