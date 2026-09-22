export type LoyaltyProgramType = 'visits' | 'points';
export type ScannerAction = 'stamp' | 'earn_points' | 'redemption';
export type ScannerSource = 'camera' | 'manual';
export type ScannerStage =
  | 'loading'
  | 'unavailable'
  | 'ready'
  | 'requesting_permission'
  | 'scanning'
  | 'validating'
  | 'awaiting_confirmation'
  | 'submitting'
  | 'success'
  | 'recoverable_error'
  | 'uncertain_result';

export interface ScannerState {
  readonly stage: ScannerStage;
  readonly token: string | null;
  readonly source: ScannerSource | null;
  readonly preview: LoyaltyPreview | null;
  readonly result: LoyaltyResult | null;
  readonly idempotencyKey: string | null;
  readonly message: string | null;
}

export interface LoyaltyPreview {
  readonly customerName: string;
  readonly businessName: string;
  readonly programName: string;
  readonly programType: LoyaltyProgramType;
  readonly rewardDescription: string;
  readonly action: ScannerAction;
  readonly purchaseAmountMinor: number | null;
  readonly pointsAwarded: number;
  readonly currentAvailablePoints: number;
  readonly resultingAvailablePoints: number;
  readonly currentProgressPoints: number;
  readonly resultingProgressPoints: number;
  readonly currentProgressStamps: number;
  readonly resultingProgressStamps: number;
  readonly stampsRequired: number;
  readonly currentRewardsReady: number;
  readonly resultingRewardsReady: number;
  readonly pointsRequired: number | null;
}

export interface LoyaltyResult {
  readonly action: ScannerAction;
  readonly pointsAwarded?: number;
  readonly availablePoints?: number;
  readonly progressPoints?: number;
  readonly progressStamps?: number;
  readonly rewardsReady?: number;
  readonly stampsRequired?: number;
  readonly pointsRequired?: number;
}

export type ScannerEvent =
  | { readonly type: 'READY' }
  | { readonly type: 'UNAVAILABLE'; readonly message: string }
  | { readonly type: 'REQUEST_PERMISSION' }
  | { readonly type: 'START_SCAN' }
  | { readonly type: 'CAPTURE'; readonly token: string; readonly source: ScannerSource }
  | { readonly type: 'PREVIEWED'; readonly preview: LoyaltyPreview }
  | { readonly type: 'SUBMIT'; readonly idempotencyKey: string }
  | { readonly type: 'SUCCEEDED'; readonly result: LoyaltyResult }
  | { readonly type: 'FAILED'; readonly message: string }
  | { readonly type: 'UNCERTAIN'; readonly message: string }
  | { readonly type: 'RESET' };

export const initialScannerState: ScannerState = {
  stage: 'loading',
  token: null,
  source: null,
  preview: null,
  result: null,
  idempotencyKey: null,
  message: null,
};

export function scannerReducer(state: ScannerState, event: ScannerEvent): ScannerState {
  switch (event.type) {
    case 'READY':
    case 'RESET':
      return { ...initialScannerState, stage: 'ready' };
    case 'UNAVAILABLE':
      return { ...initialScannerState, stage: 'unavailable', message: event.message };
    case 'REQUEST_PERMISSION':
      return { ...state, stage: 'requesting_permission', message: null };
    case 'START_SCAN':
      return { ...initialScannerState, stage: 'scanning' };
    case 'CAPTURE':
      if (state.stage !== 'scanning' && event.source === 'camera') return state;
      return {
        ...initialScannerState,
        stage: 'validating',
        token: event.token,
        source: event.source,
      };
    case 'PREVIEWED':
      if (state.stage !== 'validating') return state;
      return { ...state, stage: 'awaiting_confirmation', preview: event.preview };
    case 'SUBMIT':
      if (state.stage !== 'awaiting_confirmation' && state.stage !== 'uncertain_result')
        return state;
      return { ...state, stage: 'submitting', idempotencyKey: event.idempotencyKey, message: null };
    case 'SUCCEEDED':
      if (state.stage !== 'submitting') return state;
      return { ...state, stage: 'success', token: null, result: event.result, message: null };
    case 'UNCERTAIN':
      return { ...state, stage: 'uncertain_result', message: event.message };
    case 'FAILED':
      return {
        ...state,
        stage: 'recoverable_error',
        token: null,
        preview: null,
        message: event.message,
      };
  }
}

