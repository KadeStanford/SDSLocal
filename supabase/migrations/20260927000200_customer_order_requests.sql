begin;

create table public.square_order_support_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.square_orders(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.profiles(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  request_type text not null check (request_type in ('cancel','change','issue')),
  message varchar(1500) not null check (char_length(trim(message)) between 10 and 1500),
  response varchar(1500) check (response is null or char_length(trim(response)) between 3 and 1500),
  status text not null default 'open' check (status in ('open','resolved','declined')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index square_order_support_one_open_request
  on public.square_order_support_requests(order_id) where status = 'open';
create index square_order_support_business_queue
  on public.square_order_support_requests(business_id, status, created_at desc);
create trigger square_order_support_set_updated_at
before update on public.square_order_support_requests
for each row execute function public.set_updated_at();

alter table public.square_order_support_requests enable row level security;
revoke all on public.square_order_support_requests from public, anon, authenticated;
grant all on public.square_order_support_requests to service_role;

create function public.notify_order_support_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.square_orders%rowtype;
  recipient record;
  request_label text;
begin
  select * into order_row from public.square_orders where id = new.order_id;
  if not found then return new; end if;
  request_label := case new.request_type
    when 'cancel' then 'cancellation'
    when 'change' then 'change'
    else 'help' end;

  for recipient in
    select member.user_id from public.business_members member
    where member.business_id = new.business_id and member.is_active
      and member.role in ('owner','staff')
      and member.user_id is distinct from new.customer_id
  loop
    insert into public.notification_deliveries (
      user_id, business_id, notification_type, entity_type, entity_id,
      dedupe_key, title, body, url, expires_at, status, order_audience, order_status
    ) values (
      recipient.user_id, new.business_id, 'orders', 'pickup_order', new.order_id,
      'order-support:' || new.id || ':' || recipient.user_id,
      'Customer requested order help',
      order_row.business_name || ' · A customer requested a ' || request_label || '.',
      '/pickup-order?orderId=' || new.order_id,
      now() + interval '1 day',
      case when public.notification_enabled(recipient.user_id, new.business_id, 'orders')
        then 'queued' else 'skipped' end,
      'business', order_row.status
    ) on conflict (dedupe_key) do nothing;
  end loop;
  return new;
end;
$$;
revoke all on function public.notify_order_support_request() from public;
create trigger square_order_support_notify
after insert on public.square_order_support_requests
for each row execute function public.notify_order_support_request();

commit;
notify pgrst, 'reload schema';
