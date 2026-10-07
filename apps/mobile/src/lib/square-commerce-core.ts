export interface PickupSlot {
  at: string;
  stopId: string | null;
  address: string;
  title: string;
  timezone: string;
  windowStart?: string;
  windowEnd?: string;
}
export type CheckoutRewardType = 'free_item' | 'bogo' | 'item_discount' | 'percent_discount';
export interface RewardOffer {
  programId: string;
  revision: number;
  provider: 'square' | 'stripe';
  type: CheckoutRewardType;
  label: string;
  percent: number | null;
  items: Product[];
}
export interface RewardClaim {
  programId: string;
  revision: number;
  provider: 'square' | 'stripe';
  customerId: string;
  type: CheckoutRewardType;
}
export interface CartLine {
  rewardClaim?: RewardClaim;
  variationId: string;
  quantity: number;
  modifierIds: string[];
  /** Display estimate only; never sent as an authoritative price. */
  lastKnownUnitPrice?: number;
}
export interface Product {
  /** False for a previously visible item removed by a refreshed catalog. */
  available?: boolean;
  id: string;
  name: string;
  variation: string;
  description: string;
  category: string;
  image: string | null;
  price: number;
  currency: string;
  groups: {
    id: string;
    name: string;
    min: number;
    max: number;
    modifiers: { id: string; name: string; price: number }[];
  }[];
}
export interface Availability {
  available: boolean;
  status?: 'open' | 'closed' | 'unavailable' | 'unsupported' | 'paused' | 'no_slots';
  businessName?: string;
  products?: Product[];
  slots?: PickupSlot[];
}
export interface OrderingSettings {
  enabled: boolean;
  is_open: boolean;
  preparation_minutes: number;
  minimum_notice_minutes: number;
  slot_minutes: number;
  max_orders_per_slot: number;
  timezone: string;
  allow_upcoming_stops: boolean;
  pickup_windows: { day: number; start: string; end: string }[];
  synced_at?: string | null;
  sync_summary?: { variations: number; excluded: number } | null;
}
export interface OwnerConnection {
  connection: {
    state: string;
    merchantName: string;
    locationId: string | null;
    location: { name: string; address: string } | null;
    lastError: string | null;
  } | null;
  settings: OrderingSettings | null;
  locations: { id: string; name: string }[];
  account?: {
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null;
}
export interface OrderSnapshot {
  refundedQuantity?: number;
  name: string;
  variation_name?: string;
  variationId?: string | null;
  modifierIds?: string[];
  quantity: string;
  total_money?: { amount: number; currency: string };
  modifiers?: { name: string }[];
}
export interface PickupOrder {
  reward?: { label: string; discountMinor: number; itemName?: string | null } | null;
  provider?: 'square' | 'stripe';
  id: string;
  number: string;
  status: string;
  version: number;
  businessName: string;
  businessId?: string;
  business?: PickupBusiness | null;
  updatedAt?: string;
  paidAt?: string | null;
  completedAt?: string | null;
  refundedAt?: string | null;
  events?: { status: string; at: string }[];
  pickupAt: string;
  preparationMinutes?: number;
  timezone: string;
  address: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  refundedMinor?: number;
  remainingMinor?: number;
  disputeState?: string | null;
  providerStatus?: string | null;
  currency: string;
  createdAt: string;
  expiresAt: string;
  checkoutUrl: string | null;
  recipient?: { display_name?: string; phone_number?: string };
  dashboardUrl?: string;
  squareOrderId?: string;
  items: OrderSnapshot[];
  refundItems?:
    | {
        itemId: string;
        name: string;
        quantity: number;
        available: number;
        used: number;
        unit: number;
        extra: number;
      }[]
    | null;
  supportRequest?: OrderSupportRequest | null;
  review?: PickupOrderReview | null;
}
export type OrderSupportType = 'cancel' | 'change' | 'issue';
export interface OrderSupportRequest {
  id: string;
  type: OrderSupportType;
  message: string;
  response: string | null;
  status: 'open' | 'resolved' | 'declined';
  createdAt: string;
  resolvedAt: string | null;
}
export interface PickupOrderReview {
  id: string;
  rating: number;
  text: string;
  merchantResponse: string | null;
  moderationStatus: 'published' | 'hidden' | 'removed';
  createdAt: string;
}
export interface PickupBusiness {
  id: string;
  name: string;
  primaryColor: string;
  phone: string | null;
  timezone: string;
  logoPath: string | null;
}
export interface PickupQueue {
  orders: PickupOrder[];
  nextOffset: number | null;
  business: PickupBusiness | null;
  permissions: { canRefund: boolean; canManage: boolean };
  settings: { enabled: boolean; is_open: boolean; timezone: string } | null;
  connected: boolean;
  counts: {
    active: number;
    placed: number;
    preparing: number;
    ready: number;
    attention: number;
    requests?: number;
  };
  updatedAt: string;
}
export interface Quote {
  provider?: 'square' | 'stripe';
  quoteId: string;
  expiresAt: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  currency: string;
  slot: PickupSlot;
  reward?: {
    type: 'free_item' | 'bogo' | 'percent_discount' | string;
    label: string;
    discountMinor: number;
    variationId?: string | null;
  } | null;
}
export const orderStatusLabel: Record<string, string> = {
  checkout_pending: 'Payment not confirmed',
  checkout_expired: 'Checkout expired',
  checkout_failed: 'Checkout unavailable',
  payment_review: 'Payment needs review',
  placed: 'Order placed',
  accepted: 'Accepted',
  preparing: 'Preparing',
  ready: 'Ready for pickup',
  completed: 'Completed',
  refund_pending: 'Refund pending',
  refund_failed: 'Refund needs attention',
  refunded: 'Refunded',
  dispute_lost: 'Payment returned through dispute',
};
export const nextPickupAction: Record<string, { next: string; label: string }> = {
  placed: { next: 'accepted', label: 'Accept order' },
  accepted: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'ready', label: 'Mark ready' },
  ready: { next: 'completed', label: 'Complete pickup' },
};
export function modifierSelectionValid(product: Product, ids: readonly string[]) {
  return (
    new Set(ids).size === ids.length &&
    ids.every((id) => product.groups.some((g) => g.modifiers.some((m) => m.id === id))) &&
    product.groups.every((g) => {
      const count = g.modifiers.filter((m) => ids.includes(m.id)).length;
      return count >= g.min && count <= g.max;
    })
  );
}
/** Estimate for cart display only. Checkout always uses a server quote. */
export function cartEstimate(cart: readonly CartLine[], products: readonly Product[]) {
  return cart.reduce((sum, line) => {
    const p = products.find((i) => i.id === line.variationId);
    return (
      sum +
      (p
        ? (p.price +
            p.groups
              .flatMap((g) => g.modifiers)
              .filter((m) => line.modifierIds.includes(m.id))
              .reduce((s, m) => s + m.price, 0)) *
          line.quantity
        : 0)
    );
  }, 0);
}
export function orderingCtaEligible(appEnv: string | undefined, availability: Availability | null) {
  return (appEnv === 'development' || appEnv === 'staging') && availability?.available === true;
}
export function money(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}
export function pickupLabel(slot: { at: string; timezone: string }) {
  const date = new Date(slot.at);
  const day = date.toLocaleDateString('en-US', {
    timeZone: slot.timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const zone = ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT'].includes(slot.timezone) ? ' UTC' : '';
  return `${day} · ${date.toLocaleTimeString('en-US', { timeZone: slot.timezone, hour: 'numeric', minute: '2-digit' })}${zone}`;
}
export function pollDelay(attempt: number) {
  return Math.min(30000, 3000 * 2 ** Math.floor(attempt / 3));
}
export function restoreCart(raw: string | null, now = Date.now()): CartLine[] {
  try {
    const parsed = JSON.parse(raw ?? 'null');
    if (
      !parsed ||
      !Number.isFinite(parsed.savedAt) ||
      now - parsed.savedAt > 4 * 3600000 ||
      !Array.isArray(parsed.cart) ||
      parsed.cart.length > 30
    )
      return [];
    return parsed.cart.filter(
      (line: CartLine) =>
        typeof line.variationId === 'string' &&
        Number.isInteger(line.quantity) &&
        line.quantity >= 1 &&
        line.quantity <= 20 &&
        Array.isArray(line.modifierIds) &&
        line.modifierIds.every((id) => typeof id === 'string'),
    );
  } catch {
    return [];
  }
}