export function initialBusinessSelection(ids: readonly string[], previous: string | null = null) {
  if (previous && ids.includes(previous)) return previous;
  return ids.length === 1 ? (ids[0] ?? null) : null;
}

export function actionFor(programType: LoyaltyProgramType, redeeming: boolean): ScannerAction {
  if (redeeming) return 'redemption';
  return programType === 'points' ? 'earn_points' : 'stamp';
}

export function actionLabel(action: ScannerAction) {
  if (action === 'stamp') return 'Add visit';
  if (action === 'earn_points') return 'Award points';
  return 'Redeem reward';
}

export const MAX_PURCHASE_MINOR = 10_000_000;

export function normalizeCurrencyDigits(value: string) {
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  const minor = Number(digits);
  if (!Number.isSafeInteger(minor) || minor > MAX_PURCHASE_MINOR) return null;
  return digits;
}

export function validPurchaseMinor(value: string) {
  const minor = Number(value);
  return Number.isInteger(minor) && minor > 0 && minor <= MAX_PURCHASE_MINOR ? minor : null;
}

export function formatCurrencyMinor(minor: number | string) {
  const amount = Number(minor || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(
    amount / 100,
  );
}

export function isNetworkUncertain(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /network|fetch|offline|timed out|timeout|connection|failed to send/i.test(message);
}

export function errorRecovery(message: string) {
  if (/expired/i.test(message))
    return 'This code expired. Ask the customer to refresh their rewards QR and scan again.';
  if (/already|duplicate|last minute/i.test(message))
    return 'This code was already processed. No second reward transaction was created.';
  if (/another business|wrong business/i.test(message))
    return 'This code belongs to another business. Confirm the selected business or ask the customer to open the correct rewards card.';
  if (/reward ready|enough points/i.test(message))
    return 'This customer does not have a reward ready yet. Their balance was not changed.';
  if (/staff access|access is required|permission/i.test(message))
    return 'Your staff access is no longer active. Ask the business owner to review your access.';
  if (/membership|enrolled/i.test(message))
    return 'This customer is no longer enrolled in this rewards program.';
  if (/program is unavailable|active .*program/i.test(message))
    return 'This rewards program is not active. No balance was changed.';
  if (/purchase amount|purchase is too small/i.test(message))
    return 'Check the purchase total and try again.';
  if (/invalid loyalty code|invalid code|signature/i.test(message))
    return 'That QR code is not valid. Ask the customer to refresh it and scan again.';
  return 'We could not complete this rewards transaction. Nothing was confirmed; please try again.';
}

export function confirmationLabel(preview: LoyaltyPreview) {
  if (preview.action === 'stamp') return 'Confirm visit';
  if (preview.action === 'earn_points') return `Award ${preview.pointsAwarded} points`;
  return 'Redeem reward';
}

export function safeOutcomeLabel(outcome: string) {
  const labels: Record<string, string> = {
    success: 'Completed',
    invalid_code: 'Invalid code',
    expired_code: 'Expired',
    wrong_business: 'Wrong business',
    duplicate: 'Already used',
    no_reward: 'Not ready',
    invalid_amount: 'Amount issue',
    permission_denied: 'Access denied',
    processing_error: 'Error',
  };
  return labels[outcome] ?? 'Processing issue';
}

export function shouldAcceptCameraCapture(alreadyCaptured: boolean, value: string) {
  return !alreadyCaptured && value.trim().length > 0;
}

export const TOKEN_LIFETIME_MS = 45_000;

export function queuedScanDecision(createdAt: string, now = Date.now()) {
  const created = Date.parse(createdAt);
  if (!Number.isFinite(created) || now - created >= TOKEN_LIFETIME_MS) return 'rescan' as const;
  return 'bounded_retry' as const;
}
