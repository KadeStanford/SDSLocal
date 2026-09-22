import { describe, expect, it } from 'vitest';
import {
  cartReview,
  editableModifiers,
  cartScopePolicy,
  contactIssue,
  groupedPickupTimes,
  itemIssue,
  menuCategories,
  normalizePickupPhone,
  orderingRecovery,
  orderTracking,
  previousOrderStep,
  quoteUsable,
  safeProductImage,
  selectedPickupPlace,
  setCartLine,
} from './pickup-order-flow';
import { createPickupCartStorage, decodePickupCart } from './pickup-cart-core';
import type { Product, PickupSlot, Quote } from './square-commerce-core';
const product: Product = {
  id: 'coffee',
  name: 'Coffee',
  variation: 'Regular',
  category: 'Drinks',
  description: '',
  image: null,
  price: 500,
  currency: 'USD',
  groups: [
    {
      id: 'milk',
      name: 'Milk',
      min: 1,
      max: 1,
      modifiers: [
        { id: 'oat', name: 'Oat', price: 50 },
        { id: 'dairy', name: 'Dairy', price: 0 },
      ],
    },
  ],
};
const slot: PickupSlot = {
  at: '2026-09-21T15:00:00Z',
  stopId: null,
  title: 'Cafe',
  address: 'Main St',
  timezone: 'America/Chicago',
};
describe('pickup cart and journey', () => {
  it('validates required options, maximum options and quantity', () => {
    expect(itemIssue(product, [], 1)).toContain('Milk');
    expect(itemIssue(product, ['oat', 'dairy'], 1)).toContain('Milk');
    expect(itemIssue(product, ['oat'], 21)).toContain('quantity');
    expect(itemIssue(product, ['oat'], 1)).toBeNull();
    expect(() => setCartLine([], product, ['removed'], 1, null)).toThrow();
  });
  it('adds then edits a line without duplication and updates estimates', () => {
    const cart = setCartLine([], product, ['oat'], 2, null);
    expect(cartReview(cart, [product])).toMatchObject({ subtotal: 1100, count: 2, issues: [] });
    const edit = setCartLine(cart, product, ['dairy'], 3, 0);
    expect(edit).toHaveLength(1);
    expect(cartReview(edit, [product]).subtotal).toBe(1500);
  });
  it('keeps changed catalog items visible for repair and detects new prices', () => {
    const cart = setCartLine([], product, ['oat'], 2, null);
    expect(cartReview(cart, []).issues).toHaveLength(1);
    expect(cartReview(cart, [{ ...product, groups: [] }]).issues).toHaveLength(1);
    expect(cartReview(cart, [{ ...product, price: 700 }])).toMatchObject({
      pricesChanged: true,
      subtotal: 1500,
    });
  });
  it('drops retired options in the editor so a stale cart can be repaired', () => {
    const selected = editableModifiers(product, ['retired-option', 'oat']);
    expect(selected).toEqual(['oat']);
    expect(itemIssue(product, selected, 1)).toBeNull();
    expect(editableModifiers(product, ['retired-option'])).toEqual([]);
    expect(itemIssue(product, [], 1)).toContain('Milk');
  });
  it('groups categories and accepts only safe optional images', () => {
    expect(
      menuCategories([product, { ...product, id: 'b', category: '' }]).map((g) => g.name),
    ).toEqual(['Drinks', 'Menu']);
    expect(safeProductImage(null)).toBeNull();
    expect(safeProductImage('javascript:alert(1)')).toBeNull();
    expect(safeProductImage('https://user:secret@example.com/image')).toBeNull();
    expect(safeProductImage('https://example.com/image')).toBe('https://example.com/image');
  });
  it('auto-selects a sole fixed/mobile place but preserves valid previous choice', () => {
    expect(selectedPickupPlace([slot], null)).toBe('fixed');
    expect(selectedPickupPlace([{ ...slot, stopId: 'mobile' }], null)).toBe('mobile');
    expect(selectedPickupPlace([slot, { ...slot, stopId: 'mobile' }], null)).toBeNull();
    expect(selectedPickupPlace([slot, { ...slot, stopId: 'mobile' }], 'mobile')).toBe('mobile');
  });
  it('groups times in the pickup timezone without mixing stops', () => {
    const result = groupedPickupTimes(
      [
        { ...slot, at: '2026-09-22T01:00:00Z' },
        slot,
        { ...slot, at: '2026-09-22T15:00:00Z' },
        { ...slot, stopId: 'other' },
      ],
      'fixed',
    );
    expect(result).toHaveLength(2);
    expect(result[0]?.slots).toHaveLength(2);
    expect(result[0]?.slots[0]?.at).toBe(slot.at);
  });
  it.each(['2255550123', '(225) 555-0123', '+1 225-555-0123', '1.225.555.0123'])(
    'normalizes a common US phone: %s',
    (phone) => expect(normalizePickupPhone(phone)).toBe('+12255550123'),
  );
  it.each([
    '123',
    '++12255550123',
    '+442255550123',
    '1115550123',
    '2251110123',
    '2255550123 ext 1',
  ])('rejects invalid phone: %s', (phone) => expect(normalizePickupPhone(phone)).toBeNull());
  it('validates name and exposes quote expiry', () => {
    expect(contactIssue('', '2255550123')).toContain('name');
    expect(contactIssue('Alex', '2255550123')).toBeNull();
    const q = { expiresAt: '2026-09-20T12:00:00Z' } as Quote;
    expect(quoteUsable(q, Date.parse(q.expiresAt))).toBe(false);
    expect(quoteUsable(q, Date.parse(q.expiresAt) - 1)).toBe(true);
  });
  it('back steps preserve the journey order and financial states remain honest', () => {
    expect(previousOrderStep('review')).toBe('contact');
    expect(previousOrderStep('menu')).toBe('menu');
    expect(orderTracking('checkout_pending')).toMatchObject({ terminal: false, index: -1 });
    expect(orderTracking('payment_review').terminal).toBe(false);
    expect(orderTracking('refund_failed').terminal).toBe(false);
    expect(orderTracking('ready')).toMatchObject({ index: 3, terminal: false });
    expect(orderTracking('completed').terminal).toBe(true);
    expect(orderingRecovery('SLOT_FULL')).toContain('cart is saved');
    expect(orderingRecovery('PRICE_CHANGED')).toContain('new total');
  });
  it.each(['web', 'native'])('persists isolated carts through the %s storage contract', () => {
    const data = new Map<string, string>();
    const storage = createPickupCartStorage({
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
      removeItem: (key) => {
        data.delete(key);
      },
    });
    const cart = setCartLine([], product, ['oat'], 2, null);
    expect(storage.save('cafe', cart, 1000)).toBe(true);
    expect(storage.read('cafe', 2000)).toEqual(cart);
    expect(storage.read('other', 2000)).toEqual([]);
    storage.save('other', cart, 2000);
    storage.save('cafe', [], 2000);
    expect(storage.read('other', 3000)).toEqual(cart);
    expect(storage.read('cafe', 3000)).toEqual([]);
    expect(storage.read('other', 20000000)).toEqual([]);
    expect(cartScopePolicy('cafe', 'other')).toMatchObject({
      requiresDiscardConfirmation: false,
      keepsSeparateCarts: true,
    });
  });
  it('rejects malformed, expired, future and cross-business stored data', () => {
    const data = {
      version: 1,
      businessId: 'cafe',
      savedAt: 1000,
      lines: setCartLine([], product, ['oat'], 1, null),
    };
    for (const raw of [
      'broken',
      JSON.stringify({ ...data, businessId: 'other' }),
      JSON.stringify({ ...data, savedAt: 999999999 }),
      JSON.stringify({ ...data, lines: [{ quantity: -1 }] }),
      JSON.stringify({ ...data, version: 2 }),
    ])
      expect(decodePickupCart(raw, 'cafe', 2000)).toEqual([]);
    expect(decodePickupCart(JSON.stringify(data), 'cafe', 999999999)).toEqual([]);
  });
  it('whitelists stored fields and reports storage failure without throwing', () => {
    const data = {
      version: 1,
      businessId: 'cafe',
      savedAt: 1000,
      lines: [
        {
          ...setCartLine([], product, ['oat'], 1, null)[0]!,
          recipient: 'Private',
          token: 'secret',
        },
      ],
    };
    expect(JSON.stringify(decodePickupCart(JSON.stringify(data), 'cafe', 2000))).not.toMatch(
      /Private|secret|recipient|token/,
    );
    const storage = createPickupCartStorage({
      getItem: () => {
        throw Error('blocked');
      },
      setItem: () => {
        throw Error('quota');
      },
      removeItem: () => {},
    });
    expect(storage.read('cafe')).toEqual([]);
    expect(storage.save('cafe', data.lines)).toBe(false);
  });
});
