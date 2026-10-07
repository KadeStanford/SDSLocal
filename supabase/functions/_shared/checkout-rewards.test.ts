import { describe, expect, it, vi } from 'vitest';
import {
  eligibleRewardProducts,
  parseRewardSelection,
  selectedReward,
  rewardLineDiscounts,
  stripeRewardLines,
} from './checkout-rewards';
import { SquareService } from './square-service';
import { StripeService } from './stripe-service';
import { refundOptions } from './item-refunds';
const programId = '88888888-8888-4888-8888-888888888888';
const product: any = {
  id: 'coffee',
  name: 'Cold brew',
  variation: 'Regular',
  price: 450,
  currency: 'USD',
  groups: [{ id: 'extra', min: 0, max: 1, modifiers: [{ id: 'shot', price: 100 }] }],
};
const selection: any = {
  programId,
  revision: 1,
  provider: 'square',
  variationId: 'coffee',
  lineIndex: 0,
};
const program: any = {
  id: programId,
  checkout_reward_revision: 1,
  checkout_reward_enabled: true,
  checkout_reward_type: 'free_item',
  checkout_reward_items: [{ provider: 'square', variationId: 'coffee' }],
  reward_description: 'A coffee on us',
};
const cart: any = [{ variationId: 'coffee', quantity: 1, modifierIds: ['shot'] }];
describe('explicit reward selection', () => {
  it('never queries or spends a reward without the customer selecting one', async () => {
    const service = new SquareService({} as any, {} as any);
    await expect(
      service.checkoutReward('business', 'customer', cart, [product]),
    ).resolves.toBeNull();
  });
  it('keeps percentage rounding within every item and preserves the total', () => {
    const products = [
      { ...product, price: 199 },
      { ...product, id: 'last', price: 1 },
    ];
    const lines = [
      ...Array.from({ length: 29 }, () => ({ ...cart[0] })),
      { ...cart[0], variationId: 'last' },
    ];
    const amounts = rewardLineDiscounts(lines, products, { type: 'percent_discount', percent: 50 });
    expect(amounts.reduce((a, b) => a + b, 0)).toBe(2886);
    expect(amounts[29]).toBeLessThanOrEqual(1);
  });
  it('shows only one free Stripe unit, with remaining units at regular price', () => {
    const lines = stripeRewardLines([{ ...cart[0], quantity: 3 }], [product], {
      type: 'free_item',
      lineIndex: 0,
      discountMinor: 450,
    });
    expect(lines.map((l) => [l.quantity, l.unitAmount])).toEqual([
      [1, 0],
      [2, 450],
    ]);
    expect(lines[0].name).toContain('Reward');
  });
  it('does not select anything for missing input', () =>
    expect(parseRewardSelection(undefined)).toBeNull());
  it.each(['square', 'stripe'] as const)(
    'covers one base item and leaves paid extras for %s',
    (provider) => {
      const reward = selectedReward(
        { ...program, checkout_reward_items: [{ provider, variationId: 'coffee' }] },
        'member',
        cart,
        [product],
        provider,
        { ...selection, provider },
      );
      expect(reward.discountMinor).toBe(450);
      expect(reward.itemName).toBe('Cold brew');
    },
  );
  it('requires a current explicit business choice and correct provider', () => {
    for (const change of [
      { revision: 2 },
      { provider: 'stripe' },
      { variationId: 'other' },
      { lineIndex: 1 },
      { programId: 'other' },
    ])
      expect(() =>
        selectedReward(program, 'member', cart, [product], 'square', { ...selection, ...change }),
      ).toThrow();
    expect(eligibleRewardProducts(program, [{ ...product, available: false }], 'square')).toEqual(
      [],
    );
    expect(eligibleRewardProducts(program, [product], 'stripe')).toEqual([]);
  });
  it('does not make every quantity free', () => {
    expect(
      selectedReward(
        program,
        'member',
        [{ ...cart[0], quantity: 3 }],
        [product],
        'square',
        selection,
      ).discountMinor,
    ).toBe(450);
  });
  it('requires two units for BOGO, discounts one', () => {
    const p = { ...program, checkout_reward_type: 'bogo' };
    expect(() => selectedReward(p, 'member', cart, [product], 'square', selection)).toThrow();
    expect(
      selectedReward(p, 'member', [{ ...cart[0], quantity: 2 }], [product], 'square', selection)
        .discountMinor,
    ).toBe(450);
  });
  it('item percentage covers only one base unit, order percentage excludes extras', () => {
    expect(
      selectedReward(
        { ...program, checkout_reward_type: 'item_discount', checkout_reward_percent: 50 },
        'member',
        [{ ...cart[0], quantity: 3 }],
        [product],
        'square',
        selection,
      ).discountMinor,
    ).toBe(225);
    expect(
      selectedReward(
        { ...program, checkout_reward_type: 'percent_discount', checkout_reward_percent: 50 },
        'member',
        [{ ...cart[0], quantity: 2 }],
        [product],
        'square',
        { ...selection, variationId: null, lineIndex: null },
      ).discountMinor,
    ).toBe(450);
  });
  it('does not allocate a cash refund to a fully discounted item', () => {
    const options = refundOptions({ total_minor: 1000 }, [
      { id: 'free', snapshot: { quantity: '1', name: 'Coffee', total_money: { amount: 0 } } },
      { id: 'paid', snapshot: { quantity: '1', name: 'Meal', total_money: { amount: 1000 } } },
    ]);
    expect(options?.find((o) => o.itemId === 'free')?.unit).toBe(0);
    expect(options?.find((o) => o.itemId === 'paid')?.unit).toBe(1000);
  });
  it.each([SquareService, StripeService])(
    'does not start or reconcile a provider payment for a covered order',
    async (Service) => {
      const service = new Service({} as any, {} as any);
      const order: any = {
        id: 'order',
        business_id: 'business',
        provider: Service === StripeService ? 'stripe' : 'square',
        status: 'placed',
        provider_status: 'REWARD_COVERED',
        total_minor: 0,
        provider_request: {},
      };
      vi.spyOn(service, 'orderProjection').mockResolvedValue(order);
      expect(await service.reconcile(order)).toBe(order);
      expect(await service.ensureCheckout(order)).toEqual({ order });
    },
  );
});
