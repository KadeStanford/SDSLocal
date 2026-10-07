\set ON_ERROR_STOP on
begin;

create temporary table provider_fixtures (
  owner_id uuid,
  square_only uuid,
  stripe_only uuid,
  dual_provider uuid,
  missing_menu uuid,
  pending_account uuid,
  disconnected uuid
);
insert into provider_fixtures
select gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),
  gen_random_uuid(),gen_random_uuid(),gen_random_uuid();

do $$
declare f provider_fixtures; business_id uuid; account_counter integer := 0;
begin
  select * into f from provider_fixtures;
  insert into auth.users(id,raw_user_meta_data)
    values(f.owner_id,'{"display_name":"Provider separation owner"}');
  foreach business_id in array array[
    f.square_only,f.stripe_only,f.dual_provider,f.missing_menu,f.pending_account,f.disconnected
  ] loop
    insert into public.businesses(id,created_by,slug,name,business_type,status,approved_at)
      values(business_id,f.owner_id,'provider-'||business_id,'Provider fixture',
        'food_drink','active',now());
    insert into public.business_members(business_id,user_id,role)
      values(business_id,f.owner_id,'owner');
  end loop;

  foreach business_id in array array[f.square_only,f.dual_provider] loop
    insert into public.square_connections(
      business_id,merchant_id,merchant_name,location_id,location_snapshot,
      key_version,expires_at,state
    ) values(
      business_id,'sq-'||business_id,'Square fixture','loc-'||business_id,
      '{"address":"Fixture","timezone":"America/Chicago","currency":"USD"}',
      'v1',now()+interval '1 day','connected'
    );
    insert into public.square_ordering_settings(
      business_id,enabled,is_open,synced_at,sync_summary
    ) values(business_id,true,true,now(),'{"variations":3}');
  end loop;

  foreach business_id in array array[
    f.stripe_only,f.dual_provider,f.missing_menu,f.pending_account,f.disconnected
  ] loop
    account_counter := account_counter + 1;
    insert into public.stripe_account_states(
      business_id,account_id,state,details_submitted,charges_enabled,payouts_enabled
    ) values(
      business_id,'acct_providerfixture'||account_counter,
      case when business_id=f.pending_account then 'pending'
           when business_id=f.disconnected then 'revoked' else 'connected' end,
      business_id<>f.pending_account,business_id<>f.pending_account and business_id<>f.disconnected,
      business_id<>f.pending_account and business_id<>f.disconnected
    );
    insert into public.stripe_ordering_settings(
      business_id,enabled,is_open,synced_at,sync_summary
    ) values(
      business_id,true,true,
      case when business_id=f.missing_menu then null else now() end,
      case when business_id=f.missing_menu then '{"provider":"stripe","variations":0}'::jsonb
           else '{"provider":"stripe","variations":5}'::jsonb end
    );
  end loop;

  insert into public.ordering_provider_selections(business_id,provider) values
    (f.square_only,'square'),(f.stripe_only,'stripe'),(f.dual_provider,'square'),
    (f.missing_menu,'stripe'),(f.pending_account,'stripe'),(f.disconnected,'stripe');

  update public.platform_settings set value=jsonb_build_object(
    'enabled',true,'public_environment','staging','business_ids',jsonb_build_array(
      f.square_only,f.stripe_only,f.dual_provider,f.missing_menu,f.pending_account,f.disconnected
    )) where key='square_commerce';
  update public.platform_settings set value=jsonb_build_object(
    'enabled',true,'environment','test','business_ids',jsonb_build_array(
      f.square_only,f.stripe_only,f.dual_provider,f.missing_menu,f.pending_account,f.disconnected
    )) where key='stripe_commerce';
end $$;

do $$
declare f provider_fixtures; visible uuid[]; status text;
begin
  select * into f from provider_fixtures;
  select array_agg(business_id order by business_id) into visible
    from public.get_pickup_capabilities(null);
  if not visible @> array[f.square_only,f.stripe_only,f.dual_provider]
    or visible && array[f.missing_menu,f.pending_account,f.disconnected]
    then raise exception 'Provider-aware capability projection is incorrect: %',visible; end if;

  -- Both connections coexist, but only the selected provider controls public state.
  update public.square_ordering_settings set enabled=false where business_id=f.dual_provider;
  if exists(select 1 from public.get_pickup_capabilities(array[f.dual_provider]))
    then raise exception 'Inactive Stripe incorrectly overrode selected Square'; end if;
  update public.ordering_provider_selections set provider='stripe' where business_id=f.dual_provider;
  if not exists(select 1 from public.get_pickup_capabilities(array[f.dual_provider]))
    then raise exception 'Selected Stripe did not independently enable ordering'; end if;
  update public.square_ordering_settings set enabled=true where business_id=f.dual_provider;
  update public.stripe_ordering_settings set enabled=false where business_id=f.dual_provider;
  if exists(select 1 from public.get_pickup_capabilities(array[f.dual_provider]))
    then raise exception 'Inactive Square incorrectly overrode selected Stripe'; end if;

  update public.stripe_ordering_settings set enabled=true,is_open=false where business_id=f.dual_provider;
  select pickup_status into status from public.get_pickup_status(array[f.dual_provider]);
  if status <> 'paused' then raise exception 'Enabled versus open state was conflated: %',status; end if;
  if not exists(select 1 from public.get_pickup_capabilities(array[f.dual_provider]))
    then raise exception 'Paused business disappeared from discovery'; end if;
  update public.stripe_ordering_settings set is_open=true where business_id=f.dual_provider;
  select pickup_status into status from public.get_pickup_status(array[f.dual_provider]);
  if status <> 'accepting' then raise exception 'Accepting status was not projected: %',status; end if;

  -- The list and single-business reads use the same provider-aware projection.
  if (select count(*) from public.get_pickup_status(null) where business_id=f.dual_provider) <> 1
    or (select count(*) from public.get_pickup_status(array[f.dual_provider])) <> 1
    then raise exception 'Discover/business-page capability parity failed'; end if;

  if exists(select 1 from public.square_connections where business_id=f.stripe_only)
    then raise exception 'Stripe-only business masquerades as Square'; end if;
  if exists(select 1 from public.square_ordering_settings where business_id=f.stripe_only)
    then raise exception 'Stripe-only settings leaked into Square'; end if;
end $$;

rollback;
