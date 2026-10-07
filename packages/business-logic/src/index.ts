import type { BusinessType } from '@sds/types';

export * from './business-subscriptions';
export * from './business-feature-policy';

export interface OfferingTerminology {
  readonly item: string;
  readonly items: string;
  readonly section: string;
  readonly sections: string;
}

const offeringTerminology: Record<BusinessType, OfferingTerminology> = {
  food_drink: {
    item: 'Menu item',
    items: 'Menu',
    section: 'Menu category',
    sections: 'Menu categories',
  },
  services: {
    item: 'Service',
    items: 'Services',
    section: 'Service category',
    sections: 'Service categories',
  },
  retail: {
    item: 'Product',
    items: 'Products',
    section: 'Product category',
    sections: 'Product categories',
  },
  entertainment_venue: {
    item: 'Offering',
    items: 'Offerings',
    section: 'Offering group',
    sections: 'Offering groups',
  },
  mobile: {
    item: 'Offering',
    items: 'Offerings',
    section: 'Offering group',
    sections: 'Offering groups',
  },
  general: {
    item: 'Offering',
    items: 'Offerings',
    section: 'Offering group',
    sections: 'Offering groups',
  },
};

export function getOfferingTerminology(type: BusinessType): OfferingTerminology {
  return offeringTerminology[type];
}

/**
 * Human-readable labels for the business lifecycle. The database keeps
 * `draft` as an internal workflow state, while the UI explains that the
 * profile has not been submitted yet.
 */
export function getBusinessStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Not submitted';
    case 'pending_review':
      return 'Submitted for approval';
    case 'active':
      return 'Published';
    case 'suspended':
      return 'Suspended';
    case 'archived':
      return 'Archived';
    default:
      return status.replaceAll('_', ' ');
  }
}

export interface BusinessProfileCompletenessInput {
  readonly name?: string | null;
  readonly description?: string | null;
  readonly contact?: string | null;
  readonly location?: string | null;
  readonly offeringsCount: number;
  readonly photosCount: number;
  readonly hoursComplete: boolean;
}

export interface BusinessProfileCompleteness {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
  readonly missing: readonly string[];
}

/**
 * Customer-facing profile checks used by the mobile owner overview.
 * Every check maps to information a visitor can actually use.
 */
export function calculateBusinessProfileCompleteness(
  input: BusinessProfileCompletenessInput,
): BusinessProfileCompleteness {
  const checks = [
    ['Business name', Boolean(input.name?.trim())],
    ['Description', Boolean(input.description?.trim())],
    ['Contact information', Boolean(input.contact?.trim())],
    ['Location or service area', Boolean(input.location?.trim())],
    ['Offerings', input.offeringsCount > 0],
    ['Photos', input.photosCount > 0],
    ['Hours', input.hoursComplete],
  ] as const;
  const completed = checks.filter(([, complete]) => complete).length;
  const total = checks.length;
  return {
    completed,
    total,
    percent: Math.round((completed / total) * 100),
    missing: checks.filter(([, complete]) => !complete).map(([label]) => label),
  };
}

export interface BusinessAttentionInput {
  readonly status: string;
  readonly profile: BusinessProfileCompleteness;
  readonly readinessMissing?: string | null;
  readonly hoursComplete: boolean;
  readonly offeringsCount: number;
  readonly photosCount: number;
  readonly isMobile: boolean;
  readonly hasCurrentLocation: boolean;
}

export interface BusinessAttentionItem {
  readonly key: 'review' | 'profile' | 'hours' | 'location' | 'offerings' | 'photos';
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
}

