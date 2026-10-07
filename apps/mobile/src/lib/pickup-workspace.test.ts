import { describe, it, expect, vi } from 'vitest';
import { getTodayHours } from './discovery-core';
import { initialPickupModule, pickupModulePresentation } from './pickup-discovery';
import { pickupLabel, type PickupOrder } from './square-commerce-core';
import {
  mergeOrders,
  orderUrgency,
  ordersTabVisible,
  selectOperatorBusiness,
  singleFlight,
  sortOrders,
  type OperatorBusiness,
} from './pickup-workspace';
const order = (id: string, status: string, pickupAt: string) =>
  ({ id, status, pickupAt, createdAt: pickupAt }) as PickupOrder;
const b = (id: string) => ({ id, name: id }) as OperatorBusiness;
describe('pickup workspace state', () => {
  it('keeps ready/history separate and prioritizes active pickup time', () => {
    const rows = [
      order('later', 'placed', '2026-09-21T17:00Z'),
      order('ready', 'ready', '2026-09-21T14:00Z'),
      order('earlier', 'preparing', '2026-09-21T15:00Z'),
      order('complete', 'completed', '2026-09-21T16:00Z'),
    ];
    expect(sortOrders(rows, 'active').map((o) => o.id)).toEqual(['earlier', 'later']);
    expect(sortOrders(rows, 'ready').map((o) => o.id)).toEqual(['ready']);
    expect(sortOrders(rows, 'history').map((o) => o.id)).toEqual(['complete']);
    expect(mergeOrders(rows, [{ ...rows[0]!, status: 'accepted' }])).toHaveLength(4);
  });
  it('clears ended orders from requests while retaining completed-order issues and partial refunds', () => {
    const rows = [
      'placed',
      'refunded',
      'checkout_expired',
      'checkout_failed',
      'dispute_lost',
      'completed',
      'payment_review',
    ].map((status) => ({
      ...order(status, status, '2026-09-21T15:00Z'),
      supportRequest: { status: 'open' } as NonNullable<PickupOrder['supportRequest']>,
    }));
    expect(sortOrders(rows, 'requests').map((o) => o.id)).toEqual([
      'completed',
      'payment_review',
      'placed',
    ]);
  });
  it('derives urgency only from real pickup time or payment review', () => {
    expect(
      orderUrgency(order('a', 'placed', '2026-09-21T15:00Z'), Date.parse('2026-09-21T15:05Z')),
    ).toBe('5 min past pickup');
    expect(orderUrgency(order('a', 'completed', '2026-09-21T15:00Z'), Date.now())).toBeNull();
    expect(orderUrgency(order('a', 'payment_review', '2026-09-21T15:00Z'), Date.now())).toBe(
      'Needs attention',
    );
  });
  it('chooses one business directly, honors valid selection, rejects stale storage', () => {
    expect(selectOperatorBusiness([b('a')])).toBe('a');
    expect(selectOperatorBusiness([b('a'), b('b')], null, 'b')).toBe('b');
    expect(selectOperatorBusiness([b('a')], 'revoked', 'revoked')).toBe('a');
    expect(selectOperatorBusiness([])).toBeNull();
    expect(ordersTabVisible(true, 'business', [b('a')])).toBe(true);
    expect(ordersTabVisible(true, 'customer', [b('a')])).toBe(false);
    expect(ordersTabVisible(false, 'business', [b('a')])).toBe(false);
    expect(ordersTabVisible(true, 'business', [])).toBe(false);
  });
  it('allows only one pending transition before React commits busy state', async () => {
    const gate = singleFlight();
    let done!: () => void;
    const task = vi.fn(() => new Promise<void>((r) => (done = r)));
    const first = gate(task);
    expect(await gate(task)).toBe(false);
    expect(task).toHaveBeenCalledOnce();
    done();
    await first;
    await gate(async () => {});
  });
});
describe('pickup timezone and public presentation', () => {
  it('formats America/Chicago through spring and fall DST without accidental GMT', () => {
    expect(pickupLabel({ at: '2026-03-08T07:30:00Z', timezone: 'America/Chicago' })).toBe(
      'Sun, Mar 8 · 1:30 AM',
    );
    expect(pickupLabel({ at: '2026-03-08T08:30:00Z', timezone: 'America/Chicago' })).toBe(
      'Sun, Mar 8 · 3:30 AM',
    );
    expect(pickupLabel({ at: '2026-11-01T06:30:00Z', timezone: 'America/Chicago' })).toBe(
      'Sun, Nov 1 · 1:30 AM',
    );
    expect(pickupLabel({ at: '2026-11-01T07:30:00Z', timezone: 'America/Chicago' })).toBe(
      'Sun, Nov 1 · 1:30 AM',
    );
    expect(pickupLabel({ at: '2026-09-21T09:45:00Z', timezone: 'UTC' })).toBe(
      'Mon, Sep 21 · 9:45 AM UTC',
    );
  });
  it('evaluates business hours in Chicago, including the previous day overnight', () => {
    const hours = [
      { day_of_week: 0, opens_at: '20:00', closes_at: '02:00', is_closed: false },
      { day_of_week: 1, opens_at: '09:00', closes_at: '17:00', is_closed: false },
    ];
    expect(getTodayHours(hours, new Date('2026-09-21T06:00Z'), 'America/Chicago').state).toBe(
      'open',
    );
    expect(getTodayHours(hours, new Date('2026-09-21T12:00Z'), 'America/Chicago').state).toBe(
      'closed',
    );
  });
  it.each([
    [{ supported: false }, 'hidden'],
    [{ loading: true }, 'loading'],
    [{ discoveryStatus: 'paused' }, 'paused'],
    [{ availability: { available: false, status: 'unsupported' } }, 'hidden'],
    [{ availability: { available: true, status: 'open' }, physicalState: 'closed' }, 'scheduled'],
    [{ availability: { available: false, status: 'no_slots' }, physicalState: 'closed' }, 'closed'],
    [{ availability: { available: true, status: 'open' }, physicalState: 'open' }, 'open'],
    [{ failed: true }, 'error'],
  ] as const)('resolves %j as %s', (patch, kind) =>
    expect(
      pickupModulePresentation('staging', {
        ...initialPickupModule('a'),
        supported: true,
        loading: false,
        ...patch,
      }).kind,
    ).toBe(kind),
  );
});
