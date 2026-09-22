import { CommerceError, fail, string } from './square-security.ts';

type StripeObject = Record<string, any>;

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
    const response = await this.fetchImpl(url, init);
    const body = (await response.json().catch(() => ({}))) as StripeObject;
    if (!response.ok) {
      const message =
        typeof body.error?.message === 'string'
          ? body.error.message
          : 'Stripe test checkout is temporarily unavailable.';
      throw new CommerceError('PROVIDER_ERROR', message, response.status >= 500 ? 503 : 409);
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
