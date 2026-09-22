export type ListingProvider = 'apple' | 'google' | 'test_store';
export type ListingStatus =
  'active' | 'grace_period' | 'billing_retry' | 'paused' | 'expired' | 'revoked';

export interface ParsedRevenueCatEvent {
  readonly eventId: string;
  readonly eventType: string;
  readonly userId: string;
  readonly provider: ListingProvider;
  readonly productId: string;
  readonly status: ListingStatus;
  readonly environment: 'sandbox' | 'production';
  readonly originalTransactionId: string;
  readonly purchasedAt: string | null;
  readonly currentPeriodEnd: string | null;
  readonly willRenew: boolean;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredString(value: unknown, label: string) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Missing ${label}.`);
  }
  return value.trim();
}

function optionalDate(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function providerForStore(value: unknown): ListingProvider {
  if (value === 'APP_STORE' || value === 'MAC_APP_STORE') return 'apple';
  if (value === 'PLAY_STORE') return 'google';
  if (value === 'TEST_STORE') return 'test_store';
  throw new Error('Unsupported subscription store.');
}

function environmentFor(value: unknown): ParsedRevenueCatEvent['environment'] {
  if (value === 'SANDBOX') return 'sandbox';
  if (value === 'PRODUCTION') return 'production';
  throw new Error('Unsupported subscription environment.');
}

function statusFor(type: string, expirationAt: string | null): ListingStatus {
  if (type === 'BILLING_ISSUE') return 'billing_retry';
  if (type === 'SUBSCRIPTION_PAUSED') return 'paused';
  if (type === 'EXPIRATION') return 'expired';
  if (type === 'CANCELLATION') {
    return expirationAt && new Date(expirationAt).getTime() > Date.now() ? 'active' : 'expired';
  }
  if (
    type === 'INITIAL_PURCHASE' ||
    type === 'RENEWAL' ||
    type === 'UNCANCELLATION' ||
    type === 'PRODUCT_CHANGE'
  ) {
    return 'active';
  }
  throw new Error('Unsupported subscription event type.');
}

export function parseRevenueCatWebhook(value: unknown): ParsedRevenueCatEvent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Webhook body must be an object.');
  }
  const root = value as Record<string, unknown>;
  if (!root.event || typeof root.event !== 'object' || Array.isArray(root.event)) {
    throw new Error('Missing webhook event.');
  }
  const event = root.event as Record<string, unknown>;
  const eventType = requiredString(event.type, 'event type');
  const eventId = requiredString(event.id, 'event id');
  const userId = requiredString(event.app_user_id, 'app user id');
  if (!uuidPattern.test(userId)) throw new Error('App user id must be a Supabase user UUID.');

  const entitlementIds = Array.isArray(event.entitlement_ids)
    ? event.entitlement_ids.filter((item): item is string => typeof item === 'string')
    : [];
  if (!entitlementIds.includes('business_listing')) {
    throw new Error('Event does not include the business listing entitlement.');
  }

  const currentPeriodEnd = optionalDate(event.expiration_at_ms);
  return {
    eventId,
    eventType,
    userId,
    provider: providerForStore(event.store),
    productId: requiredString(event.product_id, 'product id'),
    status: statusFor(eventType, currentPeriodEnd),
    environment: environmentFor(event.environment),
    originalTransactionId: requiredString(
      event.original_transaction_id ?? event.transaction_id,
      'original transaction id',
    ),
    purchasedAt: optionalDate(event.purchased_at_ms),
    currentPeriodEnd,
    willRenew: eventType !== 'CANCELLATION' && eventType !== 'EXPIRATION',
  };
}

export function webhookSecretMatches(header: string | null, expectedSecret: string) {
  if (!header?.startsWith('Bearer ') || expectedSecret.length < 24) return false;
  const actual = header.slice('Bearer '.length);
  if (actual.length !== expectedSecret.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) {
    mismatch |= actual.charCodeAt(index) ^ expectedSecret.charCodeAt(index);
  }
  return mismatch === 0;
}
