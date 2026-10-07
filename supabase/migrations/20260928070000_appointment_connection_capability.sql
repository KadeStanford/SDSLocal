begin;

-- A disconnected Sandbox seller cannot accept new appointment bookings.
-- Keep existing appointments available through the owner and guest status APIs.
create or replace function public.get_appointment_capabilities(p_business_ids uuid[] default null)
returns table(business_id uuid, supports_appointments boolean)
language sql stable security definer set search_path = '' set row_security = off as $$
  select business.id, true
  from public.businesses business
  join public.appointment_settings settings on settings.business_id = business.id and settings.enabled
  join public.appointment_services service
    on service.business_id = business.id and service.is_bookable and service.archived_at is null
  join public.square_connections connection
    on connection.business_id = business.id and connection.provider = 'square'
      and connection.environment = 'sandbox' and connection.state = 'connected'
      and connection.location_id is not null
  join public.platform_settings rollout on rollout.key = 'appointment_booking'
  where business.status = 'active' and business.business_type = 'services'
    and (p_business_ids is null or business.id = any(p_business_ids))
    and rollout.value->'enabled' = 'true'::jsonb
    and coalesce(rollout.value->>'public_environment',rollout.value->>'environment')
      in ('development','staging','test')
    and (rollout.value->'business_ids') ? business.id::text
    and not exists (
      select 1 from public.blocked_businesses blocked
      where blocked.business_id = business.id and blocked.customer_id = (select auth.uid())
    )
  group by business.id
  limit 500;
$$;
revoke all on function public.get_appointment_capabilities(uuid[]) from public;
grant execute on function public.get_appointment_capabilities(uuid[]) to anon, authenticated;
alter function public.get_appointment_capabilities(uuid[]) set row_security = off;

commit;
