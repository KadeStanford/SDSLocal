import { ModerationFailure, type ModerationTransport } from './mobile-moderation-client';
import { isOutcomeId, parseModerationOutcome } from './moderation-outcome-contract';

/** Recipient and resource authorization belong to the authenticated server RPC. */
export function createMobileOutcomeClient(
  transport: ModerationTransport,
  currentAccount: () => string | null,
) {
  function assertAccount(expected: string | null): asserts expected is string {
    if (!expected) throw new ModerationFailure('signed_out', 'Sign in to view this outcome.');
    if (currentAccount() !== expected)
      throw new ModerationFailure(
        'session_changed',
        'Your account changed. Open this alert again.',
      );
  }
  async function detail(expected: string | null, deliveryId: string) {
    assertAccount(expected);
    if (!isOutcomeId(deliveryId))
      throw new ModerationFailure('invalid', 'This alert link is invalid.');
    const verified = await transport.auth.getUser();
    assertAccount(expected);
    if (verified.error || !verified.data.user)
      throw new ModerationFailure('signed_out', 'Sign in again to view this outcome.');
    if (verified.data.user.id !== expected)
      throw new ModerationFailure(
        'session_changed',
        'Your account changed. Open this alert again.',
      );
    const response = await transport.rpc('get_my_moderation_outcome', {
      p_delivery_id: deliveryId,
    });
    assertAccount(expected);
    if (response.error?.code === 'P0002') return null;
    if (response.error)
      throw new ModerationFailure(
        response.error.code === '42501' ? 'denied' : 'unavailable',
        'This outcome could not be checked. Try again.',
      );
    if (response.data === null) return null;
    const outcome = parseModerationOutcome(response.data);
    if (!outcome || outcome.id !== deliveryId)
      throw new ModerationFailure('unavailable', 'This outcome could not be verified.');
    return outcome;
  }
  return { detail };
}
