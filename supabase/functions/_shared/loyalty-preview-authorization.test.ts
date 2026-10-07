import { describe, expect, it } from 'vitest';

import {
  canPreviewLoyaltyToken,
  isAuthorizedLoyaltyBusinessMember,
  matchesExpectedLoyaltyBusinessId,
  type LoyaltyBusinessMember,
} from './loyalty-preview-authorization';

const businessId = '10000000-0000-4000-8000-000000000001';
const otherBusinessId = '10000000-0000-4000-8000-000000000002';
const staffId = '20000000-0000-4000-8000-000000000001';
const tokenOwnerId = '20000000-0000-4000-8000-000000000002';

function member(overrides: Partial<LoyaltyBusinessMember> = {}): LoyaltyBusinessMember {
  return {
    business_id: businessId,
    user_id: staffId,
    role: 'staff',
    is_active: true,
    ...overrides,
  };
}

describe('loyalty preview authorization', () => {
  it.each([
    ['an unrelated customer', undefined, tokenOwnerId, false],
    ['staff from another business', member({ business_id: otherBusinessId }), staffId, false],
    ['inactive staff', member({ is_active: false }), staffId, false],
    ['an unsupported manager role', member({ role: 'manager' }), staffId, false],
    ['an active staff member', member(), staffId, true],
    ['an active owner', member({ role: 'owner' }), staffId, true],
  ])('%s follows the token business membership rules', (_label, row, actorId, expected) => {
    expect(isAuthorizedLoyaltyBusinessMember(row, actorId, businessId)).toBe(expected);
  });

  it('does not let an omitted expected business ID skip authorization', () => {
    expect(
      canPreviewLoyaltyToken({
        member: undefined,
        actorId: tokenOwnerId,
        tokenBusinessId: businessId,
        expectedBusinessId: null,
      }),
    ).toBe(false);
  });

  it('keeps authorization bound to the token when the expected business ID is mismatched', () => {
    expect(
      canPreviewLoyaltyToken({
        member: member(),
        actorId: staffId,
        tokenBusinessId: businessId,
        expectedBusinessId: otherBusinessId,
      }),
    ).toBe(false);
    expect(matchesExpectedLoyaltyBusinessId(null, businessId)).toBe(true);
  });

  it('allows the token owner only when their existing staff membership authorizes them', () => {
    expect(
      canPreviewLoyaltyToken({
        member: member({ user_id: tokenOwnerId }),
        actorId: tokenOwnerId,
        tokenBusinessId: businessId,
        expectedBusinessId: null,
      }),
    ).toBe(true);
  });
});
