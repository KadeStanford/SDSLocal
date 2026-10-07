import { describe, expect, it } from 'vitest';
import {
  businessCreationAccess,
  storeSubscriptionManagementUrl,
  subscriptionLegalUrl,
  type ListingBillingSummary,
} from './listing-billing-core';

const active: ListingBillingSummary = {
  billingEnabled: true,
  planCode: 'growth',
  planName: 'Growth',
  status: 'active',
  canPublish: true,
  listingLimit: 3,
  usedListings: 1,
  availableListings: 2,
  currentPeriodEnd: null,
  willRenew: false,
  provider: 'google',
  productId: 'listing_growth_v1:monthly',
  businessIds: ['business-id'],
};
describe('business creation access', () => {
  it('waits for a server summary rather than trusting a store purchase result', () => {
    expect(businessCreationAccess(null, false)).toBe('checking');
    expect(businessCreationAccess(active, true)).toBe('checking');
  });
  it('allows paid/grace access with capacity, including cancelled subscriptions still in their paid period', () => {
    expect(businessCreationAccess(active, false)).toBe('ready');
    expect(businessCreationAccess({ ...active, status: 'grace_period' }, false)).toBe('ready');
  });
  it('blocks expired access or exhausted capacity', () => {
    expect(businessCreationAccess({ ...active, status: 'expired', canPublish: false }, false)).toBe(
      'subscribe',
    );
    expect(businessCreationAccess({ ...active, availableListings: 0 }, false)).toBe('full');
  });
  it('allows preview creation only from an explicit server rollout setting', () => {
    expect(
      businessCreationAccess({ ...active, billingEnabled: false, canPublish: false }, false),
    ).toBe('preview');
  });
});
describe('subscription links', () => {
  it('provides cancellation links even without a working SDK', () => {
    expect(storeSubscriptionManagementUrl('apple')).toBe(
      'https://apps.apple.com/account/subscriptions',
    );
    expect(storeSubscriptionManagementUrl('google')).toBe(
      'https://play.google.com/store/account/subscriptions',
    );
  });
  it('accepts public HTTPS legal pages', () => {
    expect(subscriptionLegalUrl('https://parishpass.app/terms')).toBe(
      'https://parishpass.app/terms',
    );
  });
  it.each([
    undefined,
    '',
    'broken',
    'http://parishpass.app/terms',
    'https://example.com/terms',
    'https://www.example.org/privacy',
    'https://localhost/terms',
    'https://127.0.0.1/privacy',
    'https://[::1]/terms',
    'https://192.168.1.2/support',
    'https://private.local/terms',
    'https://site.test/privacy',
    'https://user:password@parishpass.app/terms',
  ])('blocks a missing, placeholder, local, or credential-bearing legal link: %s', (url) => {
    expect(subscriptionLegalUrl(url)).toBeNull();
  });
});
