import { expect, it } from 'vitest';
import {
  listingPurchaseErrorFeedback,
  listingStoreHasActivePlan,
} from './listing-purchase-feedback';

it('gives a recovery path when the native sheet reports cancellation', () => {
  const feedback = listingPurchaseErrorFeedback({ userCancelled: true, code: '1' });
  expect(feedback.notice).toContain('Restore purchases');
  expect(feedback.error).toBeNull();
});

it('recognizes numeric pending-approval codes without claiming activation', () => {
  expect(listingPurchaseErrorFeedback({ code: 20 }).notice).toContain('pending store approval');
});

it('directs existing purchases to restore instead of buying a second plan', () => {
  for (const code of ['6', '7']) {
    expect(listingPurchaseErrorFeedback({ code }).error).toContain('Restore purchases');
  }
});

it('never puts raw store errors or account data in diagnostics', () => {
  const feedback = listingPurchaseErrorFeedback({
    code: 'receipt-secret',
    message: 'private account',
  });
  expect(JSON.stringify(feedback)).not.toMatch(/receipt-secret|private account/);
  expect(feedback.diagnostic).toBe('purchase: unknown');
});

it('distinguishes a completed SDK call from an active listing entitlement', () => {
  expect(listingStoreHasActivePlan({ entitlements: { active: {} } })).toBe(false);
  expect(
    listingStoreHasActivePlan({ entitlements: { active: { other: { isActive: true } } } }),
  ).toBe(false);
  expect(
    listingStoreHasActivePlan({
      entitlements: { active: { business_listing: { isActive: true } } },
    }),
  ).toBe(true);
});

it('does not mistake a previous active plan for the newly purchased product', () => {
  const info = {
    entitlements: {
      active: { business_listing: { isActive: true, productIdentifier: 'old-plan' } },
    },
  };
  expect(listingStoreHasActivePlan(info, 'new-plan')).toBe(false);
  expect(listingStoreHasActivePlan(info, 'old-plan')).toBe(true);
});
