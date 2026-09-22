import { describe, it, expect, vi } from 'vitest';
import { SquareService } from './square-service';
import { hash } from './square-security';
import type { SquareObject } from './square-client';
const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
function setup(rows: SquareObject[]) {
  const reads: { table: string; filters: [string, unknown][] }[] = [];
  const mutate = vi.fn(() => {
    throw new Error('History must never mutate orders');
  });
  const db = {
    from: (table: string) => {
      let selected = table === 'square_orders' ? [...rows] : [];
      const filters: [string, unknown][] = [];
      reads.push({ table, filters });
      const q: SquareObject = {
        select: () => q,
        eq: (key: string, value: unknown) => {
          filters.push([key, value]);
          selected = selected.filter((r) => r[key] === value);
          return q;
        },
        in: (key: string, values: unknown[]) => {
          selected = selected.filter((r) => values.includes(r[key]));
          return q;
        },
        not: (key: string, _operator: string, value: string) => {
          const values = value.slice(1, -1).split(',');
          selected = selected.filter((r) => !values.includes(r[key]));
          return q;
        },
        order: () => q,
        limit: (count: number) => {
          selected = selected.slice(0, count);
          return q;
        },
        range: (from: number, to: number) => {
          selected = selected.slice(from, to + 1);
          return q;
        },
        insert: mutate,
        update: mutate,
        delete: mutate,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: selected, error: null }).then(resolve),
      };
      return q;
    },
    rpc: mutate,
  };
  const provider = vi.fn(() => {
    throw new Error('History must never contact Square');
  });
  const service = new SquareService(db as never, {} as never, provider);
  vi.spyOn(service, 'businessIdentity').mockResolvedValue(null);
  return { service, reads, mutate, provider };
}
const row = (n: number, customer = 'alice', status = 'placed') => ({
  id: id(n),
  customer_id: customer,
  business_id: id(900),
  business_name: 'Cafe',
  order_number: `S-${n}`,
  status,
  version: 1,
  created_at: '2026-09-20T12:00:00Z',
  total_minor: 600,
  subtotal_minor: 600,
  tax_minor: 0,
  currency: 'USD',
  guest_hash: null,
  recipient: { phone_number: '+12255550123' },
  provider_request: { secret: 'never return' },
  square_payment_id: 'private-payment',
});
describe('customer order history authorization and read-only boundary', () => {
  it('requires an authenticated account and ignores a forged customer ID', async () => {
    const { service, reads } = setup([row(1), row(2, 'bob')]);
    await expect(
      service.route(
        { action: 'customer_orders', source: 'account', view: 'current', userId: 'alice' },
        null,
      ),
    ).rejects.toMatchObject({ code: 'SIGN_IN' });
    const result = await service.route(
      { action: 'customer_orders', source: 'account', view: 'current', userId: 'bob' },
      'alice',
    );
    expect(result.orders.map((o: SquareObject) => o.id)).toEqual([id(1)]);
    expect(
      reads.some((r) =>
        r.filters.some(([key, value]) => key === 'customer_id' && value === 'alice'),
      ),
    ).toBe(true);
  });
  it('accepts only a guest proof for the exact order and silently omits revoked/unknown proofs', async () => {
    const token = 'a'.repeat(64);
    const hashed = await hash(token);
    const { service } = setup([
      { ...row(1), guest_hash: hashed },
      { ...row(2), guest_hash: 'different' },
    ]);
    const result = await service.customerOrders(null, {
      source: 'device',
      view: 'current',
      access: [
        { orderId: id(1), statusToken: token },
        { orderId: id(2), statusToken: token },
        { orderId: id(3), statusToken: token },
      ],
    });
    expect(result.orders.map((o) => o.id)).toEqual([id(1)]);
    expect(result.nextOffset).toBeNull();
  });
  it('rejects invalid proofs, oversized batches and invalid paging before reading private data', async () => {
    const { service } = setup([row(1)]);
    await expect(
      service.customerOrders(null, {
        source: 'device',
        view: 'current',
        access: [{ orderId: id(1), statusToken: 'bad' }],
      }),
    ).rejects.toThrow();
    await expect(
      service.customerOrders(null, {
        source: 'device',
        view: 'current',
        access: Array(101).fill({ orderId: id(1), statusToken: 'a'.repeat(64) }),
      }),
    ).rejects.toThrow();
    await expect(
      service.customerOrders('alice', { source: 'account', view: 'current', offset: -1 }),
    ).rejects.toThrow();
    await expect(
      service.customerOrders('alice', { source: 'all', view: 'current' }),
    ).rejects.toThrow();
    await expect(
      service.customerOrders('alice', { source: 'account', view: 'all' }),
    ).rejects.toThrow();
  });
  it('paginates account history without exposing another customer’s orders', async () => {
    const { service } = setup([
      ...Array.from({ length: 26 }, (_, i) => row(i + 1, 'alice', 'completed')),
      row(30, 'bob', 'completed'),
    ]);
    const first = await service.customerOrders('alice', { source: 'account', view: 'history' });
    expect(first.orders).toHaveLength(25);
    expect(first.nextOffset).toBe(25);
    const next = await service.customerOrders('alice', {
      source: 'account',
      view: 'history',
      offset: 25,
    });
    expect(next.orders.map((o) => o.id)).toEqual([id(26)]);
    expect(next.nextOffset).toBeNull();
  });
  it('keeps pending payments and refunds current and completed/expired/failed checkouts in history', async () => {
    const states = [
      'checkout_pending',
      'placed',
      'accepted',
      'preparing',
      'ready',
      'payment_review',
      'refund_pending',
      'refund_failed',
      'completed',
      'refunded',
      'checkout_expired',
      'checkout_failed',
    ];
    const { service, mutate, provider } = setup(states.map((s, i) => row(i + 1, 'alice', s)));
    const current = await service.customerOrders('alice', { source: 'account', view: 'current' });
    expect(current.orders.map((o) => o.status)).toEqual(states.slice(0, 8));
    const history = await service.customerOrders('alice', { source: 'account', view: 'history' });
    expect(history.orders.map((o) => o.status)).toEqual(states.slice(8));
    expect(mutate).not.toHaveBeenCalled();
    expect(provider).not.toHaveBeenCalled();
  });
  it('returns only the public order projection, never guest proofs, recipient or provider records', async () => {
    const { service } = setup([row(1)]);
    const result = await service.customerOrders('alice', { source: 'account', view: 'current' });
    const serialized = JSON.stringify(result);
    for (const field of [
      'guest_hash',
      'customer_id',
      'recipient',
      'provider_request',
      'square_payment_id',
      'private-payment',
      'phone_number',
    ])
      expect(serialized).not.toContain(field);
  });
});
