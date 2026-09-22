\set ON_ERROR_STOP on
begin;
create temporary table pickup_fixtures (caller uuid, supported uuid, inactive uuid, excluded uuid, unsupported uuid);
insert into pickup_fixtures select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid();
grant select on pickup_fixtures to anon, authenticated;
do $$
declare f pickup_fixtures; id uuid;
begin
 select * into f from pickup_fixtures;
 insert into auth.users(id,raw_user_meta_data) values(f.caller,'{"display_name":"Local capability fixture"}');
 foreach id in array array[f.supported,f.inactive,f.excluded,f.unsupported] loop
  insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
  values(id,f.caller,'pickup-projection-'||id,'Local pickup fixture','food_drink','active',now());
 end loop;
 update public.businesses b set status='draft' where b.id=f.inactive;
 foreach id in array array[f.supported,f.inactive,f.excluded] loop
  insert into public.square_connections(business_id,merchant_id,merchant_name,location_id,key_version,expires_at,state)
  values(id,'fixture-'||id,'Local fixture','location-'||id,'v1',now()+interval '1 day','connected');
  insert into public.square_ordering_settings(business_id,enabled,is_open,synced_at,sync_summary)
  values(id,true,true,now(),'{"variations":4}');
  insert into public.ordering_provider_selections(business_id,provider)
  values(id,'square');
 end loop;
 update public.platform_settings set value=jsonb_build_object('enabled',true,'public_environment','staging','business_ids',jsonb_build_array(f.supported,f.inactive,f.unsupported)) where key='square_commerce';
 if not has_function_privilege('anon','public.get_pickup_capabilities(uuid[])','EXECUTE') or not has_function_privilege('authenticated','public.get_pickup_capabilities(uuid[])','EXECUTE') then raise exception 'Public capability grant missing'; end if;
 if exists(select 1 from pg_proc p, lateral aclexplode(p.proacl) a where p.oid='public.get_pickup_capabilities(uuid[])'::regprocedure and a.grantee=0) then raise exception 'PUBLIC execute not revoked'; end if;
 if not exists(select 1 from pg_proc where oid='public.get_pickup_capabilities(uuid[])'::regprocedure and prosecdef and proconfig @> array['search_path=""']) then raise exception 'Unpinned function security'; end if;
 if has_table_privilege('anon','public.square_connections','SELECT') or has_table_privilege('authenticated','public.square_ordering_settings','SELECT') then raise exception 'Private table grants exposed'; end if;
end $$;
set local role anon;
do $$
declare result jsonb; f pickup_fixtures;
begin
 select * into f from pickup_fixtures;
 select jsonb_agg(to_jsonb(c)) into result from public.get_pickup_capabilities(null) c;
 if result <> jsonb_build_array(jsonb_build_object('business_id',f.supported,'supports_pickup_ordering',true)) then raise exception 'Unsafe public shape or unsupported leak: %',result; end if;
 if exists(select 1 from public.get_pickup_capabilities(array[f.excluded,f.inactive,f.unsupported])) then raise exception 'Hidden business leaked'; end if;
 if exists(select 1 from public.get_pickup_capabilities(array[]::uuid[])) then raise exception 'Empty filter returned data'; end if;
end $$;
reset role;
update public.square_ordering_settings set is_open=false where business_id=(select supported from pickup_fixtures);
set local role anon;
do $$ begin if not exists(select 1 from public.get_pickup_capabilities(array[(select supported from pickup_fixtures)])) then raise exception 'Closed business stopped being discoverable'; end if; end $$;
reset role;
insert into public.blocked_businesses(customer_id,business_id) select caller,supported from pickup_fixtures;
select set_config('request.jwt.claim.sub',(select caller::text from pickup_fixtures),true);
set local role authenticated;
do $$ begin if exists(select 1 from public.get_pickup_capabilities(null)) then raise exception 'Blocked business leaked'; end if; end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
delete from public.blocked_businesses where customer_id=(select caller from pickup_fixtures);
do $$
declare env text; id uuid := (select supported from pickup_fixtures);
begin
 foreach env in array array['production','disabled',''] loop
  update public.platform_settings set value=jsonb_set(value,'{public_environment}',to_jsonb(env)) where key='square_commerce';
  if exists(select 1 from public.get_pickup_capabilities(array[id])) then raise exception 'Production/default exposure'; end if;
 end loop;
 update public.platform_settings set value=jsonb_set(value,'{public_environment}','"staging"') where key='square_commerce';
 update public.square_ordering_settings set sync_summary='{"variations":0}' where business_id=id;
 if exists(select 1 from public.get_pickup_capabilities(array[id])) then raise exception 'Zero catalog exposed'; end if;
 update public.square_ordering_settings set sync_summary='{"variations":4}',enabled=false where business_id=id;
 if exists(select 1 from public.get_pickup_capabilities(array[id])) then raise exception 'Disabled setup exposed'; end if;
 update public.square_ordering_settings set enabled=true where business_id=id;
 update public.square_connections set state='disconnected' where business_id=id;
 if exists(select 1 from public.get_pickup_capabilities(array[id])) then raise exception 'Disconnected setup exposed'; end if;
end $$;
rollback;
