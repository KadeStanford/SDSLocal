import { describe, it, expect, vi } from 'vitest';
import { SquareService } from './square-service';
import { checkTransition, publicOrder } from './square-domain';
import type { SquareObject } from './square-client';
function fixture(role = 'staff', active = true, business = 'business-a') {
  const records: Record<string, SquareObject[]> = {
    business_members: [{ business_id: business, user_id: 'operator', role, is_active: active }],
    square_orders: [
      {
        id: 'order-a',
        business_id: 'business-a',
        status: 'placed',
        version: 3,
        recipient: { display_name: 'Customer', phone_number: '+12255550123', secret: 'hidden' },
      },
    ],
  };
  const queries: SquareObject[] = [];
  const db = {
    from: (table: string) => {
      let rows = [...(records[table] ?? [])];
      let single = false;
      const q: SquareObject = {
        eq: (key: string, value: unknown) => {
          rows = rows.filter((r) => r[key] === value);
          return q;
        },
        select: () => q,
        insert: () => q,
        update: () => q,
        maybeSingle: () => {
          single = true;
          return q;
        },
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: single ? (rows[0] ?? null) : rows, error: null }).then(resolve),
      };
      queries.push(q);
      return q;
    },
    rpc: vi.fn(),
  };
  return { service: new SquareService(db as never, {} as never), db };
}
describe('business pickup operator boundary', () => {
  it.each(['owner', 'staff'])('allows active %s to read its own order', async (role) => {
    const { service } = fixture(role);
    expect(await service.operator('business-a', 'operator')).toEqual({
      canRefund: role === 'owner',
      canManage: role === 'owner',
    });
    expect((await service.authorizeOrder('order-a', 'operator', null, 'operator')).id).toBe(
      'order-a',
    );
  });
  it.each([
    ['staff', false, 'business-a'],
    ['staff', true, 'business-b'],
    ['customer', true, 'business-a'],
  ])('denies inactive/cross-business/non-operator (%s %s %s)', async (role, active, business) => {
    const { service, db } = fixture(role as string, active as boolean, business as string);
    await expect(service.queue('business-a', 'operator', {})).rejects.toThrow();
    await expect(service.operatorDetail('order-a', 'operator')).rejects.toThrow();
    await expect(
      service.orderAction('order-a', 'operator', { version: 3, next: 'accepted' }),
    ).rejects.toThrow();
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('denies anonymous access and customer order tokens as operator authority', async () => {
    const { service } = fixture();
    await expect(service.operator('business-a', null)).rejects.toThrow();
    await expect(
      service.authorizeOrder('order-a', 'customer', 'a'.repeat(64), 'operator'),
    ).rejects.toThrow();
  });
  it('keeps refunds and all configuration owner-only for staff', async () => {
    const { service, db } = fixture();
    for (const operation of [
      () => service.refund('order-a', 'operator', { confirmed: true, version: 3 }),
      () => service.settings('business-a', 'operator', {}),
      () => service.selectLocation('business-a', 'operator', 'location'),
      () => service.sync('business-a', 'operator'),
      () => service.disconnect('business-a', 'operator', true),
      () => service.beginOAuth('business-a', 'operator'),
      () => service.ownerStatus('business-a', 'operator'),
    ])
      await expect(operation()).rejects.toThrow('Only an active business owner');
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it('uses the authenticated identity for the batch summary, ignoring body user IDs', async () => {
    const { service, db } = fixture();
    db.rpc.mockResolvedValue({ data: [], error: null });
    await service.route({ action: 'operator_businesses', userId: 'another-person' }, 'operator');
    expect(db.rpc).toHaveBeenCalledExactlyOnceWith('square_operator_businesses', {
      p_user_id: 'operator',
    });
  });
  it('rejects stale leases before mutating fulfillment', async () => {
    const { service, db } = fixture();
    db.rpc.mockResolvedValue({ data: [], error: null });
    const patch = vi.spyOn(service, 'patchOrder');
    await expect(
      service.orderAction('order-a', 'operator', { version: 2, next: 'accepted' }),
    ).rejects.toMatchObject({ code: 'BUSY', status: 409 });
    expect(patch).not.toHaveBeenCalled();
    expect(db.rpc).toHaveBeenCalledWith(
      'square_order_lease',
      expect.objectContaining({ p_id: 'order-a', p_version: 2 }),
    );
  });
  it.each(['owner', 'staff'])(
    'allows %s fulfillment with a lease and audit event, without calling Square',
    async (role) => {
      const { service, db } = fixture(role);
      const locked = { id: 'order-a', business_id: 'business-a', status: 'placed', version: 3 };
      db.rpc.mockResolvedValue({ data: [locked], error: null });
      const patch = vi
        .spyOn(service, 'patchOrder')
        .mockResolvedValue({ ...locked, status: 'accepted', version: 4 });
      const provider = vi.spyOn(service, 'provider');
      const result = await service.orderAction('order-a', 'operator', {
        version: 3,
        next: 'accepted',
      });
      expect(result.order.status).toBe('accepted');
      expect(patch).toHaveBeenCalledWith('order-a', expect.any(String), { status: 'accepted' });
      expect(provider).not.toHaveBeenCalled();
    },
  );
  it.each([
    ['placed', 'completed'],
    ['preparing', 'accepted'],
    ['completed', 'completed'],
    ['payment_review', 'accepted'],
    ['refund_pending', 'ready'],
    ['refund_failed', 'completed'],
  ])('rejects %s to %s', (from, to) => expect(() => checkTransition(from!, to!)).toThrow());
  it('projects receipt data without raw provider fields or extra contact fields', () => {
    const order = publicOrder(
      {
        id: 'order',
        status: 'placed',
        guest_hash: 'secret',
        recipient: { display_name: 'Customer', phone_number: '+12255550123', extra: 'secret' },
      },
      [
        {
          snapshot: {
            name: 'Coffee',
            quantity: '2',
            catalog_object_id: 'private',
            modifiers: [{ name: 'Oat milk', catalog_object_id: 'private' }],
            total_money: { amount: 1100, currency: 'USD' },
          },
        },
      ],
      true,
    );
    expect(JSON.stringify(order)).not.toContain('secret');
    expect(JSON.stringify(order)).not.toContain('catalog_object_id');
    expect(order.items[0].total_money.amount).toBe(1100);
  });
});
