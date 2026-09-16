-- Read the request role directly so the dedicated no-login moderator does
-- not need access to Supabase's protected auth schema.
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
