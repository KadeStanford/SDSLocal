export const accountDeletionPhrase = 'DELETE';

export type AccountDeletionAction = 'delete_business' | 'preserve_and_transfer' | 'remove_access';

export interface AccountDeletionBusinessImpact {
  readonly id: string;
  readonly name: string;
  readonly relationship: 'owner' | 'staff';
  readonly action: AccountDeletionAction;
  readonly remainingOwnerId: string | null;
}

export interface AccountDeletionImpact {
  readonly businesses: readonly AccountDeletionBusinessImpact[];
  readonly soleOwnedBusinessCount: number;
  readonly preservedOwnedBusinessCount: number;
  readonly staffMembershipCount: number;
}

const deletionActions = new Set<AccountDeletionAction>([
  'delete_business',
  'preserve_and_transfer',
  'remove_access',
]);

export function parseAccountDeletionImpact(value: unknown): AccountDeletionImpact | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.businesses)) return null;
  const businesses: AccountDeletionBusinessImpact[] = [];
  for (const candidate of input.businesses) {
    if (!candidate || typeof candidate !== 'object') return null;
    const business = candidate as Record<string, unknown>;
    if (
      typeof business.id !== 'string' ||
      typeof business.name !== 'string' ||
      (business.relationship !== 'owner' && business.relationship !== 'staff') ||
      typeof business.action !== 'string' ||
      !deletionActions.has(business.action as AccountDeletionAction) ||
      (business.remainingOwnerId !== null && typeof business.remainingOwnerId !== 'string')
    ) {
      return null;
    }
    businesses.push({
      id: business.id,
      name: business.name,
      relationship: business.relationship,
      action: business.action as AccountDeletionAction,
      remainingOwnerId: business.remainingOwnerId,
    });
  }
  const count = (name: string) =>
    typeof input[name] === 'number' && Number.isInteger(input[name]) && input[name] >= 0
      ? input[name]
      : null;
  const soleOwnedBusinessCount = count('soleOwnedBusinessCount');
  const preservedOwnedBusinessCount = count('preservedOwnedBusinessCount');
  const staffMembershipCount = count('staffMembershipCount');
  if (
    soleOwnedBusinessCount === null ||
    preservedOwnedBusinessCount === null ||
    staffMembershipCount === null
  ) {
    return null;
  }
  return {
    businesses,
    soleOwnedBusinessCount,
    preservedOwnedBusinessCount,
    staffMembershipCount,
  };
}

export function canConfirmAccountDeletion(phrase: string, submitting: boolean) {
  return !submitting && phrase === accountDeletionPhrase;
}

export function accountDeletionAccessibility(phrase: string, submitting: boolean) {
  const disabled = !canConfirmAccountDeletion(phrase, submitting);
  return {
    accessibilityRole: 'button' as const,
    accessibilityLabel: submitting ? 'Deleting account' : 'Permanently delete account',
    accessibilityHint: 'Permanently deletes this account and the businesses listed for deletion.',
    accessibilityState: { disabled, busy: submitting },
    disabled,
  };
}

export async function completeDeletedAccount(
  deleteFromServer: () => Promise<{ deleted: boolean }>,
  cleanup: readonly (() => Promise<unknown>)[],
) {
  const result = await deleteFromServer();
  if (!result.deleted) throw new Error('Account deletion was not confirmed by the server.');
  await Promise.allSettled(cleanup.map((operation) => operation()));
  return { deleted: true as const };
}
