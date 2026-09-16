import { describe, expect, it } from 'vitest';

import { resolveDeviceDevelopmentUrl } from './index';

describe('resolveDeviceDevelopmentUrl', () => {
  it('routes a loopback Supabase URL through the development computer', () => {
    expect(resolveDeviceDevelopmentUrl('http://127.0.0.1:54321', '192.168.1.63')).toBe(
      'http://192.168.1.63:54321',
    );
  });

  it('routes localhost through the development computer', () => {
    expect(resolveDeviceDevelopmentUrl('http://localhost:54321', '192.168.1.63')).toBe(
      'http://192.168.1.63:54321',
    );
  });

  it('does not alter a deployed backend URL', () => {
    expect(resolveDeviceDevelopmentUrl('https://example.supabase.co', '192.168.1.63')).toBe(
      'https://example.supabase.co',
    );
  });

  it('does not replace loopback with another loopback address', () => {
    expect(resolveDeviceDevelopmentUrl('http://127.0.0.1:54321', '127.0.0.1')).toBe(
      'http://127.0.0.1:54321',
    );
  });
});
