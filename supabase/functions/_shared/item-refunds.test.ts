import { describe, expect, it } from 'vitest';
import { planItemRefund, refundOptions } from './item-refunds';
const rows = [
  { id: 'a', snapshot: { name: 'Coffee', quantity: '3', total_money: { amount: 900 } } },
  { id: 'b', snapshot: { name: 'Toast', quantity: '1', total_money: { amount: 600 } } },
];
const order = { total_minor: 1351, refunded_minor: 0, item_refunds: [] };
describe('Item refunds', () => {
  it('allocates discounted/taxed paid cents exactly, independent of query ordering', () => {
    const a = planItemRefund(order, rows, [{ itemId: 'a', quantity: 3 }], 'first');
    const settled = {
      ...order,
      refunded_minor: a.amount,
      item_refunds: a.history.map((h) => ({ ...h, state: 'completed' })),
    };
    const b = planItemRefund(
      settled,
      rows.slice().reverse(),
      [{ itemId: 'b', quantity: 1 }],
      'second',
    );
    expect(a.amount + b.amount).toBe(1351);
    expect(refundOptions(order, rows)).toEqual(refundOptions(order, rows.slice().reverse()));
  });
  it('split quantity refunds preserve every cent and cannot refund a quantity twice', () => {
    let current: any = { ...order };
    let total = 0;
    for (let n = 0; n < 3; n++) {
      const plan = planItemRefund(current, rows, [{ itemId: 'a', quantity: 1 }], String(n));
      total += plan.amount;
      current = {
        ...current,
        refunded_minor: total,
        item_refunds: plan.history.map((h) => ({ ...h, state: 'completed' })),
      };
    }
    expect(total).toBe(planItemRefund(order, rows, [{ itemId: 'a', quantity: 3 }], 'all').amount);
    expect(() => planItemRefund(current, rows, [{ itemId: 'a', quantity: 1 }], 'again')).toThrow();
  });
  it.each(
    [
      [{ itemId: 'foreign', quantity: 1 }],
      [{ itemId: 'a', quantity: 1.5 }],
      [{ itemId: 'a', quantity: 4 }],
      [{ itemId: 'a', quantity: 0 }],
      [
        { itemId: 'a', quantity: 1 },
        { itemId: 'a', quantity: 1 },
      ],
      [],
    ].map((selection) => ({ selection })),
  )('rejects invalid selections %j', ({ selection }) => {
    expect(() => planItemRefund(order, rows, selection, 'bad')).toThrow();
  });
  it('reserves pending quantities and releases only a provider-confirmed failure', () => {
    const plan = planItemRefund(order, rows, [{ itemId: 'a', quantity: 3 }], 'pending');
    expect(() =>
      planItemRefund(
        { ...order, item_refunds: plan.history },
        rows,
        [{ itemId: 'a', quantity: 1 }],
        'again',
      ),
    ).toThrow();
    expect(
      refundOptions(
        { ...order, item_refunds: plan.history.map((h) => ({ ...h, state: 'failed' })) },
        rows,
      )?.[0]?.available,
    ).toBe(3);
  });
  it('requires reconciliation for external or legacy money-only partial refunds', () => {
    expect(refundOptions({ ...order, refunded_minor: 100 }, rows)).toBeNull();
    expect(() =>
      planItemRefund(
        { ...order, refunded_minor: 100 },
        rows,
        [{ itemId: 'b', quantity: 1 }],
        'bad',
      ),
    ).toThrow();
  });
});
