import type { BusinessSubscriptionFeature } from './business-subscriptions';

/** Recovery of an existing obligation is never sold as a new subscription benefit. */
export const businessFeatureOperations = {
  edit_business: 'business_page',
  edit_catalog: 'business_page',
  upload_business_media: 'business_page',
  publish_event: 'events',
  manage_mobile_stops: 'events',
  edit_request_form: 'service_requests',
  submit_new_request: 'service_requests',
  view_analytics: 'basic_analytics',
  configure_rewards: 'loyalty',
  join_rewards: 'loyalty',
  earn_rewards: 'loyalty',
  send_follower_update: 'follower_updates',
  scan_new_reward: 'staff_scanning',
  configure_pickup: 'pickup_ordering',
  create_pickup_order: 'pickup_ordering',
  configure_booking: 'appointments',
  create_appointment: 'appointments',
  view_public_business: null,
  manage_membership_security: null,
  review_existing_request: null,
  redeem_existing_reward: null,
  reverse_reward: null,
  fulfill_existing_order: null,
  cancel_existing_order: null,
  refund_existing_order: null,
  support_existing_order: null,
  manage_existing_appointment: null,
  cancel_existing_appointment: null,
  refund_existing_appointment: null,
  disconnect_payment_provider: null,
  delete_account: null,
  manage_subscription: null,
} as const satisfies Record<string, BusinessSubscriptionFeature | null>;

export type BusinessFeatureOperation = keyof typeof businessFeatureOperations;
export type BusinessFeatureAccess = {
  businessId: string;
  featureCodes: readonly BusinessSubscriptionFeature[];
  planCode: string | null;
  enforced: boolean;
};

/** Authorization still requires the existing owner/staff/customer relationship. */
export function businessOperationIncluded(
  access: BusinessFeatureAccess | null | undefined,
  operation: BusinessFeatureOperation,
) {
  const feature = businessFeatureOperations[operation];
  return feature === null || (!!access && access.featureCodes.includes(feature));
}
