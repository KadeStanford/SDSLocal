begin;

create or replace function public.list_business_staff_invites(p_business_id uuid)
returns table (
  invite_id uuid,
  invited_email text,
  status text,
  expires_at timestamptz,
  created_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_business_owner(p_business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;

  update public.business_staff_invites invite
     set status = 'expired'
   where invite.business_id = p_business_id
     and invite.status = 'pending'
     and invite.expires_at <= timezone('utc', now());

  return query
  select invite.id, invite.invited_email::text, invite.status::text,
         invite.expires_at, invite.created_at, invite.accepted_at
    from public.business_staff_invites invite
   where invite.business_id = p_business_id
   order by invite.created_at desc;
end;
$$;

revoke all on function public.list_business_staff_invites(uuid) from public;
grant execute on function public.list_business_staff_invites(uuid) to authenticated;

commit;
