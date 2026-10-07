begin;

-- The same transaction that settles a refund closes its customer request,
-- including provider webhooks and refunds made outside the app.
create function public.close_ended_order_requests() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status in ('refunded','checkout_expired','checkout_failed','dispute_lost')
     or (new.total_minor > 0 and new.refunded_minor >= new.total_minor) then
    update public.square_order_support_requests
      set status = 'resolved', resolved_at = now(),
          response = coalesce(response, case
            when new.status = 'refunded' or new.refunded_minor >= new.total_minor
              then 'This order has been cancelled and the payment fully refunded.'
            else 'This order has ended and this request is closed.' end)
      where order_id = new.id and status = 'open';
  end if;
  return new;
end;
$$;
create trigger close_ended_order_requests after update of status, refunded_minor on public.square_orders
for each row execute function public.close_ended_order_requests();
revoke all on function public.close_ended_order_requests() from public, anon, authenticated;

-- Lock the order before accepting a request so a concurrent refund cannot
-- leave an open request behind after settlement.
create function public.guard_ended_order_request() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o public.square_orders;
begin
  if new.status = 'open' then
    select * into o from public.square_orders where id = new.order_id for update;
    if o.status in ('refunded','checkout_expired','checkout_failed','dispute_lost')
       or (o.total_minor > 0 and o.refunded_minor >= o.total_minor) then
      raise exception 'ORDER_COMPLETE';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_ended_order_request before insert or update on public.square_order_support_requests
for each row execute function public.guard_ended_order_request();
revoke all on function public.guard_ended_order_request() from public, anon, authenticated;

-- Clear requests left open by refunds before this migration.
update public.square_order_support_requests r
set status = 'resolved', resolved_at = now(),
    response = coalesce(r.response, 'This order has ended and this request is closed.')
from public.square_orders o
where r.order_id = o.id and r.status = 'open'
  and (o.status in ('refunded','checkout_expired','checkout_failed','dispute_lost')
       or (o.total_minor > 0 and o.refunded_minor >= o.total_minor));

create or replace function public.square_queue_counts(p_business_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', count(*) filter(where status in ('placed','accepted','preparing','payment_review','refund_pending','refund_failed')),
    'placed', count(*) filter(where status='placed'),
    'preparing', count(*) filter(where status in ('accepted','preparing')),
    'ready', count(*) filter(where status='ready'),
    'attention', count(*) filter(where status in ('payment_review','refund_pending','refund_failed')),
    'requests', (select count(*) from public.square_order_support_requests r
      join public.square_orders o on o.id = r.order_id
      where r.business_id=p_business_id and r.status='open'
        and o.status not in ('refunded','checkout_expired','checkout_failed','dispute_lost')
        and not (o.total_minor > 0 and o.refunded_minor >= o.total_minor))
  ) from public.square_orders where business_id=p_business_id;
$$;
revoke all on function public.square_queue_counts(uuid) from public, anon, authenticated;
grant execute on function public.square_queue_counts(uuid) to service_role;
commit;
notify pgrst, 'reload schema';
