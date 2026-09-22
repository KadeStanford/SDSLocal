-- Give staff-facing order notifications actionable copy instead of mirroring
-- the customer status message. The audience remains part of the delivery row so
-- one account can receive both views without collapsing them together.
create or replace function public.queue_pickup_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  heading text;
  business_heading text;
  customer_message text;
  business_message text;
  recipient record;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  heading := case new.status
    when 'placed' then 'Order placed'
    when 'accepted' then 'Order accepted'
    when 'preparing' then 'Preparing your order'
    when 'ready' then 'Ready for pickup'
    when 'completed' then 'Pickup confirmed'
    when 'refund_pending' then 'Refund in progress'
    when 'refunded' then 'Order refunded'
    when 'refund_failed' then 'Refund needs attention'
    when 'payment_review' then 'Payment needs review'
    else null
  end;
  business_heading := case new.status
    when 'placed' then 'New pickup order'
    when 'accepted' then 'Order accepted'
    when 'preparing' then 'Order in preparation'
    when 'ready' then 'Order ready to hand off'
    when 'completed' then 'Pickup confirmed'
    when 'refund_pending' then 'Refund review needed'
    when 'refunded' then 'Order refunded'
    when 'refund_failed' then 'Refund needs attention'
    when 'payment_review' then 'Payment needs review'
    else null
  end;
  if heading is null then
    return new;
  end if;

  update public.notification_deliveries
  set status = 'skipped', last_error = 'Order status changed', updated_at = now()
  where entity_type = 'pickup_order' and entity_id = new.id and status = 'queued';

  customer_message := left(new.business_name, 120) || ' · Order #' || right(new.id::text, 6);
  business_message := case new.status
    when 'placed' then 'Review and accept this order in your pickup queue.'
    when 'accepted' then 'The order is accepted. Start preparing it in your pickup queue.'
    when 'preparing' then 'The order is being prepared. Mark it ready when it is ready for pickup.'
    when 'ready' then 'The order is ready. Scan the customer pickup QR at handoff.'
    when 'completed' then 'The pickup was confirmed by staff scan.'
    when 'refund_pending' then 'Square is reviewing this refund.'
    when 'refunded' then 'The order was refunded in Square.'
    when 'refund_failed' then 'Review this refund in Square before continuing.'
    when 'payment_review' then 'Review the payment in Square before continuing.'
    else 'Review this order in your pickup queue.'
  end || ' · Order #' || right(new.id::text, 6);

  for recipient in
    select new.customer_id as id, 'customer' as audience
    where new.customer_id is not null
    union all
    select m.user_id, 'business'
    from public.business_members m
    where m.business_id = new.business_id
      and m.is_active
      and m.role in ('owner', 'staff')
  loop
    insert into public.notification_deliveries(
      user_id, business_id, notification_type, entity_type, entity_id,
      dedupe_key, title, body, url, expires_at, status, order_audience, order_status
    ) values (
      recipient.id, new.business_id, 'orders', 'pickup_order', new.id,
      'pickup:' || new.id || ':' || new.version || ':' || recipient.audience || ':' || recipient.id,
      case when recipient.audience = 'business' then business_heading else heading end,
      case when recipient.audience = 'business' then business_message else customer_message end,
      case when recipient.audience = 'business' then '/pickup-order?orderId=' else '/order?orderId=' end || new.id,
      now() + interval '1 hour',
      case when public.notification_enabled(recipient.id, new.business_id, 'orders') then 'queued' else 'skipped' end,
      recipient.audience, new.status
    ) on conflict (dedupe_key) do nothing;
  end loop;
  return new;
end;
$function$;

-- Refresh existing business rows so the inbox is useful immediately after the
-- migration, without changing order state or customer-facing deliveries.
update public.notification_deliveries d
set title = case d.order_status
    when 'placed' then 'New pickup order'
    when 'accepted' then 'Order accepted'
    when 'preparing' then 'Order in preparation'
    when 'ready' then 'Order ready to hand off'
    when 'completed' then 'Pickup confirmed'
    when 'refund_pending' then 'Refund review needed'
    when 'refunded' then 'Order refunded'
    when 'refund_failed' then 'Refund needs attention'
    when 'payment_review' then 'Payment needs review'
    else d.title
  end,
  body = case d.order_status
    when 'placed' then 'Review and accept this order in your pickup queue.'
    when 'accepted' then 'The order is accepted. Start preparing it in your pickup queue.'
    when 'preparing' then 'The order is being prepared. Mark it ready when it is ready for pickup.'
    when 'ready' then 'The order is ready. Scan the customer pickup QR at handoff.'
    when 'completed' then 'The pickup was confirmed by staff scan.'
    when 'refund_pending' then 'Square is reviewing this refund.'
    when 'refunded' then 'The order was refunded in Square.'
    when 'refund_failed' then 'Review this refund in Square before continuing.'
    when 'payment_review' then 'Review the payment in Square before continuing.'
    else d.body
  end || ' · Order #' || right(d.entity_id::text, 6),
  updated_at = now()
where d.entity_type = 'pickup_order'
  and d.order_audience = 'business';

notify pgrst, 'reload schema';