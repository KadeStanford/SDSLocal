import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = 'https://lgddhdexvwclfrnzjtly.supabase.co';
const file = process.env.READINESS_STAGING_FIXTURE_FILE;
if (!file)
  throw new Error(
    'A private task-4 confirmed-fixture manifest is required; no accounts are created by this script',
  );
const fixture = JSON.parse(fs.readFileSync(file, 'utf8'));
if (fixture.backend !== backend || fixture.confirmedDedicatedFixtures !== true || !fixture.anonKey)
  throw new Error('Exact staging dedicated-fixture guard failed');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (
  !Array.isArray(fixture.customers) ||
  fixture.customers.length !== 2 ||
  new Set(fixture.customers.map((customer) => customer.userId)).size !== 2
)
  throw new Error('Two distinct dedicated customers are required');
for (const customer of fixture.customers)
  if (
    !uuid.test(customer.userId) ||
    !customer.accessToken ||
    !Array.isArray(customer.expectedAppointmentIds) ||
    !customer.expectedAppointmentIds.length ||
    !customer.expectedAppointmentIds.every((id) => uuid.test(id))
  )
    throw new Error(
      'Nonempty known ordinary-flow appointment fixtures and private access tokens are required',
    );
const report = {
  startedAtUtc: new Date().toISOString(),
  backend,
  scope:
    'Signed-in staging appointment-history API, two confirmed dedicated customers; not native UI',
  command: 'node scripts/readiness-staging-history.mjs (private READINESS_STAGING_FIXTURE_FILE)',
  mode: 'GET only. No fixture/account creation, sessions, SQL, emails, payments, notifications or writes.',
  checks: [],
};
const safeFields = [
  'id',
  'business_id',
  'business_name',
  'service_name',
  'starts_at',
  'ends_at',
  'timezone',
  'status',
  'payment_status',
].sort();
async function get(route, token) {
  const response = await fetch(backend + route, {
    method: 'GET',
    headers: { apikey: fixture.anonKey, Authorization: `Bearer ${token}` },
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (response.status !== 200)
    throw new Error(`Expected HTTP 200; got ${response.status}, code ${body?.code ?? 'none'}`);
  return body;
}
for (const [index, customer] of fixture.customers.entries()) {
  const entry = {
    id: `customer-${index + 1}-history-isolation-and-repeat`,
    startedAtUtc: new Date().toISOString(),
    method: 'GET',
    routes: ['/auth/v1/user', '/rest/v1/rpc/get_customer_appointments'],
  };
  report.checks.push(entry);
  try {
    const user = await get('/auth/v1/user', customer.accessToken);
    if (user.id !== customer.userId || !user.email_confirmed_at)
      throw new Error('Token is not for the designated confirmed fixture customer');
    const first = await get('/rest/v1/rpc/get_customer_appointments', customer.accessToken);
    const repeated = await get('/rest/v1/rpc/get_customer_appointments', customer.accessToken);
    const expected = [...customer.expectedAppointmentIds].sort();
    if (
      !Array.isArray(first) ||
      JSON.stringify(first.map((row) => row.id).sort()) !== JSON.stringify(expected)
    )
      throw new Error(
        'Returned history does not match this dedicated customer’s known appointment IDs',
      );
    if (first.some((row) => JSON.stringify(Object.keys(row).sort()) !== JSON.stringify(safeFields)))
      throw new Error('History payload fields differ from the reviewed summary-only contract');
    if (
      first.some(
        (row, rowIndex) =>
          rowIndex > 0 && Date.parse(first[rowIndex - 1].starts_at) < Date.parse(row.starts_at),
      )
    )
      throw new Error('History is not sorted by descending start time');
    const other = fixture.customers[1 - index];
    if (first.some((row) => other.expectedAppointmentIds.includes(row.id)))
      throw new Error('Another customer’s appointment appeared');
    if (JSON.stringify(first) !== JSON.stringify(repeated))
      throw new Error('History changed on immediate repeat read');
    entry.status = 'passed';
    entry.result = {
      rows: first.length,
      expectedIdsMatch: true,
      otherCustomerExcluded: true,
      summaryOnlyFields: true,
      descendingStartsAt: true,
      sameOnRepeat: true,
    };
  } catch (error) {
    entry.status = 'failed';
    entry.error = error.message;
  }
  entry.completedAtUtc = new Date().toISOString();
}
report.completedAtUtc = new Date().toISOString();
report.totals = {
  passed: report.checks.filter((check) => check.status === 'passed').length,
  failed: report.checks.filter((check) => check.status === 'failed').length,
};
const output = path.resolve(
  root,
  process.argv[2] ?? 'reports/readiness/evidence/staging-history-signed-in.json',
);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ completedAtUtc: report.completedAtUtc, totals: report.totals }));
process.exitCode = report.totals.failed ? 1 : 0;
