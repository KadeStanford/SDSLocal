alter table public.notification_preferences drop constraint notification_preferences_type;
alter table public.notification_preferences add constraint notification_preferences_type
  check (notification_type in ('events','loyalty','general_updates','operational','orders'));
alter table public.notification_deliveries drop constraint notification_deliveries_type;
alter table public.notification_deliveries add constraint notification_deliveries_type
  check (notification_type in ('events','loyalty','general_updates','operational','orders'));
alter table public.notification_deliveries drop constraint notification_deliveries_entity;
alter table public.notification_deliveries add constraint notification_deliveries_entity
  check (entity_type in ('event','loyalty_membership','business_update','account','pickup_order'));
alter table public.notification_deliveries
  add column order_audience text check (order_audience in ('customer','business')),
  add column order_status text;

create function public.order_notification_preference(p_enabled boolean default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in is required' using errcode='42501'; end if;
  if p_enabled is not null then
    insert into public.notification_preferences(user_id,business_id,notification_type,is_enabled)
      values(auth.uid(),null,'orders',p_enabled)
      on conflict(user_id,business_id,notification_type) do update
        set is_enabled=excluded.is_enabled,updated_at=now();
    if not p_enabled then
      update public.notification_deliveries set status='skipped',last_error='Order push alerts disabled'
        where user_id=auth.uid() and notification_type='orders' and status='queued';
    end if;
  end if;
  return public.notification_enabled(auth.uid(),null,'orders');
end;
$$;
revoke all on function public.order_notification_preference(boolean) from public;
grant execute on function public.order_notification_preference(boolean) to authenticated;

-- Also used by dispatch immediately before sending, so removed staff lose access.
create function public.pickup_notification_access(p_user uuid,p_order uuid,p_audience text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (p_user=(select auth.uid()) or (select auth.role())='service_role')
  and exists(select 1 from public.square_orders o where o.id=p_order and (
    (p_audience='customer' and o.customer_id=p_user) or
    (p_audience='business' and exists(select 1 from public.business_members m
      where m.business_id=o.business_id and m.user_id=p_user and m.is_active and m.role in ('owner','staff')))
  ));
$$;
revoke all on function public.pickup_notification_access(uuid,uuid,text) from public;
grant execute on function public.pickup_notification_access(uuid,uuid,text) to authenticated,service_role;

-- The private predicate never reveals an order; only its recipient can read the row.
drop policy notification_deliveries_owner_read on public.notification_deliveries;
create policy notification_deliveries_owner_read on public.notification_deliveries for select to authenticated
using (user_id=(select auth.uid()) and (entity_type<>'pickup_order' or
  public.pickup_notification_access((select auth.uid()),entity_id,order_audience)));

create function public.queue_pickup_order_notifications()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  heading text;
  message text;
  recipient record;
begin
  if old.status is not distinct from new.status then return new; end if;
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
    else null end;
  if heading is null then return new; end if;
  -- Do not deliver an old "ready" push after the order has moved on. Its inbox
  -- entry remains as history independently of whether a device accepted a push.
  update public.notification_deliveries set status='skipped',last_error='Order status changed',updated_at=now()
    where entity_type='pickup_order' and entity_id=new.id and status='queued';
  message := left(new.business_name,120)||' · Order #'||right(new.id::text,6);
  for recipient in
    select new.customer_id as id,'customer' as audience where new.customer_id is not null
    union all
    select m.user_id,'business' from public.business_members m
      where m.business_id=new.business_id and m.is_active and m.role in ('owner','staff')
        and m.user_id is distinct from new.customer_id
  loop
    insert into public.notification_deliveries(user_id,business_id,notification_type,entity_type,
      entity_id,dedupe_key,title,body,url,expires_at,status,order_audience,order_status)
    values(recipient.id,new.business_id,'orders','pickup_order',new.id,
      'pickup:'||new.id||':'||new.version||':'||recipient.id,
      case when recipient.audience='business' and new.status='placed' then 'New pickup order' else heading end,
      message,
      case when recipient.audience='business' then '/pickup-order?orderId=' else '/order?orderId=' end||new.id,
      now()+interval '1 hour',
      case when public.notification_enabled(recipient.id,new.business_id,'orders') then 'queued' else 'skipped' end,
      recipient.audience,new.status)
    on conflict(dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function public.queue_pickup_order_notifications() from public;
create trigger square_order_notifications after update of status on public.square_orders
for each row execute function public.queue_pickup_order_notifications();

create function public.pickup_notification_sendable(p_delivery uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.notification_deliveries d
    join public.square_orders o on o.id=d.entity_id
    where d.id=p_delivery and d.entity_type='pickup_order' and d.order_status=o.status
      and (d.expires_at is null or d.expires_at>now())
      and public.notification_enabled(d.user_id,d.business_id,'orders')
      and public.pickup_notification_access(d.user_id,o.id,d.order_audience));
$$;
revoke all on function public.pickup_notification_sendable(uuid) from public;
grant execute on function public.pickup_notification_sendable(uuid) to service_role;

create index notification_pickup_inbox on public.notification_deliveries(user_id,created_at desc)
  where entity_type='pickup_order' and dismissed_at is null;

create function public.claim_pickup_notifications(p_limit integer default 25)
returns setof public.notification_deliveries language plpgsql security definer set search_path = '' as $$
begin
  update public.notification_deliveries set status='queued',next_attempt_at=now(),updated_at=now()
    where notification_type='orders' and status='sending' and updated_at<now()-interval '10 minutes';
  update public.notification_deliveries d set status='skipped',last_error='Order changed, expired, or alerts disabled',updated_at=now()
    where notification_type='orders' and status='queued' and
      (attempt_count>=5 or not public.pickup_notification_sendable(d.id));
  return query with picked as (
    select d.id from public.notification_deliveries d
    where d.notification_type='orders' and d.status='queued' and d.deliver_after<=now() and d.next_attempt_at<=now()
    order by d.deliver_after,d.created_at for update skip locked limit least(greatest(p_limit,1),100)
  ) update public.notification_deliveries d set status='sending',attempt_count=d.attempt_count+1,updated_at=now()
    from picked where d.id=picked.id returning d.*;
end;
$$;
revoke all on function public.claim_pickup_notifications(integer) from public;
grant execute on function public.claim_pickup_notifications(integer) to service_role;
notify pgrst,'reload schema';
