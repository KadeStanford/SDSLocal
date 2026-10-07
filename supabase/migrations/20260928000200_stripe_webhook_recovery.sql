begin;
alter table public.stripe_account_states add column authorization_started_at timestamptz;
create table public.stripe_webhook_inbox (
  event_id text primary key check (length(event_id) between 1 and 200),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  lease_id uuid,
  lease_until timestamptz,
  last_attempt_at timestamptz,
  attempts integer not null default 0,
  last_error text
);
alter table public.stripe_webhook_inbox enable row level security;
revoke all on public.stripe_webhook_inbox from public,anon,authenticated;
grant all on public.stripe_webhook_inbox to service_role;
create index stripe_webhook_retry on public.stripe_webhook_inbox(last_attempt_at) where processed_at is null;
create function public.stripe_webhook_claim(p_id text,p_lease uuid) returns setof public.stripe_webhook_inbox
language sql security definer set search_path = '' as $$
  update public.stripe_webhook_inbox set lease_id = p_lease,lease_until = now() + interval '90 seconds',
    last_attempt_at = now(),attempts = attempts + 1
  where event_id = p_id and processed_at is null and (lease_until is null or lease_until < now()) returning *;
$$;
revoke all on function public.stripe_webhook_claim(text,uuid) from public,anon,authenticated;
grant execute on function public.stripe_webhook_claim(text,uuid) to service_role;
-- Closed disputes must not block seller cleanup or consume booking capacity.
do $$ declare fn record; definition text; begin
  for fn in select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('square_business_deletion_guard','square_customer_anonymize','square_reserve_order','get_pickup_queue_counts') loop
    definition := pg_get_functiondef(fn.oid);
    definition := replace(definition,$old$'completed','refunded','checkout_expired','checkout_failed'$old$,$new$'completed','refunded','checkout_expired','checkout_failed','dispute_lost'$new$);
    execute definition;
  end loop;
end $$;
notify pgrst,'reload schema';
commit;
