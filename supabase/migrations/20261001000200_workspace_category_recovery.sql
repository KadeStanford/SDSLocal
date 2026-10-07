begin;
-- Focused, atomic category editing without overwriting the other workspace editors.
create or replace function public.set_business_categories(p_business_id uuid, p_category_ids smallint[])
returns void language plpgsql security definer set search_path = '' as $$
declare kind public.business_type; requested integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_members where business_id = p_business_id
      and user_id = auth.uid() and role = 'owner' and is_active
  ) then raise exception 'Owner access required' using errcode = '42501'; end if;
  select business_type into kind from public.businesses where id = p_business_id for update;
  perform public.assert_business_feature(p_business_id, 'business_page');
  requested := cardinality(coalesce(p_category_ids, '{}'));
  if requested > 5 or requested <> (select count(distinct id) from unnest(p_category_ids) id)
    or requested <> (select count(*) from public.categories where id = any(p_category_ids)
      and is_active and (business_type is null or business_type = kind))
  then raise exception 'Choose up to five valid categories for this business type' using errcode = '22023'; end if;
  delete from public.business_categories where business_id = p_business_id;
  insert into public.business_categories(business_id, category_id, is_primary)
    select p_business_id, id, position = 1 from unnest(p_category_ids) with ordinality as choice(id, position);
  update public.businesses set category_summary = (
    select string_agg(name, ', ' order by array_position(p_category_ids, id))
    from public.categories where id = any(p_category_ids)
  ) where id = p_business_id;
end $$;
revoke all on function public.set_business_categories(uuid, smallint[]) from public, anon;
grant execute on function public.set_business_categories(uuid, smallint[]) to authenticated;
commit;
