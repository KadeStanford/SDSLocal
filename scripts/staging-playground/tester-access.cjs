// Enroll confirmed, consenting tester accounts without sending invitations or granting plans.
const { query } = require('./staging.cjs');
const [action = '--check', userId] = process.argv.slice(2);
if (
  !['--check', '--enable', '--disable'].includes(action) ||
  !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId ?? '')
) {
  console.error(
    'Usage: node scripts/staging-playground/tester-access.cjs --check|--enable|--disable <confirmed-user-uuid>',
  );
  process.exit(1);
}
(async () => {
  const settings = `(select value from public.platform_settings where key='business_listing_billing')`;
  const guard = `do $$ begin
    if ${settings}->>'environment' is distinct from 'sandbox'
      or coalesce((${settings}->>'enabled')::boolean, false)
      or not coalesce((${settings}->>'featureEnforcement')::boolean, false)
      or not coalesce((${settings}->>'sandboxCheckout')::boolean, false) then
      raise exception 'Expected enforced sandbox-only staging configuration';
    end if;
    if not exists(select 1 from auth.users where id='${userId}'::uuid and email_confirmed_at is not null and deleted_at is null) then
      raise exception 'A confirmed existing tester account is required';
    end if;
  end $$;`;
  const mutation =
    action === '--check'
      ? ''
      : `insert into public.business_subscription_sandbox_testers(owner_id,enabled)
    values ('${userId}'::uuid,${action === '--enable'}) on conflict(owner_id) do update set enabled=excluded.enabled;`;
  await query(`begin; ${guard} ${mutation} commit;`);
  const result = await query(
    `select coalesce((select enabled from public.business_subscription_sandbox_testers where owner_id='${userId}'::uuid),false) as sandbox_access;`,
  );
  console.log(
    JSON.stringify({
      action,
      userId,
      sandboxAccess: result[0].sandbox_access,
      emailSent: false,
      planGranted: false,
    }),
  );
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
