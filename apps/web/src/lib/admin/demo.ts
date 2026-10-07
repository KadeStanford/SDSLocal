import { randomBytes, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { cookies, headers } from 'next/headers';
import type { PGlite } from '@electric-sql/pglite';
import {
  ADMIN_ID,
  asUser,
  createFixtureDatabase,
  FIXTURE_VERSION,
} from '../../../../../scripts/admin/fixture-runtime.mjs';
import { demoConfigured } from './demo-guard';
export { demoConfigured } from './demo-guard';

const globals = globalThis as typeof globalThis & {
  parishDemoToken?: string;
  parishDemoDb?: Promise<PGlite>;
  parishDemoVersion?: string;
};
const COOKIE = 'parish-admin-synthetic-session';
async function assertLocalHost() {
  const host = (await headers()).get('host') ?? '';
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host))
    throw new Error('Synthetic fixture access requires the local preview host.');
}
export async function activateDemo() {
  if (!demoConfigured()) throw new Error('Synthetic mode is unavailable.');
  await assertLocalHost();
  globals.parishDemoToken ??= randomBytes(32).toString('hex');
  (await cookies()).set(COOKIE, globals.parishDemoToken, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/admin',
    maxAge: 8 * 3600,
    secure: false,
  });
}
export async function hasDemoSession() {
  if (!demoConfigured()) return false;
  await assertLocalHost();
  const token = (await cookies()).get(COOKIE)?.value;
  return (
    !!token &&
    !!globals.parishDemoToken &&
    token.length === globals.parishDemoToken.length &&
    timingSafeEqual(Buffer.from(token), Buffer.from(globals.parishDemoToken))
  );
}
export async function fixtureRpc<T>(name: string, params: unknown[] = []) {
  if (!(await hasDemoSession())) throw new Error('Administrator access required.');
  // Only fixed RPC names selected by server code. Parameters use PostgreSQL bindings.
  const functions: Record<string, string> = {
    snapshot: 'public.get_admin_moderation_snapshot($1,$2,$3,$4)',
    record: 'public.get_admin_moderation_record($1,$2)',
    action: 'public.admin_moderation_action($1,$2,$3,$4,$5,$6,$7)',
  };
  if (!functions[name]) throw new Error('Unsupported fixture operation.');
  if (globals.parishDemoVersion !== FIXTURE_VERSION) {
    delete globals.parishDemoDb;
    globals.parishDemoVersion = FIXTURE_VERSION;
  }
  globals.parishDemoDb ??= import('@electric-sql/pglite').then(({ PGlite }) =>
    createFixtureDatabase(PGlite, path.resolve(process.cwd(), '../..')),
  );
  const db = await globals.parishDemoDb;
  const result = await asUser<{ data: T }>(
    db,
    ADMIN_ID,
    `select ${functions[name]} as data`,
    params,
  );
  if (!result.rows[0]) throw new Error('The synthetic operation returned no result.');
  return result.rows[0].data;
}
