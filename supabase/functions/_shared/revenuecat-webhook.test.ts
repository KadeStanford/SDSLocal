import { describe, expect, it, vi } from 'vitest';

import { parseRevenueCatWebhook, webhookSecretMatches } from './revenuecat-webhook.ts';

const userId = 'd742c5f1-0f70-4e17-b966-88aa43e2d50d';

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      id: 'event-1',
      event_timestamp_ms: Date.UTC(2026, 8, 20),
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

  it('requires an event timestamp so retried events can be ordered safely', () => {
    for (const timestamp of [undefined, null, 'invalid', 0, -1, 1e20]) {
      expect(() => parseRevenueCatWebhook(payload({ event_timestamp_ms: timestamp }))).toThrow(
        'event timestamp',
      );
    }
  });

  it('preserves paid access during the store billing grace period only', () => {
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    try {
      const graceEnd = Date.UTC(2026, 8, 23);
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'BILLING_ISSUE',
            expiration_at_ms: Date.UTC(2026, 8, 20),
            grace_period_expiration_at_ms: graceEnd,
          }),
        ),
      ).toMatchObject({
        status: 'grace_period',
        currentPeriodEnd: new Date(graceEnd).toISOString(),
      });
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'BILLING_ISSUE',
            grace_period_expiration_at_ms: null,
          }),
        ).status,
      ).toBe('billing_retry');
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'BILLING_ISSUE',
            grace_period_expiration_at_ms: Date.UTC(2026, 8, 19),
          }),
        ).status,
      ).toBe('billing_retry');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a scheduled Google pause active until the paid period expires', () => {
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    try {
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'SUBSCRIPTION_PAUSED',
            store: 'PLAY_STORE',
            product_id: 'listing_growth_v1:monthly',
          }),
        ),
      ).toMatchObject({ status: 'active', willRenew: false });
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'EXPIRATION',
            store: 'PLAY_STORE',
            product_id: 'listing_growth_v1:monthly',
            expiration_at_ms: Date.UTC(2026, 8, 20),
          }),
        ),
      ).toMatchObject({ status: 'expired', willRenew: false });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not activate an already elapsed pause or cancellation', () => {
    vi.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
    try {
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'SUBSCRIPTION_PAUSED',
            expiration_at_ms: Date.UTC(2026, 8, 20),
          }),
        ).status,
      ).toBe('paused');
      expect(
        parseRevenueCatWebhook(
          payload({
            type: 'CANCELLATION',
            expiration_at_ms: Date.UTC(2026, 8, 20),
          }),
        ).status,
      ).toBe('expired');
    } finally {
      vi.useRealTimers();
    }
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
