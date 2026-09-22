import { describe, expect, it } from 'vitest';

import {
  annualSavingsLabel,
  listingProductMetadata,
  listingStatusMessage,
  type ListingBillingSummary,
} from './listing-billing-core';

describe('listingProductMetadata', () => {
  it('maps every configured plan and period from its stable product id', () => {
    expect(listingProductMetadata('listing_single_monthly_v1')).toEqual({
      planCode: 'single',
      period: 'monthly',
    });
    expect(listingProductMetadata('listing_multi_yearly_v1')).toEqual({
      planCode: 'multi',
      period: 'yearly',
    });
    expect(listingProductMetadata('listing_single_v1:monthly')).toEqual({
      planCode: 'single',
      period: 'monthly',
    });
  });

  it('does not guess when a store returns an unknown product', () => {
    expect(listingProductMetadata('something_else')).toBeNull();
  });
});

it('only advertises a real yearly saving', () => {
  expect(annualSavingsLabel(10, 100)).toBe('Save 17%');
  expect(annualSavingsLabel(10, 120)).toBeNull();
});

it('explains a cancelled subscription without saying access ended early', () => {
  const summary: ListingBillingSummary = {
    billingEnabled: true,
    planCode: 'single',
    planName: 'Single',
    status: 'active',
    canPublish: true,
    listingLimit: 1,
    usedListings: 1,
    availableListings: 0,
    currentPeriodEnd: '2026-10-20T00:00:00.000Z',
    willRenew: false,
    provider: 'apple',
    productId: 'listing_single_monthly_v1',
    businessIds: ['business-1'],
  };
  expect(listingStatusMessage(summary)).toContain('Active until');
});
