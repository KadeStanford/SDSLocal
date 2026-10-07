import {
  ModerationFailure,
  type DecisionPayload,
  type MobileModerationClient,
} from './mobile-moderation-client';
import type { DecisionResult } from './moderation-types';
/** An uncertain send retains one immutable payload/UUID. Repeated taps share one in-flight operation. */
export class DecisionAttempt {
  private pending: DecisionPayload | null = null;
  private flight: Promise<DecisionResult> | null = null;
  private uncertain = false;
  constructor(
    private readonly send: MobileModerationClient['decide'],
    private readonly accountId: () => string | null,
  ) {}
  get payload() {
    return this.pending;
  }
  get awaitingConfirmation() {
    return this.uncertain;
  }
  get submitting() {
    return this.flight !== null;
  }
  clear() {
    this.pending = null;
    this.uncertain = false;
  }
  submit(payload: DecisionPayload): Promise<DecisionResult> {
    if (this.flight) return this.flight;
    if (this.pending && this.uncertain && this.pending !== payload)
      return Promise.reject(
        new ModerationFailure(
          'uncertain',
          'Resolve the earlier result with Retry same decision or by checking its history.',
        ),
      );
    this.pending = payload;
    this.uncertain = false;
    const capturedAccount = this.accountId();
    this.flight = Promise.resolve()
      .then(() => this.send(capturedAccount, payload))
      .then((result) => {
        this.clear();
        return result;
      })
      .catch((error) => {
        if (error instanceof ModerationFailure && error.kind !== 'uncertain') this.clear();
        else this.uncertain = true;
        throw error;
      })
      .finally(() => {
        this.flight = null;
      });
    return this.flight;
  }
  retry(): Promise<DecisionResult> {
    if (!this.pending)
      return Promise.reject(
        new ModerationFailure('invalid', 'There is no earlier decision to retry.'),
      );
    return this.submit(this.pending);
  }
}
