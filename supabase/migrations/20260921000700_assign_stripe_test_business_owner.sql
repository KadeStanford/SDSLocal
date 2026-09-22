begin;

-- Make the Stripe fixture visible in the signed-in staging owner's workspace.
-- The original fixture uses a deterministic demo owner so it can be seeded
-- repeatably; this handoff assigns it to the real staging account used for
-- interactive testing while preserving the business and its catalog.
do $$
declare
  staging_owner uuid;
begin
  select id into staging_owner
  from auth.users
  where email = 'kade20413@gmail.com'
  limit 1;

  if staging_owner is null then
    raise exception 'The staging owner account kade20413@gmail.com does not exist';
  end if;

  update public.businesses
  set created_by = staging_owner,
      updated_at = now()
  where id = '88888888-8888-4888-8888-888888888888'::uuid;

  update public.business_members
  set is_active = false
  where business_id = '88888888-8888-4888-8888-888888888888'::uuid
    and user_id <> staging_owner;

  insert into public.business_members (business_id, user_id, role, is_active)
  values (
    '88888888-8888-4888-8888-888888888888'::uuid,
    staging_owner,
    'owner',
    true
  )
  on conflict (business_id, user_id) do update
    set role = 'owner', is_active = true;
end;
$$;

commit;
notify pgrst, 'reload schema';
