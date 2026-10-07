import { beforeEach, expect, it, vi } from 'vitest';
import AuthPage from './page';

const h = vi.hoisted(() => ({ redirect: vi.fn(), client: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: h.redirect }));
vi.mock('next/link', () => ({ default: () => null }));
vi.mock('./auth-forms', () => ({ AuthForms: () => null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: h.client }));
beforeEach(() => {
  vi.resetAllMocks();
  h.client.mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: 'already-signed-in' } } }) },
  });
  h.redirect.mockImplementation(() => {
    throw new Error('Redirected');
  });
});
it.each([
  ['/\\outside.example', '/account'],
  ['//outside.example', '/account'],
  ['/account/moderation', '/account/moderation'],
  [
    '/account/moderation/00000000-0000-0000-0000-000000000001',
    '/account/moderation/00000000-0000-0000-0000-000000000001',
  ],
])('validates %s when an authenticated user revisits the auth page', async (next, destination) => {
  await expect(
    AuthPage({ params: Promise.resolve({}), searchParams: Promise.resolve({ next }) }),
  ).rejects.toThrow('Redirected');
  expect(h.redirect).toHaveBeenCalledExactlyOnceWith(destination);
});
