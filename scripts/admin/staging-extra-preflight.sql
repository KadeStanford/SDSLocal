-- READ ONLY. No user rows, credentials or provider configuration.
begin read only;
select jsonb_build_object(
  'history_columns',(select jsonb_agg(jsonb_build_object('column',column_name,'type',data_type,'nullable',is_nullable))
    from information_schema.columns where table_schema='supabase_migrations' and table_name='schema_migrations'),
  'expected_history',(select coalesce(jsonb_agg(jsonb_build_object('version',version,'name',name)),'[]'::jsonb)
    from supabase_migrations.schema_migrations where version in ('20261001000200','20261001000300','20261006000100','20261006000200','20261006000300')
    or name in ('20261001000200_workspace_category_recovery','20261001000300_customer_appointment_history',
      'workspace_category_recovery','customer_appointment_history','20261006000100_admin_moderation_workspace',
      '20261006000200_moderation_outcome_notifications','20261006000300_validated_business_submission')),
  'schema_acl',(select nspacl from pg_namespace where nspname='public'),
  'moderator_schema_create',has_schema_privilege('sds_business_moderator','public','CREATE'),
  'notification_write_permissions',(select jsonb_object_agg(a.attname,has_column_privilege('authenticated',a.attrelid,a.attname,'UPDATE'))
    from pg_attribute a where a.attrelid='public.notification_deliveries'::regclass and a.attnum>0 and not a.attisdropped),
  'enums',(select jsonb_object_agg(name,labels) from (select t.typname name,jsonb_agg(e.enumlabel order by e.enumsortorder) labels
    from pg_type t join pg_namespace n on n.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid
    where n.nspname='public' and t.typname in ('business_type','business_status','report_status','report_target_type','business_role') group by t.typname) enums),
  'constraints',(select jsonb_agg(jsonb_build_object('table',c.conrelid::regclass::text,'name',c.conname,'definition',pg_get_constraintdef(c.oid)))
    from pg_constraint c where c.conrelid in ('public.notification_deliveries'::regclass,'public.platform_admin_audit_log'::regclass)),
  'migration_rollback_dependencies',(select jsonb_agg(jsonb_build_object('function',p.oid::regprocedure::text,'dependent',pg_describe_object(d.classid,d.objid,d.objsubid)))
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_depend d on d.refclassid='pg_proc'::regclass and d.refobjid=p.oid
    where n.nspname='public' and p.proname in ('set_business_categories','get_customer_appointments','protect_business_moderation_state'))
) extra_preflight;
rollback;
