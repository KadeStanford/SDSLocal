import type { CartLine, Product, RewardClaim, RewardOffer } from './square-commerce-core';

export function validRewardClaim(value: unknown): value is RewardClaim {
  const v = value as RewardClaim | undefined;
  return (
    !!v &&
    typeof v.programId === 'string' &&
    typeof v.customerId === 'string' &&
    Number.isInteger(v.revision) &&
    v.revision > 0 &&
    ['square', 'stripe'].includes(v.provider) &&
    ['free_item', 'bogo', 'item_discount', 'percent_discount'].includes(v.type)
  );
}
export function withoutReward(cart: CartLine[]): CartLine[] {
  return cart.map(({ rewardClaim: _claim, ...line }) => line);
}
export function rewardSelection(
  cart: CartLine[],
  offer: RewardOffer | null,
  customerId: string | null,
) {
  const lineIndex = cart.findIndex((line) => !!line.rewardClaim);
  if (lineIndex < 0) return { selection: null, issue: null, discount: 0 };
  const line = cart[lineIndex]!;
  const claim = line.rewardClaim!;
  const unavailable = {
    selection: null,
    issue: 'This reward needs another look. Choose an available item or save the reward for later.',
    discount: 0,
  };
  if (
    !offer ||
    claim.customerId !== customerId ||
    claim.programId !== offer.programId ||
    claim.revision !== offer.revision ||
    claim.provider !== offer.provider ||
    claim.type !== offer.type ||
    cart.filter((l) => l.rewardClaim).length !== 1
  )
    return unavailable;
  const orderDiscount = offer.type === 'percent_discount';
  const item = offer.items.find((p) => p.id === line.variationId && p.available !== false);
  if (!orderDiscount && (!item || line.quantity < (offer.type === 'bogo' ? 2 : 1)))
    return unavailable;
  return {
    selection: {
      programId: claim.programId,
      revision: claim.revision,
      provider: claim.provider,
      variationId: orderDiscount ? null : line.variationId,
      lineIndex: orderDiscount ? null : lineIndex,
    },
    issue: null,
    discount: item
      ? Math.floor(item.price * (offer.type === 'item_discount' ? offer.percent! / 100 : 1))
      : 0,
  };
}
export function rewardEstimate(
  cart: CartLine[],
  products: Product[],
  offer: RewardOffer | null,
  customerId: string | null,
) {
  const result = rewardSelection(cart, offer, customerId);
  return result.selection && offer?.type === 'percent_discount'
    ? Math.floor(
        (cart.reduce(
          (sum, l) => sum + (products.find((p) => p.id === l.variationId)?.price ?? 0) * l.quantity,
          0,
        ) *
          offer.percent!) /
          100,
      )
    : result.discount;
}
export function rewardTerms(offer: Pick<RewardOffer, 'type' | 'percent'>) {
  if (offer.type === 'bogo')
    return 'Add two of the same eligible item. One base item is free; paid extras are charged on both.';
  if (offer.type === 'item_discount')
    return `${offer.percent}% off one eligible base item. Paid extras cost extra.`;
  if (offer.type === 'percent_discount')
    return `${offer.percent}% off menu items in this order. Paid extras are excluded.`;
  return 'One eligible base item is free. Paid extras cost extra.';
}
