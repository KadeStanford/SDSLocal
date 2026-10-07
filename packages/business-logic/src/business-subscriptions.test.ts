import { describe, expect, it } from 'vitest';

import {
  businessSubscriptionPlans,
  businessSubscriptionProductMetadata,
  legacyBusinessSubscriptionPlans,
  offeredBusinessSubscriptionProductMetadata,
  isBusinessSubscriptionDowngrade,
} from './business-subscriptions';

describe('business subscription store catalog', () => {
  it.each([...businessSubscriptionPlans, ...legacyBusinessSubscriptionPlans])(
    'preserves both store durations for $name',
    (plan) => {
      for (const period of ['monthly', 'yearly'] as const) {
        const expected = { planCode: plan.code, period };
        expect(businessSubscriptionProductMetadata(`listing_${plan.code}_${period}_v1`)).toEqual(
          expected,
        );
        expect(businessSubscriptionProductMetadata(`listing_${plan.code}_v1:${period}`)).toEqual(
          expected,
        );
      }
    },
  );

  it.each([
    'other_listing_single_monthly_v1',
    'listing_single_monthly_v1_extra',
    'listing_single_monthly_v2',
    'listing_single_v2:monthly',
    'listing_single_yearly_v1:monthly',
    'listing_multi_monthly_v1:yearly',
    'listing_partner_monthly_v1',
    'LISTING_SINGLE_MONTHLY_V1',
    '',
  ])('rejects an unconfigured product: %s', (productId) => {
    expect(businessSubscriptionProductMetadata(productId)).toBeNull();
  });

  it('defers only a move to a smaller listing allowance', () => {
    expect(isBusinessSubscriptionDowngrade('multi', 'single')).toBe(true);
    expect(isBusinessSubscriptionDowngrade('single', 'multi')).toBe(false);
    expect(isBusinessSubscriptionDowngrade('single', 'single')).toBe(false);
    expect(isBusinessSubscriptionDowngrade('multi', 'multi')).toBe(false);
    expect(isBusinessSubscriptionDowngrade('pro', 'growth')).toBe(true);
    expect(isBusinessSubscriptionDowngrade('growth', 'essentials')).toBe(true);
    expect(isBusinessSubscriptionDowngrade('essentials', 'pro')).toBe(false);
    expect(isBusinessSubscriptionDowngrade('single', 'essentials')).toBe(true);
  });

  it('uses features to distinguish plans with the same three-business allowance', () => {
    expect(businessSubscriptionPlans.map((plan) => plan.listingLimit)).toEqual([3, 3, 3]);
    const [essentials, growth, pro] = businessSubscriptionPlans;
    expect(essentials.features).not.toContain('loyalty');
    expect(growth.features).toEqual(expect.arrayContaining([...essentials.features]));
    expect(growth.features).toContain('loyalty');
    expect(growth.features).not.toContain('pickup_ordering');
    expect(pro.features).toEqual(expect.arrayContaining([...growth.features]));
    expect(pro.features).toContain('pickup_ordering');
    expect(pro.features).toContain('appointments');
  });

  it('does not sell inactive or legacy products even if RevenueCat includes them', () => {
    const productId = 'listing_growth_monthly_v1';
    expect(offeredBusinessSubscriptionProductMetadata(productId, new Set())).toBeNull();
    expect(offeredBusinessSubscriptionProductMetadata(productId, new Set([productId]))).toEqual({
      planCode: 'growth',
      period: 'monthly',
    });
    const legacyId = 'listing_multi_monthly_v1';
    expect(offeredBusinessSubscriptionProductMetadata(legacyId, new Set([legacyId]))).toBeNull();
  });
});
