import { expect, it, vi } from 'vitest';
import { customerOrderView, loadCustomerOrders, mergeCustomerOrders } from './customer-orders';
import type { PickupOrder } from './square-commerce-core';
it('classifies all customer statuses without losing unfinished payments or refunds', () => {
  for (const status of [
    'checkout_pending',
    'placed',
    'accepted',
    'preparing',
    'ready',
    'payment_review',
    'refund_pending',
    'refund_failed',
  ])
    expect(customerOrderView(status)).toBe('current');
  for (const status of ['completed', 'refunded', 'checkout_failed', 'checkout_expired'])
    expect(customerOrderView(status)).toBe('history');
});
it('merges the same account/device order once, keeping the latest server version', () => {
  const order = { id: 'a', version: 1, createdAt: '2026-09-20T12:00:00Z' } as PickupOrder;
  expect(mergeCustomerOrders([{ ...order, version: 3 }], [order])).toEqual([
    { ...order, version: 3 },
  ]);
});
it('never requests account orders as a guest and sends only the saved device proofs', async () => {
  const read = vi.fn().mockResolvedValue({ orders: [], nextOffset: null });
  await loadCustomerOrders(
    null,
    'current',
    { account: 0, device: 0 },
    {
      read,
      access: async () => [
        { businessId: 'business', idempotencyKey: 'not-sent', orderId: 'a', statusToken: 'proof' },
      ],
    },
  );
  expect(read).toHaveBeenCalledExactlyOnceWith({
    source: 'device',
    view: 'current',
    offset: 0,
    access: [{ orderId: 'a', statusToken: 'proof' }],
  });
});
it('fetches signed-in and device history with independent pagination, never supplies a user ID', async () => {
  const read = vi.fn().mockResolvedValue({ orders: [], nextOffset: null });
  await loadCustomerOrders(
    'alice',
    'history',
    { account: 25, device: null },
    { read, access: vi.fn() },
  );
  expect(read).toHaveBeenCalledExactlyOnceWith({ source: 'account', view: 'history', offset: 25 });
});
it('propagates unavailable history instead of misrepresenting it as an empty history', async () => {
  await expect(
    loadCustomerOrders(
      'alice',
      'current',
      { account: 0, device: 0 },
      {
        access: async () => [],
        read: async () => {
          throw new Error('Offline');
        },
      },
    ),
  ).rejects.toThrow('Offline');
});
