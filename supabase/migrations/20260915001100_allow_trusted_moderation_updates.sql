-- Give the approval RPC a narrow execution identity. The role cannot log in
-- or be assumed by application users, and only this reviewed function is
-- owned by it.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sds_business_moderator') then
    create role sds_business_moderator nologin noinherit bypassrls;
  end if;
end;
$$;

grant usage on schema public to sds_business_moderator;
grant select (id, status) on public.businesses to sds_business_moderator;
grant update (
  status,
  approved_at,
  reviewed_at,
  reviewed_by,
  review_feedback
) on public.businesses to sds_business_moderator;
grant execute on function public.is_platform_admin() to sds_business_moderator;
grant execute on function public.get_business_readiness(uuid) to sds_business_moderator;

grant sds_business_moderator to current_user;
grant create on schema public to sds_business_moderator;
alter function public.approve_business(uuid) owner to sds_business_moderator;
revoke all on function public.approve_business(uuid) from public;
grant execute on function public.approve_business(uuid) to authenticated;
revoke create on schema public from sds_business_moderator;
revoke sds_business_moderator from current_user;

create or replace function public.protect_business_moderation_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
    ) = 'authenticated'
    and current_user <> 'sds_business_moderator' then
    if new.approved_at is distinct from old.approved_at
      or new.suspended_at is distinct from old.suspended_at then
      raise exception 'Moderation timestamps are server-managed';
    end if;

    if new.status is distinct from old.status
      and not (
        (old.status = 'draft' and new.status = 'pending_review')
        or (old.status = 'pending_review' and new.status = 'draft')
      ) then
      raise exception 'This business status transition requires moderation';
    end if;
  end if;

  return new;
end;
$$;
