-- Keep the dedicated moderator role out of the auth schema. This private
-- helper exposes only the current request user ID needed for reviewed_by.
create or replace function public.moderation_request_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

revoke all on function public.moderation_request_user_id() from public;
grant execute on function public.moderation_request_user_id()
to sds_business_moderator;

grant sds_business_moderator to current_user;

create or replace function public.approve_business(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  readiness jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  select public.get_business_readiness(p_business_id) into readiness;
  if not (readiness ->> 'ready')::boolean then
    raise exception 'Business is no longer ready for approval' using errcode = '22023';
  end if;

  update public.businesses
  set
    status = 'active',
    approved_at = now(),
    reviewed_at = now(),
    reviewed_by = public.moderation_request_user_id(),
    review_feedback = null
  where id = p_business_id
    and status = 'pending_review';

  if not found then
    raise exception 'Business is not pending review' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.approve_business(uuid) from public;
grant execute on function public.approve_business(uuid) to authenticated;
revoke sds_business_moderator from current_user;
