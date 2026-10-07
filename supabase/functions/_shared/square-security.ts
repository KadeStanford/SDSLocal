export const SQUARE_API_VERSION = '2026-09-16';
export const SQUARE_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE',
  'DISPUTES_READ',
] as const;
export class CommerceError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function fail(code: string, message: string, status = 400): never {
  throw new CommerceError(code, message, status);
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('INVALID_REQUEST', 'Check the information and try again.');
  return value as Record<string, unknown>;
}
export function string(value: unknown, max = 200): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail('INVALID_REQUEST', 'Check the information and try again.');
  return value.trim();
}
export function uuid(value: unknown, _field?: string): string {
  const result = string(value, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result))
    fail('INVALID_REQUEST', 'Invalid identifier.');
  return result;
}
export function integer(value: unknown, min = 0, max = 10000000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max)
    fail('INVALID_AMOUNT', 'Invalid amount or quantity.');
  return value;
}
export function opaqueToken(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value))
    fail('INVALID_TOKEN', 'This order access link is not valid.', 403);
  return value;
}
const encoder = new TextEncoder();
const hex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
export const hash = async (value: string) =>
  hex(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value))));
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unbase64 = (value: string) => Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export interface SealedToken {
  ciphertext: string;
  nonce: string;
  version: string;
}
async function encryptionKey(secret: string) {
  const bytes = unbase64(secret);
  if (bytes.length !== 32) fail('NOT_CONFIGURED', 'Ordering setup is incomplete.', 503);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function sealToken(
  value: string,
  secret: string,
  version: string,
  context: string,
): Promise<SealedToken> {
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce, additionalData: encoder.encode(context) },
    await encryptionKey(secret),
    encoder.encode(value),
  );
  return { ciphertext: base64(new Uint8Array(encrypted)), nonce: base64(nonce), version };
}
export async function openToken(value: SealedToken, keys: Record<string, string>, context: string) {
  const secret = keys[value.version];
  if (!secret) fail('KEY_UNAVAILABLE', 'Square connection needs attention.', 503);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unbase64(value.nonce), additionalData: encoder.encode(context) },
    await encryptionKey(secret),
    unbase64(value.ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}
export async function verifyWebhook(
  raw: string,
  signature: string | null,
  url: string,
  secret: string,
) {
  if (!signature || !secret) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    return await crypto.subtle.verify('HMAC', key, unbase64(signature), encoder.encode(url + raw));
  } catch {
    return false;
  }
}
export interface SquareConfig {
  appEnv: 'development' | 'staging';
  applicationId: string;
  applicationSecret: string;
  redirectUrl: string;
  webhookUrl: string;
  webhookKey: string;
  encryptionKey: string;
  keyVersion: string;
  keys: Record<string, string>;
  enabled: boolean;
  maintenanceSecret: string;
  allowedOrigin: string;
}
export function squareConfig(env: (key: string) => string | undefined): SquareConfig {
  const appEnv = env('APP_ENV');
  if ((appEnv !== 'development' && appEnv !== 'staging') || env('SQUARE_ENVIRONMENT') !== 'sandbox')
    fail('DISABLED', 'Pickup ordering is not available in this environment.', 503);
  const required = (name: string) => {
    const value = env(name);
    if (!value) fail('NOT_CONFIGURED', 'Square Sandbox setup is pending.', 503);
    return value;
  };
  if (required('SQUARE_API_VERSION') !== SQUARE_API_VERSION)
    fail('API_VERSION', 'Square setup needs an API version review.', 503);
  const redirectUrl = required('SQUARE_OAUTH_REDIRECT_URL');
  const webhookUrl = required('SQUARE_WEBHOOK_URL');
  for (const url of [redirectUrl, webhookUrl])
    if (new URL(url).protocol !== 'https:')
      fail('NOT_CONFIGURED', 'HTTPS callback URLs are required.', 503);
  const encryption = required('SQUARE_TOKEN_ENCRYPTION_KEY');
  const version = required('SQUARE_TOKEN_KEY_VERSION');
  const previous = env('SQUARE_TOKEN_PREVIOUS_KEYS');
  const keys = { ...(previous ? JSON.parse(previous) : {}), [version]: encryption };
  return {
    appEnv,
    applicationId: required('SQUARE_APPLICATION_ID'),
    applicationSecret: required('SQUARE_APPLICATION_SECRET'),
    redirectUrl,
    webhookUrl,
    webhookKey: required('SQUARE_WEBHOOK_SIGNATURE_KEY'),
    encryptionKey: encryption,
    keyVersion: version,
    keys,
    enabled:
      appEnv === 'development'
        ? env('SQUARE_COMMERCE_ENABLED') !== 'false'
        : env('SQUARE_COMMERCE_ENABLED') === 'true',
    maintenanceSecret: required('SQUARE_MAINTENANCE_SECRET'),
    allowedOrigin: env('SQUARE_ALLOWED_ORIGIN') ?? '',
  };
}
export function parseOAuthCallback(url: URL) {
  if (url.searchParams.getAll('state').length !== 1)
    fail('INVALID_STATE', 'Square authorization could not be verified.');
  const state = opaqueToken(url.searchParams.get('state'));
  if (url.searchParams.has('error')) return { state, code: null };
  if (url.searchParams.getAll('code').length !== 1)
    fail('INVALID_CALLBACK', 'Square authorization did not return a code.');
  return { state, code: string(url.searchParams.get('code'), 4096) };
}

export interface StripeConfig {
  appEnv: 'development' | 'staging';
  secretKey: string;
  checkoutReturnUrl: string;
  connectCallbackUrl: string;
  webhookSecret: string;
  enabled: boolean;
  allowedOrigin: string;
  applicationFeeMinor: number;
}

export function stripeConfig(env: (key: string) => string | undefined): StripeConfig {
  const appEnv = env('APP_ENV');
  if (appEnv !== 'development' && appEnv !== 'staging')
    fail('DISABLED', 'Stripe test ordering is not available in this environment.', 503);
  const required = (name: string) => {
    const value = env(name)?.trim();
    if (!value) fail('NOT_CONFIGURED', 'Stripe test ordering setup is pending.', 503);
    return value;
  };
  const secretKey = required('STRIPE_SECRET_KEY');
  if (!secretKey.startsWith('sk_test_'))
    fail('NOT_CONFIGURED', 'Stripe test ordering requires a test-mode secret key.', 503);
  const checkoutReturnUrl = required('STRIPE_CHECKOUT_RETURN_URL');
  const connectCallbackUrl = required('STRIPE_CONNECT_CALLBACK_URL');
  for (const url of [checkoutReturnUrl, connectCallbackUrl]) {
    if (new URL(url).protocol !== 'https:')
      fail('NOT_CONFIGURED', 'Stripe callback URLs must use HTTPS.', 503);
  }
  return {
    appEnv,
    secretKey,
    checkoutReturnUrl,
    connectCallbackUrl,
    webhookSecret: required('STRIPE_WEBHOOK_SECRET'),
    enabled:
      appEnv === 'development'
        ? env('STRIPE_COMMERCE_ENABLED') !== 'false'
        : env('STRIPE_COMMERCE_ENABLED') === 'true',
    allowedOrigin:
      env('STRIPE_ALLOWED_ORIGIN') ?? env('SQUARE_ALLOWED_ORIGIN') ?? env('SUPABASE_URL') ?? '',
    // SDS does not charge businesses a platform/application fee for Stripe orders.
    // Keep this hard-coded so a stale hosted secret cannot silently add a fee.
    applicationFeeMinor: 0,
  };
}
