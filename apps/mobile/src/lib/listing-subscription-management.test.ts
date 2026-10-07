import { expect, it, vi } from 'vitest';
import { openListingSubscriptionManagement } from './listing-subscription-management';

it('opens the Apple management sheet without leaving the app for an external URL', async () => {
  const showAppleSheet = vi.fn().mockResolvedValue(undefined),
    openUrl = vi.fn();
  await openListingSubscriptionManagement({
    platform: 'ios',
    provider: 'apple',
    showAppleSheet,
    openUrl,
  });
  expect(showAppleSheet).toHaveBeenCalledOnce();
  expect(openUrl).not.toHaveBeenCalled();
});
it('surfaces a failed Apple sheet instead of silently launching another store', async () => {
  const openUrl = vi.fn();
  await expect(
    openListingSubscriptionManagement({
      platform: 'ios',
      provider: 'apple',
      showAppleSheet: vi.fn().mockRejectedValue(new Error('sheet unavailable')),
      openUrl,
    }),
  ).rejects.toThrow('sheet unavailable');
  expect(openUrl).not.toHaveBeenCalled();
});
it('keeps Google subscriptions on the Google management destination', async () => {
  const showAppleSheet = vi.fn(),
    openUrl = vi.fn().mockResolvedValue(undefined);
  await openListingSubscriptionManagement({
    platform: 'android',
    provider: 'google',
    showAppleSheet,
    openUrl,
  });
  expect(openUrl).toHaveBeenCalledExactlyOnceWith(
    'https://play.google.com/store/account/subscriptions',
  );
  expect(showAppleSheet).not.toHaveBeenCalled();
});
