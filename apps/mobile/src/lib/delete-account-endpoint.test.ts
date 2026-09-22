import { describe, expect, it } from 'vitest';

import {
  bearerToken,
  customerDeletionError,
  mergeStorageTargets,
  parseDeletionConfirmation,
} from '../../../../supabase/functions/_shared/account-deletion';

describe('delete-account endpoint contract', () => {
  it('rejects anonymous requests', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Basic value')).toBeNull();
  });

  it('does not accept a caller-supplied target user ID', () => {
    expect(parseDeletionConfirmation({ confirmation: 'DELETE' })).toBe(true);
    expect(parseDeletionConfirmation({ confirmation: 'DELETE', userId: 'someone-else' })).toBe(
      false,
    );
  });

  it('targets only the deleting user staging assets', () => {
    expect(
      mergeStorageTargets(
        [],
        [
          { bucket: 'media-staging', path: 'deleting-user/business/file.webp' },
          { bucket: 'media-staging', path: 'unrelated-user/business/file.webp' },
        ],
        'deleting-user',
      ),
    ).toEqual([{ bucket: 'media-staging', path: 'deleting-user/business/file.webp' }]);
  });

  it('returns customer-safe errors', () => {
    expect(customerDeletionError(500)).toBe(
      'Account deletion did not complete. Your account is still available. Please try again.',
    );
  });
});
