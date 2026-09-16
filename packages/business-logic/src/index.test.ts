import { describe, expect, it } from 'vitest';

import { calculateLoyaltyBalance, getOfferingTerminology } from './index';

describe('calculateLoyaltyBalance', () => {
  it('derives progress and ready rewards from authoritative transactions', () => {
    expect(
      calculateLoyaltyBalance({
        earnedStamps: 13,
        reversedStamps: 1,
        redeemedRewards: 1,
        stampsRequired: 8,
      }),
    ).toEqual({ availableStamps: 4, rewardsReady: 0, progressTowardNextReward: 4 });
  });

  it('never returns a negative balance', () => {
    expect(
      calculateLoyaltyBalance({
        earnedStamps: 2,
        reversedStamps: 3,
        redeemedRewards: 0,
        stampsRequired: 5,
      }).availableStamps,
    ).toBe(0);
  });

  it('rejects invalid configuration', () => {
    expect(() =>
      calculateLoyaltyBalance({
        earnedStamps: 1,
        reversedStamps: 0,
        redeemedRewards: 0,
        stampsRequired: 1,
      }),
    ).toThrow(RangeError);
  });

  it('supports multiple ready rewards without losing remainder progress', () => {
    expect(
      calculateLoyaltyBalance({
        earnedStamps: 21,
        reversedStamps: 1,
        redeemedRewards: 0,
        stampsRequired: 8,
      }),
    ).toEqual({ availableStamps: 20, rewardsReady: 2, progressTowardNextReward: 4 });
  });

  it('accounts for redemptions and audited stamp reversals independently', () => {
    expect(
      calculateLoyaltyBalance({
        earnedStamps: 18,
        reversedStamps: 2,
        redeemedRewards: 1,
        stampsRequired: 8,
      }),
    ).toEqual({ availableStamps: 8, rewardsReady: 1, progressTowardNextReward: 0 });
  });
});

describe('getOfferingTerminology', () => {
  it('uses menu language for food and drink businesses', () => {
    expect(getOfferingTerminology('food_drink')).toMatchObject({
      item: 'Menu item',
      items: 'Menu',
    });
  });

  it('uses service language for service businesses', () => {
    expect(getOfferingTerminology('services')).toMatchObject({
      item: 'Service',
      items: 'Services',
    });
  });
});
