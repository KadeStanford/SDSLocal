import { describe, expect, it } from 'vitest';

import {
  calculateBusinessProfileCompleteness,
  calculateLoyaltyBalance,
  calculatePointsBalance,
  combineLocalDateTime,
  formatMinorCurrency,
  getOfferingTerminology,
  hasUnsavedChanges,
  parseCurrencyToMinor,
  selectBusinessAttentionItem,
  toDateInputValue,
  toTimeInputValue,
} from './index';

describe('calculatePointsBalance', () => {
  it('keeps the remainder while exposing ready rewards', () => {
    expect(
      calculatePointsBalance({
        earnedPoints: 275,
        redeemedPoints: 25,
        pointsRequired: 100,
      }),
    ).toEqual({ availablePoints: 250, rewardsReady: 2, progressTowardNextReward: 50 });
  });

  it('never returns a negative balance after redemptions', () => {
    expect(
      calculatePointsBalance({
        earnedPoints: 10,
        redeemedPoints: 25,
        pointsRequired: 100,
      }).availablePoints,
    ).toBe(0);
  });
});

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

describe('business workspace helpers', () => {
  const completeProfile = calculateBusinessProfileCompleteness({
    name: 'Corner Cafe',
    description: 'Coffee and pastries',
    contact: 'hello@example.com',
    location: '123 Main St',
    offeringsCount: 8,
    photosCount: 3,
    hoursComplete: true,
  });

  it('calculates meaningful customer-facing profile completion', () => {
    expect(completeProfile).toEqual({
      completed: 7,
      total: 7,
      percent: 100,
      missing: [],
    });
  });

  it('selects one direct attention item for an incomplete business', () => {
    const profile = calculateBusinessProfileCompleteness({
      name: 'Corner Cafe',
      description: '',
      contact: 'hello@example.com',
      location: '123 Main St',
      offeringsCount: 8,
      photosCount: 3,
      hoursComplete: true,
    });
    expect(
      selectBusinessAttentionItem({
        status: 'draft',
        profile,
        hoursComplete: true,
        offeringsCount: 8,
        photosCount: 3,
        isMobile: false,
        hasCurrentLocation: false,
      }),
    ).toMatchObject({ key: 'profile', actionLabel: 'Complete profile' });
  });

  it('prioritizes a mobile location over lower-priority cleanup', () => {
    expect(
      selectBusinessAttentionItem({
        status: 'active',
        profile: completeProfile,
        hoursComplete: true,
        offeringsCount: 8,
        photosCount: 3,
        isMobile: true,
        hasCurrentLocation: false,
      }),
    ).toMatchObject({ key: 'location', title: 'Set today’s location' });
  });

  it('converts familiar currency input to cents and back', () => {
    expect(parseCurrencyToMinor('$25.00')).toBe(2500);
    expect(parseCurrencyToMinor('7.5')).toBe(750);
    expect(formatMinorCurrency(750)).toBe('$7.50');
    expect(parseCurrencyToMinor('2500')).toBe(250000);
    expect(parseCurrencyToMinor('not money')).toBeNull();
  });

  it('converts local picker values without requiring typed ISO values', () => {
    const date = combineLocalDateTime('2026-09-18', '18:00');
    expect(date).not.toBeNull();
    expect(toDateInputValue(date!)).toBe('2026-09-18');
    expect(toTimeInputValue(date!)).toBe('18:00');
    expect(combineLocalDateTime('', '18:00')).toBeNull();
  });

  it('detects dirty editor state without treating equal values as changes', () => {
    expect(hasUnsavedChanges({ open: true }, { open: true })).toBe(false);
    expect(hasUnsavedChanges({ open: true }, { open: false })).toBe(true);
  });
});
