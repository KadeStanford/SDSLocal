import { CommerceError, fail, string } from './square-security.ts';

type StripeObject = Record<string, any>;

export function stripeConnectAccountCreateParams(input: {
  businessId: string;
  businessName: string | null | undefined;
  contactEmail?: string;
}) {
  const businessName = input.businessName?.trim() || 'Business';
  const contactEmail = input.contactEmail?.trim();
  return {
    ...(contactEmail ? { contact_email: contactEmail } : {}),
    display_name: businessName,
    // The pickup catalog is currently US-only. Let Stripe collect each owner's
    // legal entity type; prefilling company excludes sole proprietors and can
    // lock in the wrong legal profile before the owner sees the form.
    identity: { country: 'us' },
    configuration: { merchant: { capabilities: { card_payments: { requested: true } } } },
    defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
    dashboard: 'full',
    include: ['configuration.merchant', 'defaults'],
    metadata: { sds_business_id: input.businessId },
  };
}

export function stripeOnboardingSessionIsReady(session: StripeObject, accountId: string) {
  return (
    session.livemode === false &&
    session.account === accountId &&
    session.components?.account_onboarding?.enabled === true &&
    typeof session.client_secret === 'string' &&
    session.client_secret.trim().length > 0
  );
}

export class StripeClient {
  constructor(
    readonly secretKey: string,
    readonly accountId?: string,
    readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request(
    path: string,
    params?: Record<string, unknown>,
    method: 'GET' | 'POST' = 'POST',
    idempotencyKey?: string,
  ) {
    const isV2 = path.startsWith('/v2/');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': isV2 ? 'application/json' : 'application/x-www-form-urlencoded',
    };
    if (isV2) headers['Stripe-Version'] = '2025-12-15.preview';
    if (this.accountId) headers['Stripe-Account'] = this.accountId;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    let url = `https://api.stripe.com${path}`;
    const init: RequestInit = { method, headers, signal: AbortSignal.timeout(20000) };
    if (method === 'GET') {
      const query = params ? new URLSearchParams(flatten(params)).toString() : '';
      if (query) url += `?${query}`;
    } else if (params)
      init.body = isV2 ? JSON.stringify(params) : new URLSearchParams(flatten(params));
    const endpoint = path.replace(/\/acct_[A-Za-z0-9]+/g, '/acct_[redacted]');
    let response: Response;
    try {
      response = await this.fetchImpl(url, init);
    } catch (error) {
      console.error('Stripe API request failed before a response', {
        endpoint,
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
    const body = (await response.json().catch(() => ({}))) as StripeObject;
    if (!response.ok) {
      console.error('Stripe API request failed', {
        endpoint,
        status: response.status,
        requestId: response.headers.get('Request-Id'),
        errorType: typeof body.error?.type === 'string' ? body.error.type : undefined,
        errorCode: typeof body.error?.code === 'string' ? body.error.code : undefined,
      });
      const providerCode =
        typeof body.error?.code === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(body.error.code)
          ? body.error.code
          : undefined;
      const providerRequestId = response.headers.get('Request-Id');
      throw Object.assign(
        new CommerceError(
          'PROVIDER_ERROR',
          'Stripe could not complete this action. Please retry or contact support with the request reference.',
          response.status >= 500 ? 503 : 409,
        ),
        {
          ...(providerCode ? { providerCode } : {}),
          ...(providerRequestId && /^req_[A-Za-z0-9]+$/.test(providerRequestId)
            ? { providerRequestId }
            : {}),
        },
      );
    }
    return body;
  }
}

function flatten(value: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (raw === undefined || raw === null) continue;
    if (Array.isArray(raw))
      raw.forEach((item, index) => Object.assign(result, flatten({ [String(index)]: item }, name)));
    else if (typeof raw === 'object')
      Object.assign(result, flatten(raw as Record<string, unknown>, name));
    else result[name] = String(raw);
  }
  return result;
}

export function stripeAccountId(value: unknown) {
  const account = string(value, 100);
  if (!/^acct_[A-Za-z0-9]+$/.test(account)) fail('INVALID_REQUEST', 'Invalid Stripe account.');
  return account;
}

export function stripeCheckoutUrl(value: unknown) {
  const url = string(value, 2048);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    fail('PROVIDER_ERROR', 'Stripe checkout is not ready.', 503);
  }
  if (
    parsed.protocol !== 'https:' ||
    !['checkout.stripe.com', 'connect.stripe.com', 'accounts.stripe.com'].includes(parsed.hostname)
  )
    fail('PROVIDER_ERROR', 'Stripe checkout is not ready.', 503);
  return url;
}

export async function stripeWebhookSignature(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const timestamp = Number(
    header
      .split(',')
      .map((piece) => piece.trim())
      .find((piece) => piece.startsWith('t='))
      ?.slice(2),
  );
  const signatures = header
    .split(',')
    .map((piece) => piece.trim())
    .filter((piece) => piece.startsWith('v1='))
    .map((piece) => piece.slice(3));
  if (
    !Number.isFinite(timestamp) ||
    !signatures.length ||
    Math.abs(Date.now() / 1000 - timestamp) > 300
  )
    return false;
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(`${timestamp}.${raw}`)),
  );
  const expected = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return signatures.some((signature) => {
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let index = 0; index < expected.length; index++)
      result |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
    return result === 0;
  });
}
