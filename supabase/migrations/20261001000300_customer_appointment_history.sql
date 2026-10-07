begin;
-- Return only the authenticated customer's summary, not payment/provider or guest secrets.
create or replace function public.get_customer_appointments()
returns table(id uuid, business_id uuid, business_name text, service_name text,
  starts_at timestamptz, ends_at timestamptz, timezone text, status text, payment_status text)
language sql stable security definer set search_path = '' as $$
  select a.id, a.business_id, coalesce(b.name, 'Business unavailable')::text,
    coalesce(a.service_snapshot->>'name', 'Appointment'), a.starts_at, a.ends_at,
    a.timezone, a.status, a.payment_status
  from public.appointments a left join public.businesses b on b.id = a.business_id
  where a.customer_id = auth.uid() and auth.uid() is not null
  order by a.starts_at desc;
$$;
revoke all on function public.get_customer_appointments() from public, anon;
grant execute on function public.get_customer_appointments() to authenticated;
commit;
