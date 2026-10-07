begin;
set local role service_role;
select r.id,r.event_id,r.customer_id,r.status,r.checked_in_at,e.id,e.business_id,e.title,e.starts_at,e.ends_at,b.name,b.status from public.event_rsvps r join public.events e on e.id=r.event_id join public.businesses b on b.id=e.business_id where r.customer_id='00000000-0000-4000-8000-000000000000' limit 0;
rollback;
