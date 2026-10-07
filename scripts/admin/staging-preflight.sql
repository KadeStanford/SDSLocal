-- READ ONLY. Use only after browser handoff in lgddhdexvwclfrnzjtly.
-- Return metadata, definitions and counts; no customer rows or credentials.
begin read only;
with tables as (
  select c.oid,c.relname,pg_get_userbyid(c.relowner) owner,c.relrowsecurity,c.relforcerowsecurity,c.relacl
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname in (
    'profiles','platform_admins','platform_admin_audit_log','businesses','business_members',
    'business_categories','categories','business_hours','business_photos','media_assets',
    'content_reports','offering_items','events','pickup_order_reviews','pickup_order_review_reports',
    'pickup_order_review_events','verified_event_reviews','verified_event_review_reports',
    'verified_event_review_events','notification_deliveries','notification_preferences',
    'service_requests','square_order_support_requests','appointments')
), functions as (
  select p.oid::regprocedure::text signature,pg_get_function_result(p.oid) result_type,
    p.prosecdef security_definer,p.provolatile,pg_get_userbyid(p.proowner) owner,p.proconfig,p.proacl,
    pg_get_functiondef(p.oid) definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (
    'is_platform_admin','is_business_owner','moderation_request_user_id','protect_business_moderation_state',
    'get_business_readiness','submit_business_for_review','return_related_business_to_draft',
    'set_business_categories','get_customer_appointments','assert_business_feature',
    'approve_business','reject_business','resolve_platform_report','resolve_pickup_review_report',
    'notification_enabled','claim_notification_deliveries','set_notification_delivery_state',
    'get_my_notification_deliveries','get_admin_moderation_snapshot','get_admin_moderation_record',
    'admin_moderation_action','queue_moderation_outcomes','moderation_outcome_access',
    'moderation_notification_sendable','get_my_moderation_outcome','get_my_moderation_outcomes')
)
select jsonb_build_object(
  'database',current_database(),'checked_at',now(),
  'tables',(select jsonb_agg(to_jsonb(t) order by relname) from tables t),
  'columns',(select jsonb_agg(jsonb_build_object('table',t.relname,'column',a.attname,
    'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'acl',a.attacl) order by t.relname,a.attnum)
    from tables t join pg_attribute a on a.attrelid=t.oid where a.attnum>0 and not a.attisdropped),
  'policies',(select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p
    where schemaname='public' and tablename in (select relname from tables)),
  'triggers',(select jsonb_agg(jsonb_build_object('table',t.relname,'trigger',g.tgname,
    'definition',pg_get_triggerdef(g.oid)) order by t.relname,g.tgname)
    from tables t join pg_trigger g on g.tgrelid=t.oid where not g.tgisinternal),
  'functions',(select jsonb_agg(to_jsonb(f) order by signature) from functions f),
  'roles',(select jsonb_agg(jsonb_build_object('name',rolname,'login',rolcanlogin,'bypass_rls',rolbypassrls,'superuser',rolsuper))
    from pg_roles where rolname in ('anon','authenticated','service_role','sds_business_moderator','sds_billing_manager')),
  'role_memberships',(select jsonb_agg(jsonb_build_object('role',parent.rolname,'member',member.rolname))
    from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member on member.oid=m.member
    where parent.rolname in ('sds_business_moderator','sds_billing_manager')),
  'migration_count',(select count(*) from supabase_migrations.schema_migrations),
  'recent_migrations',(select jsonb_agg(to_jsonb(r) order by version desc) from
    (select version,name from supabase_migrations.schema_migrations order by version desc limit 20) r)
) preflight;
rollback;
