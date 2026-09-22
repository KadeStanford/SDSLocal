export type ListingPlanCode = 'single' | 'multi';
export type BillingPeriod = 'monthly' | 'yearly';

export interface ListingBillingSummary {
  readonly billingEnabled: boolean;
  readonly planCode: ListingPlanCode | null;
  readonly planName: string | null;
  readonly status:
    'none' | 'active' | 'grace_period' | 'billing_retry' | 'paused' | 'expired' | 'revoked';
  readonly canPublish: boolean;
  readonly listingLimit: number;
  readonly usedListings: number;
  readonly availableListings: number;
  readonly currentPeriodEnd: string | null;
  readonly willRenew: boolean;
  readonly provider: 'apple' | 'google' | 'test_store' | null;
  readonly productId: string | null;
  readonly businessIds: readonly string[];
}

export const listingPlans = [
  {
    code: 'single',
    name: 'Single',
    listingLimit: 1,
    description: 'For an owner publishing one local business.',
  },
  {
    code: 'multi',
    name: 'Multi',
    listingLimit: 3,
    description: 'For owners managing up to three local businesses.',
  },
] as const;

export function listingProductMetadata(productId: string) {
  const normalized = productId.toLowerCase();
  const planCode: ListingPlanCode | null = normalized.includes('listing_single_')
    ? 'single'
    : normalized.includes('listing_multi_')
      ? 'multi'
      : null;
  const period: BillingPeriod | null =
    normalized.includes('_monthly_') || normalized.endsWith(':monthly')
      ? 'monthly'
      : normalized.includes('_yearly_') || normalized.endsWith(':yearly')
        ? 'yearly'
        : null;
  return planCode && period ? { planCode, period } : null;
}

export function annualSavingsLabel(monthlyPrice: number, yearlyPrice: number) {
  if (monthlyPrice <= 0 || yearlyPrice <= 0 || yearlyPrice >= monthlyPrice * 12) return null;
  const savings = Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100);
  return savings > 0 ? `Save ${savings}%` : null;
}

export function listingStatusMessage(summary: ListingBillingSummary) {
  if (summary.status === 'none') return 'No listing plan yet';
  if (summary.status === 'grace_period' || summary.status === 'billing_retry') {
    return 'Payment needs attention';
  }
  if (summary.status === 'paused') return 'Listing plan paused';
  if (summary.status === 'expired' || summary.status === 'revoked') return 'Listing plan inactive';
  if (!summary.willRenew && summary.currentPeriodEnd) {
    return `Active until ${new Date(summary.currentPeriodEnd).toLocaleDateString()}`;
  }
  return `${summary.usedListings} of ${summary.listingLimit} listing slots used`;
}
