import { describe, expect, it } from 'vitest';
import {
  businessSearchScore,
  discoverySearchIntent,
  offeringSearchQuery,
} from './discovery-search';
import {
  DEFAULT_DISCOVERY_FILTERS,
  filterDiscoveryBusinesses,
  type DiscoveryBusiness,
} from './discovery-core';

const make = (
  id: string,
  name: string,
  category: string,
  menu = '',
  description = '',
): DiscoveryBusiness => ({
  id,
  name,
  category_summary: category,
  offering_search_text: menu,
  description,
  city: 'Hammond',
  created_at: '2026-09-01',
  status: 'active',
});
const rows = [
  make('bread', 'A Baker', 'Bakery', 'Baker’s dozen rolls soft dinner rolls'),
  make('pizza', 'Juniper Kitchen', 'Pizza restaurant', 'Margherita pizza pepperoni calzone'),
  make('seafood', 'Bayou Table', 'Seafood restaurant', 'Grilled catfish'),
  make('flowers', 'Petal Studio', 'Florist', 'Birthday bouquet floral arrangement'),
  make('hair', 'Willow & Pine', 'Hair studio', 'Color consultation cut and finish'),
  make('repair', 'Parish Repairs', 'Home services', 'Plumbing drain repair'),
];
const ranked = (query: string, overrides = {}) =>
  filterDiscoveryBusinesses(
    rows,
    query,
    { ...DEFAULT_DISCOVERY_FILTERS, ...overrides },
    new Set(),
    new Set(),
    new Date(),
  );

describe('intent-aware discovery ranking', () => {
  it('puts restaurants ahead of dinner rolls for dinner', () => {
    expect(ranked('dinner').map((b) => b.id)).toEqual(['seafood', 'pizza', 'bread']);
    expect(offeringSearchQuery('dinner', rows)).toBe('');
  });
  it.each(['supper', 'dinnre', 'I want somewhere for dinner', 'dinner near me'])(
    'understands %s',
    (query) => {
      expect(ranked(query)[0]?.id).toBe('seafood');
    },
  );
  it('keeps explicit items specific', () => {
    expect(ranked('dinner rolls').map((b) => b.id)).toEqual(['bread']);
    expect(offeringSearchQuery('dinner rolls', rows)).toBe('dinner rolls');
    expect(ranked('pizza').map((b) => b.id)).toEqual(['pizza']);
  });
  it.each([
    ['birthday flowers', 'flowers'],
    ['haircut', 'hair'],
    ['plumber', 'repair'],
    ['peppernoi', 'pizza'],
    ['calzon', 'pizza'],
    ['WILLOW & PINE', 'hair'],
  ])('finds %s', (query, id) => {
    expect(ranked(query).map((b) => b.id)).toEqual([id]);
  });
  it('supports reordered words and location without discarding constraints', () => {
    expect(ranked('Hammond dinner')[0]?.id).toBe('seafood');
    expect(ranked('dinner Covington')).toEqual([]);
    expect(ranked('birthday pizza')).toEqual([]);
  });
  it('does not fill results for unsupported niche searches', () => {
    expect(ranked('telescope repair')).toEqual([]);
    expect(ranked('sushi')).toEqual([]);
    expect(ranked('cat')).toEqual([]);
  });
  it('supports accented words', () => {
    expect(businessSearchScore(make('c', 'Café du coin', 'Coffee'), 'cafe')).toBeGreaterThan(0);
  });
  it('does not leak blocked/inactive results or bypass selected filters', () => {
    expect(ranked('dinner', { category: 'Florist' })).toEqual([]);
    expect(ranked('dinner', { audience: 'following' })).toEqual([]);
    expect(
      filterDiscoveryBusinesses(
        rows,
        'dinner',
        DEFAULT_DISCOVERY_FILTERS,
        new Set(),
        new Set(['seafood', 'pizza', 'bread']),
        new Date(),
      ),
    ).toEqual([]);
    expect(
      filterDiscoveryBusinesses(
        rows.map((b) => ({ ...b, status: 'draft' })),
        'dinner',
        DEFAULT_DISCOVERY_FILTERS,
        new Set(),
        new Set(),
        new Date(),
      ),
    ).toEqual([]);
  });
  it('requires data supporting open-now and pickup intent', () => {
    const b = rows[1]!;
    expect(businessSearchScore(b, 'pizza open now')).toBe(0);
    expect(businessSearchScore({ ...b, isOpenNow: true }, 'pizza open now')).toBeGreaterThan(0);
    expect(businessSearchScore(b, 'pizza takeout')).toBe(0);
    expect(
      businessSearchScore({ ...b, supportsPickupOrdering: true }, 'pizza takeout'),
    ).toBeGreaterThan(0);
  });
  it('corrects offering typos only against catalog words', () => {
    expect(offeringSearchQuery('peppernoi', rows)).toBe('pepperoni');
    expect(offeringSearchQuery('xyzabc', rows)).toBe('xyzabc');
  });
  it('keeps browse ordering alphabetical and explicit sorts intact', () => {
    expect(ranked('')[0]?.id).toBe('bread');
    expect(ranked('dinner', { sort: 'recent' })[0]?.id).toBe('bread');
  });
  it('bounds very long query work', () =>
    expect(discoverySearchIntent('dinner '.repeat(10000)).tokens).toHaveLength(24));
});
