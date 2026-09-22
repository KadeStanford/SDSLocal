begin;

-- The admin console reads this one server-validated snapshot instead of
-- granting the browser broad read access to profiles, reports, or operations
-- tables. It is intentionally read-only; provider billing metrics are kept
-- outside the database and are shown as disconnected until a trusted usage
-- source is configured.
create or replace function public.get_platform_admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'generated_at', now(),
    'counts', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'businesses', (select count(*) from public.businesses),
      'active_businesses', (select count(*) from public.businesses where status = 'active'),
      'pending_businesses', (select count(*) from public.businesses where status = 'pending_review'),
      'suspended_businesses', (select count(*) from public.businesses where status = 'suspended'),
      'active_memberships', (select count(*) from public.business_members where is_active),
      'upcoming_events', (select count(*) from public.events where starts_at >= now() and archived_at is null),
      'active_loyalty_memberships', (select count(*) from public.loyalty_memberships where is_active),
      'loyalty_transactions_30d', (
        select count(*)
        from public.loyalty_transactions
        where created_at >= now() - interval '30 days'
      ),
      'scan_attempts_24h', (
        select count(*)
        from public.loyalty_scan_attempts
        where created_at >= now() - interval '24 hours'
      )
    ),
    'moderation', jsonb_build_object(
      'open_reports', (select count(*) from public.content_reports where status in ('open', 'reviewing')),
      'pending_businesses', (select count(*) from public.businesses where status = 'pending_review')
    ),
    'operations', jsonb_build_object(
      'queued_notifications', (
        select count(*)
        from public.notification_deliveries
        where status in ('queued', 'sending')
      ),
      'failed_notifications', (
        select count(*)
        from public.notification_deliveries
        where status = 'failed'
      ),
      'media_processing', (select count(*) from public.media_assets where status = 'processing'),
      'media_pending_delete', (select count(*) from public.media_assets where status = 'pending_delete'),
      'analytics_events_24h', (
        select count(*)
        from public.analytics_recent_events
        where occurred_at >= now() - interval '24 hours'
      ),
      'database_bytes', pg_database_size(current_database()),
      'media_bytes', coalesce((select sum(byte_size) from public.media_assets), 0)
    )
  );
end;
$$;

revoke all on function public.get_platform_admin_overview() from public;
grant execute on function public.get_platform_admin_overview() to authenticated;

create table public.platform_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action varchar(80) not null,
  target_type varchar(40),
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint platform_admin_audit_action_length check (char_length(action) between 1 and 80)
);

create index platform_admin_audit_created_idx
  on public.platform_admin_audit_log (created_at desc);

alter table public.platform_admin_audit_log enable row level security;

create policy platform_admin_audit_admin_read
on public.platform_admin_audit_log for select to authenticated
using (public.is_platform_admin());

create or replace function public.list_platform_admin_audit(p_limit integer default 20)
returns table (
  id bigint,
  action varchar,
  target_type varchar,
  target_id uuid,
  details jsonb,
  actor_name varchar,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select
    entry.id,
    entry.action,
    entry.target_type,
    entry.target_id,
    entry.details,
    coalesce(profile.display_name, 'Administrator')::varchar,
    entry.created_at
  from public.platform_admin_audit_log entry
  left join public.profiles profile on profile.id = entry.actor_id
  order by entry.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

revoke all on function public.list_platform_admin_audit(integer) from public;
grant execute on function public.list_platform_admin_audit(integer) to authenticated;

create or replace function public.list_platform_reports(p_status public.report_status default null)
returns table (
  id uuid,
  target_type public.report_target_type,
  target_id uuid,
  target_label varchar,
  reason varchar,
  details varchar,
  status public.report_status,
  resolution_note varchar,
  reporter_name varchar,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return query
  select
    report.id,
    report.target_type,
    coalesce(report.business_id, report.event_id, report.offering_item_id),
    coalesce(business.name, event.title, offering.name)::varchar,
    report.reason,
    report.details,
    report.status,
    report.resolution_note,
    coalesce(reporter.display_name, 'Customer')::varchar,
    report.created_at,
    report.updated_at
  from public.content_reports report
  left join public.businesses business on business.id = report.business_id
  left join public.events event on event.id = report.event_id
  left join public.offering_items offering on offering.id = report.offering_item_id
  left join public.profiles reporter on reporter.id = report.reporter_id
  where p_status is null or report.status = p_status
  order by report.created_at desc
  limit 100;
end;
$$;

revoke all on function public.list_platform_reports(public.report_status) from public;
grant execute on function public.list_platform_reports(public.report_status) to authenticated;

create or replace function public.resolve_platform_report(
  p_report_id uuid,
  p_status public.report_status,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_note text := nullif(left(trim(coalesce(p_resolution_note, '')), 1000), '');
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_status not in ('resolved', 'dismissed') then
    raise exception 'Reports can only be resolved or dismissed' using errcode = '22023';
  end if;

  update public.content_reports
  set status = p_status,
      resolution_note = normalized_note,
      updated_at = now()
  where id = p_report_id;

  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;

  insert into public.platform_admin_audit_log (actor_id, action, target_type, target_id, details)
  values (
    (select auth.uid()),
    case when p_status = 'resolved' then 'resolve_report' else 'dismiss_report' end,
    'content_report',
    p_report_id,
    jsonb_build_object('resolution_note', normalized_note)
  );
end;
$$;

revoke all on function public.resolve_platform_report(uuid, public.report_status, text) from public;
grant execute on function public.resolve_platform_report(uuid, public.report_status, text) to authenticated;

commit;
