begin;
create or replace function public.get_pickup_capabilities(p_business_ids uuid[] default null)
returns table (business_id uuid, supports_pickup_ordering boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_business_ids is not null and cardinality(p_business_ids) > 500 then raise exception 'Request at most 500 businesses at a time'; end if;
  return query
    select b.id, true
      from public.businesses b
      join public.square_connections c on c.business_id = b.id
      join public.square_ordering_settings s on s.business_id = b.id
      join public.platform_settings flag on flag.key = case when c.provider = 'stripe' then 'stripe_commerce' else 'square_commerce' end
     where b.status = 'active'
       and (p_business_ids is null or b.id = any(p_business_ids))
       and flag.value->'enabled' = 'true'::jsonb
       and coalesce(flag.value->>'public_environment', flag.value->>'environment') in ('development','staging','test')
       and (flag.value->'business_ids') ? b.id::text
       and c.environment = 'sandbox'
       and c.state = 'connected'
       and c.location_id is not null
       and s.provider = c.provider
       and s.enabled
       and s.synced_at is not null
       and case when jsonb_typeof(s.sync_summary->'variations') = 'number' then (s.sync_summary->>'variations')::numeric > 0 else false end
       and not exists (select 1 from public.blocked_businesses blocked where blocked.business_id = b.id and blocked.customer_id = (select auth.uid()))
     order by b.id limit 1000;
end;
$$;
revoke all on function public.get_pickup_capabilities(uuid[]) from public;
grant execute on function public.get_pickup_capabilities(uuid[]) to anon, authenticated, service_role;
commit;
notify pgrst, 'reload schema';
