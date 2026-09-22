begin;

-- Queue summaries are local aggregates, never per-order Square requests.
create index if not exists square_orders_history
  on public.square_orders (business_id, created_at desc, id)
  where status in ('completed','checkout_expired','checkout_failed','refunded');
create index if not exists square_order_items_order on public.square_order_items(order_id);
create index if not exists square_order_events_order_time on public.square_order_events(order_id,created_at);

create or replace function public.square_queue_counts(p_business_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', count(*) filter(where status in ('placed','accepted','preparing','payment_review','refund_pending','refund_failed')),
    'placed', count(*) filter(where status='placed'),
    'preparing', count(*) filter(where status in ('accepted','preparing')),
    'ready', count(*) filter(where status='ready'),
    'attention', count(*) filter(where status in ('payment_review','refund_pending','refund_failed'))
  ) from public.square_orders where business_id=p_business_id
    and status in ('placed','accepted','preparing','ready','payment_review','refund_pending','refund_failed');
$$;
revoke all on function public.square_queue_counts(uuid) from public, anon, authenticated;
grant execute on function public.square_queue_counts(uuid) to service_role;
create or replace function public.square_operator_businesses(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'name', b.name, 'primaryColor', b.primary_color, 'timezone', s.timezone,
    'phone', b.phone, 'logoPath', (select a.storage_path from public.business_photos p
      join public.media_assets a on a.id=p.media_asset_id
      where p.business_id=b.id and p.role='logo' and a.status='ready' limit 1),
    'canRefund', m.role='owner', 'isOpen', s.is_open,
    'counts', public.square_queue_counts(b.id)
  ) order by b.name,b.id), '[]'::jsonb)
  from public.business_members m join public.businesses b on b.id=m.business_id
  join public.square_ordering_settings s on s.business_id=b.id
  where m.user_id=p_user_id and m.is_active and m.role in ('owner','staff')
    and s.enabled and s.synced_at is not null;
$$;
revoke all on function public.square_operator_businesses(uuid) from public, anon, authenticated;
grant execute on function public.square_operator_businesses(uuid) to service_role;
-- Safe branding projection in the authorized Edge service.
grant select on public.business_photos, public.media_assets to service_role;
create or replace function public.get_pickup_status(p_business_ids uuid[] default null)
returns table(business_id uuid, supports_pickup_ordering boolean, pickup_status text)
language sql stable security definer set search_path = '' as $$
  select c.business_id,c.supports_pickup_ordering,
    case when s.is_open then 'accepting' else 'paused' end
  from public.get_pickup_capabilities(p_business_ids) c
  join public.square_ordering_settings s on s.business_id=c.business_id;
$$;
revoke all on function public.get_pickup_status(uuid[]) from public;
grant execute on function public.get_pickup_status(uuid[]) to anon,authenticated,service_role;

commit;
notify pgrst, 'reload schema';
