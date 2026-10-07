import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = 'https://lgddhdexvwclfrnzjtly.supabase.co';
if (process.env.READINESS_STAGING_URL !== backend) throw new Error('Exact staging URL is required');
const key = process.env.READINESS_STAGING_ANON_KEY;
if (!key || process.env.READINESS_STAGING_ACCESS_TOKEN)
  throw new Error('Anonymous staging key only');
const output = path.resolve(
  root,
  process.argv[2] ?? 'reports/readiness/evidence/staging-readonly.json',
);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const report = {
  observedAtUtc: new Date().toISOString(),
  backend,
  projectRef: 'lgddhdexvwclfrnzjtly',
  scope: 'Live staging backend contracts; not an installed OTA or native UI test',
  command: 'node scripts/readiness-staging.mjs (exact URL and anonymous key supplied privately)',
  mode: 'Anonymous GET only; redirects rejected. No sessions, emails, SQL, Edge invocation, writes, payments or notifications.',
  checks: [],
};
async function check(id, route, verify) {
  const entry = { id, startedAtUtc: new Date().toISOString(), method: 'GET', route };
  report.checks.push(entry);
  try {
    const response = await fetch(backend + route, {
      method: 'GET',
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    entry.httpStatus = response.status;
    const body = await response.json();
    entry.result = verify(response.status, body);
    entry.status = 'passed';
    entry.completedAtUtc = new Date().toISOString();
    return body;
  } catch (error) {
    entry.status = 'failed';
    entry.error = error.message;
    entry.completedAtUtc = new Date().toISOString();
    return null;
  }
}
function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}
function rows(status, value, predicate, label) {
  requireThat(status === 200, `${label}: expected HTTP 200, got ${status}`);
  requireThat(Array.isArray(value) && value.length > 0, `${label}: nonempty records required`);
  requireThat(value.every(predicate), `${label}: a record failed the required field contract`);
  return { rows: value.length, nonempty: true, requiredFieldsValid: true };
}
function denied(status, value) {
  requireThat(
    (status === 401 || status === 403) && value?.code === '42501',
    'Expected resolved RPC with SQL 42501 anonymous denial',
  );
  return {
    errorCode: value.code,
    meaning: 'RPC resolves; anonymous execution is denied. Signed-in success is not tested.',
  };
}
await Promise.all([
  check('auth-service-health', '/auth/v1/health', (status, value) => {
    requireThat(status === 200 && value?.name === 'GoTrue', 'Auth health contract failed');
    return { name: value.name, version: value.version };
  }),
  check('auth-registration-settings', '/auth/v1/settings', (status, value) => {
    requireThat(
      status === 200 && value?.disable_signup === false && value?.mailer_autoconfirm === false,
      'Signup or email confirmation setting changed',
    );
    return {
      signupAllowed: true,
      emailConfirmationRequired: true,
      googleEnabled: value.external?.google === true,
      appleEnabled: value.external?.apple === true,
      limit: 'Enabled provider configuration does not prove successful login.',
    };
  }),
  check('anonymous-admin-access-denied', '/rest/v1/rpc/is_platform_admin', denied),
  check(
    'category-rpc-resolves-anonymous-denied',
    '/rest/v1/rpc/set_business_categories?p_business_id=00000000-0000-0000-0000-000000000000&p_category_ids=%7B%7D',
    denied,
  ),
  check('history-rpc-resolves-anonymous-denied', '/rest/v1/rpc/get_customer_appointments', denied),
  check(
    'onboarding-active-category-options',
    '/rest/v1/categories?select=id,name,business_type&is_active=eq.true&order=display_order',
    (status, value) =>
      rows(
        status,
        value,
        (row) => Number.isInteger(row.id) && typeof row.name === 'string' && row.name.length > 0,
        'Category options',
      ),
  ),
]);
const businesses = await check(
  'discover-public-active-businesses',
  '/rest/v1/businesses?select=id,name,slug,status,business_type&status=eq.active&order=name&limit=10',
  (status, value) =>
    rows(
      status,
      value,
      (row) =>
        uuid.test(row.id) && row.status === 'active' && row.name && row.slug && row.business_type,
      'Public businesses',
    ),
);
const business =
  businesses?.find((row) => row.id === '11111111-1111-4111-8111-111111111111') ?? businesses?.[0];
if (business && uuid.test(business.id)) {
  report.selectedPublicBusinessId = business.id;
  const route = `/rest/v1/businesses?select=id,name,slug,status,business_type,description,category_summary,primary_color,accent_color,timezone&id=eq.${business.id}`;
  const first = await check('open-public-business-page', route, (status, value) =>
    rows(
      status,
      value,
      (row) => row.id === business.id && row.status === 'active' && row.name && row.timezone,
      'Public business page',
    ),
  );
  await check('repeat-public-business-page', route, (status, value) => {
    const result = rows(
      status,
      value,
      (row) => row.id === business.id && row.status === 'active' && row.name && row.timezone,
      'Repeated public business page',
    );
    requireThat(
      first && JSON.stringify(value) === JSON.stringify(first),
      'Repeated public business fields changed during this run',
    );
    return { ...result, sameFieldsOnRepeat: true };
  });
  await Promise.all([
    check(
      'read-public-business-categories',
      `/rest/v1/business_categories?select=category_id,is_primary&business_id=eq.${business.id}`,
      (status, value) =>
        rows(
          status,
          value,
          (row) => Number.isInteger(row.category_id) && typeof row.is_primary === 'boolean',
          'Business categories',
        ),
    ),
    check(
      'read-public-offering-sections',
      `/rest/v1/offering_sections?select=id,name&business_id=eq.${business.id}&is_visible=eq.true&archived_at=is.null&order=display_order`,
      (status, value) =>
        rows(
          status,
          value,
          (row) => uuid.test(row.id) && typeof row.name === 'string' && row.name.length > 0,
          'Offering sections',
        ),
    ),
    check(
      'read-public-offering-items',
      `/rest/v1/offering_items?select=id,section_id,name,price_minor,currency,is_available&business_id=eq.${business.id}&is_visible=eq.true&limit=20`,
      (status, value) =>
        rows(
          status,
          value,
          (row) =>
            uuid.test(row.id) &&
            uuid.test(row.section_id) &&
            row.name &&
            Number.isInteger(row.price_minor) &&
            row.price_minor >= 0 &&
            /^[A-Z]{3}$/.test(row.currency) &&
            typeof row.is_available === 'boolean',
          'Offering items',
        ),
    ),
  ]);
} else {
  for (const id of [
    'open-public-business-page',
    'repeat-public-business-page',
    'read-public-business-categories',
    'read-public-offering-sections',
    'read-public-offering-items',
  ])
    report.checks.push({
      id,
      status: 'not-tested',
      reason: 'No valid public business was returned; dependent checks were not executed.',
    });
}
report.completedAtUtc = new Date().toISOString();
report.totals = Object.fromEntries(
  ['passed', 'failed', 'not-tested'].map((status) => [
    status,
    report.checks.filter((check) => check.status === status).length,
  ]),
);
report.limit =
  'Nonempty public API contracts and anonymous RPC denial only. No installed native preview, signed-in category save/history isolation, onboarding creation, verification/recovery, purchase, booking, loyalty, moderation outcome or notification journey was executed.';
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    backend,
    completedAtUtc: report.completedAtUtc,
    totals: report.totals,
    checks: report.checks.map(({ id, status, httpStatus, error, result }) => ({
      id,
      status,
      httpStatus,
      error,
      rows: result?.rows,
    })),
  }),
);
process.exitCode = report.totals.failed ? 1 : 0;
