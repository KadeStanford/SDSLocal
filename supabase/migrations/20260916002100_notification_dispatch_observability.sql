begin;

-- Keep a small, service-role-only audit trail for the scheduled dispatcher. This
-- makes missed runs and provider failures visible without exposing delivery
-- internals to customers.
create table if not exists public.notification_dispatch_runs (
  id uuid primary key default gen_random_uuid(),
  trigger_source varchar(32) not null default 'scheduler',
  status varchar(16) not null default 'running',
  claimed_count integer not null default 0,
  sent_count integer not null default 0,
  skipped_count integer not null default 0,
  retried_count integer not null default 0,
  error_message varchar(500),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint notification_dispatch_runs_status check (status in ('running', 'succeeded', 'failed')),
  constraint notification_dispatch_runs_counts check (
    claimed_count >= 0 and sent_count >= 0 and skipped_count >= 0 and retried_count >= 0
  )
);

create index if not exists notification_dispatch_runs_started_idx
  on public.notification_dispatch_runs (started_at desc);

alter table public.notification_dispatch_runs enable row level security;
revoke all on public.notification_dispatch_runs from anon, authenticated;
grant select, insert, update on public.notification_dispatch_runs to service_role;

commit;
