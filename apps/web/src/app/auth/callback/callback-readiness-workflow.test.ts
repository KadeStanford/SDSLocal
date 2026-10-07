import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';
const h = vi.hoisted(() => ({ exchange: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: h.exchange } }),
}));
beforeEach(() => {
  h.exchange.mockReset();
  h.exchange.mockResolvedValue({ error: null });
});
function request(next: string, code = 'offline-code') {
  const url = new URL('https://parish.example.invalid/auth/callback');
  if (code) url.searchParams.set('code', code);
  url.searchParams.set('next', next);
  return new NextRequest(url);
}
describe('readiness workflow: actual web confirmation route', () => {
  it.each(['/account/moderation', '/account/moderation/00000000-0000-4000-8000-000000000001'])(
    'preserves the pending internal moderation destination %s',
    async (next) => {
      const response = await GET(request(next));
      expect(response.headers.get('location')).toBe(next);
    },
  );
  it('preserves the browser origin when Next normalizes the server hostname', async () => {
    const incoming = new NextRequest('http://localhost:4182/auth/callback?code=offline-code', {
      headers: { host: '127.0.0.1:4182', 'x-forwarded-host': '127.0.0.1:4182' },
    });
    const response = await GET(incoming);
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('/account');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(new URL(response.headers.get('location')!, 'http://127.0.0.1:4182').origin).toBe(
      'http://127.0.0.1:4182',
    );
  });
  it('exchanges the code and preserves an internal onboarding path and query', async () => {
    const response = await GET(request('/account/businesses/new?resume=1'));
    expect(h.exchange).toHaveBeenCalledExactlyOnceWith('offline-code');
    expect(response.headers.get('location')).toBe('/account/businesses/new?resume=1');
  });
  it.each([
    'https://outside.example.invalid',
    '//outside.example.invalid',
    '/\\outside.example.invalid',
    '/\t/outside.example.invalid',
    '/\n/outside.example.invalid',
  ])('keeps callback redirect on the app origin for %s', async (next) => {
    const response = await GET(request(next));
    expect(response.headers.get('location')).toBe('/account');
  });
  it('reports an expired code without navigating to the requested private page', async () => {
    h.exchange.mockResolvedValue({ error: { message: 'Expired fixture' } });
    const response = await GET(request('/account'));
    expect(response.headers.get('location')).toBe('/auth?error=confirmation');
  });
  it('does not invoke Auth when the callback has no code', async () => {
    const response = await GET(request('/account', ''));
    expect(h.exchange).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe('/auth?error=confirmation');
  });
});
