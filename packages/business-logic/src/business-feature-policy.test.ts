import { describe, expect, it } from 'vitest';
import { businessOperationIncluded, type BusinessFeatureAccess } from './business-feature-policy';
import { businessSubscriptionPlans, businessSubscriptionFeatures } from './business-subscriptions';

const access = (features: BusinessFeatureAccess['featureCodes']): BusinessFeatureAccess => ({
  businessId: 'business-a',
  featureCodes: features,
  planCode: null,
  enforced: true,
});

describe('business feature policy', () => {
  it('uses server capabilities rather than a plan name or rollout flag', () => {
    expect(
      businessOperationIncluded(
        { ...access([]), planCode: 'pro', enforced: false },
        'create_pickup_order',
      ),
    ).toBe(false);
    expect(
      businessOperationIncluded(access(businessSubscriptionFeatures), 'create_pickup_order'),
    ).toBe(true);
  });
  it.each(businessSubscriptionPlans)(
    '$name keeps all three business slots and its promised tools',
    (plan) => {
      expect(plan.listingLimit).toBe(3);
      expect(businessOperationIncluded(access(plan.features), 'edit_catalog')).toBe(true);
      expect(businessOperationIncluded(access(plan.features), 'configure_rewards')).toBe(
        plan.code !== 'essentials',
      );
      expect(businessOperationIncluded(access(plan.features), 'create_appointment')).toBe(
        plan.code === 'pro',
      );
      expect(businessOperationIncluded(access(plan.features), 'create_pickup_order')).toBe(
        plan.code === 'pro',
      );
    },
  );
  it('fails closed for new activity without a snapshot', () => {
    expect(businessOperationIncluded(null, 'create_pickup_order')).toBe(false);
    expect(businessOperationIncluded(undefined, 'earn_rewards')).toBe(false);
  });
  it('preserves recovery after expiration without inventing new benefits', () => {
    for (const operation of [
      'fulfill_existing_order',
      'refund_existing_order',
      'cancel_existing_appointment',
      'redeem_existing_reward',
      'reverse_reward',
      'disconnect_payment_provider',
      'delete_account',
    ] as const) {
      expect(businessOperationIncluded(access([]), operation)).toBe(true);
      expect(businessOperationIncluded(null, operation)).toBe(true);
    }
  });
});
