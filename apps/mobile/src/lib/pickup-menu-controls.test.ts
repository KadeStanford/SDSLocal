import { describe, expect, it, vi } from 'vitest';
import { cartReview, setCartLine } from './pickup-order-flow';
import {
  cartBarSummary,
  changeSimpleQuantity,
  commitCartChange,
  filteredMenuRows,
  hasCustomization,
  modifierGroupIssue,
  refreshedProducts,
  simpleQuantity,
  toggleModifier,
} from './pickup-menu-controls';
import {
  formattedPickupPhone,
  pickupClockLabel,
  pickupTimezoneLabel,
  visiblePickupSlots,
} from './pickup-checkout-presentation';

import type { CartLine, Product, PickupSlot } from './square-commerce-core';
const plain: Product = {
  id: 'side',
  name: 'TEST Market Side',
  variation: 'Regular',
  description: '',
  category: 'Menu',
  image: null,
  price: 600,
  currency: 'USD',
  groups: [],
};
const required = {
  id: 'base',
  name: 'Base',
  min: 1,
  max: 1,
  modifiers: [
    { id: 'rice', name: 'Rice', price: 0 },
    { id: 'salad', name: 'Salad', price: 100 },
  ],
};
const extras = {
  id: 'extras',
  name: 'Extras',
  min: 0,
  max: 2,
  modifiers: [
    { id: 'a', name: 'Avocado', price: 200 },
    { id: 'b', name: 'Beans', price: 100 },
    { id: 'c', name: 'Corn', price: 50 },
  ],
};
const custom = { ...plain, id: 'bowl', groups: [required, extras] };
const slot: PickupSlot = {
  at: '2026-09-21T14:00:00Z',
  stopId: null,
  title: 'Pickup',
  address: 'Main Street',
  timezone: 'America/Chicago',
};
describe('menu cart controls', () => {
  it('adds one immediately, increments a single plain line, decrements and removes at zero', () => {
    let cart: CartLine[] = [];
    for (const delta of [1, 1, -1, -1] as const) {
      cart = changeSimpleQuantity(cart, plain, delta);
      expect(cart.length).toBeLessThanOrEqual(1);
    }
    expect(cart).toEqual([]);
    expect(cartBarSummary(changeSimpleQuantity([], plain, 1), [plain])).toMatchObject({
      count: 1,
      subtotal: 600,
      label: 'View cart (1) · $6.00',
    });
  });
  it('bounds quantity, preserves other products and consolidates legacy duplicate plain lines', () => {
    const other = setCartLine([], custom, ['rice'], 1, null);
    let cart = [
      ...other,
      ...setCartLine([], plain, [], 2, null),
      ...setCartLine([], plain, [], 3, null),
    ];
    cart = changeSimpleQuantity(cart, plain, 1);
    expect(cart[0]).toEqual(other[0]);
    expect(simpleQuantity(cart, plain)).toBe(6);
    expect(cart).toHaveLength(2);
    expect(() => changeSimpleQuantity(setCartLine([], plain, [], 20, null), plain, 1)).toThrow(
      '20',
    );
  });
  it('routes configurable items to options, including optional groups', () => {
    expect(hasCustomization(plain)).toBe(false);
    expect(hasCustomization(custom)).toBe(true);
    expect(hasCustomization({ ...plain, groups: [extras] })).toBe(true);
    expect(() => changeSimpleQuantity([], custom, 1)).toThrow('options');
  });
  it('required single choice replaces radio selection and cannot deselect', () => {
    expect(toggleModifier(required, ['rice', 'a'], 'salad')).toEqual(['a', 'salad']);
    expect(toggleModifier(required, ['rice'], 'rice')).toEqual(['rice']);
    expect(modifierGroupIssue(required, [])).toBe('Select 1 more option.');
    expect(modifierGroupIssue(required, ['rice'])).toBeNull();
  });
  it('optional choice can deselect and multi choice enforces a maximum', () => {
    expect(toggleModifier({ ...required, min: 0 }, ['rice'], 'rice')).toEqual([]);
    expect(toggleModifier(extras, ['a', 'b'], 'c')).toEqual(['a', 'b']);
    expect(toggleModifier(extras, ['a', 'b'], 'a')).toEqual(['b']);
    expect(modifierGroupIssue(extras, ['a', 'b', 'c'])).toContain('2');
  });
  it('keeps customized combinations separate and edits the exact selected line and estimate', () => {
    let cart = setCartLine([], custom, ['rice'], 1, null);
    cart = setCartLine(cart, custom, ['salad', 'a'], 2, null);
    const first = cart[0];
    cart = setCartLine(cart, custom, ['salad', 'b'], 3, 1);
    expect(cart).toHaveLength(2);
    expect(cart[0]).toEqual(first);
    expect(cartReview(cart, [custom]).subtotal).toBe(3000);
  });
  it('groups Square variations into one browse row while preserving each option', () => {
    const large = {
      ...plain,
      id: 'cold-large',
      name: 'TEST Cold Brew',
      variation: 'Large',
      category: 'Coffee & Drinks',
    };
    const regular = {
      ...plain,
      id: 'cold-regular',
      name: 'TEST Cold Brew',
      variation: 'Regular',
      category: 'Coffee & Drinks',
      price: 450,
    };
    const rows = filteredMenuRows([large, regular], null, 'cold brew');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({
      kind: 'item',
      product: large,
      products: [large, regular],
    });
  });
  it('preserves unavailable products for recovery and blocks adding or checkout review', () => {
    const cart = setCartLine([], plain, [], 1, null);
    const products = refreshedProducts([plain], []);
    expect(products[0]?.available).toBe(false);
    expect(cartReview(cart, products).issues).toHaveLength(1);
    expect(() => changeSimpleQuantity(cart, products[0]!, 1)).toThrow('unavailable');
    expect(changeSimpleQuantity(cart, products[0]!, -1)).toEqual([]);
    expect(refreshedProducts(products, [plain])).toEqual([plain]);
  });
  it('persists before committing and leaves the previous cart on write failure', () => {
    const commit = vi.fn();
    const cart = changeSimpleQuantity([], plain, 1);
    expect(commitCartChange(cart, () => false, commit)).toBe(false);
    expect(commit).not.toHaveBeenCalled();
    expect(commitCartChange(cart, () => true, commit)).toBe(true);
    expect(commit).toHaveBeenCalledWith(cart);
  });
  it('filters long catalogs by category and AND search without inventing metadata', () => {
    expect(
      filteredMenuRows(
        [plain, { ...plain, id: 'coffee', name: 'Cold Brew', category: 'Drinks' }],
        'Drinks',
        'cold drinks',
      ),
    ).toHaveLength(2);
    expect(filteredMenuRows([plain], null, 'sandwich')).toEqual([]);
    expect(filteredMenuRows([plain], null, '')[1]).toMatchObject({
      product: { image: null, description: '' },
    });
  });
});
describe('pickup selection and review presentation', () => {
  it('shows eight times with progressive disclosure, preserving a later selection', () => {
    const slots = Array.from({ length: 30 }, (_, i) => ({
      ...slot,
      at: new Date(Date.parse(slot.at) + i * 900000).toISOString(),
    }));
    expect(visiblePickupSlots(slots, null, 8)).toHaveLength(8);
    expect(visiblePickupSlots(slots, null, 16)).toHaveLength(16);
    expect(visiblePickupSlots(slots, slots[20]!, 8)).toHaveLength(21);
  });
  it('formats the selected CTA without repeated timezone and identifies the local zone once', () => {
    expect(pickupClockLabel(slot)).toBe('9:00 AM');
    expect(pickupTimezoneLabel(slot)).toBe('Central Time');
  });
  it('formats US phone for review while preserving invalid input for correction', () => {
    expect(formattedPickupPhone('+12255550123')).toBe('(225) 555-0123');
    expect(formattedPickupPhone('invalid')).toBe('invalid');
  });
});
