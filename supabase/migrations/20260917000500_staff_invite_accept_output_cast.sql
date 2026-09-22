begin;

-- Keep the RPC's declared text result type explicit for varchar business names.
create or replace function public.accept_business_staff_invite(p_token text)
returns table (
  business_id uuid,
  business_name text,
  role public.business_role
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  current_email text;
  current_phone text;
  current_phone_digits text;
  invite public.business_staff_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in or create an account before accepting this invite' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'This staff invite link is incomplete' using errcode = '22023';
  end if;

  select lower(trim(email)), phone into current_email, current_phone
    from auth.users where id = current_user_id;
  if current_phone is not null then
    current_phone_digits := regexp_replace(current_phone, '[^0-9]', '', 'g');
    if length(current_phone_digits) = 10 then
      current_phone := '+1' || current_phone_digits;
    elsif length(current_phone_digits) between 8 and 15 then
      current_phone := '+' || current_phone_digits;
    else
      current_phone := null;
    end if;
  end if;

  select * into invite
    from public.business_staff_invites
   where token_hash = encode(extensions.digest(convert_to(trim(p_token), 'UTF8'), 'sha256'), 'hex')
   for update;

  if invite.id is null then
    raise exception 'This staff invite is invalid or has already been used' using errcode = 'P0002';
  end if;
  if invite.status <> 'pending' then
    raise exception 'This staff invite is no longer available' using errcode = 'P0002';
  end if;
  if invite.expires_at <= timezone('utc', now()) then
    update public.business_staff_invites set status = 'expired' where id = invite.id;
    raise exception 'This staff invite has expired. Ask the owner for a new link' using errcode = 'P0002';
  end if;
  if (invite.invited_email is not null and (current_email is null or current_email <> invite.invited_email))
     or (invite.invited_phone is not null and (current_phone is null or current_phone <> invite.invited_phone)) then
    raise exception 'Sign in with the invited email address or phone number to accept this invite' using errcode = '42501';
  end if;
  if public.is_business_owner(invite.business_id, current_user_id) then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;

  insert into public.business_members (business_id, user_id, role, is_active)
  values (invite.business_id, current_user_id, 'staff', true)
  on conflict on constraint business_members_business_id_user_id_key
  do update set role = 'staff', is_active = true;

  update public.business_staff_invites
     set status = 'accepted', accepted_by = current_user_id,
         accepted_at = timezone('utc', now())
   where id = invite.id;

  return query
  select business.id, business.name::text, 'staff'::public.business_role
    from public.businesses business
   where business.id = invite.business_id;
end;
$$;

revoke all on function public.accept_business_staff_invite(text) from public;
grant execute on function public.accept_business_staff_invite(text) to authenticated;

commit;
