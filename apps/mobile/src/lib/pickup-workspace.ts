import type { PickupBusiness, PickupOrder, PickupQueue } from './square-commerce-core';
export type QueueView = 'active' | 'ready' | 'history' | 'requests';
export type OperatorBusiness = PickupBusiness & {
  canRefund: boolean;
  isOpen: boolean;
  counts: PickupQueue['counts'];
};
export const attentionStates = ['payment_review', 'refund_pending', 'refund_failed'];
export const historyStates = [
  'completed',
  'refunded',
  'checkout_expired',
  'checkout_failed',
  'dispute_lost',
];
export function queueView(status: string): QueueView {
  return historyStates.includes(status) ? 'history' : status === 'ready' ? 'ready' : 'active';
}
export function sortOrders(orders: PickupOrder[], view: QueueView) {
  return [...orders]
    .filter((o) =>
      view === 'requests'
        ? o.supportRequest?.status === 'open' &&
          ![
            'refunded',
            'cancelled',
            'checkout_expired',
            'checkout_failed',
            'dispute_lost',
          ].includes(o.status)
        : queueView(o.status) === view,
    )
    .sort((a, b) =>
      view === 'history'
        ? Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.id.localeCompare(b.id)
        : Date.parse(a.pickupAt) - Date.parse(b.pickupAt) || a.id.localeCompare(b.id),
    );
}
export function orderUrgency(order: PickupOrder, now: number) {
  if (attentionStates.includes(order.status)) return 'Needs attention';
  if (historyStates.includes(order.status)) return null;
  const minutes = Math.ceil((Date.parse(order.pickupAt) - now) / 60000);
  return minutes < 0
    ? `${Math.abs(minutes)} min past pickup`
    : minutes <= 15
      ? `Pickup in ${minutes} min`
      : null;
}
export function orderAge(at: string, now: number) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(at)) / 60000));
  return minutes < 1
    ? 'Just now'
    : minutes < 60
      ? `${minutes} min ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} hr ago`
        : `${Math.floor(minutes / 1440)} days ago`;
}
export function shortOrderNumber(number: string) {
  return number.replace(/^S-/, '').slice(-6);
}
export function mergeOrders(current: PickupOrder[], incoming: PickupOrder[]) {
  const map = new Map(current.map((o) => [o.id, o]));
  for (const order of incoming) map.set(order.id, order);
  return [...map.values()];
}
export function selectOperatorBusiness(
  businesses: OperatorBusiness[],
  requested?: string | null,
  saved?: string | null,
) {
  return (
    businesses.find((b) => b.id === requested)?.id ??
    businesses.find((b) => b.id === saved)?.id ??
    businesses[0]?.id ??
    null
  );
}
export function ordersTabVisible(
  signedIn: boolean,
  mode: string,
  businesses: readonly OperatorBusiness[],
) {
  return signedIn && mode === 'business' && businesses.length > 0;
}
export function pickupError(error: unknown) {
  const code = (error as { code?: string })?.code;
  if (code === 'OPERATOR_REQUIRED' || code === 'OWNER_REQUIRED' || code === 'SIGN_IN')
    return 'Your business access changed. Ask an owner to check your staff access.';
  if (code === 'RECONNECT')
    return 'Square needs to reconnect. An owner can reconnect in Ordering & Square.';
  return 'Couldn’t update orders. Check your connection and try again. Your last results are still here.';
}
/** Reject repeated activation synchronously, including before React commits busy state. */
export function singleFlight() {
  let active = false;
  return async (task: () => Promise<void>) => {
    if (active) return false;
    active = true;
    try {
      await task();
      return true;
    } finally {
      active = false;
    }
  };
}
