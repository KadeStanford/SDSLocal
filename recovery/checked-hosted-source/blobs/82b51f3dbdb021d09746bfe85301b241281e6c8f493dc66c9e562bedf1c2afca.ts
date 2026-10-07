import { fail, integer, record, string, uuid } from './square-security.ts';
import type { SquareObject } from './square-client.ts';

export interface CartLine {
  variationId: string;
  quantity: number;
  modifierIds: string[];
}
export interface Modifier {
  id: string;
  name: string;
  price: number;
  version: number;
}
export interface ModifierGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  modifiers: Modifier[];
}
export interface Product {
  id: string;
  itemId: string;
  name: string;
  variation: string;
  description: string;
  category: string;
  image: string | null;
  price: number;
  currency: string;
  version: number;
  groups: ModifierGroup[];
}
export interface PickupWindow {
  day: number;
  start: string;
  end: string;
}
export interface OrderingSettings {
  enabled: boolean;
  is_open: boolean;
  preparation_minutes: number;
  minimum_notice_minutes: number;
  slot_minutes: number;
  max_orders_per_slot: number;
  timezone: string;
  pickup_windows: PickupWindow[];
  allow_upcoming_stops: boolean;
}
export interface Stop {
  id: string;
  title: string;
  address_text: string;
  starts_at: string;
  ends_at: string;
  is_published: boolean;
}
export interface Slot {
  at: string;
  stopId: string | null;
  address: string;
  title: string;
  timezone: string;
  windowStart?: string;
  windowEnd?: string;
}
export function present(object: SquareObject, location: string) {
  return (
    !object.is_deleted &&
    (object.present_at_all_locations === false
      ? (object.present_at_location_ids ?? []).includes(location)
      : !(object.absent_at_location_ids ?? []).includes(location))
  );
}
export function flattenCatalog(objects: SquareObject[]): SquareObject[] {
  const all = new Map<string, SquareObject>();
  for (const object of objects) {
    all.set(object.id, object);
    for (const child of [
      ...(object.item_data?.variations ?? []),
      ...(object.modifier_list_data?.modifiers ?? []),
    ])
      all.set(child.id, child);
  }
  return [...all.values()];
}
export function catalogProducts(objects: SquareObject[], location: string, currency: string) {
  const flat = flattenCatalog(objects);
  const byId = new Map(flat.map((o) => [o.id, o]));
  const products: Product[] = [];
  let excluded = 0;
  for (const object of flat.filter((o) => o.type === 'ITEM_VARIATION')) {
    try {
      const data = object.item_variation_data;
      const item = byId.get(data.item_id);
      const details = item?.item_data;
      if (
        !item ||
        !details ||
        !present(item, location) ||
        !present(object, location) ||
        details.is_archived ||
        (details.product_type && details.product_type !== 'REGULAR') ||
        data.measurement_unit_id ||
        data.sellable === false
      )
        throw new Error('Unsupported item');
      const override = data.location_overrides?.find(
        (o: SquareObject) => o.location_id === location,
      );
      if (
        override?.sold_out &&
        (!override.sold_out_valid_until || Date.parse(override.sold_out_valid_until) > Date.now())
      )
        throw new Error('Sold out');
      const price = override?.price_money ?? data.price_money;
      if (
        (override?.pricing_type ?? data.pricing_type) !== 'FIXED_PRICING' ||
        price?.currency !== currency
      )
        throw new Error('Unsupported price');
      const groups: ModifierGroup[] = [];
      for (const info of details.modifier_list_info ?? []) {
        if (info.enabled === false) continue;
        const list = byId.get(info.modifier_list_id);
        const ld = list?.modifier_list_data;
        if (!list || !ld || !present(list, location) || ld.modifier_type === 'TEXT')
          throw new Error('Unsupported modifiers');
        const modifiers = (ld.modifiers ?? [])
          .filter((m: SquareObject) => present(m, location))
          .map((m: SquareObject) => {
            const md = m.modifier_data;
            if (md.child_modifier_list_ids?.length || md.price_money?.currency !== currency)
              throw new Error('Unsupported modifier');
            return {
              id: m.id,
              name: string(md.name),
              price: integer(md.price_money.amount),
              version: integer(m.version ?? 0, 0, Number.MAX_SAFE_INTEGER),
            };
          });
        const minimum =
          info.min_selected_modifiers >= 0
            ? info.min_selected_modifiers
            : (ld.min_selected_modifiers ?? 0);
        const limit =
          info.max_selected_modifiers >= 0
            ? info.max_selected_modifiers
            : (ld.max_selected_modifiers ?? (ld.selection_type === 'SINGLE' ? 1 : 0));
        const max = limit === 0 ? modifiers.length : Math.min(limit, modifiers.length);
        const min = integer(minimum, 0, 100);
        // Quantity/repeated and nested modifiers require a different cart model.
        if (ld.allow_quantities || min > max) throw new Error('Unsupported modifier quantity');
        groups.push({ id: list.id, name: string(ld.name), min, max, modifiers });
      }
      const imageObject = byId.get(details.image_ids?.[0]);
      const imageUrl = imageObject?.image_data?.url;
      const category =
        byId.get(details.categories?.[0]?.id ?? details.category_id)?.category_data?.name ?? 'Menu';
      products.push({
        id: object.id,
        itemId: item.id,
        name: string(details.name),
        variation: data.name || 'Regular',
        description: details.description_plaintext ?? '',
        category,
        image: typeof imageUrl === 'string' && imageUrl.startsWith('https://') ? imageUrl : null,
        price: integer(price.amount),
        currency,
        version: integer(object.version ?? 0, 0, Number.MAX_SAFE_INTEGER),
        groups,
      });
    } catch {
      excluded++;
    }
  }
  return { products, excluded };
}
export function parseCart(value: unknown): CartLine[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30)
    fail('INVALID_CART', 'Choose between 1 and 30 items.');
  return value.map((raw) => {
    const line = record(raw);
    const ids = line.modifierIds;
    if (!Array.isArray(ids) || ids.length > 50) fail('INVALID_MODIFIERS', 'Choose valid options.');
    const modifierIds = ids.map((id) => string(id, 100)).sort();
    if (new Set(modifierIds).size !== modifierIds.length)
      fail('INVALID_MODIFIERS', 'Choose each option only once.');
    return {
      variationId: string(line.variationId, 100),
      quantity: integer(line.quantity, 1, 20),
      modifierIds,
    };
  });
}
export function priceCart(cart: CartLine[], products: Product[]) {
  return cart.map((line, index) => {
    const product = products.find((p) => p.id === line.variationId);
    if (!product) fail('ITEM_UNAVAILABLE', 'An item is no longer available. Refresh your menu.');
    const available = product.groups.flatMap((g) => g.modifiers);
    for (const group of product.groups) {
      const count = line.modifierIds.filter((id) =>
        group.modifiers.some((m) => m.id === id),
      ).length;
      if (count < group.min || count > group.max)
        fail('REQUIRED_MODIFIER', `Check the options for ${product.name}.`);
    }
    const modifiers = line.modifierIds.map((id) => {
      const m = available.find((o) => o.id === id);
      if (!m) fail('INVALID_MODIFIERS', 'An option is no longer available.');
      return m;
    });
    integer((product.price + modifiers.reduce((sum, m) => sum + m.price, 0)) * line.quantity);
    return {
      uid: `line-${index}`,
      catalog_object_id: product.id,
      catalog_version: product.version,
      quantity: String(line.quantity),
      modifiers: modifiers.map((m) => ({
        catalog_object_id: m.id,
        catalog_version: m.version,
        quantity: '1',
      })),
    };
  });
}
export function parseSettings(value: unknown): OrderingSettings {
  const settings = record(value);
  for (const key of ['enabled', 'is_open', 'allow_upcoming_stops'])
    if (typeof settings[key] !== 'boolean')
      fail('INVALID_SETTINGS', 'Check the ordering settings.');
  const timezone = string(settings.timezone, 80);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
  } catch {
    fail('INVALID_TIMEZONE', 'Choose a valid timezone.');
  }
  const slot = integer(settings.slot_minutes, 15, 60);
  if (![15, 30, 60].includes(slot)) fail('INVALID_SETTINGS', 'Choose 15, 30 or 60 minute slots.');
  if (!Array.isArray(settings.pickup_windows) || settings.pickup_windows.length > 21)
    fail('INVALID_WINDOWS', 'Choose valid pickup windows.');
  const windows = settings.pickup_windows.map((raw) => {
    const w = record(raw);
    const start = string(w.start, 5);
    const end = string(w.end, 5);
    if (
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(start) ||
      !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(end) ||
      start >= end
    )
      fail('INVALID_WINDOWS', 'Each pickup window must end after it starts on the same day.');
    return { day: integer(w.day, 0, 6), start, end };
  });
  if (settings.enabled && windows.length === 0)
    fail('INVALID_WINDOWS', 'Add a pickup window before enabling orders.');
  return {
    enabled: settings.enabled as boolean,
    is_open: settings.is_open as boolean,
    allow_upcoming_stops: settings.allow_upcoming_stops as boolean,
    preparation_minutes: integer(settings.preparation_minutes, 5, 240),
    minimum_notice_minutes: integer(settings.minimum_notice_minutes, 5, 1440),
    slot_minutes: slot,
    max_orders_per_slot: integer(settings.max_orders_per_slot, 1, 100),
    timezone,
    pickup_windows: windows,
  };
}
export function pickupSlots(
  settings: OrderingSettings,
  mobile: boolean,
  stops: Stop[],
  address: string,
  now = Date.now(),
): Slot[] {
  if (!settings.enabled || !settings.is_open) return [];
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: settings.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const earliest =
    now + Math.max(settings.preparation_minutes, settings.minimum_notice_minutes) * 60000;
  const slots: Slot[] = [];
  // Walk UTC instants; DST gaps/repeated wall times remain unambiguous.
  for (let time = Math.ceil(earliest / 60000) * 60000; time <= now + 7 * 86400000; time += 60000) {
    const parts = Object.fromEntries(formatter.formatToParts(time).map((p) => [p.type, p.value]));
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
    const local = `${parts.hour}:${parts.minute}`;
    if (
      Number(parts.minute) % settings.slot_minutes !== 0 ||
      !settings.pickup_windows.some((w) => w.day === day && w.start <= local && local < w.end)
    )
      continue;
    const locations = mobile
      ? stops.filter(
          (s) =>
            s.is_published &&
            Boolean(s.address_text) &&
            Date.parse(s.starts_at) <= time &&
            time < Date.parse(s.ends_at) &&
            (settings.allow_upcoming_stops || Date.parse(s.starts_at) <= now),
        )
      : [{ id: null, title: 'Pickup', address_text: address }];
    for (const stop of locations)
      slots.push({
        at: new Date(time).toISOString(),
        stopId: stop.id,
        address: stop.address_text,
        title: stop.title,
        timezone: settings.timezone,
        ...('starts_at' in stop ? { windowStart: stop.starts_at, windowEnd: stop.ends_at } : {}),
      });
  }
  return slots;
}
export const nextOrderState: Record<string, string> = {
  placed: 'accepted',
  accepted: 'preparing',
  preparing: 'ready',
  ready: 'completed',
};
export function checkTransition(from: string, to: string) {
  if (nextOrderState[from] !== to)
    fail('INVALID_TRANSITION', 'This order changed. Refresh the queue.', 409);
}
export function canRefund(status: string) {
  return ['placed', 'accepted', 'preparing', 'ready', 'completed', 'refund_failed'].includes(
    status,
  );
}
export const terminalStates = [
  'completed',
  'refunded',
  'checkout_expired',
  'checkout_failed',
  'dispute_lost',
];
export function parseRecipient(value: unknown) {
  const input = record(value);
  const name = string(input.name, 100);
  const phone = string(input.phone, 20);
  if (!/^\+[1-9]\d{7,14}$/.test(phone))
    fail(
      'INVALID_PHONE',
      'Enter a phone number with country code, such as +1 followed by 10 digits.',
    );
  return { display_name: name, phone_number: phone };
}
export function parsePickup(value: unknown) {
  const input = record(value);
  const at = string(input.at, 30);
  if (!Number.isFinite(Date.parse(at))) fail('INVALID_SLOT', 'Choose a pickup time.');
  return {
    at: new Date(at).toISOString(),
    stopId: input.stopId === null ? null : uuid(input.stopId),
  };
}
export function orderAmounts(order: SquareObject) {
  const total = integer(order.total_money?.amount, 0);
  const tax = integer(order.total_tax_money?.amount ?? 0);
  const currency = string(order.total_money?.currency, 3);
  if (
    !/^[A-Z]{3}$/.test(currency) ||
    (order.total_tip_money?.amount ?? 0) !== 0 ||
    (order.total_service_charge_money?.amount ?? 0) !== 0
  )
    fail('INVALID_AMOUNT', 'Unsupported order charges.');
  return { subtotal_minor: integer(total - tax), tax_minor: tax, total_minor: total, currency };
}
export function publicOrder(
  order: SquareObject,
  items: SquareObject[] = [],
  owner = false,
  preparationMinutes?: number,
) {
  return {
    id: order.id,
    provider: order.provider ?? 'square',
    number: order.order_number,
    status: order.status,
    version: order.version,
    pickupAt: order.pickup_at,
    preparationMinutes,
    timezone: order.pickup_timezone,
    address: order.pickup_address,
    businessName: order.business_name,
    businessId: order.business_id,
    subtotal: Number(order.subtotal_minor) + Number(order.loyalty_reward?.discountMinor ?? 0),
    tax: order.tax_minor,
    tip: 0,
    total: order.total_minor,
    refundedMinor: Number(order.refunded_minor ?? 0),
    remainingMinor: Number(order.total_minor) - Number(order.refunded_minor ?? 0),
    disputeState: order.dispute_state ?? null,
    providerStatus: order.provider_status ?? null,
    reward: order.loyalty_reward
      ? {
          type: order.loyalty_reward.type,
          label: order.loyalty_reward.label,
          discountMinor: order.loyalty_reward.discountMinor,
          itemName: order.loyalty_reward.itemName ?? null,
        }
      : null,
    currency: order.currency,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    completedAt: order.completed_at,
    refundedAt: order.refunded_at,
    expiresAt: order.expires_at,
    paidAt: order.paid_at,
    items: items.map(({ id, snapshot: i }) => ({
      refundedQuantity: (order.item_refunds ?? [])
        .filter((r: SquareObject) => r.state === 'completed')
        .reduce(
          (n: number, r: SquareObject) =>
            n + (r.items.find((item: SquareObject) => item.itemId === id)?.quantity ?? 0),
          0,
        ),
      name: i.name,
      variation_name: i.variation_name,
      variationId: i.variation_id ?? i.catalog_object_id ?? null,
      quantity: i.quantity,
      modifierIds: Array.isArray(i.modifier_ids)
        ? i.modifier_ids
        : (i.modifiers ?? [])
            .map((modifier: SquareObject) => modifier.catalog_object_id)
            .filter((id: unknown): id is string => typeof id === 'string'),
      total_money: i.total_money
        ? {
            amount:
              Number(i.total_money.amount) +
              Number(i.total_discount_money?.amount ?? 0) -
              Number(i.total_tax_money?.amount ?? 0),
            currency: i.total_money.currency,
          }
        : undefined,
      modifiers: (i.modifiers ?? []).map((m: SquareObject) => ({ name: m.name })),
    })),
    checkoutUrl:
      order.status === 'checkout_pending' && Date.parse(order.expires_at) > Date.now()
        ? order.checkout_url
        : null,
    ...(owner
      ? {
          recipient: {
            display_name: order.recipient?.display_name,
            phone_number: order.recipient?.phone_number,
          },
          provider: order.provider ?? 'square',
          squareOrderId: order.square_order_id,
          dashboardUrl:
            order.provider_status === 'REWARD_COVERED'
              ? undefined
              : order.provider === 'stripe' && order.merchant_id
                ? 'https://dashboard.stripe.com/test/connect/accounts/' + order.merchant_id
                : 'https://squareupsandbox.com/dashboard/orders/overview',
        }
      : {}),
  };
}
export function paymentPatch(order: SquareObject, payment: SquareObject): SquareObject | null {
  if (payment.order_id !== order.square_order_id || payment.location_id !== order.location_id)
    fail('PAYMENT_MISMATCH', 'Payment requires review.', 409);
  if (payment.status !== 'COMPLETED') return null; // A failed attempt does not invalidate a still-payable checkout.
  if (
    payment.total_money?.currency !== order.currency ||
    payment.total_money?.amount !== Number(order.total_minor)
  )
    return {
      status: 'payment_review',
      provider_status: 'AMOUNT_MISMATCH',
      square_payment_id: payment.id,
      paid_at: order.paid_at ?? new Date().toISOString(),
    };
  if (order.paid_at) return null; // Old payment events never undo fulfillment/refunds.
  return {
    status: ['checkout_expired', 'checkout_failed'].includes(order.status)
      ? 'payment_review'
      : 'placed',
    provider_status: payment.status,
    square_payment_id: payment.id,
    paid_at: new Date().toISOString(),
    checkout_url: null,
  };
}
export function refundPatch(order: SquareObject, refund: SquareObject): SquareObject | null {
  if (
    refund.payment_id !== order.square_payment_id ||
    refund.amount_money?.currency !== order.currency ||
    !Number.isSafeInteger(refund.amount_money?.amount) ||
    refund.amount_money.amount <= 0 ||
    refund.amount_money.amount > Number(order.total_minor) ||
    !['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'].includes(refund.status)
  )
    fail('REFUND_MISMATCH', 'Refund requires review.', 409);
  if (order.status === 'refunded') return null;
  if (refund.amount_money.amount < Number(order.total_minor))
    return refund.status === 'PENDING'
      ? {
          status: 'refund_pending',
          provider_status: 'REFUND_PENDING',
          checkout_url: null,
          square_refund_id: refund.id,
          refund_amount_minor: refund.amount_money.amount,
        }
      : refund.status === 'COMPLETED' &&
          Number(order.refunded_minor ?? 0) < refund.amount_money.amount
        ? { status: 'payment_review', provider_status: 'PARTIAL_REFUND', checkout_url: null }
        : null;
  if (
    order.square_refund_id &&
    refund.id !== order.square_refund_id &&
    refund.status !== 'COMPLETED'
  )
    return null; // An older failed attempt cannot overwrite the latest refund.
  if (refund.status === 'COMPLETED')
    return {
      status: 'refunded',
      provider_status: 'REFUND_COMPLETED',
      refunded_minor: Number(order.total_minor),
      refunded_at: new Date().toISOString(),
      cancelled_at: new Date().toISOString(),
      square_refund_id: refund.id,
    };
  return {
    status: refund.status === 'PENDING' ? 'refund_pending' : 'refund_failed',
    provider_status: `REFUND_${refund.status}`,
    square_refund_id: refund.id,
  };
}
