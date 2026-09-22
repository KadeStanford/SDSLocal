begin;

alter table public.nearby_alert_preferences
  drop constraint nearby_alert_preferences_radius,
  add constraint nearby_alert_preferences_radius
    check (radius_miles between 1 and 25);

create or replace function public.set_nearby_alert_preferences(
  p_enabled boolean default null,
  p_radius_miles integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  saved public.nearby_alert_preferences;
begin
  if current_user_id is null then
    raise exception 'Sign in is required' using errcode = '42501';
  end if;
  if p_radius_miles is not null
    and (p_radius_miles < 1 or p_radius_miles > 25) then
    raise exception 'Choose a distance from 1 to 25 miles' using errcode = '22023';
  end if;

  insert into public.nearby_alert_preferences (user_id, is_enabled, radius_miles)
  values (current_user_id, coalesce(p_enabled, false), coalesce(p_radius_miles, 5))
  on conflict (user_id) do update set
    is_enabled = coalesce(p_enabled, public.nearby_alert_preferences.is_enabled),
    radius_miles = coalesce(p_radius_miles, public.nearby_alert_preferences.radius_miles),
    updated_at = now()
  returning * into saved;

  return jsonb_build_object('enabled', saved.is_enabled, 'radiusMiles', saved.radius_miles);
end;
$$;

commit;
