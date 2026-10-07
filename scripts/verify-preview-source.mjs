import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Release contracts for the page families that previously regressed in a copied checkout.
// Update these contracts deliberately when replacing the corresponding implementation.
export function verifyPreviewSource(mobileRoot) {
  const required = [
    ['src/app/(tabs)/account.tsx', ['AccountSettingsRow', 'AuthModeButton', 'BackPill']],
    ['src/components/alerts-button.tsx', ['AlertsInboxHeader', 'AlertsInboxList']],
    ['src/app/notification.tsx', ['AlertsInboxHeader', 'AlertsInboxList']],
    [
      'src/components/alerts-inbox.tsx',
      ['splitNotificationAlerts', 'BusinessSearch', 'Unread only'],
    ],
    ['src/app/my-service-requests.tsx', ['CustomerRequestInbox', 'CustomerRequestDetails']],
    ['src/components/customer-calendar.tsx', ['eventDateBarDays', 'event-date-bar', 'HorizontalScrollRow']],
    ['src/components/events-view-switch.tsx', ['By date', 'All events']],
    ['src/components/app-text-input.tsx', ['inputSurface', 'onFocus', 'onBlur']],
    ['src/components/event-detail-heading.tsx', ['contentFit="cover"', 'onDirections']],
    ['src/components/flow-layout.tsx', ['FlowSection', 'FlowIdentity']],
    [
      'src/components/public-business-page.tsx',
      ['BusinessDetailsDisclosure', 'EventCard', 'selectedEventId'],
    ],
    [
      'src/components/business-workspace.tsx',
      ['WorkspaceDetailsOverview', 'MobileStopInbox', 'BackPill', 'MenuCategoryActions'],
    ],
    ['src/components/reward-wallet.tsx', ['RewardIdentity', 'CustomerBrand', 'CustomerAction', 'RewardsWalletList', 'RewardProgramCard']],
    ['src/components/service-operations-screen.tsx', ['OperationsScreenHeader', 'AppointmentWorkspace']],
    ['src/app/service-requests.tsx', ['ServiceRequestInboxControls', 'ServiceRequestSummaryCard']],
    [
      'src/components/customer-rewards-ui.tsx',
      ['RewardsHeader', 'FollowingBusinessCard', 'Keep following'],
    ],
    ['src/lib/discovery-feed.ts', ['DiscoveryDaypart', 'DiscoveryWeather']],
    ['src/components/discovery-carousel.tsx', ['DiscoveryCarousel']],
    ['src/components/business-card.tsx', ['BusinessRating']],
    ['src/components/pickup/business-order-components.tsx', ['businessOrderStage']],
    ['src/app/(tabs)/staff-scan.tsx', ['AppButton', 'useTheme', 'actionCopyFlexible']],
    ['src/app/event-attendees.tsx', ['EventAttendeeInboxHeader', 'MerchantSheet', 'BackPill']],
    [
      'src/app/staff-invite.tsx',
      ['StaffInviteContent', 'AppButton', 'BackPill', 'started.current'],
    ],
    ['src/app/auth/callback.tsx', ['BackPill', 'useTheme', 'errorSurface']],
    ['src/app/business-reviews.tsx', ['saveBusinessReviewReply', 'Refresh review status']],
    ['src/lib/business-review-reply.ts', ['reply_to_business_review', 'respondedAt']],
    [
      'src/components/blocked-businesses-panel.tsx',
      ['BlockedBusinessesContent', 'AppButton', 'refreshNeeded'],
    ],
    [
      'src/app/service-request.tsx',
      ['ServiceRequestForm', 'ServiceRequestReview', 'serviceRequestArguments'],
    ],
    [
      'src/app/(tabs)/rewards.tsx',
      [
        'RewardsCodeSheet',
        'CustomerCalendar',
        'FollowingFiltersSheet',
        'RewardDetails',
        'RewardsWalletList',
      ],
    ],
    [
      'src/app/(tabs)/explore.tsx',
      [
        'DiscoveryHomeHeader',
        'DiscoveryBusinessFeed',
        'DiscoveryShortcuts',
        'loadBusinessReviewSummaries',
      ],
    ],
  ];
  for (const [file, features] of required) {
    const source = readFileSync(resolve(mobileRoot, file), 'utf8');
    for (const feature of features) {
      if (!source.includes(feature))
        throw new Error(
          `Stale Preview source: ${file} is missing ${feature}. Merge the current Account, alerts, home and customer page changes before publishing.`,
        );
    }
  }
  return { accountRedesign: true, sharedAlertsInbox: true, parishPassHome: true };
}
