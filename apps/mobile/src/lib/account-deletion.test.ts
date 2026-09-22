import { describe, expect, it, vi } from 'vitest';

import {
  accountDeletionAccessibility,
  canConfirmAccountDeletion,
  completeDeletedAccount,
  parseAccountDeletionImpact,
} from './account-deletion';

const business = (
  name: string,
  action: 'delete_business' | 'preserve_and_transfer' | 'remove_access',
) => ({
  id: `${name}-id`,
  name,
  relationship: action === 'remove_access' ? ('staff' as const) : ('owner' as const),
  action,
  remainingOwnerId: action === 'preserve_and_transfer' ? 'remaining-owner' : null,
});

describe('account deletion impact', () => {
  it('represents a customer-only plan without business changes', () => {
    expect(
      parseAccountDeletionImpact({
        businesses: [],
        soleOwnedBusinessCount: 0,
        preservedOwnedBusinessCount: 0,
        staffMembershipCount: 0,
      }),
    ).toEqual({
      businesses: [],
      soleOwnedBusinessCount: 0,
      preservedOwnedBusinessCount: 0,
      staffMembershipCount: 0,
    });
  });

  it('distinguishes staff removal, co-owner preservation, and sole-owner deletion', () => {
    const impact = parseAccountDeletionImpact({
      businesses: [
        business('Staff business', 'remove_access'),
        business('Shared business', 'preserve_and_transfer'),
        business('Sole business', 'delete_business'),
      ],
      soleOwnedBusinessCount: 1,
      preservedOwnedBusinessCount: 1,
      staffMembershipCount: 1,
    });
    expect(impact?.businesses.map((item) => [item.name, item.action])).toEqual([
      ['Staff business', 'remove_access'],
      ['Shared business', 'preserve_and_transfer'],
      ['Sole business', 'delete_business'],
    ]);
  });
});

describe('account deletion completion', () => {
  it('requires the exact confirmation phrase and exposes destructive accessibility state', () => {
    expect(canConfirmAccountDeletion('delete', false)).toBe(false);
    expect(canConfirmAccountDeletion('DELETE', false)).toBe(true);
    expect(accountDeletionAccessibility('DELETE', true)).toMatchObject({
      accessibilityRole: 'button',
      accessibilityState: { disabled: true, busy: true },
      disabled: true,
    });
  });

  it('clears local state only after server-confirmed success', async () => {
    const cleanup = vi.fn(async () => undefined);
    await expect(
      completeDeletedAccount(async () => ({ deleted: true }), [cleanup]),
    ).resolves.toEqual({ deleted: true });
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it('leaves the session and local state intact after failure', async () => {
    const cleanup = vi.fn(async () => undefined);
    await expect(
      completeDeletedAccount(async () => {
        throw new Error('request failed');
      }, [cleanup]),
    ).rejects.toThrow('request failed');
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('does not falsely report completion from an unconfirmed response', async () => {
    const cleanup = vi.fn(async () => undefined);
    await expect(
      completeDeletedAccount(async () => ({ deleted: false }), [cleanup]),
    ).rejects.toThrow('not confirmed');
    expect(cleanup).not.toHaveBeenCalled();
  });
});
