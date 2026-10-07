import { afterEach, describe, expect, it, vi } from 'vitest';
import { moneyPatch, squareRefundTotal } from './payment-money';
import { configureStripeWebhooks, stripePaymentEvents } from './stripe-webhook-config';
import { SquareService } from './square-service';
import { StripeService } from './stripe-service';
import { StripeClient } from './stripe-client';
const row = () => ({
  id: '88888888-8888-4888-8888-888888888889',
  business_id: '88888888-8888-4888-8888-888888888888',
  merchant_id: 'acct_fixture',
  provider: 'stripe',
  status: 'payment_review',
  total_minor: 350,
  refunded_minor: 100,
  square_payment_id: 'pi_fixture',
  paid_at: '2026-09-28T12:00:00Z',
  provider_status: 'PARTIAL_REFUND',
  version: 1,
});
const db = () =>
  ({ from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })) }) as any;
afterEach(() => vi.restoreAllMocks());
describe('Canonical payment lifecycle', () => {
  it('aggregates multiple Square partial refunds and ignores duplicate IDs', () => {
    const order = { ...row(), provider: 'square' };
    const payment = { id: 'pi_fixture', total_money: { amount: 350, currency: 'USD' } };
    order.currency = 'USD';
    const first = {
      id: 'r1',
      payment_id: 'pi_fixture',
      amount_money: { amount: 100, currency: 'USD' },
      status: 'COMPLETED',
    };
    const final = { ...first, id: 'r2', amount_money: { amount: 250, currency: 'USD' } };
    expect(squareRefundTotal(order, payment, [first, first, final])).toMatchObject({
      status: 'refunded',
      refunded_minor: 350,
    });
  });
  it('rejects a foreign payment refund and impossible aggregate total', () => {
    const order = { ...row(), currency: 'USD' };
    const payment = { id: 'pi_fixture', total_money: { amount: 350, currency: 'USD' } };
    const refund = {
      id: 'r1',
      payment_id: 'foreign',
      amount_money: { amount: 100, currency: 'USD' },
      status: 'COMPLETED',
    };
    expect(() => squareRefundTotal(order, payment, [refund])).toThrow();
    expect(() => moneyPatch(order, 351)).toThrow();
  });
  it('restores the previous kitchen phase after a canonically won dispute', () => {
    expect(
      moneyPatch(
        {
          ...row(),
          refunded_minor: 0,
          provider_status: 'PAYMENT_DISPUTED',
          payment_resume_status: 'ready',
        },
        0,
        false,
        { id: 'du_fixture', state: 'WON' },
      ),
    ).toMatchObject({ status: 'ready', dispute_state: 'WON' });
  });
  it('records a lost dispute separately from a refund', () => {
    expect(
      moneyPatch(row(), 100, false, { id: 'du_fixture', state: 'LOST', amount: 250 }),
    ).toMatchObject({ status: 'dispute_lost', refunded_minor: 100, disputed_minor: 250 });
  });
  it('does not repeatedly pause an acknowledged partial refund', () => {
    expect(
      moneyPatch({ ...row(), status: 'ready', reviewed_refunded_minor: 100 }, 100),
    ).not.toHaveProperty('status');
    expect(
      moneyPatch({ ...row(), status: 'ready', reviewed_refunded_minor: 100 }, 150),
    ).toMatchObject({ status: 'payment_review' });
  });
  it.each(['stripe', 'square'])('refunds only the remaining %s amount', async (provider) => {
    const order = { ...row(), provider, currency: 'USD' };
    const service =
      provider === 'stripe'
        ? new StripeService(db(), { secretKey: 'sk_test_fixture' } as any)
        : new SquareService(db(), {} as any);
    vi.spyOn(service, 'authorizeOrder').mockResolvedValue(order);
    vi.spyOn(service, 'reconcile').mockResolvedValue(order);
    vi.spyOn(service, 'withOrderLease').mockImplementation(async (_id, _version, fn) =>
      fn(order, 'lease'),
    );
    vi.spyOn(service, 'patchOrder').mockImplementation(async (_id, _lease, patch) =>
      Object.assign(order, patch),
    );
    vi.spyOn(service, 'orderProjection').mockImplementation(async (value) => value);
    const request =
      provider === 'stripe'
        ? vi
            .spyOn(StripeClient.prototype, 'request')
            .mockResolvedValue({
              id: 'r2',
              payment_intent: 'pi_fixture',
              amount: 250,
              currency: 'usd',
              status: 'succeeded',
            })
        : vi
            .fn()
            .mockResolvedValue({
              refund: {
                id: 'r2',
                payment_id: 'pi_fixture',
                amount_money: { amount: 250, currency: 'USD' },
                status: 'COMPLETED',
              },
            });
    if (service instanceof SquareService)
      vi.spyOn(service, 'provider').mockResolvedValue({
        client: { request },
        connection: { merchant_id: order.merchant_id },
      } as any);
    const result = await service.refund(order.id, 'owner', { confirmed: true, version: 1 });
    expect(result.order.status).toBe('refunded');
    expect(order.refunded_minor).toBe(350);
    expect(request.mock.calls[0][1]).toMatchObject(
      provider === 'stripe' ? { amount: 250 } : { amount_money: { amount: 250 } },
    );
  });
  it('rejects a partial amount above the remaining balance without a provider call', async () => {
    const order = row();
    const service = new StripeService(db(), { secretKey: 'sk_test_fixture' } as any);
    vi.spyOn(service, 'authorizeOrder').mockResolvedValue(order);
    vi.spyOn(service, 'reconcile').mockResolvedValue(order);
    vi.spyOn(service, 'withOrderLease').mockImplementation(async (_id, _version, fn) =>
      fn(order, 'lease'),
    );
    const request = vi.spyOn(StripeClient.prototype, 'request');
    await expect(
      service.refund(order.id, 'owner', { confirmed: true, version: 1, amountMinor: 251 }),
    ).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
});
describe('Staging webhook destination configuration', () => {
  const url = 'https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/stripe-webhook';
  it('updates only the existing test destination and preserves its prior events', async () => {
    const client = new StripeClient('sk_test_fixture');
    const prior = ['checkout.session.completed'];
    const request = vi
      .spyOn(client, 'request')
      .mockResolvedValueOnce({
        data: [
          { id: 'we_fixture', url, livemode: false, status: 'enabled', enabled_events: prior },
        ],
        has_more: false,
      })
      .mockResolvedValueOnce({
        id: 'we_fixture',
        url,
        livemode: false,
        enabled_events: stripePaymentEvents,
      });
    const result = await configureStripeWebhooks(client, url);
    expect(result.eventCount).toBe(stripePaymentEvents.length);
    expect(request.mock.calls[1]).toEqual([
      '/v1/webhook_endpoints/we_fixture',
      { enabled_events: stripePaymentEvents },
    ]);
    expect(result).not.toHaveProperty('secret');
  });
  it.each([true, false])('refuses %s live-mode destinations', async (live) => {
    const client = new StripeClient('sk_test_fixture');
    const request = vi
      .spyOn(client, 'request')
      .mockResolvedValue({
        data: [
          {
            id: 'we_fixture',
            url,
            livemode: live,
            status: live ? 'enabled' : 'disabled',
            enabled_events: [],
          },
        ],
        has_more: false,
      });
    await expect(configureStripeWebhooks(client, url)).rejects.toThrow();
    expect(request).toHaveBeenCalledTimes(1);
  });
});
