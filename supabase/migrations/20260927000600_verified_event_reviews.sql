begin;

create table public.verified_event_reviews (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  rsvp_id uuid not null unique references public.event_rsvps(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  customer_id uuid references auth.users(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  review_text varchar(1200) not null default '' check (char_length(trim(review_text)) <= 1200),
  merchant_response varchar(1500) check (
    merchant_response is null or char_length(trim(merchant_response)) between 3 and 1500
  ),
  responded_by uuid references auth.users(id) on delete set null,
  responded_at timestamptz,
  moderation_status text not null default 'published'
    check (moderation_status in ('published','hidden','removed')),
  moderated_by uuid references auth.users(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, customer_id)
);
create index verified_event_reviews_business_public
  on public.verified_event_reviews(business_id, created_at desc)
  where moderation_status = 'published';
create trigger verified_event_reviews_set_updated_at
before update on public.verified_event_reviews
for each row execute function public.set_updated_at();

alter table public.verified_event_reviews enable row level security;
revoke all on public.verified_event_reviews from public, anon, authenticated;
grant all on public.verified_event_reviews to service_role;
grant select (id, event_id, business_id, rating, review_text, merchant_response, created_at)
  on public.verified_event_reviews to anon, authenticated;
create policy verified_event_reviews_public_read
on public.verified_event_reviews for select to anon, authenticated
using (
  moderation_status = 'published'
  and exists (
    select 1 from public.businesses business
    where business.id = verified_event_reviews.business_id and business.status = 'active'
  )
);
create policy verified_event_reviews_customer_read
on public.verified_event_reviews for select to authenticated
using (customer_id = (select auth.uid()));

create table public.verified_event_review_reports (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.verified_event_reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spam','abusive','private_information','inaccurate','other')),
  details varchar(500) check (details is null or char_length(trim(details)) between 5 and 500),
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolution_note varchar(1000),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  unique (review_id, reporter_id)
);
create index verified_event_review_reports_queue
  on public.verified_event_review_reports(status, created_at desc) where status = 'open';
alter table public.verified_event_review_reports enable row level security;
revoke all on public.verified_event_review_reports from public, anon, authenticated;
grant all on public.verified_event_review_reports to service_role;

create table public.verified_event_review_events (
  id bigint generated always as identity primary key,
  review_id uuid references public.verified_event_reviews(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created','merchant_reply','moderated','reported')),
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index verified_event_review_events_review
  on public.verified_event_review_events(review_id, created_at);
alter table public.verified_event_review_events enable row level security;
revoke all on public.verified_event_review_events from public, anon, authenticated;
grant all on public.verified_event_review_events to service_role;

create or replace function public.pickup_order_review_summary(p_business_id uuid)
returns table(review_count bigint, average_rating numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with verified_reviews as (
    select review.rating from public.pickup_order_reviews review
    where review.business_id = p_business_id and review.moderation_status = 'published'
    union all
    select review.rating from public.verified_event_reviews review
    where review.business_id = p_business_id and review.moderation_status = 'published'
  )
  select count(*)::bigint, coalesce(round(avg(rating), 1), 0::numeric)
  from verified_reviews
  where exists (
    select 1 from public.businesses business
    where business.id = p_business_id and business.status = 'active'
  );
$$;
revoke all on function public.pickup_order_review_summary(uuid) from public;
grant execute on function public.pickup_order_review_summary(uuid) to anon, authenticated;

create or replace function public.report_verified_event_review(
  p_review_id uuid,
  p_reason text,
  p_details text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  review_row public.verified_event_reviews%rowtype;
  added integer;
  details_value text := nullif(trim(coalesce(p_details, '')), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to report a review' using errcode = '42501';
  end if;
  if p_reason is null or p_reason not in ('spam','abusive','private_information','inaccurate','other') then
    raise exception 'Choose a report reason' using errcode = '22023';
  end if;
  if details_value is not null and (char_length(details_value) < 5 or char_length(details_value) > 500) then
    raise exception 'Report details must be between 5 and 500 characters' using errcode = '22023';
  end if;
  select * into review_row from public.verified_event_reviews where id = p_review_id;
  if not found or review_row.moderation_status <> 'published' then
    raise exception 'Review is not available' using errcode = 'P0002';
  end if;
  if review_row.customer_id = (select auth.uid()) then
    raise exception 'You cannot report your own review' using errcode = '42501';
  end if;
  insert into public.verified_event_review_reports(review_id, reporter_id, reason, details)
    values(p_review_id, (select auth.uid()), p_reason, details_value)
    on conflict(review_id, reporter_id) do nothing;
  get diagnostics added = row_count;
  if added > 0 then
    insert into public.verified_event_review_events(review_id, event_id, actor_id, event_type, event_data)
      values(review_row.id, review_row.event_id, (select auth.uid()), 'reported',
        jsonb_build_object('reason', p_reason));
  end if;
  return added > 0;
end;
$$;
revoke all on function public.report_verified_event_review(uuid, text, text) from public;
grant execute on function public.report_verified_event_review(uuid, text, text) to authenticated;

create or replace function public.list_pickup_review_reports()
returns table (
  report_id uuid,
  review_id uuid,
  business_name text,
  rating smallint,
  review_text text,
  merchant_response text,
  reason text,
  details text,
  status text,
  created_at timestamptz,
  resolution_note text
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
  with reports as (
    select report.id as report_id, review.id as review_id,
      coalesce(business.name, 'Deleted business') as business_name,
      review.rating, review.review_text, review.merchant_response,
      report.reason, report.details, report.status, report.created_at, report.resolution_note
    from public.pickup_order_review_reports report
    join public.pickup_order_reviews review on review.id = report.review_id
    left join public.businesses business on business.id = review.business_id
    union all
    select report.id, review.id, coalesce(business.name, 'Deleted business'),
      review.rating, review.review_text, review.merchant_response,
      report.reason, report.details, report.status, report.created_at, report.resolution_note
    from public.verified_event_review_reports report
    join public.verified_event_reviews review on review.id = report.review_id
    left join public.businesses business on business.id = review.business_id
  )
  select reports.* from reports
  order by case when reports.status = 'open' then 0 else 1 end, reports.created_at desc
  limit 500;
end;
$$;
revoke all on function public.list_pickup_review_reports() from public;
grant execute on function public.list_pickup_review_reports() to authenticated;

create or replace function public.resolve_pickup_review_report(
  p_report_id uuid,
  p_action text,
  p_resolution_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_report public.pickup_order_review_reports%rowtype;
  order_review public.pickup_order_reviews%rowtype;
  event_report public.verified_event_review_reports%rowtype;
  event_review public.verified_event_reviews%rowtype;
  next_status text;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('hide','restore','remove','dismiss') then
    raise exception 'Choose a supported moderation action' using errcode = '22023';
  end if;

  select * into order_report from public.pickup_order_review_reports
    where id = p_report_id for update;
  if found then
    select * into order_review from public.pickup_order_reviews
      where id = order_report.review_id for update;
    if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
    next_status := case p_action when 'hide' then 'hidden' when 'remove' then 'removed'
      when 'restore' then 'published' else order_review.moderation_status end;
    if p_action <> 'dismiss' then
      update public.pickup_order_reviews set moderation_status = next_status,
        moderated_by = (select auth.uid()), moderated_at = now() where id = order_review.id;
      insert into public.pickup_order_review_events(review_id, order_id, actor_id, event_type, event_data)
        values(order_review.id, order_review.order_id, (select auth.uid()), 'moderated',
          jsonb_build_object('action', p_action));
    end if;
    update public.pickup_order_review_reports set
      status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
      resolution_note = nullif(left(trim(coalesce(p_resolution_note, '')), 1000), ''),
      resolved_at = now(), resolved_by = (select auth.uid()) where id = p_report_id;
    return;
  end if;

  select * into event_report from public.verified_event_review_reports
    where id = p_report_id for update;
  if not found then raise exception 'Review report not found' using errcode = 'P0002'; end if;
  select * into event_review from public.verified_event_reviews
    where id = event_report.review_id for update;
  if not found then raise exception 'Review not found' using errcode = 'P0002'; end if;
  next_status := case p_action when 'hide' then 'hidden' when 'remove' then 'removed'
    when 'restore' then 'published' else event_review.moderation_status end;
  if p_action <> 'dismiss' then
    update public.verified_event_reviews set moderation_status = next_status,
      moderated_by = (select auth.uid()), moderated_at = now() where id = event_review.id;
    insert into public.verified_event_review_events(review_id, event_id, actor_id, event_type, event_data)
      values(event_review.id, event_review.event_id, (select auth.uid()), 'moderated',
        jsonb_build_object('action', p_action));
  end if;
  update public.verified_event_review_reports set
    status = case when p_action = 'dismiss' then 'dismissed' else 'resolved' end,
    resolution_note = nullif(left(trim(coalesce(p_resolution_note, '')), 1000), ''),
    resolved_at = now(), resolved_by = (select auth.uid()) where id = p_report_id;
end;
$$;
revoke all on function public.resolve_pickup_review_report(uuid, text, text) from public;
grant execute on function public.resolve_pickup_review_report(uuid, text, text) to authenticated;

commit;
notify pgrst, 'reload schema';
