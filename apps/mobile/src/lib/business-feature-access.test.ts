import { describe, expect, it } from 'vitest';
import { businessOperationIncluded, businessSubscriptionFeatures } from '@sds/business-logic';
import {
  BusinessAccessRequestScope,
  parseBusinessFeatureAccess,
  workspaceFeatureOperation,
} from './business-feature-access';

const access = {
  businessId: 'business-a',
  enforced: true,
  planCode: 'pro',
  featureCodes: [...businessSubscriptionFeatures],
};
describe('business capability snapshots', () => {
  it('accepts the full server catalog, including discovery', () => {
    expect(parseBusinessFeatureAccess(access, 'business-a')).toEqual(access);
  });
  it.each([
    null,
    {},
    { ...access, businessId: 'business-b' },
    { ...access, featureCodes: ['invented'] },
    { ...access, enforced: 'false' },
  ])('rejects malformed or cross-business snapshots', (value) => {
    expect(() => parseBusinessFeatureAccess(value, 'business-a')).toThrow();
  });
  it('denies missing/expired setup access while keeping recovery available', () => {
    expect(businessOperationIncluded(null, 'configure_booking')).toBe(false);
    expect(businessOperationIncluded({ ...access, featureCodes: [] }, 'configure_pickup')).toBe(
      false,
    );
    for (const operation of [
      'refund_existing_order',
      'manage_existing_appointment',
      'redeem_existing_reward',
      'disconnect_payment_provider',
    ] as const) {
      expect(businessOperationIncluded(null, operation)).toBe(true);
    }
    expect(workspaceFeatureOperation.appointments).toBeUndefined();
    expect(workspaceFeatureOperation.staff).toBeUndefined();
  });
  it('discards late responses after an account/business/entitlement switch', async () => {
    const scope = new BusinessAccessRequestScope();
    scope.select('owner-a/business-a/pro');
    let resolve!: (v: string) => void;
    const pending = scope.run(
      'owner-a/business-a/pro',
      () =>
        new Promise<string>((r) => {
          resolve = r;
        }),
    );
    scope.select('owner-b/business-b/essentials');
    resolve('pro');
    expect(await pending).toBeUndefined();
  });
  it('keeps the latest refresh and invalidates unmounted requests', async () => {
    const scope = new BusinessAccessRequestScope();
    scope.select('same');
    let first!: (v: string) => void;
    const old = scope.run(
      'same',
      () =>
        new Promise<string>((r) => {
          first = r;
        }),
    );
    expect(await scope.run('same', async () => 'expired')).toBe('expired');
    first('active');
    expect(await old).toBeUndefined();
    const pending = scope.run('same', async () => 'active');
    scope.invalidate();
    expect(await pending).toBeUndefined();
  });
});
