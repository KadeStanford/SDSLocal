begin;
-- Orders are private, service-role only. Save selection and refund intent in one
-- leased update, before contacting either provider. No client amount is trusted.
alter table public.square_orders add column item_refunds jsonb not null default '[]'::jsonb
  check (jsonb_typeof(item_refunds) = 'array');
create function public.settle_pickup_item_refund() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.refund_key is not null and new.status <> 'refund_pending' then
    new.item_refunds := coalesce((select jsonb_agg(case
      when entry->>'key' = new.refund_key::text and entry->>'state' = 'pending' then
        entry || jsonb_build_object('state', case
          when new.status = 'refund_failed' then 'failed'
          when new.refunded_minor >= (entry->>'before')::bigint + (entry->>'amount')::bigint then 'completed'
          else 'pending' end)
      else entry end) from jsonb_array_elements(new.item_refunds) entry), '[]'::jsonb);
  end if;
  return new;
end;
$$;
create trigger settle_pickup_item_refund before update on public.square_orders
for each row execute function public.settle_pickup_item_refund();
revoke all on function public.settle_pickup_item_refund() from public, anon, authenticated;
create or replace function public.square_queue_counts(p_business_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'active', count(*) filter(where status in ('placed','accepted','preparing','payment_review','refund_pending','refund_failed')),
    'placed', count(*) filter(where status='placed'),
    'preparing', count(*) filter(where status in ('accepted','preparing')),
    'ready', count(*) filter(where status='ready'),
    'attention', count(*) filter(where status in ('payment_review','refund_pending','refund_failed')),
    'requests', (select count(*) from public.square_order_support_requests r where r.business_id=p_business_id and r.status='open')
  ) from public.square_orders where business_id=p_business_id;
$$;
revoke all on function public.square_queue_counts(uuid) from public, anon, authenticated;
grant execute on function public.square_queue_counts(uuid) to service_role;
commit;
notify pgrst, 'reload schema';
