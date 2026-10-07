import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://lgddhdexvwclfrnzjtly.supabase.co';
const output = path.resolve(
  root,
  process.env.READINESS_STAGING_OUTPUT ?? 'reports/readiness/evidence/staging-readonly.json',
);
const envIndex = process.argv.indexOf('--env-file');
const values = { ...process.env };
if (envIndex >= 0) {
  for (const line of fs.readFileSync(process.argv[envIndex + 1], 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}
const configured = values.EXPO_PUBLIC_STAGING_SUPABASE_URL ?? values.READINESS_STAGING_URL;
const key = values.EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY ?? values.READINESS_STAGING_ANON_KEY;
const report = {
  observedAtUtc: new Date().toISOString(),
  backend: base,
  mode: 'Anonymous GET requests only. No accounts, sessions, email, payment, SQL, Edge invocation, or data mutations.',
  checks: [],
};
fs.mkdirSync(path.dirname(output), { recursive: true });
const save = () => fs.writeFileSync(output, JSON.stringify(report, null, 2));
if (configured !== base || !key) {
  report.checks.push({
    id: 'staging-configuration',
    status: 'skipped',
    reason:
      'Requires the exact approved staging URL and its public anonymous key; keys are never written to reports.',
  });
  save();
  process.exitCode = 2;
} else {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  async function check(
    id,
    route,
    assert,
    summarize = (value) => ({ rows: Array.isArray(value) ? value.length : undefined }),
  ) {
    const startedAtUtc = new Date().toISOString();
    try {
      const response = await fetch(base + route, {
        method: 'GET',
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const value = await response.json();
      assert(value);
      report.checks.push({
        id,
        startedAtUtc,
        method: 'GET',
        route,
        httpStatus: response.status,
        status: 'passed',
        result: summarize(value),
      });
      save();
      return value;
    } catch (error) {
      report.checks.push({
        id,
        startedAtUtc,
        method: 'GET',
        route,
        status: 'failed',
        reason: error.message,
      });
      save();
      return null;
    }
  }
  const array = (value) => {
    if (!Array.isArray(value)) throw new Error('Expected an array response');
  };
  await check(
    'auth-service-health',
    '/auth/v1/health',
    (v) => {
      if (!v.version) throw new Error('Missing auth version');
    },
    (v) => ({ name: v.name, version: v.version }),
  );
  await check(
    'auth-registration-settings',
    '/auth/v1/settings',
    (v) => {
      if (v.disable_signup || v.mailer_autoconfirm)
        throw new Error('Signup disabled or email confirmation bypassed');
    },
    (v) => ({
      emailConfirmationRequired: !v.mailer_autoconfirm,
      signupAllowed: !v.disable_signup,
      googleEnabled: v.external?.google,
      appleEnabled: v.external?.apple,
    }),
  );
  try {
    const response = await fetch(base + '/rest/v1/rpc/is_platform_admin', {
      method: 'GET',
      headers,
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    report.checks.push({
      id: 'anonymous-admin-access-denied',
      startedAtUtc: new Date().toISOString(),
      method: 'GET',
      route: '/rest/v1/rpc/is_platform_admin',
      httpStatus: response.status,
      status: [401, 403].includes(response.status) ? 'passed' : 'failed',
      result: { expected: '401 or 403; anonymous caller cannot execute admin membership lookup' },
    });
  } catch (error) {
    report.checks.push({
      id: 'anonymous-admin-access-denied',
      status: 'failed',
      reason: error.message,
    });
  }
  save();
  await check(
    'onboarding-active-category-options',
    '/rest/v1/categories?select=id,name,business_type&is_active=eq.true&order=display_order',
    (v) => {
      array(v);
      if (!v.length || v.some((x) => !x.name || typeof x.id !== 'number'))
        throw new Error('Active category options empty or invalid');
    },
  );
  const businesses = await check(
    'discover-public-active-businesses',
    '/rest/v1/businesses?select=id,name,slug,status,business_type&status=eq.active&order=name&limit=10',
    (v) => {
      array(v);
      if (!v.length || v.some((x) => !x.id || !x.name || !x.slug || x.status !== 'active'))
        throw new Error('Public active businesses empty or invalid');
    },
  );
  if (businesses?.length) {
    const id = encodeURIComponent(businesses[0].id);
    const route = `/rest/v1/businesses?select=id,name,slug,status,business_type,description,category_summary,primary_color,accent_color,timezone&id=eq.${id}`;
    const single = (v) => {
      array(v);
      if (v.length !== 1 || v[0].status !== 'active')
        throw new Error('Expected exactly one accessible active business page');
    };
    await check('open-public-business-page', route, single, (v) => ({
      rows: v.length,
      hasName: !!v[0].name,
      hasTimezone: !!v[0].timezone,
    }));
    await check('repeat-public-business-page', route, single);
    await check(
      'read-public-business-categories',
      `/rest/v1/business_categories?select=category_id,is_primary&business_id=eq.${id}`,
      array,
    );
    await check(
      'read-public-offering-sections',
      `/rest/v1/offering_sections?select=id,name&business_id=eq.${id}&is_visible=eq.true&archived_at=is.null&order=display_order`,
      array,
    );
    await check(
      'read-public-offering-items',
      `/rest/v1/offering_items?select=id,section_id,name,price_minor,currency,is_available&business_id=eq.${id}&is_visible=eq.true&limit=20`,
      array,
    );
  } else
    report.checks.push({
      id: 'public-business-details',
      status: 'skipped',
      reason: 'No valid active business fixture was readable; detail requests were not fabricated.',
    });
  report.completedAtUtc = new Date().toISOString();
  report.limit =
    'Anonymous API contracts and repeat reads only. Empty catalogs can pass an array contract; this does not prove ordering, booking, loyalty redemption, onboarding creation, auth login/recovery, moderation, native rendering, or notifications.';
  save();
  process.exitCode = report.checks.some((c) => c.status === 'failed') ? 1 : 0;
}
console.log(
  JSON.stringify(
    {
      output,
      checks: report.checks.map(({ id, status, reason, result }) => ({
        id,
        status,
        reason,
        result,
      })),
    },
    null,
    2,
  ),
);
