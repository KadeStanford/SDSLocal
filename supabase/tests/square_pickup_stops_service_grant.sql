-- Read-only, rolled-back verification. Never exposes a stop, order or credential.
begin;
do $$
begin
  if not has_table_privilege('service_role','public.business_location_stops','SELECT') then
    raise exception 'Square service role cannot read pickup stops';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.business_location_stops'::regclass) then
    raise exception 'Stop RLS must remain enabled';
  end if;
  if has_table_privilege('anon','public.square_ordering_settings','SELECT')
     or has_table_privilege('authenticated','public.square_ordering_settings','SELECT')
     or has_table_privilege('anon','public.square_connections','SELECT')
     or has_table_privilege('authenticated','public.square_connections','SELECT') then
    raise exception 'Private Square tables became client-readable';
  end if;
end $$;
set local role service_role;
do $$
begin
  -- Parse and execute the actual projected availability read under its real role.
  perform id,title,address_text,starts_at,ends_at,is_published
    from public.business_location_stops
    where business_id='11111111-1111-4111-8111-111111111111'::uuid
      and is_published=true and ends_at>now()
    order by starts_at limit 100;
end $$;
reset role;
rollback;
