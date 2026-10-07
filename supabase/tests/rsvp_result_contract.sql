-- Self-contained transactional regression; no hosted users or email.
begin;
\ir fixtures/business.sql
do $$
declare chosen_event uuid; chosen_user uuid; reply record;
begin
  select fixture.owner_id into chosen_user from database_test_fixture fixture;
  select e.id into chosen_event from public.events e join public.businesses b on b.id=e.business_id
  where b.status='active' and e.is_published and e.archived_at is null and e.starts_at>now()
  order by e.starts_at limit 1;
  if chosen_user is null or chosen_event is null then raise exception 'Local test fixtures missing'; end if;
  perform set_config('request.jwt.claim.sub',chosen_user::text,true);
  select * into reply from public.set_event_rsvp_group(chosen_event,true,1);
  if reply.rsvp_status not in ('going','waitlisted') or reply.my_party_size <> 1 then
    raise exception 'Group RSVP result contract failed';
  end if;
  select * into reply from public.set_event_rsvp_group(chosen_event,false,1);
  if reply.rsvp_status is not null then raise exception 'Cancelled RSVP result contract failed'; end if;
end $$;
rollback;
