import { storeSubscriptionManagementUrl } from './listing-billing-core';

/** Keep Apple's management UI in the active app scene, including sandbox purchases. */
export async function openListingSubscriptionManagement({
  platform,
  provider,
  showAppleSheet,
  openUrl,
}: {
  platform: string;
  provider: 'apple' | 'google';
  showAppleSheet: () => Promise<void>;
  openUrl: (url: string) => Promise<unknown>;
}) {
  if (platform === 'ios' && provider === 'apple') {
    await showAppleSheet();
    return;
  }
  await openUrl(storeSubscriptionManagementUrl(provider));
}
