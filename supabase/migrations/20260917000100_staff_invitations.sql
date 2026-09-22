begin;

-- Invite tokens are generated and hashed inside Postgres. The raw token is
-- returned only once to the owner who created the invite and is never stored.
create extension if not exists pgcrypto with schema extensions;

create table public.business_staff_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  invited_email varchar(254) not null,
  token_hash char(64) not null unique,
  status varchar(16) not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null default (timezone('utc', now()) + interval '7 days'),
  accepted_by uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint business_staff_invites_email_check check (
    invited_email = lower(trim(invited_email))
    and invited_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint business_staff_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint business_staff_invites_state_check check (
    (status = 'pending' and accepted_by is null and accepted_at is null and revoked_at is null)
    or (status = 'accepted' and accepted_by is not null and accepted_at is not null and revoked_at is null)
    or (status in ('revoked', 'expired') and accepted_by is null and accepted_at is null)
  )
);

create unique index business_staff_invites_pending_email_idx
  on public.business_staff_invites (business_id, invited_email)
  where status = 'pending';

create index business_staff_invites_business_idx
  on public.business_staff_invites (business_id, created_at desc);

alter table public.business_staff_invites enable row level security;

create policy staff_invites_owner_read on public.business_staff_invites
  for select to authenticated
  using (public.is_business_owner(business_id, (select auth.uid())));

-- Owners create, list, and revoke through definer functions so clients never
-- need direct table access. Recipients can accept only their own email-bound
-- token, and acceptance creates the same membership row used by Staff Scan.
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
    business_id,
    invited_email,
    token_hash,
    invited_by,
    expires_at
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

create or replace function public.revoke_business_staff_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
begin
  select business_id into target_business_id
    from public.business_staff_invites
   where id = p_invite_id and status = 'pending';
  if target_business_id is null then
    raise exception 'Pending staff invite not found' using errcode = 'P0002';
  end if;
  if not public.is_business_owner(target_business_id, (select auth.uid())) then
    raise exception 'Business owner access required' using errcode = '42501';
  end if;
  update public.business_staff_invites
     set status = 'revoked', revoked_at = timezone('utc', now())
   where id = p_invite_id and status = 'pending';
end;
$$;

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
  invite public.business_staff_invites%rowtype;
begin
  if current_user_id is null then
    raise exception 'Sign in or create an account before accepting this invite' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_token, '')), '') is null then
    raise exception 'This staff invite link is incomplete' using errcode = '22023';
  end if;

  select lower(trim(email)) into current_email from auth.users where id = current_user_id;
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
  if current_email is null or current_email <> invite.invited_email then
    raise exception 'Sign in with the invited email address to accept this invite' using errcode = '42501';
  end if;
  if public.is_business_owner(invite.business_id, current_user_id) then
    raise exception 'The owner already has full access' using errcode = '22023';
  end if;

  insert into public.business_members (business_id, user_id, role, is_active)
  values (invite.business_id, current_user_id, 'staff', true)
  on conflict (business_id, user_id)
  do update set role = 'staff', is_active = true;

  update public.business_staff_invites
     set status = 'accepted', accepted_by = current_user_id,
         accepted_at = timezone('utc', now())
   where id = invite.id;

  return query
  select business.id, business.name, 'staff'::public.business_role
    from public.businesses business
   where business.id = invite.business_id;
end;
$$;

revoke all on table public.business_staff_invites from anon, authenticated;
revoke all on function public.create_business_staff_invite(uuid, text) from public;
revoke all on function public.list_business_staff_invites(uuid) from public;
revoke all on function public.revoke_business_staff_invite(uuid) from public;
revoke all on function public.accept_business_staff_invite(text) from public;
grant execute on function public.create_business_staff_invite(uuid, text) to authenticated;
grant execute on function public.list_business_staff_invites(uuid) to authenticated;
grant execute on function public.revoke_business_staff_invite(uuid) to authenticated;
grant execute on function public.accept_business_staff_invite(text) to authenticated;

commit;
