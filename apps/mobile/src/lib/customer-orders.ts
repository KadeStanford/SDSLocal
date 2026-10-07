import type { PickupOrder } from './square-commerce-core';
import { terminalPickupStates } from './pickup-order-flow';
import type { OrderAccess } from './square-commerce';
export type CustomerOrderView = 'current' | 'history';
export interface CustomerOrderPage {
  orders: PickupOrder[];
  nextOffset: number | null;
}
export interface CustomerOrdersResult {
  orders: PickupOrder[];
  nextAccount: number | null;
  nextDevice: number | null;
}
export function mergeCustomerOrders(...pages: PickupOrder[][]) {
  const rows = new Map<string, PickupOrder>();
  for (const page of pages)
    for (const order of page) {
      const old = rows.get(order.id);
      if (!old || order.version >= old.version) rows.set(order.id, order);
    }
  return [...rows.values()].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id),
  );
}
export function customerOrderView(status: string): CustomerOrderView {
  return terminalPickupStates.includes(status) ? 'history' : 'current';
}
export function customerOrderCancelCutoff(
  order: Pick<PickupOrder, 'status' | 'pickupAt' | 'preparationMinutes' | 'paidAt'>,
  now = Date.now(),
) {
  if (
    !['placed', 'accepted'].includes(order.status) ||
    !order.paidAt ||
    !Number.isInteger(order.preparationMinutes) ||
    Number(order.preparationMinutes) < 5 ||
    Number(order.preparationMinutes) > 240
  )
    return null;
  const pickupAt = Date.parse(order.pickupAt);
  if (!Number.isFinite(pickupAt)) return null;
  const cutoff = pickupAt - Number(order.preparationMinutes) * 60_000;
  return cutoff > now ? cutoff : null;
}
export async function loadCustomerOrders(
  userId: string | null,
  view: CustomerOrderView,
  offsets: { account: number | null; device: number | null },
  ports: {
    access: () => Promise<OrderAccess[]>;
    read: (body: Record<string, unknown>) => Promise<CustomerOrderPage>;
  },
): Promise<CustomerOrdersResult> {
  const access = offsets.device !== null ? await ports.access() : [];
  const empty = { orders: [], nextOffset: null };
  const [account, device] = await Promise.all([
    userId && offsets.account !== null
      ? ports.read({ source: 'account', view, offset: offsets.account })
      : empty,
    access.length && offsets.device !== null
      ? ports.read({
          source: 'device',
          view,
          offset: offsets.device,
          access: access.map((a) => ({ orderId: a.orderId, statusToken: a.statusToken })),
        })
      : empty,
  ]);
  return {
    orders: mergeCustomerOrders(account.orders, device.orders),
    nextAccount: account.nextOffset,
    nextDevice: device.nextOffset,
  };
}
