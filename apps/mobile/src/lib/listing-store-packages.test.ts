import type { PurchasesPackage, SubscriptionOption } from 'react-native-purchases';
import { describe, expect, it } from 'vitest';

import { parseStoreListingPackages } from './listing-store-packages';

function apple(overrides: Record<string, unknown> = {}) {
  return {
    product: {
      identifier: 'listing_growth_monthly_v1',
      productCategory: 'SUBSCRIPTION',
      price: 39,
      priceString: '$39.00',
      subscriptionPeriod: 'P1M',
      introPrice: null,
      ...overrides,
    },
  } as unknown as PurchasesPackage;
}
function google(overrides: Record<string, unknown> = {}) {
  const phase = {
    recurrenceMode: 1,
    billingPeriod: { iso8601: 'P1M' },
    price: { amountMicros: 39_000_000, formatted: '€39.00' },
  };
  const option = {
    storeProductId: 'listing_growth_v1:monthly',
    isBasePlan: true,
    isPrepaid: false,
    installmentsInfo: null,
    freePhase: null,
    introPhase: null,
    pricingPhases: [phase],
    fullPricePhase: phase,
    ...overrides,
  } as unknown as SubscriptionOption;
  const item = apple({
    identifier: option.storeProductId,
    price: 0,
    priceString: 'Free trial',
    defaultOption: { isBasePlan: false },
    subscriptionOptions: [option],
  });
  return { item, option };
}

describe('store listing packages', () => {
  it('uses the localized Apple recurring price', () => {
    const item = apple();
    expect(
      parseStoreListingPackages([item], 'ios', new Set([item.product.identifier]))[0],
    ).toMatchObject({ planCode: 'growth', period: 'monthly', price: 39, priceString: '$39.00' });
  });

  it('shows the Google base-plan price and purchases that exact option rather than a default trial', () => {
    const { item, option } = google();
    const [parsed] = parseStoreListingPackages(
      [item],
      'android',
      new Set([item.product.identifier]),
    );
    expect(parsed).toMatchObject({ price: 39, priceString: '€39.00' });
    expect(parsed!.subscriptionOption).toBe(option);
  });

  it.each([
    { subscriptionPeriod: 'P3M' },
    { introPrice: { price: 1 } },
    { productCategory: 'NON_SUBSCRIPTION' },
    { price: 0 },
    { price: NaN },
    { priceString: '' },
    { identifier: 'listing_growth_v1:monthly' },
  ])('rejects Apple terms the paywall does not disclose: %j', (overrides) => {
    const item = apple(overrides);
    expect(parseStoreListingPackages([item], 'ios', new Set([item.product.identifier]))).toEqual(
      [],
    );
  });

  it.each([
    { isPrepaid: true },
    { installmentsInfo: { commitmentPaymentsCount: 12 } },
    { isBasePlan: false },
    { freePhase: {} },
    { introPhase: {} },
    { pricingPhases: [] },
    { fullPricePhase: null },
    { fullPricePhase: { recurrenceMode: 2 } },
  ])('rejects unsupported Google billing terms: %j', (overrides) => {
    const { item } = google(overrides);
    expect(
      parseStoreListingPackages([item], 'android', new Set([item.product.identifier])),
    ).toEqual([]);
  });

  it('does not expose inactive products or a web checkout', () => {
    const item = apple();
    expect(parseStoreListingPackages([item], 'ios', new Set())).toEqual([]);
    expect(parseStoreListingPackages([item], 'web', new Set([item.product.identifier]))).toEqual(
      [],
    );
  });
});
