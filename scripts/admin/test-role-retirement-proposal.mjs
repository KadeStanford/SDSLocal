import fs from 'node:fs/promises';
import { PGlite } from '../../apps/web/node_modules/@electric-sql/pglite/dist/index.js';

const db = new PGlite();
const moderator = 'proposal_moderator';
const migrator = 'proposal_migrator';
const grantor = 'proposal_existing_grantor';
try {
  await db.exec(`
    create role ${moderator} nologin bypassrls;
    create role ${migrator} nologin createrole;
    create role ${grantor} nologin createrole;
    grant ${moderator} to ${grantor} with admin true;
    set role ${grantor};
    grant ${moderator} to ${migrator} with admin true;
    grant ${moderator} to ${migrator} with inherit false;
    grant ${moderator} to ${migrator} with set false;
    reset role;
    alter schema public owner to ${migrator};
    grant usage on schema public to ${moderator};
    create role authenticated;
    create role anon;
    create function public.approve_business(uuid) returns boolean language sql as $$select true$$;
    alter function public.approve_business(uuid) owner to ${moderator};
    grant execute on function public.approve_business(uuid) to authenticated;
    set session authorization ${migrator};
    create function public.admin_moderation_action(text,uuid,text,text,text,uuid,text)
      returns boolean language sql as $$select true$$;
  `);
  const flags = async () =>
    (
      await db.query(`select jsonb_agg(jsonb_build_object(
    'grantor',g.rolname,'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option)
    order by g.rolname) flags from pg_auth_members m join pg_roles g on g.oid=m.grantor
    where m.roleid='${moderator}'::regrole and m.member='${migrator}'::regrole`)
    ).rows[0].flags;
  const before = await flags();
  let denied = false;
  try {
    await db.exec(
      `alter function public.admin_moderation_action(text,uuid,text,text,text,uuid,text) owner to ${moderator}`,
    );
  } catch (error) {
    denied = error.code === '42501';
  }
  if (!denied) throw new Error('Expected original ownership denial');
  await db.exec(`begin;
    grant ${moderator} to ${migrator} with inherit false granted by ${migrator};`);
  const during = await flags();
  const added = during.find((row) => row.grantor === migrator);
  if (!added || added.admin || added.inherit || !added.set)
    throw new Error('Unexpected temporary grant flags');
  await db.exec(`revoke ${moderator} from ${migrator} granted by ${migrator};`);
  const proposedSql = await fs.readFile(
    new URL(
      '../../docs/admin-verification/staging-admin/ownership-and-retirement.proposed.sql',
      import.meta.url,
    ),
    'utf8',
  );
  await db.exec(
    proposedSql.replaceAll('sds_business_moderator', moderator).replaceAll('postgres', migrator),
  );
  await db.exec('savepoint duplicate_retirement');
  let duplicateDenied = false;
  try {
    await db.exec(
      'revoke execute on function public.approve_business(uuid) from public,anon,authenticated',
    );
  } catch (error) {
    duplicateDenied = error.code === '42501';
    await db.exec('rollback to savepoint duplicate_retirement');
  }
  if (!duplicateDenied) throw new Error('Expected duplicate retirement ownership denial');
  await db.exec('release savepoint duplicate_retirement');
  const after = await flags();
  if (JSON.stringify(before) !== JSON.stringify(after))
    throw new Error('Original membership changed');
  const checks = (
    await db.query(`select
    (select pg_get_userbyid(proowner) from pg_proc where oid='public.admin_moderation_action(text,uuid,text,text,text,uuid,text)'::regprocedure)='${moderator}' owner_correct,
    not pg_has_role(current_user,'${moderator}','SET') set_restored,
    not has_schema_privilege('${moderator}','public','CREATE') create_restored,
    not (select rolsuper from pg_roles where rolname=current_user) nonsuper_migrator,
    not has_function_privilege('authenticated','public.approve_business(uuid)','EXECUTE') legacy_write_retired,
    current_user=session_user session_role_restored`)
  ).rows[0];
  if (Object.values(checks).some((value) => value !== true))
    throw new Error('Preservation checks failed');
  await db.exec('commit');
  const evidence = {
    checked_at: new Date().toISOString(),
    scope:
      'Exact proposed DO block with only role-name substitution in isolated PGlite; no hosted role changes',
    original_ownership_denied: true,
    duplicate_retirement_denied: duplicateDenied,
    before,
    during,
    after,
    ...checks,
  };
  await fs.writeFile(
    new URL(
      '../../docs/admin-verification/staging-admin/role-retirement-local-test.json',
      import.meta.url,
    ),
    JSON.stringify(evidence, null, 2) + '\n',
  );
  console.log(JSON.stringify(evidence));
} catch (error) {
  console.error(JSON.stringify({ message: error.message, code: error.code, where: error.where }));
  process.exitCode = 1;
} finally {
  await db.close();
}
