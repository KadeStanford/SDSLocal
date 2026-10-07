import { afterEach, expect, it, vi } from 'vitest';
import { SquareService } from './square-service';
import { StripeService } from './stripe-service';
import { StripeClient } from './stripe-client';
afterEach(() => vi.restoreAllMocks());
it.each(['square', 'stripe'])(
  'persists calculated %s item intent before requesting money and reuses a pending refund',
  async (provider) => {
    const order: any = {
      id: 'order',
      business_id: 'business',
      merchant_id: 'acct_fixture',
      provider,
      status: 'placed',
      version: 1,
      total_minor: 350,
      refunded_minor: 0,
      currency: 'USD',
      paid_at: '2026-09-28T12:00:00Z',
      square_payment_id: 'pi_fixture',
      item_refunds: [],
    };
    const db: any = {
      from: vi.fn(() => ({
        select: () => ({
          eq: async () => ({
            data: [
              {
                id: 'item',
                snapshot: { name: 'Coffee', quantity: '2', total_money: { amount: 350 } },
              },
            ],
            error: null,
          }),
        }),
        insert: async () => ({ data: null, error: null }),
      })),
    };
    const service =
      provider === 'stripe'
        ? new StripeService(db, { secretKey: 'sk_test_fixture' } as any)
        : new SquareService(db, {} as any);
    vi.spyOn(service, 'authorizeOrder').mockResolvedValue(order);
    vi.spyOn(service, 'reconcile').mockResolvedValue(order);
    vi.spyOn(service, 'withOrderLease').mockImplementation(async (_id, _version, fn) =>
      fn(order, 'lease'),
    );
    const patch = vi
      .spyOn(service, 'patchOrder')
      .mockImplementation(async (_id, _lease, value) => Object.assign(order, value));
    vi.spyOn(service, 'orderProjection').mockImplementation(async (value) => value);
    const response = {
      id: 'refund',
      amount: 175,
      currency: 'usd',
      payment_intent: 'pi_fixture',
      status: 'pending',
    };
    const request =
      provider === 'stripe'
        ? vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue(response)
        : vi.fn().mockResolvedValue({
            refund: {
              id: 'refund',
              payment_id: 'pi_fixture',
              status: 'PENDING',
              amount_money: { amount: 175, currency: 'USD' },
            },
          });
    if (service instanceof SquareService)
      vi.spyOn(service, 'provider').mockResolvedValue({
        client: { request },
        connection: { merchant_id: order.merchant_id },
      } as any);
    await service.refund('order', 'owner', {
      confirmed: true,
      version: 1,
      items: [{ itemId: 'item', quantity: 1 }],
    });
    expect(patch.mock.calls[0]?.[2]).toMatchObject({
      refund_amount_minor: 175,
      item_refunds: [
        { state: 'pending', amount: 175, items: [{ itemId: 'item', quantity: 1, amount: 175 }] },
      ],
    });
    expect(patch.mock.invocationCallOrder[0]).toBeLessThan(request.mock.invocationCallOrder[0]!);
    const key = order.refund_key;
    await service.refund('order', 'owner', {
      confirmed: true,
      version: 1,
      items: [{ itemId: 'foreign', quantity: 999 }],
    });
    expect(order.refund_key).toBe(key);
    expect(order.item_refunds).toHaveLength(1);
    expect(request.mock.calls[1]?.[0]).toBe(
      provider === 'stripe' ? '/v1/refunds/refund' : '/v2/refunds/refund',
    );
    await expect(
      service.refund('order', 'owner', { confirmed: true, version: 1, amountMinor: 1 }),
    ).rejects.toMatchObject({ code: 'INVALID_REFUND_ITEMS' });
    expect(request).toHaveBeenCalledTimes(2);
  },
);
