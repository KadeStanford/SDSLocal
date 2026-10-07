import { createClient } from 'npm:@supabase/supabase-js@2';
import { businessAllowsObligationRecovery } from '../_shared/business-obligation-access.ts';

import { loyaltySigningSecret, verifyLoyaltyToken } from '../_shared/loyalty-token.ts';
import {
  isAuthorizedLoyaltyBusinessMember,
  matchesExpectedLoyaltyBusinessId,
  type LoyaltyBusinessMember,
} from '../_shared/loyalty-preview-authorization.ts';

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Origin': '*',
};
const uuidPattern = /^[0-9a-f-]{36}$/i;

type ScanAction = 'stamp' | 'earn_points' | 'redemption';
type RequestedScanAction = ScanAction | 'auto';
type ScanSource = 'camera' | 'manual';
type Operation = 'preview' | 'commit' | 'reconcile';
type ScanOutcome =
  | 'success'
  | 'invalid_code'
  | 'expired_code'
  | 'wrong_business'
  | 'duplicate'
  | 'no_reward'
  | 'invalid_amount'
  | 'permission_denied'
  | 'processing_error';

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function outcomeForError(message: string, status: number, wrongBusiness = false): ScanOutcome {
  if (wrongBusiness) return 'wrong_business';
  if (status === 403 || /business staff access required/i.test(message)) return 'permission_denied';
  if (/expired/i.test(message)) return 'expired_code';
  if (/already used|last minute/i.test(message) || status === 409) return 'duplicate';
  if (/reward ready|enough points/i.test(message)) return 'no_reward';
  if (/purchase amount|purchase is too small|greater than zero/i.test(message))
    return 'invalid_amount';
  if (/invalid loyalty code|invalid code|signature/i.test(message)) return 'invalid_code';
  return 'processing_error';
}

async function hasBusinessAccess(
  admin: ReturnType<typeof createClient>,
  businessId: string,
  userId: string,
) {
  const { data, error } = await admin
    .from('business_members')
    .select('business_id, user_id, role, is_active')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['owner', 'staff'])
    .maybeSingle();
  return (
    !error &&
    isAuthorizedLoyaltyBusinessMember(data as LoyaltyBusinessMember | null, userId, businessId)
  );
}

async function recordScanAttempt(
  admin: ReturnType<typeof createClient>,
  record: {
    readonly businessId: string | null;
    readonly actorId: string;
    readonly membershipId: string | null;
    readonly transactionId?: string | null;
    readonly action: ScanAction;
    readonly scanSource: ScanSource;
    readonly outcome: ScanOutcome;
    readonly pointsAmount?: number;
    readonly spendMinor?: number | null;
  },
) {
  try {
    const { error } = await admin.from('loyalty_scan_attempts').insert({
      business_id: record.businessId,
      actor_id: record.actorId,
      membership_id: record.membershipId,
      transaction_id: record.transactionId ?? null,
      action: record.action,
      scan_source: record.scanSource,
      outcome: record.outcome,
      points_amount: record.pointsAmount ?? 0,
      spend_minor: record.spendMinor ?? null,
    });
    if (error) console.warn('Could not record loyalty scan attempt:', error.message);
  } catch (error) {
    console.warn('Could not record loyalty scan attempt:', error);
  }
}

