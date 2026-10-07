import {
  businessFeatureOperations,
  businessSubscriptionFeatures,
  type BusinessFeatureAccess,
  type BusinessFeatureOperation,
} from '@sds/business-logic';
import type { BusinessSection } from './business-workspace-config';

export const workspaceFeatureOperation: Partial<Record<BusinessSection, BusinessFeatureOperation>> =
  {
    profile: 'edit_business',
    contact: 'edit_business',
    location: 'edit_business',
    hours: 'edit_business',
    offerings: 'edit_catalog',
    photos: 'upload_business_media',
    events: 'publish_event',
    'mobile-location': 'manage_mobile_stops',
    updates: 'send_follower_update',
    rewards: 'configure_rewards',
    review: 'edit_business',
    // Appointment setup is gated inside its screen; the schedule stays accessible.
    // Ordering setup has its own gate with a disconnect action.
  };

export function parseBusinessFeatureAccess(
  value: unknown,
  businessId: string,
): BusinessFeatureAccess {
  const data = value as BusinessFeatureAccess | null;
  const known = new Set<string>(businessSubscriptionFeatures);
  if (
    !data ||
    data.businessId !== businessId ||
    typeof data.enforced !== 'boolean' ||
    !(data.planCode === null || typeof data.planCode === 'string') ||
    !Array.isArray(data.featureCodes) ||
    data.featureCodes.some((code) => !known.has(code))
  ) {
    throw new Error('Business access could not be verified.');
  }
  return data;
}

/** Invalidates pending responses on account, business, or entitlement changes. */
export class BusinessAccessRequestScope {
  private identity = '';
  private generation = 0;
  select(identity: string) {
    if (this.identity !== identity) {
      this.identity = identity;
      this.generation++;
    }
  }
  invalidate() {
    this.generation++;
  }
  async run<T>(identity: string, request: () => Promise<T>): Promise<T | undefined> {
    const generation = ++this.generation;
    const result = await request();
    return this.identity === identity && this.generation === generation ? result : undefined;
  }
}

export function featurePlanLabel(operation: BusinessFeatureOperation) {
  const feature = businessFeatureOperations[operation];
  if (feature === 'appointments' || feature === 'pickup_ordering') return 'Pro';
  if (feature === 'loyalty' || feature === 'staff_scanning' || feature === 'follower_updates')
    return 'Growth or Pro';
  return 'an active business plan';
}
