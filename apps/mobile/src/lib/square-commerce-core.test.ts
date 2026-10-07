import { describe, expect, it } from 'vitest';
import {
  cartEstimate,
  modifierSelectionValid,
  nextPickupAction,
  orderStatusLabel,
  orderingCtaEligible,
  pollDelay,
  restoreCart,
  type Product,
} from './square-commerce-core';
const product: Product = {
  id: 'coffee',
  name: 'Coffee',
  variation: 'Regular',
  description: '',
  image: null,
  category: 'Drinks',
  price: 500,
  currency: 'USD',
  groups: [
    {
      id: 'milk',
      name: 'Milk',
      min: 1,
      max: 1,
      modifiers: [{ id: 'oat', name: 'Oat', price: 50 }],
    },
  ],
};
describe('pickup customer presentation', () => {
  it('shows the CTA only on backend eligibility in the Sandbox app environments', () => {
    expect(orderingCtaEligible('staging', { available: true })).toBe(true);
    expect(orderingCtaEligible('production', { available: true })).toBe(false);
    expect(orderingCtaEligible('staging', { available: false })).toBe(false);
    expect(orderingCtaEligible('staging', null)).toBe(false);
  });
  it('requires valid modifier choices before adding an item', () => {
    expect(modifierSelectionValid(product, [])).toBe(false);
    expect(modifierSelectionValid(product, ['oat'])).toBe(true);
    expect(modifierSelectionValid(product, ['oat', 'oat'])).toBe(false);
    expect(modifierSelectionValid(product, ['unknown'])).toBe(false);
  });
  it('calculates display estimates with quantity and modifiers', () => {
    expect(
      cartEstimate([{ variationId: 'coffee', quantity: 2, modifierIds: ['oat'] }], [product]),
    ).toBe(1100);
  });
  it('expires stale carts and rejects malformed quantities', () => {
    const cart = [{ variationId: 'coffee', quantity: 2, modifierIds: ['oat'] }];
    expect(restoreCart(JSON.stringify({ savedAt: 100, cart }), 200)).toEqual(cart);
    expect(restoreCart(JSON.stringify({ savedAt: 100, cart }), 20000000)).toEqual([]);
    expect(restoreCart('not-json')).toEqual([]);
  });
  it('keeps checkout and refund pending until server state changes', () => {
    expect(orderStatusLabel.checkout_pending).toBe('Payment not confirmed');
    expect(orderStatusLabel.refund_pending).toBe('Refund pending');
    expect(nextPickupAction.checkout_pending).toBeUndefined();
    expect(pollDelay(12)).toBe(30000);
  });
});
