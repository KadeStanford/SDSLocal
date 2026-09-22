#!/usr/bin/env node

function argument(name) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizedOrigin(value, label) {
  if (!value) throw new Error(`${label} is required.`);
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.origin !== url.href.replace(/\/$/, '')) {
    throw new Error(`${label} must be an absolute HTTPS origin without a path.`);
  }
  const host = url.hostname.toLowerCase();
  if (
    ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host) ||
    host.endsWith('.localhost') ||
    host.endsWith('.local')
  ) {
    throw new Error(`${label} must be reachable publicly.`);
  }
  return url.origin;
}

const origin = normalizedOrigin(
  argument('origin') ?? process.env.SDS_STAGING_SITE_URL,
  'Staging origin',
);
const slug = argument('slug') ?? process.env.SDS_STAGING_SMOKE_BUSINESS_SLUG;
const expectedBusiness = argument('business') ?? process.env.SDS_STAGING_SMOKE_BUSINESS_NAME;
const productionValue = argument('production-origin') ?? process.env.SDS_PRODUCTION_SITE_URL;
const productionOrigin = productionValue
  ? normalizedOrigin(productionValue, 'Production origin')
  : null;

if (!slug || !expectedBusiness) {
  throw new Error(
    'Provide --slug and --business (or SDS_STAGING_SMOKE_BUSINESS_SLUG and SDS_STAGING_SMOKE_BUSINESS_NAME).',
  );
}

const secretValues = Object.entries(process.env)
  .filter(([name, value]) =>
    Boolean(
      value &&
      value.length >= 12 &&
      /(SECRET|SERVICE_ROLE|ACCESS_TOKEN|PRIVATE_KEY|PASSWORD)/i.test(name),
    ),
  )
  .map(([, value]) => value);

function assertSafeResponse(response, body, label) {
  if (response.url && new URL(response.url).origin !== origin) {
    throw new Error(`${label} escaped the staging origin.`);
  }
  const location = response.headers.get('location');
  if (location) {
    const destination = new URL(location, origin);
    const host = destination.hostname.toLowerCase();
    if (
      ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(host) ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      (productionOrigin && destination.origin === productionOrigin)
    ) {
      throw new Error(`${label} redirects outside safe staging.`);
    }
  }
  const forbiddenMarkers = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ACCESS_TOKEN',
    'EAS_ACCESS_TOKEN',
    'VERCEL_TOKEN',
  ];
  if (forbiddenMarkers.some((marker) => body.includes(marker))) {
    throw new Error(`${label} contains a secret variable marker.`);
  }
  if (secretValues.some((secret) => body.includes(secret))) {
    throw new Error(`${label} contains a sensitive environment value.`);
  }
}

async function request(path, expectedStatuses, label) {
  const response = await fetch(`${origin}${path}`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15_000),
  });
  const body = await response.text();
  assertSafeResponse(response, body, label);
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${label} returned HTTP ${response.status}.`);
  }
  return { response, body };
}

const home = await request('/', [200], 'Homepage');
const publicBusinessPath = `/b/${encodeURIComponent(slug)}`;
const business = await request(publicBusinessPath, [200], 'Public business page');
if (!business.body.includes(expectedBusiness)) {
  throw new Error('Public business page did not contain the expected business name.');
}

const invalidSlug = `codex-smoke-missing-${Date.now()}`;
await request(`/b/${invalidSlug}`, [404], 'Unknown business page');

console.log(`PASS homepage: ${home.response.status}`);
console.log(`PASS business: ${business.response.status} ${publicBusinessPath}`);
console.log('PASS unknown business: 404');
console.log('PASS redirect and response-secret safety checks');
