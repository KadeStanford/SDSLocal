import { describe, expect, it } from 'vitest';
import {
  actionFor,
  actionLabel,
  confirmationLabel,
  errorRecovery,
  formatCurrencyMinor,
  initialBusinessSelection,
  initialScannerState,
  isNetworkUncertain,
  MAX_PURCHASE_MINOR,
  normalizeCurrencyDigits,
  queuedScanDecision,
  safeOutcomeLabel,
  scannerReducer,
  shouldAcceptCameraCapture,
  validPurchaseMinor,
  type LoyaltyPreview,
} from './staff-scanner-core';

const preview: LoyaltyPreview = {
  customerName: 'Jane D.',
  businessName: 'Bayou Bites',
  programName: 'Local rewards',
  programType: 'visits',
  rewardDescription: 'Free entree',
  action: 'stamp',
  purchaseAmountMinor: null,
  pointsAwarded: 0,
  currentAvailablePoints: 0,
  resultingAvailablePoints: 0,
  currentProgressPoints: 0,
  resultingProgressPoints: 0,
  currentProgressStamps: 4,
  resultingProgressStamps: 5,
  stampsRequired: 8,
  currentRewardsReady: 0,
  resultingRewardsReady: 0,
  pointsRequired: null,
};

describe('staff scanner selection and transaction display', () => {
  it('auto-selects exactly one eligible business', () =>
    expect(initialBusinessSelection(['a'])).toBe('a'));
  it('requires an explicit selection for multiple businesses', () =>
    expect(initialBusinessSelection(['a', 'b'])).toBeNull());
  it('preserves a still-valid explicit selection', () =>
    expect(initialBusinessSelection(['a', 'b'], 'b')).toBe('b'));
  it('does not silently select a missing program', () =>
    expect(initialBusinessSelection([])).toBeNull());
  it('uses visit and points labels', () => {
    expect(actionLabel(actionFor('visits', false))).toBe('Add visit');
    expect(actionLabel(actionFor('points', false))).toBe('Award points');
    expect(actionLabel(actionFor('points', true))).toBe('Redeem reward');
  });
});

describe('checkout amount input', () => {
  it('normalizes currency digits and formats continuously', () => {
    expect(normalizeCurrencyDigits('$25.00')).toBe('2500');
    expect(formatCurrencyMinor('2500')).toMatch(/25\.00/);
  });
  it.each(['', '0', '000'])('rejects zero purchase amount %s', (value) =>
    expect(validPurchaseMinor(value)).toBeNull(),
  );
  it.each(['-1', 'abc', '1.2'])('rejects malformed amount %s', (value) =>
    expect(validPurchaseMinor(value)).toBeNull(),
  );
  it('rejects unreasonable or overflow input', () => {
    expect(normalizeCurrencyDigits(String(MAX_PURCHASE_MINOR + 1))).toBeNull();
    expect(validPurchaseMinor(String(MAX_PURCHASE_MINOR + 1))).toBeNull();
  });
});

describe('explicit scanner state machine', () => {
  it('follows scan, preview, confirm and success transitions', () => {
    let state = scannerReducer(initialScannerState, { type: 'READY' });
    state = scannerReducer(state, { type: 'START_SCAN' });
    state = scannerReducer(state, { type: 'CAPTURE', token: 'signed', source: 'camera' });
    expect(state.stage).toBe('validating');
    state = scannerReducer(state, { type: 'PREVIEWED', preview });
    expect(state.stage).toBe('awaiting_confirmation');
    state = scannerReducer(state, { type: 'SUBMIT', idempotencyKey: 'stable' });
    state = scannerReducer(state, { type: 'SUCCEEDED', result: { action: 'stamp' } });
    expect(state.stage).toBe('success');
  });
  it('accepts only the first camera callback', () => {
    expect(shouldAcceptCameraCapture(false, 'signed')).toBe(true);
    expect(shouldAcceptCameraCapture(true, 'signed')).toBe(false);
  });
  it.each(['business change', 'mode change', 'cancel', 'sign-out', 'background'])(
    '%s clears sensitive data',
    () => {
      const pending = {
        ...initialScannerState,
        stage: 'awaiting_confirmation' as const,
        token: 'secret',
        preview,
      };
      expect(scannerReducer(pending, { type: 'RESET' })).toEqual({
        ...initialScannerState,
        stage: 'ready',
      });
    },
  );
  it('supports manual entry through the same capture state', () => {
    const ready = scannerReducer(initialScannerState, { type: 'READY' });
    expect(
      scannerReducer(ready, { type: 'CAPTURE', token: 'signed', source: 'manual' }).stage,
    ).toBe('validating');
  });
  it('represents lost responses as uncertain and retains the stable key', () => {
    const submitted = {
      ...initialScannerState,
      stage: 'submitting' as const,
      idempotencyKey: 'stable',
      token: 'signed',
      preview,
    };
    const uncertain = scannerReducer(submitted, { type: 'UNCERTAIN', message: 'Result unknown' });
    expect(uncertain).toMatchObject({
      stage: 'uncertain_result',
      idempotencyKey: 'stable',
      token: 'signed',
    });
  });
});

describe('recovery and privacy helpers', () => {
  it.each([
    ['expired token', 'expired'],
    ['already used', 'already processed'],
    ['another business', 'another business'],
    ['not enough points', 'does not have a reward'],
    ['Business staff access required', 'staff access'],
    ['membership inactive', 'no longer enrolled'],
    ['program is unavailable', 'not active'],
    ['purchase amount', 'purchase total'],
    ['invalid loyalty code', 'not valid'],
  ])('maps %s to customer-readable recovery', (message, expected) =>
    expect(errorRecovery(message)).toContain(expected),
  );
  it('classifies network uncertainty', () =>
    expect(isNetworkUncertain(new Error('Failed to fetch'))).toBe(true));
  it('keeps safe analytics labels and hides unknown details', () =>
    expect(safeOutcomeLabel('sql_stack')).toBe('Processing issue'));
  it('marks expired queued rotating tokens as requiring a rescan', () => {
    expect(queuedScanDecision(new Date(0).toISOString(), 45_000)).toBe('rescan');
    expect(queuedScanDecision(new Date(10_000).toISOString(), 20_000)).toBe('bounded_retry');
  });
  it('builds consequence-specific confirmation labels', () => {
    expect(confirmationLabel(preview)).toBe('Confirm visit');
    expect(confirmationLabel({ ...preview, action: 'earn_points', pointsAwarded: 25 })).toBe(
      'Award 25 points',
    );
    expect(confirmationLabel({ ...preview, action: 'redemption' })).toBe('Redeem reward');
  });
});
