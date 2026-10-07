export type LoyaltyBusinessMember = {
  business_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
};

export function isAuthorizedLoyaltyBusinessMember(
  member: LoyaltyBusinessMember | null | undefined,
  actorId: string,
  tokenBusinessId: string,
) {
  return Boolean(
    member &&
    member.business_id === tokenBusinessId &&
    member.user_id === actorId &&
    member.is_active &&
    (member.role === 'owner' || member.role === 'staff'),
  );
}

export function matchesExpectedLoyaltyBusinessId(
  expectedBusinessId: string | null,
  tokenBusinessId: string,
) {
  return !expectedBusinessId || expectedBusinessId === tokenBusinessId;
}

export function canPreviewLoyaltyToken(args: {
  member: LoyaltyBusinessMember | null | undefined;
  actorId: string;
  tokenBusinessId: string;
  expectedBusinessId: string | null;
}) {
  return (
    isAuthorizedLoyaltyBusinessMember(args.member, args.actorId, args.tokenBusinessId) &&
    matchesExpectedLoyaltyBusinessId(args.expectedBusinessId, args.tokenBusinessId)
  );
}
