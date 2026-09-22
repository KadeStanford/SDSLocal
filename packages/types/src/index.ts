export type AppEnvironment = 'development' | 'staging' | 'production';

export type BusinessType =
  'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';

export type BusinessStatus = 'draft' | 'pending_review' | 'active' | 'suspended';

export type BusinessRole = 'owner' | 'staff';

export type ServiceAreaType = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';

export type OfferingPrice =
  | { kind: 'fixed'; amountMinor: number; currency: string }
  | { kind: 'starting_at'; amountMinor: number; currency: string }
  | { kind: 'contact' };

export type LoyaltyTransactionType = 'stamp' | 'redemption' | 'reversal' | 'points_earned';

export type LoyaltyProgramType = 'visits' | 'points';

export interface BusinessLocationStop {
  readonly id: string;
  readonly title: string;
  readonly addressText: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly timezone: string;
}

export type AnalyticsEventName =
  | 'page_view'
  | 'qr_scan'
  | 'offering_view'
  | 'follow'
  | 'unfollow'
  | 'loyalty_join'
  | 'loyalty_stamp'
  | 'reward_redeemed'
  | 'event_view'
  | 'event_save'
  | 'phone_click'
  | 'directions_click'
  | 'social_click';

export interface CursorPage<T> {
  readonly items: readonly T[];
  readonly nextCursor: string | null;
}

export interface CustomerProfile {
  readonly id: string;
  readonly displayName: string | null;
  readonly city: string | null;
  readonly regionCode: string | null;
  readonly postalCode: string | null;
}

export interface BusinessHourInput {
  readonly dayOfWeek: number;
  readonly intervalNumber: number;
  readonly opensAt: string | null;
  readonly closesAt: string | null;
  readonly isClosed: boolean;
}

export interface BusinessOnboardingInput {
  readonly name: string;
  readonly slug: string;
  readonly businessType: BusinessType;
  readonly description: string;
  readonly categoryIds: readonly number[];
  readonly hours: readonly BusinessHourInput[];
  readonly phone?: string;
  readonly email?: string;
  readonly websiteUrl?: string;
  readonly addressLine1?: string;
  readonly addressLine2?: string;
  readonly city?: string;
  readonly regionCode?: string;
  readonly postalCode?: string;
  readonly countryCode: string;
  readonly serviceAreaType: ServiceAreaType;
  readonly serviceAreaRegions: readonly string[];
  readonly serviceRadiusMiles?: number;
  readonly serviceArea?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly primaryColor: string;
  readonly accentColor: string;
}

export interface OwnedBusinessSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: BusinessStatus;
  readonly role: BusinessRole;
}