async function rewardsState(
  admin: ReturnType<typeof createClient>,
  membershipId: string,
  programType: 'visits' | 'points',
  stampsRequired: number,
  pointsRequired: number | null,
) {
  const { data, error } = await admin
    .from('loyalty_transactions')
    .select('transaction_type, amount, points_amount')
    .eq('membership_id', membershipId);
  if (error) throw error;
  let availableStamps = 0;
  let availablePoints = 0;
  for (const row of data ?? []) {
    if (row.transaction_type === 'stamp') availableStamps += Number(row.amount ?? 0);
    if (row.transaction_type === 'reversal') availableStamps -= Number(row.amount ?? 0);
    if (row.transaction_type === 'points_earned') availablePoints += Number(row.points_amount ?? 0);
    if (row.transaction_type === 'redemption') {
      if (programType === 'points') availablePoints -= Number(row.points_amount ?? 0);
      else availableStamps -= Number(row.amount ?? 0) * stampsRequired;
    }
  }
  availableStamps = Math.max(availableStamps, 0);
  availablePoints = Math.max(availablePoints, 0);
  return {
    availableStamps,
    progressStamps: programType === 'visits' ? availableStamps % stampsRequired : 0,
    availablePoints,
    progressPoints:
      programType === 'points' && pointsRequired ? availablePoints % pointsRequired : 0,
    rewardsReady:
      programType === 'points' && pointsRequired
        ? Math.floor(availablePoints / pointsRequired)
        : Math.floor(availableStamps / stampsRequired),
  };
}

