import { describe, expect, it } from 'vitest';

import {
  bearerToken,
  customerDeletionError,
  mergeStorageTargets,
  parseDeletionConfirmation,
} from './account-deletion';

describe('account deletion endpoint safety', () => {
  it('rejects anonymous and malformed authorization', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken('Basic secret')).toBeNull();
    expect(bearerToken('Bearer ')).toBeNull();
    expect(bearerToken('Bearer current-user-token')).toBe('current-user-token');
  });

  it('accepts only the exact phrase and no caller-supplied target user', () => {
    expect(parseDeletionConfirmation({ confirmation: 'DELETE' })).toBe(true);
    expect(parseDeletionConfirmation({ confirmation: 'delete' })).toBe(false);
    expect(parseDeletionConfirmation({ confirmation: 'DELETE', userId: 'another-user' })).toBe(
      false,
    );
  });

  it('deduplicates cleanup while rejecting another user staging prefix', () => {
    expect(
      mergeStorageTargets(
        [{ bucket: 'business-media', path: 'business/asset.webp' }],
        [
          { bucket: 'business-media', path: 'business/asset.webp' },
          { bucket: 'media-staging', path: 'current-user/business/draft.webp' },
          { bucket: 'media-staging', path: 'another-user/business/private.webp' },
        ],
        'current-user',
      ),
    ).toEqual([
      { bucket: 'business-media', path: 'business/asset.webp' },
      { bucket: 'media-staging', path: 'current-user/business/draft.webp' },
    ]);
  });

  it('uses customer-safe failure text without infrastructure details', () => {
    const message = customerDeletionError(500);
    expect(message).toContain('did not complete');
    expect(message).not.toMatch(/sql|service.role|stack|postgres/i);
  });
});
