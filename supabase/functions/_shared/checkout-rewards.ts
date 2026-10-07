import { fail, integer, record, string, uuid } from './square-security.ts';
import type { CartLine, Product } from './square-domain.ts';

export type RewardProvider = 'square' | 'stripe';
export interface RewardSelection {
  programId: string;
  revision: number;
  provider: RewardProvider;
  variationId: string | null;
  lineIndex: number | null;
}
export function parseRewardSelection(value: unknown): RewardSelection | null {
  if (value == null) return null;
  const v = record(value);
  if (v.provider !== 'square' && v.provider !== 'stripe')
    fail('REWARD_CHANGED', 'Choose your reward again.', 409);
  return {
    programId: uuid(v.programId),
    revision: integer(v.revision, 1),
    provider: v.provider,
    variationId: v.variationId == null ? null : string(v.variationId, 100),
    lineIndex: v.lineIndex == null ? null : integer(v.lineIndex, 0, 29),
  };
}
export function eligibleRewardProducts(
  program: Record<string, any>,
  products: Product[],
  provider: RewardProvider,
) {
  const ids = new Set(
    (Array.isArray(program.checkout_reward_items) ? program.checkout_reward_items : [])
      .filter((item: any) => item.provider === provider)
      .map((item: any) => item.variationId),
  );
  return products.filter(
    (product) =>
      ids.has(product.id) &&
      product.price > 0 &&
      (product as Product & { available?: boolean }).available !== false,
  );
}
/** Prices are always from the current provider catalog. Paid modifiers are never discounted. */
export function selectedReward(
  program: Record<string, any>,
  membershipId: string,
  cart: CartLine[],
  products: Product[],
  provider: RewardProvider,
  selection: RewardSelection,
) {
  if (
    !program.checkout_reward_enabled ||
    program.id !== selection.programId ||
    Number(program.checkout_reward_revision) !== selection.revision ||
    selection.provider !== provider
  )
    fail('REWARD_CHANGED', 'This reward changed. Choose an available reward again.', 409);
  const type = program.checkout_reward_type;
  const percent = ['percent_discount', 'item_discount'].includes(type)
    ? integer(program.checkout_reward_percent, 1, 100)
    : null;
  let discountMinor = 0;
  let name: string | null = null;
  if (type === 'percent_discount') {
    if (selection.variationId !== null || selection.lineIndex !== null)
      fail('REWARD_CHANGED', 'Choose the order discount again.', 409);
    const baseSubtotal = cart.reduce(
      (sum, line) =>
        sum + (products.find((p) => p.id === line.variationId)?.price ?? 0) * line.quantity,
      0,
    );
    discountMinor = Math.floor((baseSubtotal * percent!) / 100);
  } else {
    if (!['free_item', 'bogo', 'item_discount'].includes(type) || selection.lineIndex === null)
      fail('REWARD_CHANGED', 'Choose a reward item.', 409);
    const line = cart[selection.lineIndex];
    const product = eligibleRewardProducts(program, products, provider).find(
      (p) => p.id === selection.variationId,
    );
    if (
      !line ||
      !product ||
      line.variationId !== selection.variationId ||
      line.quantity < (type === 'bogo' ? 2 : 1)
    )
      fail(
        'REWARD_ITEM_UNAVAILABLE',
        'Your chosen reward item is no longer eligible. Choose another item or save your reward.',
        409,
      );
    discountMinor =
      type === 'item_discount' ? Math.floor((product.price * percent!) / 100) : product.price;
    name =
      product.name +
      (product.variation && product.variation !== 'Regular' ? ` · ${product.variation}` : '');
  }
  if (discountMinor < 1)
    fail('REWARD_ITEM_UNAVAILABLE', 'This reward has no discount for the selected items.', 409);
  return {
    version: 2,
    membershipId,
    programId: program.id,
    revision: selection.revision,
    provider,
    type,
    variationId: selection.variationId,
    lineIndex: selection.lineIndex,
    percent,
    discountMinor,
    itemName: name,
    label: string(program.reward_description ?? 'Rewards discount', 500),
    selection,
  };
}

/** Cumulative rounding keeps every line nonnegative and the discount sum exact. */
export function rewardLineDiscounts(
  cart: CartLine[],
  products: Product[],
  reward: Record<string, any> | null,
) {
  let base = 0,
    allocated = 0;
  return cart.map((line, index) => {
    if (!reward) return 0;
    if (reward.type !== 'percent_discount')
      return index === reward.lineIndex ? reward.discountMinor : 0;
    base += (products.find((p) => p.id === line.variationId)?.price ?? 0) * line.quantity;
    const cumulative = Math.floor((base * reward.percent) / 100);
    const discount = cumulative - allocated;
    allocated = cumulative;
    return discount;
  });
}
/** Stripe's hosted receipt shows the selected reward unit at its discounted price. */
export function stripeRewardLines(
  cart: CartLine[],
  products: Product[],
  reward: Record<string, any> | null,
) {
  return cart.flatMap((line, index) => {
    const p = products.find((p) => p.id === line.variationId)!;
    const base = {
      name: p.name + (p.variation && p.variation !== 'Regular' ? ` · ${p.variation}` : ''),
      description: p.description,
      image: p.image,
      currency: p.currency,
      unitAmount: p.price,
      quantity: line.quantity,
    };
    if (!reward || reward.type === 'percent_discount' || reward.lineIndex !== index) return [base];
    return [
      {
        ...base,
        name: `${base.name} · Reward`,
        unitAmount: p.price - reward.discountMinor,
        quantity: 1,
      },
      ...(line.quantity > 1 ? [{ ...base, quantity: line.quantity - 1 }] : []),
    ];
  });
}
