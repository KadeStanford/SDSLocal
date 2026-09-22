begin;

alter table public.notification_deliveries
  add column read_at timestamptz,
  add column dismissed_at timestamptz;

create index notification_deliveries_inbox_idx
  on public.notification_deliveries (user_id, created_at desc)
  where status = 'sent' and dismissed_at is null;

create index notification_deliveries_unread_idx
  on public.notification_deliveries (user_id, created_at desc)
  where status = 'sent' and read_at is null and dismissed_at is null;

create policy notification_deliveries_owner_update on public.notification_deliveries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant update (read_at, dismissed_at) on public.notification_deliveries to authenticated;

commit;
