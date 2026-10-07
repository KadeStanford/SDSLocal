import { describe, expect, it, vi, afterEach } from 'vitest';
import { stripePaymentIntentPatch, stripeSessionPatch } from './stripe-order-state';
import { StripeService } from './stripe-service';
import { StripeClient } from './stripe-client';
import type { StripeConfig } from './square-security';
const order = {
  id: 'order-fixture',
  merchant_id: 'acct_fixture',
  square_payment_id: 'pi_fixture',
  square_order_id: 'cs_fixture',
  total_minor: 1200,
  currency: 'USD',
  status: 'checkout_pending',
  provider_request: { checkoutMode: 'payment_sheet' },
  expires_at: '2099-01-01T00:00:00Z',
};
const intent = {
  id: 'pi_fixture',
  livemode: false,
  metadata: { sds_order_id: order.id },
  amount: 1200,
  currency: 'usd',
  client_secret: 'pi_fixture_secret_fixture',
};
afterEach(() => vi.restoreAllMocks());
describe('interrupted Stripe checkout', () => {
  it.each([
    ['requires_payment_method', 'PAYMENT_METHOD_REQUIRED'],
    ['requires_confirmation', 'PAYMENT_METHOD_REQUIRED'],
    ['requires_action', 'PAYMENT_ACTION_REQUIRED'],
    ['processing', 'PAYMENT_PROCESSING'],
  ])('projects %s without cancelling or placing the order', (status, provider_status) => {
    expect(stripePaymentIntentPatch(order, { ...intent, status })).toEqual({ provider_status });
    expect(stripePaymentIntentPatch({ ...order, status: 'placed' }, { ...intent, status })).toEqual(
      {},
    );
  });
  it('treats an open hosted checkout as unfinished and still accepts a later verified payment', () => {
    const session = {
      id: 'cs_fixture',
      livemode: false,
      client_reference_id: order.id,
      metadata: { sds_order_id: order.id },
      status: 'open',
      payment_status: 'unpaid',
    };
    expect(stripeSessionPatch(order, session)).toEqual({
      provider_status: 'PAYMENT_METHOD_REQUIRED',
    });
    expect(
      stripeSessionPatch(order, {
        ...session,
        status: 'complete',
        payment_status: 'paid',
        amount_total: 1200,
        currency: 'usd',
        payment_intent: { ...intent, status: 'succeeded', amount_received: 1200 },
      }),
    ).toMatchObject({ status: 'placed', provider_status: 'PAID' });
  });
  it.each(['requires_payment_method', 'requires_action', 'processing'])(
    'resumes the same intent safely in %s',
    async (status) => {
      const service = new StripeService(
        {} as never,
        { secretKey: 'sk_test_fixture' } as StripeConfig,
      );
      const locked = { ...order };
      vi.spyOn(service, 'reconcile').mockResolvedValue(locked);
      vi.spyOn(service, 'withOrderLease').mockImplementation(async (_id, _user, callback) =>
        callback(locked, 'lease'),
      );
      vi.spyOn(service, 'patchOrder').mockImplementation(async (_id, _lease, patch) => ({
        ...locked,
        ...patch,
      }));
      vi.spyOn(service, 'orderProjection').mockImplementation(async (row) => row as never);
      const request = vi
        .spyOn(StripeClient.prototype, 'request')
        .mockResolvedValue({ ...intent, status });
      const result = await service.ensurePaymentSheet(locked);
      expect(request).toHaveBeenCalledExactlyOnceWith(
        '/v1/payment_intents/pi_fixture',
        undefined,
        'GET',
      );
      expect(result.order.status).toBe('checkout_pending');
      if (status === 'processing') expect(result).not.toHaveProperty('paymentIntentClientSecret');
      else expect(result).toHaveProperty('paymentIntentClientSecret', intent.client_secret);
    },
  );
});
