import { expect, it } from 'vitest';
import { rewardSelection, rewardEstimate, withoutReward } from './pickup-rewards';
import { createPickupCartStorage } from './pickup-cart-core';
import { setCartLine } from './pickup-order-flow';
import { changeSimpleQuantity } from './pickup-menu-controls';
import type { CartLine, Product, RewardOffer } from './square-commerce-core';
const product: Product = {
  id: 'coffee',
  name: 'Coffee',
  price: 450,
  variation: 'Regular',
  currency: 'USD',
  category: 'Drinks',
  description: '',
  image: null,
  groups: [],
};
const offer: RewardOffer = {
  programId: 'p',
  revision: 1,
  provider: 'square',
  type: 'free_item',
  label: 'Coffee on us',
  percent: null,
  items: [product],
};
const line: CartLine = {
  variationId: 'coffee',
  quantity: 1,
  modifierIds: [],
  rewardClaim: {
    programId: 'p',
    revision: 1,
    provider: 'square',
    type: 'free_item',
    customerId: 'customer',
  },
};
it('keeps an explicit claim in saved carts and follows the selected line after removal', () => {
  const map = new Map();
  const storage = createPickupCartStorage({
    getItem: (k) => map.get(k),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  });
  storage.save('biz', [{ variationId: 'meal', quantity: 1, modifierIds: [] }, line]);
  const cart = storage.read('biz');
  expect(rewardSelection(cart, offer, 'customer').selection?.lineIndex).toBe(1);
  expect(rewardSelection(cart.slice(1), offer, 'customer').selection?.lineIndex).toBe(0);
  expect(rewardSelection(cart, offer, 'other').issue).toBeTruthy();
});
it('does not silently substitute a different item, revision or provider', () => {
  expect(rewardSelection([{ ...line, variationId: 'meal' }], offer, 'customer').issue).toBeTruthy();
  expect(rewardSelection([line], { ...offer, revision: 2 }, 'customer').issue).toBeTruthy();
  expect(rewardSelection([line], { ...offer, provider: 'stripe' }, 'customer').issue).toBeTruthy();
});
it('preserves a claim on edits and keeps ordinary quick-add items separate', () => {
  const edited = setCartLine([line], product, [], 2, 0);
  expect(edited[0]?.rewardClaim).toEqual(line.rewardClaim);
  const next = changeSimpleQuantity([line], product, 1);
  expect(next).toHaveLength(2);
  expect(next[0]?.rewardClaim).toEqual(line.rewardClaim);
  expect(rewardEstimate(next, [product], offer, 'customer')).toBe(450);
});
it('saving for later removes the claim without deleting purchased items', () => {
  expect(withoutReward([line])).toEqual([{ variationId: 'coffee', quantity: 1, modifierIds: [] }]);
  expect(rewardSelection(withoutReward([line]), offer, 'customer').selection).toBeNull();
});
it('marks BOGO invalid when reduced below two and estimates order discounts on base prices', () => {
  expect(
    rewardSelection(
      [{ ...line, rewardClaim: { ...line.rewardClaim!, type: 'bogo' } }],
      { ...offer, type: 'bogo' },
      'customer',
    ).issue,
  ).toBeTruthy();
  expect(
    rewardEstimate(
      [{ ...line, quantity: 2, rewardClaim: { ...line.rewardClaim!, type: 'percent_discount' } }],
      [product],
      { ...offer, type: 'percent_discount', percent: 50 },
      'customer',
    ),
  ).toBe(450);
});
