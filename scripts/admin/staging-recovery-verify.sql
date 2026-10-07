-- Read-only role checks. No customer rows, credentials, or fixtures.
begin read only;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true);
set local role anon;
do $verify$ begin
  begin perform public.set_business_categories('00000000-0000-4000-8000-000000000000','{}'::smallint[]);
    raise exception 'Anonymous category execution unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  begin perform public.get_customer_appointments();
    raise exception 'Anonymous history execution unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
end $verify$;
reset role;
set local role authenticated;
do $verify$ begin
  begin perform public.set_business_categories('00000000-0000-4000-8000-000000000000','{}'::smallint[]);
    raise exception 'Signed-out category execution unexpectedly succeeded';
  exception when insufficient_privilege then null; end;
  if exists(select 1 from public.get_customer_appointments()) then
    raise exception 'Signed-out history disclosed appointments'; end if;
end $verify$;
reset role;
select 'Read-only anonymous and signed-out checks passed' verification,
  p.oid::regprocedure::text signature,pg_get_userbyid(p.proowner) owner,p.prosecdef security_definer,
  p.provolatile volatility,p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
  (select count(*) from supabase_migrations.schema_migrations) history_rows
from pg_proc p where p.oid in ('public.set_business_categories(uuid,smallint[])'::regprocedure,'public.get_customer_appointments()'::regprocedure)
order by signature;
rollback;
