import { expect, it } from 'vitest';
import { businessAllowsObligationRecovery } from './business-obligation-access';
const billing = {
  status: 'suspended',
  suspension_reason: 'billing',
  billing_suspension_previous_status: 'active',
  approved_at: '2026-09-01T00:00:00Z',
};
it('preserves previously approved billing-suspended obligations', () => {
  expect(businessAllowsObligationRecovery(billing)).toBe(true);
  expect(businessAllowsObligationRecovery({ status: 'active' })).toBe(true);
});
it.each([
  null,
  undefined,
  { ...billing, suspension_reason: 'moderation' },
  { ...billing, approved_at: null },
  { ...billing, billing_suspension_previous_status: 'pending_review' },
  { ...billing, status: 'draft' },
])('does not reopen unavailable or unapproved businesses: %s', (business) => {
  expect(businessAllowsObligationRecovery(business)).toBe(false);
});
