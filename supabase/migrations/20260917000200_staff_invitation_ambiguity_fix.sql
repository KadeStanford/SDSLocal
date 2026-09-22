begin;

-- The output column names of the invite RPCs overlap with table columns. Keep
-- all table references qualified so Postgres cannot resolve them as variables.
create or replace function public.create_business_staff_invite(
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
  normalized_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_invite_id uuid;
  new_expires_at timestamptz;
  owner_email text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_business_owner(p_business_id, current_user_id) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid staff email address' using errcode = '22023';
  end if;

  select lower(trim(email)) into owner_email from auth.users where id = current_user_id;
  if normalized_email = owner_email then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;

  update public.business_staff_invites invite
     set status = 'revoked', revoked_at = timezone('utc', now())
   where invite.business_id = p_business_id
     and invite.invited_email = normalized_email
     and invite.status = 'pending';

  insert into public.business_staff_invites (
    business_id, invited_email, token_hash, invited_by, expires_at
  )
  values (
    p_business_id,
    normalized_email,
    encode(extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), 'hex'),
    current_user_id,
    timezone('utc', now()) + interval '7 days'
  )
  returning id, business_staff_invites.expires_at
    into new_invite_id, new_expires_at;

  return query select new_invite_id, normalized_email, raw_token, new_expires_at;
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
  select invite.id, invite.invited_email::text, invite.status::text, invite.expires_at,
         invite.created_at, invite.accepted_at
    from public.business_staff_invites invite
   where invite.business_id = p_business_id
   order by invite.created_at desc;
end;
$$;

revoke all on function public.create_business_staff_invite(uuid, text) from public;
revoke all on function public.list_business_staff_invites(uuid) from public;
grant execute on function public.create_business_staff_invite(uuid, text) to authenticated;
grant execute on function public.list_business_staff_invites(uuid) to authenticated;

commit;
