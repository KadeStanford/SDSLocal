import { afterEach, describe, expect, it } from 'vitest';

import {
  businessPublicUrl,
  buildBusinessPublicUrl,
  getBusinessPublicLinkState,
  normalizePublicBaseUrl,
  publicShareBaseUrl,
  publicSharingUnavailableCopy,
} from './share-links';

describe('public share links', () => {
  afterEach(() => {
    delete process.env.EXPO_PUBLIC_SHARE_BASE_URL;
    delete process.env.EXPO_PUBLIC_SITE_URL;
  });

  it('creates a usable HTTPS public business URL', () => {
    const base = normalizePublicBaseUrl('https://sds-local-staging.vercel.app/');
    expect(buildBusinessPublicUrl('bayou-bloom', base)).toBe(
      'https://sds-local-staging.vercel.app/b/bayou-bloom',
    );
  });

  it('rejects loopback, local-network aliases, and non-HTTPS bases', () => {
    expect(normalizePublicBaseUrl('http://localhost:3000')).toBeNull();
    expect(normalizePublicBaseUrl('https://127.0.0.1')).toBeNull();
    expect(normalizePublicBaseUrl('https://devbox.local')).toBeNull();
    expect(normalizePublicBaseUrl('http://staging.sdslocal.com')).toBeNull();
    expect(normalizePublicBaseUrl('ftp://staging.sdslocal.com')).toBeNull();
  });

  it('removes one or more trailing slashes without creating a duplicate path slash', () => {
    const base = normalizePublicBaseUrl('https://staging.sdslocal.com///');
    expect(base).toBe('https://staging.sdslocal.com');
    expect(buildBusinessPublicUrl('bayou-bloom', base)).toBe(
      'https://staging.sdslocal.com/b/bayou-bloom',
    );
  });

  it('encodes a business slug and rejects an empty slug', () => {
    expect(buildBusinessPublicUrl('Bayou & Bloom', 'https://staging.sdslocal.com')).toBe(
      'https://staging.sdslocal.com/b/Bayou%20%26%20Bloom',
    );
    expect(buildBusinessPublicUrl('   ', 'https://staging.sdslocal.com')).toBeNull();
  });

  it('provides the same configured URL state used by Share and QR', () => {
    process.env.EXPO_PUBLIC_SHARE_BASE_URL = 'https://staging.sdslocal.com/';
    const sharedUrl = businessPublicUrl('bayou-bloom');
    expect(getBusinessPublicLinkState('bayou-bloom', publicShareBaseUrl())).toEqual({
      available: true,
      url: sharedUrl,
    });
  });

  it('provides customer-readable copy when QR and sharing are unavailable', () => {
    expect(getBusinessPublicLinkState('bayou-bloom', null)).toEqual({
      available: false,
      ...publicSharingUnavailableCopy,
    });
    expect(publicSharingUnavailableCopy.title).toBe('Public sharing is temporarily unavailable');
    expect(JSON.stringify(publicSharingUnavailableCopy)).not.toContain('EXPO_PUBLIC_');
  });
});
