rollback;
begin read only;
select jsonb_build_object('current_user',current_user,'session_user',session_user,
  'role',(select jsonb_build_object('name',rolname,'superuser',rolsuper,'create_role',rolcreaterole) from pg_roles where rolname=current_user),
  'memberships',(select jsonb_agg(jsonb_build_object('role',parent.rolname,'member',member.rolname,
    'grantor',grantor.rolname,'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option))
    from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member on member.oid=m.member
    join pg_roles grantor on grantor.oid=m.grantor where parent.rolname='sds_business_moderator'),
  'can_set_moderator',pg_has_role(current_user,'sds_business_moderator','SET'),
  'admin_rpc_absent',to_regprocedure('public.get_admin_moderation_snapshot(text,text,text,integer)') is null,
  'request_id_absent',not exists(select 1 from information_schema.columns where table_schema='public' and table_name='platform_admin_audit_log' and column_name='request_id'),
  'outcome_columns_absent',not exists(select 1 from information_schema.columns where table_schema='public' and table_name='notification_deliveries' and column_name='moderation_outcome')) role_preflight;
rollback;
