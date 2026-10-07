import type { BusinessSubscriptionPlanCode as ListingPlanCode } from '@sds/business-logic';

export {
  businessSubscriptionPlans as listingPlans,
  businessSubscriptionBenefits as listingPlanBenefits,
  businessSubscriptionProductMetadata as listingProductMetadata,
  offeredBusinessSubscriptionProductMetadata as offeredListingProductMetadata,
  isBusinessSubscriptionDowngrade as isListingDowngrade,
} from '@sds/business-logic';
export type {
  BusinessSubscriptionPlanCode as ListingPlanCode,
  BusinessSubscriptionPeriod as BillingPeriod,
} from '@sds/business-logic';

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

export type BusinessCreationAccess = 'checking' | 'preview' | 'subscribe' | 'full' | 'ready';

export function businessCreationAccess(
  summary: ListingBillingSummary | null,
  loading: boolean,
): BusinessCreationAccess {
  if (loading || !summary) return 'checking';
  if (!summary.billingEnabled) return 'preview';
  if (!summary.canPublish) return 'subscribe';
  if (summary.availableListings <= 0) return 'full';
  return 'ready';
}

export function storeSubscriptionManagementUrl(provider: 'apple' | 'google') {
  return provider === 'apple'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}

export function subscriptionLegalUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '[::1]' ||
      /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
      /(^|\.)example\.(com|org|net)$/.test(hostname) ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.test')
    )
      return null;
    return parsed.toString();
  } catch {
    return null;
  }
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
