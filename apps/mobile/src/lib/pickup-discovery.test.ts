import { describe, expect, it, vi } from 'vitest';
import {
  initialPickupModule,
  loadPickupModule,
  loadPublicPickupCapabilities,
  pickupModulePresentation,
} from './pickup-discovery';
import {
  businessCardAccessibilityLabel,
  businessStatusIndicators,
  DEFAULT_DISCOVERY_FILTERS,
  filterDiscoveryBusinesses,
  type DiscoveryBusiness,
} from './discovery-core';
const supported = [{ business_id: 'cafe', supports_pickup_ordering: true }];
const ports = () => ({
  capabilities: vi.fn(async () => supported),
  order: vi.fn(async () => null),
  availability: vi.fn(async () => ({ available: true as boolean, status: 'open' as const })),
});
describe('public pickup discovery', () => {
  it('reads capability once for the list and strips extra fields', async () => {
    const read = vi.fn(async () => ({
      data: [
        { ...supported[0], token: 'private' },
        { business_id: 'other', supports_pickup_ordering: false },
      ],
      error: null,
    }));
    expect(await loadPublicPickupCapabilities('staging', read)).toEqual(supported);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it.each(['production', undefined])(
    'never queries outside pilot environments (%s)',
    async (env) => {
      const read = vi.fn();
      expect(await loadPublicPickupCapabilities(env, read)).toEqual([]);
      expect(read).not.toHaveBeenCalled();
      expect(
        pickupModulePresentation(env, { ...initialPickupModule('cafe'), orderId: 'saved' }).kind,
      ).toBe('hidden');
    },
  );
  it('does not probe Square for unsupported businesses', async () => {
    const p = ports();
    p.capabilities.mockResolvedValue([]);
    const result = await loadPickupModule('cafe', p);
    expect(p.availability).not.toHaveBeenCalled();
    expect(pickupModulePresentation('staging', result).kind).toBe('hidden');
  });
  it('opens the existing guest ordering route', async () => {
    const state = await loadPickupModule('cafe', ports());
    expect(pickupModulePresentation('staging', state)).toMatchObject({
      kind: 'open',
      action: 'Order pickup',
      path: '/order?businessId=cafe',
    });
  });
  it('retains a supported closed module and refresh action', async () => {
    const p = {
      ...ports(),
      availability: async () => ({ available: false, status: 'closed' as const }),
    };
    expect(pickupModulePresentation('staging', await loadPickupModule('cafe', p))).toMatchObject({
      kind: 'closed',
      action: 'Refresh pickup times',
    });
  });
  it.each(['capabilities', 'availability'] as const)(
    'shows retry after %s failure',
    async (key) => {
      const p = ports();
      p[key].mockRejectedValue(new Error('offline'));
      expect(pickupModulePresentation('staging', await loadPickupModule('cafe', p))).toMatchObject({
        kind: 'error',
        action: 'Retry',
      });
    },
  );
  it('treats provider outage as recoverable, not closed', async () => {
    const p = {
      ...ports(),
      availability: async () => ({ available: false, status: 'unavailable' as const }),
    };
    expect(pickupModulePresentation('staging', await loadPickupModule('cafe', p)).kind).toBe(
      'error',
    );
  });
  it('prioritizes a saved order even if capability now fails', async () => {
    const p = {
      ...ports(),
      capabilities: async () => {
        throw Error('offline');
      },
      order: async () => ({ businessId: 'cafe', orderId: 'saved' }),
    };
    expect(pickupModulePresentation('staging', await loadPickupModule('cafe', p))).toMatchObject({
      kind: 'order',
      path: '/order?orderId=saved',
    });
  });
  it('does not show a different business order and has a stable loading state', async () => {
    const p = { ...ports(), order: async () => ({ businessId: 'other', orderId: 'saved' }) };
    expect((await loadPickupModule('cafe', p)).orderId).toBeNull();
    expect(pickupModulePresentation('staging', initialPickupModule('cafe')).kind).toBe('loading');
  });
  const cafe: DiscoveryBusiness = {
    id: 'cafe',
    name: 'A very long café name',
    description: 'Coffee',
    category_summary: 'Food',
    offering_search_text: '',
    city: 'Baton Rouge',
    created_at: '2026-01-01',
    status: 'active',
    supportsPickupOrdering: true,
    has_active_rewards: true,
  };
  it('combines pickup filtering with search, following, blocked and inactive rules', () => {
    const businesses = [
      cafe,
      { ...cafe, id: 'other', supportsPickupOrdering: false },
      { ...cafe, id: 'inactive', status: 'suspended' },
    ];
    const filters = {
      ...DEFAULT_DISCOVERY_FILTERS,
      feature: 'pickup' as const,
      audience: 'following' as const,
    };
    expect(
      filterDiscoveryBusinesses(
        businesses,
        'café',
        filters,
        new Set(['cafe']),
        new Set(),
        new Date(),
      ),
    ).toEqual([cafe]);
    expect(
      filterDiscoveryBusinesses(
        businesses,
        'café',
        filters,
        new Set(['cafe']),
        new Set(['cafe']),
        new Date(),
      ),
    ).toEqual([]);
  });
  it('prioritizes the compact pickup badge and announces capability on the card', () => {
    expect(businessStatusIndicators(cafe, new Set(['cafe']), new Date())).toEqual([
      'pickup',
      'following',
    ]);
    expect(businessCardAccessibilityLabel(cafe)).toContain('Order ahead available');
    expect(
      businessCardAccessibilityLabel({ ...cafe, supportsPickupOrdering: false }),
    ).not.toContain('Order ahead');
  });
});
