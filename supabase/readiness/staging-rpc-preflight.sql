-- READ ONLY. Run only in verified project lgddhdexvwclfrnzjtly before bounded application.
begin read only;
select p.oid::regprocedure as signature, pg_get_function_result(p.oid) as result_type,
       p.prosecdef as security_definer, p.provolatile, p.proconfig,
       pg_get_userbyid(p.proowner) as owner, p.proacl,
       pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in
  ('set_business_categories','get_customer_appointments','assert_business_feature','get_business_readiness','return_related_business_to_draft')
order by p.proname,p.oid;
select table_name,column_name,data_type,udt_name,is_nullable,character_maximum_length
from information_schema.columns where table_schema='public' and table_name in
  ('businesses','business_members','business_categories','categories','appointments')
order by table_name,ordinal_position;
select c.relname,c.relrowsecurity,c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('businesses','business_members','business_categories','categories','appointments');
select policyname,tablename,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('businesses','business_members','business_categories','categories','appointments');
select t.tgname, c.relname, pg_get_triggerdef(t.oid)
from pg_trigger t join pg_class c on c.oid=t.tgrelid
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and not t.tgisinternal and c.relname in ('businesses','business_categories','categories');
select version,name from supabase_migrations.schema_migrations
where name in ('20261001000200_workspace_category_recovery','20261001000300_customer_appointment_history')
order by version;
rollback;
