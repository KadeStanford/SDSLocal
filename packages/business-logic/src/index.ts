import type { BusinessType } from '@sds/types';

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
