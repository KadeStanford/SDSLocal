-- Run with the migration in a transaction and roll back; no email or fixtures persist.
begin;
\ir fixtures/business.sql
do $$
declare
  owner_id uuid;
  business_id uuid;
  result jsonb;
begin
  select fixture.owner_id into strict owner_id from database_test_fixture fixture;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  for business_id in select member.business_id from public.business_members member
    where member.user_id = owner_id and member.role = 'owner' and member.is_active
  loop
    result := public.get_business_reviews(business_id);
    if jsonb_typeof(result->'reviews') <> 'array' then raise exception 'Review contract failed'; end if;
    if exists (select 1 from jsonb_array_elements(result->'reviews') review
      where review->>'moderationStatus' <> 'published'
        or review ? 'customer_id' or review ? 'responded_by')
    then raise exception 'Private review metadata exposed'; end if;
  end loop;
  if business_id is null then raise exception 'Confirmed owner fixture has no businesses'; end if;
  perform set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
  begin
    perform public.get_business_reviews(business_id);
    raise exception 'Non-owner was allowed';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    perform public.get_business_reviews(business_id);
    raise exception 'Anonymous user was allowed';
  exception when insufficient_privilege then null;
  end;
  if has_function_privilege('anon', 'public.get_business_reviews(uuid)', 'execute')
    or not has_function_privilege('authenticated', 'public.get_business_reviews(uuid)', 'execute')
  then raise exception 'Review grants failed'; end if;
end;
$$;
rollback;
