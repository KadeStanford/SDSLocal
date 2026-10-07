import { describe, expect, it } from 'vitest';
import { paymentNeedsCustomer, pendingPaymentPresentation } from './pending-payment';
import { waitForOrderConfirmation } from './order-confirmation';
const pending = { status: 'checkout_pending' };
describe('pending payment feedback', () => {
  it.each(['PAYMENT_METHOD_REQUIRED', 'PAYMENT_ACTION_REQUIRED'])(
    'releases a stale submitted state only for verified %s',
    (providerStatus) => {
      const order = { ...pending, providerStatus };
      expect(paymentNeedsCustomer(order)).toBe(true);
      expect(pendingPaymentPresentation(order, true, true)).toMatchObject({
        waiting: false,
        canContinue: true,
      });
      expect(paymentNeedsCustomer({ ...order, status: 'placed' })).toBe(false);
    },
  );
  it('keeps submitted and processing payments out of the retry path after a timeout', () => {
    for (const order of [pending, { ...pending, providerStatus: 'PAYMENT_PROCESSING' }]) {
      expect(pendingPaymentPresentation(order, true, true)).toMatchObject({
        title: 'Still checking payment',
        waiting: true,
        canContinue: false,
      });
    }
  });
  it('does not describe an unsubmitted checkout as a confirmed or processing payment', () => {
    expect(pendingPaymentPresentation(pending)).toMatchObject({
      title: 'Payment not confirmed',
      waiting: false,
    });
  });
  it('ends the fast confirmation check immediately when the server needs customer action', async () => {
    let calls = 0;
    const result = await waitForOrderConfirmation(async () => {
      calls++;
      return { ...pending, providerStatus: 'PAYMENT_METHOD_REQUIRED' };
    });
    expect(calls).toBe(1);
    expect(result?.status).toBe('checkout_pending');
  });
});
