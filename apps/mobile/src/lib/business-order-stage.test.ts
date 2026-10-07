import { describe, expect, it } from 'vitest';
import { businessOrderStage } from './business-order-stage';
import { orderStatusLabel } from './square-commerce-core';

describe('merchant instructions follow the confirmed order stage', () => {
  it('covers every status displayed by commerce without falling back to generic instructions', () => {
    for (const status of Object.keys(orderStatusLabel)) {
      expect(businessOrderStage(status).title, status).not.toBe('Order details');
    }
  });
  it('reserves scanning instructions for an order ready for handoff', () => {
    for (const status of Object.keys(orderStatusLabel)) {
      expect(/scan/i.test(businessOrderStage(status).instruction), status).toBe(status === 'ready');
    }
    expect(businessOrderStage('ready').instruction).not.toContain('accept');
    expect(businessOrderStage('completed').instruction).not.toContain('mark');
  });
  it('never tells businesses to prepare an unconfirmed payment', () => {
    expect(businessOrderStage('checkout_pending').instruction).toContain(
      'Wait for payment confirmation',
    );
    expect(businessOrderStage('checkout_failed').instruction).toContain('not confirmed');
    expect(businessOrderStage('payment_review').instruction).toContain('before preparing');
    expect(businessOrderStage('future_provider_state').instruction).toContain(
      'before taking action',
    );
  });
});
