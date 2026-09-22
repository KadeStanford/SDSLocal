import { describe, expect, it, vi } from 'vitest';

import { parseRevenueCatWebhook, webhookSecretMatches } from './revenuecat-webhook.ts';

const userId = 'd742c5f1-0f70-4e17-b966-88aa43e2d50d';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      id: 'event-1',
      type: 'INITIAL_PURCHASE',
      app_user_id: userId,
      entitlement_ids: ['business_listing'],
      store: 'APP_STORE',
      environment: 'SANDBOX',
      product_id: 'listing_single_monthly_v1',
      original_transaction_id: 'transaction-1',
      purchased_at_ms: Date.UTC(2026, 8, 20),
      expiration_at_ms: Date.UTC(2026, 9, 20),
      ...overrides,
    },
  };
}

describe('parseRevenueCatWebhook', () => {
  it('maps an Apple sandbox purchase to an active listing entitlement', () => {
    expect(parseRevenueCatWebhook(payload())).toMatchObject({
      eventId: 'event-1',
      userId,
      provider: 'apple',
      environment: 'sandbox',
      productId: 'listing_single_monthly_v1',
      status: 'active',
      willRenew: true,
    });
  });

  it('preserves the Google subscription and base-plan identifier', () => {
    expect(
      parseRevenueCatWebhook(
        payload({ store: 'PLAY_STORE', product_id: 'listing_multi_v1:yearly' }),
      ),
    ).toMatchObject({ provider: 'google', productId: 'listing_multi_v1:yearly' });
  });

  it('keeps a cancelled subscription active through its paid period', () => {
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    const event = parseRevenueCatWebhook(
      payload({ type: 'CANCELLATION', expiration_at_ms: Date.UTC(2026, 9, 20) }),
    );
    expect(event.status).toBe('active');
    expect(event.willRenew).toBe(false);
    vi.useRealTimers();
  });

  it('rejects an event for an unrelated entitlement', () => {
    expect(() => parseRevenueCatWebhook(payload({ entitlement_ids: ['other'] }))).toThrow(
      'business listing entitlement',
    );
  });

  it('rejects a non-UUID app user id so purchases cannot target arbitrary accounts', () => {
    expect(() => parseRevenueCatWebhook(payload({ app_user_id: 'someone@example.com' }))).toThrow(
      'Supabase user UUID',
    );
  });
});

describe('webhookSecretMatches', () => {
  const secret = 'test-secret-that-is-long-enough';

  it('accepts the configured bearer secret only', () => {
    expect(webhookSecretMatches(`Bearer ${secret}`, secret)).toBe(true);
    expect(webhookSecretMatches('Bearer wrong-secret-that-is-long', secret)).toBe(false);
    expect(webhookSecretMatches(null, secret)).toBe(false);
  });
});