/** Select one actionable item so the overview stays calm and focused. */
export function selectBusinessAttentionItem(
  input: BusinessAttentionInput,
): BusinessAttentionItem | null {
  if (input.status === 'suspended') {
    return {
      key: 'review',
      title: 'Resolve the publishing issue',
      detail: 'Your page is not visible to customers while it is suspended.',
      actionLabel: 'Review publishing',
    };
  }
  if (input.status === 'pending_review') {
    return {
      key: 'review',
      title: 'Your profile is under review',
      detail: 'We will let you know when your customer-facing page is approved.',
      actionLabel: 'View publishing',
    };
  }
  if (input.readinessMissing) {
    return {
      key: 'review',
      title: 'Finish your public profile',
      detail: input.readinessMissing,
      actionLabel: 'Review profile',
    };
  }
  if (input.profile.missing.length > 0) {
    return {
      key: 'profile',
      title: 'Complete the public profile',
      detail: `${input.profile.missing[0]} is still missing from your customer page.`,
      actionLabel: 'Complete profile',
    };
  }
  if (!input.hoursComplete) {
    return {
      key: 'hours',
      title: 'Add your weekly hours',
      detail: 'Customers need to know when they can visit or contact you.',
      actionLabel: 'Set hours',
    };
  }
  if (input.isMobile && !input.hasCurrentLocation) {
    return {
      key: 'location',
      title: 'Set today’s location',
      detail: 'Let nearby customers know where to find you today.',
      actionLabel: 'Set location',
    };
  }
  if (input.offeringsCount === 0) {
    return {
      key: 'offerings',
      title: 'Add your first offering',
      detail: 'Give customers a clear reason to choose your business.',
      actionLabel: 'Add offering',
    };
  }
  if (input.photosCount === 0) {
    return {
      key: 'photos',
      title: 'Add a business photo',
      detail: 'A photo helps customers recognize and trust your page.',
      actionLabel: 'Add photo',
    };
  }
  return null;
}

/** Convert a normal dollar input such as "$25.00" to integer cents. */
export function parseCurrencyToMinor(value: string): number | null {
  const normalized = value.trim().replace(/[,$\s]/g, '');
  if (!normalized || !/^\d+(?:\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** Display integer cents as the familiar dollar value owners enter. */
export function formatMinorCurrency(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value / 100);
}

export function combineLocalDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

export function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toTimeInputValue(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

export function hasUnsavedChanges<T>(initial: T, current: T): boolean {
  return JSON.stringify(initial) !== JSON.stringify(current);
}

export interface PointsBalanceInput {
  readonly earnedPoints: number;
  readonly redeemedPoints: number;
  readonly pointsRequired: number;
}

export interface PointsBalance {
  readonly availablePoints: number;
  readonly rewardsReady: number;
  readonly progressTowardNextReward: number;
}

export function calculatePointsBalance(input: PointsBalanceInput): PointsBalance {
  if (!Number.isInteger(input.pointsRequired) || input.pointsRequired < 1) {
    throw new RangeError('pointsRequired must be a positive integer');
  }
  const values = [input.earnedPoints, input.redeemedPoints];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new RangeError('point counters must be non-negative integers');
  }
  const availablePoints = Math.max(0, input.earnedPoints - input.redeemedPoints);
  return {
    availablePoints,
    rewardsReady: Math.floor(availablePoints / input.pointsRequired),
    progressTowardNextReward: availablePoints % input.pointsRequired,
  };
}

export interface LoyaltyBalanceInput {
  readonly earnedStamps: number;
  readonly reversedStamps: number;
  readonly redeemedRewards: number;
  readonly stampsRequired: number;
}

export interface LoyaltyBalance {
  readonly availableStamps: number;
  readonly rewardsReady: number;
  readonly progressTowardNextReward: number;
}

export function calculateLoyaltyBalance(input: LoyaltyBalanceInput): LoyaltyBalance {
  if (!Number.isInteger(input.stampsRequired) || input.stampsRequired < 2) {
    throw new RangeError('stampsRequired must be an integer of at least 2');
  }

  const values = [input.earnedStamps, input.reversedStamps, input.redeemedRewards];
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new RangeError('loyalty counters must be non-negative integers');
  }

  const netEarned = Math.max(0, input.earnedStamps - input.reversedStamps);
  const consumedStamps = input.redeemedRewards * input.stampsRequired;
  const availableStamps = Math.max(0, netEarned - consumedStamps);

  return {
    availableStamps,
    rewardsReady: Math.floor(availableStamps / input.stampsRequired),
    progressTowardNextReward: availableStamps % input.stampsRequired,
  };
}

/** Shared client gate; the server still independently validates submission. */
export function canSubmitBusinessForReview(input: {
  isOwner: boolean; status: string; saving?: boolean;
  readiness: {ready: boolean; checks: readonly {key: string; complete: boolean|null}[]}|null|undefined;
}): boolean {
  const keys=['description','category','contact','location','hours','logo','cover'];
  return input.isOwner&&input.status==='draft'&&input.saving!==true&&input.readiness?.ready===true
    &&keys.every(key=>input.readiness?.checks.some(check=>check.key===key&&check.complete===true));
}


export * from './moderation-outcome';

export * from './staff-invite-preview';