async function existingResult(
  admin: ReturnType<typeof createClient>,
  businessId: string,
  membershipId: string,
  idempotencyKey: string,
  programType: 'visits' | 'points',
  stampsRequired: number,
  pointsRequired: number | null,
) {
  const { data: transaction } = await admin
    .from('loyalty_transactions')
    .select('id, transaction_type, points_amount')
    .eq('business_id', businessId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (!transaction) return null;
  const state = await rewardsState(
    admin,
    membershipId,
    programType,
    stampsRequired,
    pointsRequired,
  );
  return {
    transactionId: transaction.id,
    action:
      transaction.transaction_type === 'points_earned'
        ? 'earn_points'
        : transaction.transaction_type,
    pointsAwarded:
      transaction.transaction_type === 'points_earned' ? Number(transaction.points_amount ?? 0) : 0,
    ...state,
    stampsRequired,
    pointsRequired,
    reconciled: true,
  };
}

async function reconcileResult(
  admin: ReturnType<typeof createClient>,
  businessId: string,
  idempotencyKey: string,
) {
  const { data: transaction } = await admin
    .from('loyalty_transactions')
    .select('id, membership_id, transaction_type, points_amount')
    .eq('business_id', businessId)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (!transaction) return null;
  const { data: membership } = await admin
    .from('loyalty_memberships')
    .select('program_id')
    .eq('id', transaction.membership_id)
    .eq('business_id', businessId)
    .maybeSingle();
  if (!membership) return null;
  const { data: program } = await admin
    .from('loyalty_programs')
    .select('program_type, stamps_required, points_required')
    .eq('id', membership.program_id)
    .maybeSingle();
  if (!program) return null;
  const programType: 'visits' | 'points' = program.program_type === 'points' ? 'points' : 'visits';
  const stampsRequired = Number(program.stamps_required);
  const pointsRequired = program.points_required ? Number(program.points_required) : null;
  const state = await rewardsState(
    admin,
    transaction.membership_id,
    programType,
    stampsRequired,
    pointsRequired,
  );
  return {
    transactionId: transaction.id,
    action:
      transaction.transaction_type === 'points_earned'
        ? 'earn_points'
        : transaction.transaction_type,
    pointsAwarded:
      transaction.transaction_type === 'points_earned' ? Number(transaction.points_amount ?? 0) : 0,
    ...state,
    stampsRequired,
    pointsRequired,
    reconciled: true,
  };
}

export async function loyaltyTransactHandler(request: Request) {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer '))
    return json(401, { error: 'Staff sign-in is required.' });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: authData, error: authError } = await admin.auth.getUser(
    authorization.slice('Bearer '.length),
  );
  if (authError || !authData.user) return json(401, { error: 'Your session is invalid.' });

  let body: {
    token?: unknown;
    action?: unknown;
    idempotencyKey?: unknown;
    purchaseAmountMinor?: unknown;
    expectedBusinessId?: unknown;
    scanSource?: unknown;
    operation?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'A JSON request body is required.' });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const action: RequestedScanAction | '' =
    body.action === 'stamp' ||
    body.action === 'redemption' ||
    body.action === 'earn_points' ||
    body.action === 'auto'
      ? body.action
      : '';
  const purchaseAmountMinor =
    typeof body.purchaseAmountMinor === 'number' && Number.isInteger(body.purchaseAmountMinor)
      ? body.purchaseAmountMinor
      : null;
  const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
  const expectedBusinessId =
    typeof body.expectedBusinessId === 'string' && uuidPattern.test(body.expectedBusinessId)
      ? body.expectedBusinessId
      : null;
  const scanSource: ScanSource = body.scanSource === 'manual' ? 'manual' : 'camera';
  const operation: Operation =
    body.operation === 'preview'
      ? 'preview'
      : body.operation === 'reconcile'
        ? 'reconcile'
        : 'commit';
  if (
    (operation !== 'reconcile' && (!token || !action)) ||
    (operation !== 'preview' && !uuidPattern.test(idempotencyKey))
  ) {
    return json(400, {
      error:
        operation === 'preview'
          ? 'Token and action are required.'
          : 'Token, action, and idempotency key are required.',
    });
  }

  const actorId = authData.user.id;

  if (operation === 'reconcile') {
    if (!expectedBusinessId)
      return json(400, { error: 'Select a business before checking this transaction.' });
    if (!(await hasBusinessAccess(admin, expectedBusinessId, actorId)))
      return json(403, { error: 'Staff access is required for the selected business.' });
    const reconciled = await reconcileResult(admin, expectedBusinessId, idempotencyKey);
    return reconciled
      ? json(200, { loyalty: reconciled })
      : json(404, {
          error:
            'No confirmed transaction was found. Ask the customer to refresh their code and scan again.',
        });
  }

  try {
    let claims;
    try {
      claims = await verifyLoyaltyToken(token, loyaltySigningSecret());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The loyalty code is invalid.';
      if (operation === 'commit')
        await recordScanAttempt(admin, {
          businessId: null,
          actorId,
          membershipId: null,
          action: action === 'auto' || !action ? 'stamp' : action,
          scanSource,
          outcome: outcomeForError(message, /expired/i.test(message) ? 410 : 400),
        });
      return json(/expired/i.test(message) ? 410 : 400, { error: message });
    }

    // The signed token is authoritative for the business whose customer data is
    // about to be read. expectedBusinessId is only a client-side consistency check.
    if (!(await hasBusinessAccess(admin, claims.businessId, actorId))) {
      if (operation === 'commit')
        await recordScanAttempt(admin, {
          businessId: claims.businessId,
          actorId,
          membershipId: claims.membershipId,
          action: action === 'auto' || !action ? 'stamp' : action,
          scanSource,
          outcome: 'permission_denied',
        });
      return json(403, { error: 'Staff access is required for the selected business.' });
    }

    const [{ data: membership, error: membershipError }, { data: program, error: programError }] =
      await Promise.all([
        admin
          .from('loyalty_memberships')
          .select('id, business_id, program_id, customer_id, is_active')
          .eq('id', claims.membershipId)
          .eq('business_id', claims.businessId)
          .eq('program_id', claims.programId)
          .eq('is_active', true)
          .maybeSingle(),
        admin
          .from('loyalty_programs')
          .select(
            'id, business_id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, is_active',
          )
          .eq('id', claims.programId)
          .eq('business_id', claims.businessId)
          .eq('is_active', true)
          .maybeSingle(),
      ]);
    if (membershipError || programError || !membership || !program) {
      if (operation === 'commit') {
        await recordScanAttempt(admin, {
          businessId: claims.businessId,
          actorId,
          membershipId: claims.membershipId,
          action: action === 'redemption' ? 'redemption' : 'stamp',
          scanSource,
          outcome: 'processing_error',
        });
      }
      return json(409, { error: 'This rewards membership or program is unavailable.' });
    }
    const programType: 'visits' | 'points' =
      program.program_type === 'points' ? 'points' : 'visits';

    const resolvedAction: ScanAction =
      action === 'auto' ? (programType === 'points' ? 'earn_points' : 'stamp') : action;

    if (
      (resolvedAction === 'stamp' && programType !== 'visits') ||
      (resolvedAction === 'earn_points' && programType !== 'points')
    ) {
      await recordScanAttempt(admin, {
        businessId: claims.businessId,
        actorId,
        membershipId: claims.membershipId,
        action: resolvedAction,
        scanSource,
        outcome: 'processing_error',
      });
      return json(400, {
        error:
          programType === 'points'
            ? 'This QR code is for a points program. Use the purchase total to award points.'
            : 'This QR code is for a visit program. Record a visit instead.',
      });
    }

    if (!matchesExpectedLoyaltyBusinessId(expectedBusinessId, claims.businessId)) {
      if (operation === 'commit')
        await recordScanAttempt(admin, {
          businessId: expectedBusinessId,
          actorId,
          membershipId: claims.membershipId,
          action: resolvedAction,
          scanSource,
          outcome: 'wrong_business',
        });
      return json(409, {
        error:
          'This customer code belongs to another business. Switch businesses or ask the customer to open the correct rewards card.',
      });
    }

    const stampsRequired = Number(program.stamps_required);
    const pointsRequired =
      programType === 'points' && program.points_required ? Number(program.points_required) : null;
    const pointsPerDollar =
      programType === 'points' && program.points_per_dollar
        ? Number(program.points_per_dollar)
        : null;
    if (
      resolvedAction === 'earn_points' &&
      (!purchaseAmountMinor || purchaseAmountMinor < 1 || purchaseAmountMinor > 10_000_000)
    ) {
      return json(400, { error: 'Enter a valid purchase amount greater than zero.' });
    }

    if (operation === 'preview') {
      const [state, businessResult, profileResult] = await Promise.all([
        rewardsState(admin, claims.membershipId, programType, stampsRequired, pointsRequired),
        admin
          .from('businesses')
          .select('name,status,suspension_reason,billing_suspension_previous_status,approved_at')
          .eq('id', claims.businessId)
          .maybeSingle(),
        admin
          .from('profiles')
          .select('display_name')
          .eq('id', membership.customer_id)
          .maybeSingle(),
      ]);
      if (
        !(resolvedAction === 'redemption'
          ? businessAllowsObligationRecovery(businessResult.data)
          : businessResult.data?.status === 'active')
      )
        return json(409, { error: 'This business is unavailable.' });
      if (resolvedAction !== 'redemption') {
        const { error } = await admin.rpc('assert_business_feature', {
          p_business_id: claims.businessId,
          p_feature: 'staff_scanning',
        });
        if (error)
          return json(error.details === 'BUSINESS_FEATURE_REQUIRED' ? 403 : 503, {
            error:
              error.details === 'BUSINESS_FEATURE_REQUIRED'
                ? 'This business needs Growth or Pro to add new rewards. Existing rewards can still be redeemed.'
                : 'Business access could not be checked. Please retry.',
          });
      }
      const pointsAwarded =
        resolvedAction === 'earn_points' && pointsPerDollar
          ? Math.floor((purchaseAmountMinor! / 100) * pointsPerDollar)
          : 0;
      if (resolvedAction === 'earn_points' && pointsAwarded < 1)
        return json(400, { error: 'This purchase is too small to earn a point.' });
      if (resolvedAction === 'redemption' && state.rewardsReady < 1)
        return json(409, {
          error:
            programType === 'points'
              ? 'This customer does not have enough points for a reward.'
              : 'This customer does not have a reward ready.',
        });
      const resultingAvailablePoints =
        state.availablePoints +
        (resolvedAction === 'earn_points' ? pointsAwarded : 0) -
        (resolvedAction === 'redemption' && programType === 'points' ? pointsRequired! : 0);
      const resultingAvailableStamps =
        state.availableStamps +
        (resolvedAction === 'stamp' ? 1 : 0) -
        (resolvedAction === 'redemption' && programType === 'visits' ? stampsRequired : 0);
      return json(200, {
        preview: {
          customerName: profileResult.data?.display_name?.trim() || 'Rewards customer',
          businessName: businessResult.data.name,
          programName: program.name,
          programType,
          rewardDescription: program.reward_description,
          action: resolvedAction,
          purchaseAmountMinor: resolvedAction === 'earn_points' ? purchaseAmountMinor : null,
          pointsAwarded,
          currentAvailablePoints: state.availablePoints,
          resultingAvailablePoints,
          currentProgressPoints: state.progressPoints,
          resultingProgressPoints: pointsRequired ? resultingAvailablePoints % pointsRequired : 0,
          currentProgressStamps: state.progressStamps,
          resultingProgressStamps:
            programType === 'visits' ? resultingAvailableStamps % stampsRequired : 0,
          stampsRequired,
          currentRewardsReady: state.rewardsReady,
          resultingRewardsReady:
            programType === 'points' && pointsRequired
              ? Math.floor(resultingAvailablePoints / pointsRequired)
              : Math.floor(resultingAvailableStamps / stampsRequired),
          pointsRequired,
        },
      });
    }

    const reconciled = await existingResult(
      admin,
      claims.businessId,
      claims.membershipId,
      idempotencyKey,
      programType,
      stampsRequired,
      pointsRequired,
    );
    if (reconciled) return json(200, { loyalty: reconciled });

    const { data, error } =
      resolvedAction === 'earn_points'
        ? await admin.rpc('process_loyalty_points_earn', {
            p_actor_id: actorId,
            p_membership_id: claims.membershipId,
            p_token_id: claims.jti,
            p_spend_minor: purchaseAmountMinor,
            p_idempotency_key: idempotencyKey,
          })
        : await admin.rpc('process_loyalty_action', {
            p_actor_id: actorId,
            p_membership_id: claims.membershipId,
            p_token_id: claims.jti,
            p_action: resolvedAction,
            p_idempotency_key: idempotencyKey,
          });
    if (error) {
      const afterRace = await existingResult(
        admin,
        claims.businessId,
        claims.membershipId,
        idempotencyKey,
        programType,
        stampsRequired,
        pointsRequired,
      );
      if (afterRace) return json(200, { loyalty: afterRace });
      const conflict = error.code === '23505' || /already|last minute/i.test(error.message);
      const status = conflict ? 409 : error.code === '42501' ? 403 : 400;
      await recordScanAttempt(admin, {
        businessId: claims.businessId,
        actorId,
        membershipId: claims.membershipId,
        action: resolvedAction,
        scanSource,
        outcome: outcomeForError(error.message, status),
        spendMinor: resolvedAction === 'earn_points' ? purchaseAmountMinor : null,
      });
      return json(status, { error: error.message });
    }
    const loyalty = (data ?? {}) as Record<string, unknown>;
    await recordScanAttempt(admin, {
      businessId: claims.businessId,
      actorId,
      membershipId: claims.membershipId,
      transactionId: typeof loyalty.transactionId === 'string' ? loyalty.transactionId : null,
      action: resolvedAction,
      scanSource,
      outcome: 'success',
      pointsAmount: typeof loyalty.pointsAwarded === 'number' ? loyalty.pointsAwarded : 0,
      spendMinor: resolvedAction === 'earn_points' ? purchaseAmountMinor : null,
    });
    return json(200, { loyalty: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The loyalty code is invalid.';
    return json(/expired/i.test(message) ? 410 : 400, { error: message });
  }
}

if (import.meta.main) Deno.serve(loyaltyTransactHandler);
