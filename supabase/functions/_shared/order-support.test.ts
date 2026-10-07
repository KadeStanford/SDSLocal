import { describe, expect, it } from 'vitest';
import {
  canRequestOrderSupport,
  customerCancellationCutoff,
  parseOrderSupportRequest,
  parseOrderSupportResolution,
} from './order-support.ts';

describe('customer order support requests', () => {
  it('accepts only a supported reason and a bounded note', () => {
    expect(parseOrderSupportRequest('change', 'Please remove one item.')).toEqual({
      type: 'change',
      message: 'Please remove one item.',
    });
    expect(() => parseOrderSupportRequest('refund', 'Please help me.')).toThrow();
    expect(() => parseOrderSupportRequest('issue', 'short')).toThrow();
    expect(() => parseOrderSupportRequest('issue', 'x'.repeat(1501))).toThrow();
  });

  it('keeps support available only while the order is active', () => {
    for (const status of ['checkout_pending', 'placed', 'accepted', 'preparing', 'ready'])
      expect(canRequestOrderSupport(status)).toBe(true);
    for (const status of ['completed', 'refunded', 'checkout_expired', 'checkout_failed'])
      expect(canRequestOrderSupport(status)).toBe(false);
    expect(canRequestOrderSupport('completed', 'issue')).toBe(true);
    for (const status of [
      'refunded',
      'cancelled',
      'checkout_expired',
      'checkout_failed',
      'dispute_lost',
    ]) {
      for (const type of ['cancel', 'change', 'issue'] as const)
        expect(canRequestOrderSupport(status, type)).toBe(false);
    }
  });

  it('uses the merchant prep window as the customer cancellation cutoff', () => {
    const pickupAt = '2026-10-03T18:00:00.000Z';
    const cutoff = Date.parse(pickupAt) - 20 * 60_000;
    expect(customerCancellationCutoff('placed', pickupAt, 20)).toBe(cutoff);
    expect(customerCancellationCutoff('accepted', pickupAt, 20)).toBe(cutoff);
    expect(customerCancellationCutoff('preparing', pickupAt, 20)).toBeNull();
    expect(customerCancellationCutoff('placed', pickupAt, 0)).toBeNull();
  });

  it('allows only explicit merchant outcomes', () => {
    expect(parseOrderSupportResolution('resolved')).toBe('resolved');
    expect(parseOrderSupportResolution('declined')).toBe('declined');
    expect(() => parseOrderSupportResolution('open')).toThrow();
  });
});
