import { describe, expect, it } from 'vitest';

import {
  authIntentDestination,
  consumePendingAuthIntent,
  parseCustomerAuthIntent,
  savePendingAuthIntent,
} from './auth-intents';

const businessId = '11111111-1111-4111-8111-111111111111';
const eventId = '22222222-2222-4222-8222-222222222222';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe('customer authentication intents', () => {
  it('accepts typed intents and preserves the business destination', () => {
    const intent = parseCustomerAuthIntent({
      kind: 'event_reminder',
      businessId,
      businessName: 'Bayou & Bloom',
      targetId: eventId,
      targetName: 'Coffee flight',
    });
    expect(intent).not.toBeNull();
    expect(authIntentDestination(intent!)).toEqual({
      pathname: '/explore',
      params: { businessId, resumeAction: 'event_reminder', targetId: eventId },
    });
  });

  it('rejects arbitrary routes, invalid IDs, and missing target IDs', () => {
    expect(parseCustomerAuthIntent({ kind: '/admin', businessId, businessName: 'Bad' })).toBeNull();
    expect(
      parseCustomerAuthIntent({ kind: 'follow', businessId: 'not-a-uuid', businessName: 'Bad' }),
    ).toBeNull();
    expect(
      parseCustomerAuthIntent({ kind: 'report_event', businessId, businessName: 'Bad' }),
    ).toBeNull();
  });

  it('consumes a valid intent once and rejects stale intents', () => {
    const storage = memoryStorage();
    const intent = { kind: 'follow' as const, businessId, businessName: 'Bayou & Bloom' };
    savePendingAuthIntent(intent, storage, 1_000);
    expect(consumePendingAuthIntent(storage, 2_000)).toEqual(intent);
    expect(consumePendingAuthIntent(storage, 2_000)).toBeNull();
    savePendingAuthIntent(intent, storage, 1_000);
    expect(consumePendingAuthIntent(storage, 31 * 60 * 1_000)).toBeNull();
  });

  it('restores business creation without requiring a fake business identifier', () => {
    const intent = parseCustomerAuthIntent({ kind: 'create_business' });
    expect(intent).toEqual({ kind: 'create_business' });
    expect(authIntentDestination(intent!)).toEqual({
      pathname: '/account',
      params: { startBusiness: '1' },
    });
  });
});
