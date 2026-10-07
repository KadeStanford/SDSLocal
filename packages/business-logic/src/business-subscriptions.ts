export const businessSubscriptionBenefits = [
  'Hosted business page, photos, menu or services, and a shareable QR code',
  'Local discovery, customer follows, and business reviews',
  'Events, RSVPs, and mobile business locations',
  'Page activity insights and service requests',
] as const;

export const businessSubscriptionFeatures = [
  'business_page',
  'discovery',
  'events',
  'service_requests',
  'basic_analytics',
  'loyalty',
  'follower_updates',
  'staff_scanning',
  'pickup_ordering',
  'appointments',
] as const;
export type BusinessSubscriptionFeature = (typeof businessSubscriptionFeatures)[number];
const essentialsFeatures = [
  'business_page',
  'discovery',
  'events',
  'service_requests',
  'basic_analytics',
] as const satisfies readonly BusinessSubscriptionFeature[];
const growthFeatures = [
  ...essentialsFeatures,
  'loyalty',
  'follower_updates',
  'staff_scanning',
] as const satisfies readonly BusinessSubscriptionFeature[];

/** All new plans cover the same small-business footprint; upgrades buy features. */
export const businessSubscriptionPlans = [
  {
    code: 'essentials',
    name: 'Essentials',
    listingLimit: 3,
    serviceLevel: 1,
    description: 'Build your presence and help local customers find and contact you.',
    features: essentialsFeatures,
    benefits: ['Business pages and discovery', 'Events, service requests, and basic insights'],
  },
  {
    code: 'growth',
    name: 'Growth',
    listingLimit: 3,
    serviceLevel: 2,
    description: 'Bring customers back with rewards and updates for your followers.',
    features: growthFeatures,
    benefits: ['Everything in Essentials', 'Loyalty rewards, follower updates, and staff scanning'],
  },
  {
    code: 'pro',
    name: 'Pro',
    listingLimit: 3,
    serviceLevel: 3,
    description: 'Take pickup orders and appointment bookings with supported payment setup.',
    features: businessSubscriptionFeatures,
    benefits: ['Everything in Growth', 'Pickup ordering and appointment booking tools'],
  },
] as const;

/** Existing purchases remain restorable, with their original listing allowances. */
export const legacyBusinessSubscriptionPlans = [
  { code: 'single', name: 'Legacy Single', listingLimit: 1, serviceLevel: 3 },
  { code: 'multi', name: 'Legacy Multi', listingLimit: 3, serviceLevel: 3 },
] as const;
const allPlans = [...businessSubscriptionPlans, ...legacyBusinessSubscriptionPlans];
export type BusinessSubscriptionPlanCode = (typeof allPlans)[number]['code'];
export type BusinessSubscriptionPeriod = 'monthly' | 'yearly';

/** Exact matching keeps lookalike or future product IDs out of the purchase flow. */
export function businessSubscriptionProductMetadata(productId: string) {
  for (const plan of allPlans) {
    for (const period of ['monthly', 'yearly'] as const) {
      if (
        productId === `listing_${plan.code}_${period}_v1` ||
        productId === `listing_${plan.code}_v1:${period}`
      ) {
        return { planCode: plan.code, period };
      }
    }
  }
  return null;
}

export function offeredBusinessSubscriptionProductMetadata(
  productId: string,
  enabledProductIds: ReadonlySet<string>,
) {
  const metadata = businessSubscriptionProductMetadata(productId);
  return metadata &&
    enabledProductIds.has(productId) &&
    businessSubscriptionPlans.some((plan) => plan.code === metadata.planCode)
    ? metadata
    : null;
}

export function isBusinessSubscriptionDowngrade(
  current: BusinessSubscriptionPlanCode,
  next: BusinessSubscriptionPlanCode,
) {
  const currentPlan = allPlans.find((plan) => plan.code === current)!;
  const nextPlan = allPlans.find((plan) => plan.code === next)!;
  return (
    nextPlan.serviceLevel < currentPlan.serviceLevel ||
    nextPlan.listingLimit < currentPlan.listingLimit
  );
}
