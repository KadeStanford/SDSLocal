begin;

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
  select reports.report_id, reports.review_id, reports.business_name::text, reports.rating,
    reports.review_text::text, reports.merchant_response::text, reports.reason::text,
    reports.details::text, reports.status::text, reports.created_at, reports.resolution_note::text
  from reports
  order by case when reports.status = 'open' then 0 else 1 end, reports.created_at desc
  limit 500;
end;
$$;
revoke all on function public.list_pickup_review_reports() from public, anon;
grant execute on function public.list_pickup_review_reports() to authenticated;


commit;
