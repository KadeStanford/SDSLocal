grant select, update on table public.push_tokens to service_role;

-- Send business order updates to every active owner/staff device, including
-- accounts that also placed the customer order. Include the audience in the
-- dedupe key so the same account can receive both views.
create or replace function public.queue_pickup_order_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  heading text;
  message text;
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
  if heading is null then
    return new;
  end if;
  update public.notification_deliveries
  set status = 'skipped', last_error = 'Order status changed', updated_at = now()
  where entity_type = 'pickup_order' and entity_id = new.id and status = 'queued';
  message := left(new.business_name, 120) || ' · Order #' || right(new.id::text, 6);
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
      case when recipient.audience = 'business' and new.status = 'placed' then 'New pickup order' else heading end,
      message,
      case when recipient.audience = 'business' then '/pickup-order?orderId=' else '/order?orderId=' end || new.id,
      now() + interval '1 hour',
      case when public.notification_enabled(recipient.id, new.business_id, 'orders') then 'queued' else 'skipped' end,
      recipient.audience, new.status
    ) on conflict (dedupe_key) do nothing;
  end loop;
  return new;
end;
$function$;

notify pgrst, 'reload schema';