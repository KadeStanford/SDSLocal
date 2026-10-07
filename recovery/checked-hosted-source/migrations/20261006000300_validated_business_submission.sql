begin;
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
    and current_user not in ('sds_business_moderator', 'sds_billing_manager') then
    -- Direct owner updates must not bypass readiness and billing in submit_business_for_review.
    if current_user = 'authenticated' and old.status = 'draft' and new.status = 'pending_review' then
      raise exception 'Submit through the validated business review action' using errcode = '42501';
    end if;

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
commit;
notify pgrst,'reload schema';
