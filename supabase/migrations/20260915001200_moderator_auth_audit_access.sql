-- The approval RPC records the authenticated administrator in reviewed_by.
-- Its dedicated no-login owner therefore needs access to auth.uid().
grant usage on schema auth to sds_business_moderator;
grant execute on function auth.uid() to sds_business_moderator;
