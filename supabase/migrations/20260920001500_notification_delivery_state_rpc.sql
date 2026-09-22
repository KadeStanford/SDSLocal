-- Keep dispatcher state transitions in a security-definer function.  The
-- worker uses the service role, but a single RPC gives every status write the
-- same transaction and makes failures observable instead of leaving rows in
-- `sending` forever.
create or replace function public.set_notification_delivery_state(
  p_delivery uuid,
  p_status text,
  p_next_attempt_at timestamptz default null,
  p_last_error text default null,
  p_expo_tickets jsonb default null,
  p_sent_at timestamptz default null
)
returns public.notification_deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.notification_deliveries;
begin
  update public.notification_deliveries delivery
  set status = p_status,
      next_attempt_at = coalesce(p_next_attempt_at, delivery.next_attempt_at),
      last_error = p_last_error,
      expo_tickets = coalesce(p_expo_tickets, delivery.expo_tickets),
      sent_at = coalesce(p_sent_at, delivery.sent_at),
      updated_at = now()
  where delivery.id = p_delivery
  returning delivery.* into result;

  if result.id is null then
    raise exception 'Notification delivery % was not found', p_delivery using errcode = 'P0002';
  end if;

  return result;
end;
$$;

revoke all on function public.set_notification_delivery_state(uuid, text, timestamptz, text, jsonb, timestamptz) from public;
grant execute on function public.set_notification_delivery_state(uuid, text, timestamptz, text, jsonb, timestamptz) to service_role;

notify pgrst, 'reload schema';
