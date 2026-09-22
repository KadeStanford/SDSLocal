begin;

-- Staff invites may target an email account or an E.164 phone account. Keep
-- the public RPC signature stable so existing mobile/web clients continue to
-- work, while storing the two identities separately for secure acceptance.
alter table public.business_staff_invites
  alter column invited_email drop not null;

alter table public.business_staff_invites
  add column invited_phone varchar(16);

alter table public.business_staff_invites
  drop constraint business_staff_invites_email_check;

alter table public.business_staff_invites
  add constraint business_staff_invites_identifier_check check (
    (invited_email is not null
      and invited_phone is null
      and invited_email = lower(trim(invited_email))
      and invited_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
    or
    (invited_email is null
      and invited_phone is not null
      and invited_phone ~ '^\+[1-9][0-9]{7,14}$')
  );

create unique index if not exists business_staff_invites_pending_phone_idx
  on public.business_staff_invites (business_id, invited_phone)
  where status = 'pending' and invited_phone is not null;

drop function if exists public.create_business_staff_invite(uuid, text);

create function public.create_business_staff_invite(
  p_business_id uuid,
  p_email text
)
returns table (
  invite_id uuid,
  invited_email text,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  normalized_input text := lower(trim(coalesce(p_email, '')));
  normalized_email text;
  normalized_phone text;
  phone_digits text;
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_invite_id uuid;
  new_expires_at timestamptz;
  owner_email text;
  owner_phone text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_business_owner(p_business_id, current_user_id) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;

  if normalized_input ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    normalized_email := normalized_input;
  elsif normalized_input ~ '^[+0-9().[:space:]-]+$' then
    phone_digits := regexp_replace(normalized_input, '[^0-9]', '', 'g');
    if length(phone_digits) = 10 then
      normalized_phone := '+1' || phone_digits;
    elsif length(phone_digits) between 8 and 15 and left(phone_digits, 1) <> '0' then
      normalized_phone := '+' || phone_digits;
    end if;
  end if;

  if normalized_email is null and normalized_phone is null then
    raise exception 'Enter a valid staff email or phone number' using errcode = '22023';
  end if;

  select lower(trim(email)), phone into owner_email, owner_phone
    from auth.users where id = current_user_id;
  if normalized_email is not null and normalized_email = owner_email then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;
  if normalized_phone is not null and normalized_phone = owner_phone then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;

  update public.business_staff_invites invite
     set status = 'revoked', revoked_at = timezone('utc', now())
   where invite.business_id = p_business_id
     and invite.status = 'pending'
     and ((normalized_email is not null and invite.invited_email = normalized_email)
       or (normalized_phone is not null and invite.invited_phone = normalized_phone));

  insert into public.business_staff_invites (
    business_id, invited_email, invited_phone, token_hash, invited_by, expires_at
  )
  values (
    p_business_id,
    normalized_email,
    normalized_phone,
    encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex'),
    current_user_id,
    timezone('utc', now()) + interval '7 days'
  )
  returning id, business_staff_invites.expires_at
    into new_invite_id, new_expires_at;

  return query select new_invite_id, coalesce(normalized_email, normalized_phone), raw_token, new_expires_at;
end;
$$;

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
  select invite.id, coalesce(invite.invited_email, invite.invited_phone)::text,
         invite.status::text, invite.expires_at, invite.created_at, invite.accepted_at
    from public.business_staff_invites invite
   where invite.business_id = p_business_id
   order by invite.created_at desc;
end;
$$;

drop function if exists public.accept_business_staff_invite(text);

create function public.accept_business_staff_invite(p_token text)
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

revoke all on function public.create_business_staff_invite(uuid, text) from public;
revoke all on function public.list_business_staff_invites(uuid) from public;
revoke all on function public.accept_business_staff_invite(text) from public;
grant execute on function public.create_business_staff_invite(uuid, text) to authenticated;
grant execute on function public.list_business_staff_invites(uuid) to authenticated;
grant execute on function public.accept_business_staff_invite(text) to authenticated;

commit;
