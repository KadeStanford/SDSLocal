import {
  cartEstimate,
  modifierSelectionValid,
  type CartLine,
  type Product,
  type PickupSlot,
  type Quote,
} from './square-commerce-core';
export type OrderStep = 'menu' | 'cart' | 'pickup' | 'contact' | 'review';
export const orderSteps: OrderStep[] = ['menu', 'cart', 'pickup', 'contact', 'review'];
export function previousOrderStep(step: OrderStep): OrderStep {
  return orderSteps[Math.max(0, orderSteps.indexOf(step) - 1)] ?? 'menu';
}
export function unitEstimate(product: Product, modifierIds: readonly string[]) {
  return cartEstimate(
    [{ variationId: product.id, quantity: 1, modifierIds: [...modifierIds] }],
    [product],
  );
}
/** Remove retired options before opening the editor so every selection is visible. */
export function editableModifiers(product: Product, ids: readonly string[]) {
  return ids.filter((id) =>
    product.groups.some((group) => group.modifiers.some((option) => option.id === id)),
  );
}
export function itemIssue(product: Product, modifiers: string[], quantity: number) {
  if (product.available === false) return 'This item is currently unavailable.';
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
    return 'Choose a quantity from 1 to 20.';
  if (!modifierSelectionValid(product, modifiers)) {
    const group = product.groups.find((g) => {
      const count = g.modifiers.filter((m) => modifiers.includes(m.id)).length;
      return count < g.min || count > g.max;
    });
    return group
      ? `${group.name}: choose ${group.min === group.max ? group.min : `${group.min}–${group.max}`} options.`
      : 'Some options changed. Please choose your options again.';
  }
  return null;
}
export function setCartLine(
  cart: CartLine[],
  product: Product,
  modifierIds: string[],
  quantity: number,
  index: number | null,
) {
  const issue = itemIssue(product, modifierIds, quantity);
  if (issue) throw new Error(issue);
  if (index === null && cart.length >= 30) throw new Error('Your cart can hold up to 30 items.');
  const line = {
    variationId: product.id,
    quantity,
    modifierIds: [...modifierIds].sort(),
    lastKnownUnitPrice: unitEstimate(product, modifierIds),
  };
  return index === null ? [...cart, line] : cart.map((old, i) => (i === index ? line : old));
}
export function cartReview(cart: CartLine[], products: Product[]) {
  const issues = cart.flatMap((line) => {
    const p = products.find((p) => p.id === line.variationId);
    return !p
      ? ['An item is no longer available. Remove it to continue.']
      : p.available === false
        ? [`${p.name} is currently unavailable. Remove it to continue.`]
        : itemIssue(p, line.modifierIds, line.quantity)
          ? [`${p.name}: options changed. Edit this item to continue.`]
          : [];
  });
  const pricesChanged = cart.some((line) => {
    const p = products.find((p) => p.id === line.variationId);
    return (
      p &&
      line.lastKnownUnitPrice !== undefined &&
      line.lastKnownUnitPrice !== unitEstimate(p, line.modifierIds)
    );
  });
  return {
    issues,
    pricesChanged,
    count: cart.reduce((n, l) => n + l.quantity, 0),
    subtotal: cartEstimate(cart, products),
  };
}
export function menuCategories(products: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const product of products) {
    const category = product.category.trim() || 'Menu';
    groups.set(category, [...(groups.get(category) ?? []), product]);
  }
  return [...groups].map(([name, items]) => ({ name, items }));
}
export function safeProductImage(value: string | null) {
  try {
    const u = new URL(value ?? '');
    return u.protocol === 'https:' && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
}
export const pickupPlaceKey = (slot: PickupSlot) => slot.stopId ?? 'fixed';
export function pickupPlaces(slots: PickupSlot[]) {
  return [...new Map(slots.map((s) => [pickupPlaceKey(s), s])).values()];
}
export function selectedPickupPlace(slots: PickupSlot[], previous: string | null) {
  const places = pickupPlaces(slots);
  return places.some((s) => pickupPlaceKey(s) === previous)
    ? previous
    : places.length === 1
      ? pickupPlaceKey(places[0]!)
      : null;
}
export function groupedPickupTimes(slots: PickupSlot[], place: string | null) {
  const groups = new Map<string, { label: string; slots: PickupSlot[] }>();
  for (const slot of slots
    .filter((s) => pickupPlaceKey(s) === place)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const at = new Date(slot.at);
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: slot.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(at);
    const group = groups.get(key) ?? {
      label: new Intl.DateTimeFormat('en-US', {
        timeZone: slot.timezone,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      }).format(at),
      slots: [],
    };
    group.slots.push(slot);
    groups.set(key, group);
  }
  return [...groups].map(([key, g]) => ({ key, ...g }));
}
export function pickupTimeLabel(slot: PickupSlot) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: slot.timezone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(slot.at));
}
export function normalizePickupPhone(value: string): string | null {
  const trimmed = value.trim();
  if (!/^\+?[\d\s().-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (national.length !== 10 || !/^[2-9]\d{2}[2-9]\d{6}$/.test(national)) return null;
  return `+1${national}`;
}
export function contactIssue(name: string, phone: string) {
  if (name.trim().length < 1 || name.trim().length > 100)
    return 'Enter the pickup name (up to 100 characters).';
  if (!normalizePickupPhone(phone))
    return 'Enter a valid 10-digit US phone number, for example (225) 555-0123.';
  return null;
}
export function quoteUsable(quote: Quote | null, now = Date.now()) {
  return Boolean(quote && Date.parse(quote.expiresAt) > now);
}
export const terminalPickupStates = [
  'completed',
  'refunded',
  'checkout_expired',
  'checkout_failed',
];
export const fulfillmentSteps = [
  ['placed', 'Placed'],
  ['accepted', 'Accepted'],
  ['preparing', 'Preparing'],
  ['ready', 'Ready'],
  ['completed', 'Completed'],
] as const;
export function orderTracking(status: string) {
  const index = fulfillmentSteps.findIndex(([key]) => key === status);
  const notes: Record<string, string> = {
    checkout_pending:
      'Confirming payment with Square. Returning to this app does not confirm a payment.',
    checkout_expired: 'This unpaid checkout expired. You can start a new order.',
    checkout_failed: 'Checkout did not complete. Check the latest status before trying again.',
    payment_review: 'Your payment needs review by the business. Do not pay again.',
    refund_pending: 'The business requested a refund. Waiting for Square to confirm it.',
    refund_failed: 'The refund needs attention from the business. It is not confirmed.',
    refunded: 'Square confirmed the refund.',
    ready: 'Your order is ready for pickup.',
    completed: 'Your pickup is complete.',
  };
  return {
    index,
    terminal: terminalPickupStates.includes(status),
    message: notes[status] ?? 'The business will update your pickup progress here.',
  };
}
export function orderingRecovery(code: string | undefined) {
  switch (code) {
    case 'PRICE_CHANGED':
      return 'Prices changed. Refresh your menu and review a new total before paying.';
    case 'SLOT_FULL':
    case 'INVALID_SLOT':
      return 'That pickup time is no longer available. Choose another time; your cart is saved.';
    case 'ORDERING_CLOSED':
    case 'DISABLED':
      return 'Pickup ordering is currently closed. Your cart is saved for when it reopens.';
    case 'QUOTE_EXPIRED':
      return 'Your price quote expired. Review a fresh total before paying.';
    case 'ITEM_UNAVAILABLE':
    case 'CATALOG_CHANGED':
    case 'INVALID_CART':
      return 'The menu changed. Refresh it and review your cart.';
    default:
      return 'We couldn’t complete that step. Your cart is saved; check your connection and retry.';
  }
}
export function itemAccessibilityLabel(product: Product) {
  return `View ${product.name}${product.variation && product.variation !== 'Regular' ? `, ${product.variation}` : ''}, ${new Intl.NumberFormat('en-US', { style: 'currency', currency: product.currency }).format(product.price / 100)}${product.available === false ? ', currently unavailable' : ''}`;
}
export function cartScopePolicy(from: string, to: string) {
  return {
    sameBusiness: from === to,
    requiresDiscardConfirmation: false,
    keepsSeparateCarts: true,
  };
}
