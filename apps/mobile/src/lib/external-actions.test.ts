import { describe, expect, it } from 'vitest';

import { buildDirectionsUrl, normalizeWebsiteUrl } from './external-actions';

describe('external customer actions', () => {
  it('normalizes legitimate business websites', () => {
    expect(normalizeWebsiteUrl('example.com/menu')).toBe('https://example.com/menu');
    expect(normalizeWebsiteUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects dangerous and unsupported website schemes', () => {
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeWebsiteUrl('data:text/html,bad')).toBeNull();
    expect(normalizeWebsiteUrl('ftp://example.com')).toBeNull();
  });

  it('builds platform-aware coordinate directions', () => {
    const location = { latitude: 30.5044, longitude: -90.4612, label: 'Bayou & Bloom' };
    expect(buildDirectionsUrl('ios', location)).toContain('maps.apple.com');
    expect(buildDirectionsUrl('android', location)).toMatch(/^geo:30\.5044,-90\.4612\?/);
  });

  it('falls back to an encoded address and rejects missing locations', () => {
    expect(buildDirectionsUrl('web', { address: '211 Oak Street, Hammond, LA' })).toContain(
      '211%20Oak%20Street%2C%20Hammond%2C%20LA',
    );
    expect(buildDirectionsUrl('android', {})).toBeNull();
  });
});
