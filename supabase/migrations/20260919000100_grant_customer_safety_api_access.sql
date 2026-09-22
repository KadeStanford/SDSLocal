-- Let authenticated customers reach the existing RLS policies for reports
-- and blocks through PostgREST. The policies remain responsible for limiting
-- every operation to the current user's own rows.
grant select, insert on table public.content_reports to authenticated;

grant select, insert, update, delete on table public.blocked_businesses to authenticated;
