import { beforeEach, describe, expect, it, vi } from 'vitest';
import { magicLinkAction, signInAction, signOutAction, signUpAction } from './actions';

const h = vi.hoisted(() => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  otp: vi.fn(),
  signOut: vi.fn(),
  headers: new Map<string, string>(),
  redirect: vi.fn(),
  client: vi.fn(),
}));
vi.mock('next/headers', () => ({ headers: async () => h.headers }));
vi.mock('next/navigation', () => ({ redirect: h.redirect }));
vi.mock('@/lib/supabase/config', () => ({ getSiteUrl: () => 'http://localhost:3000' }));
vi.mock('@/lib/supabase/server', () => ({ createClient: h.client }));
function form(values: Record<string, string>) {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}
const credentials = { email: 'offline-fixture@example.invalid', password: 'OfflineFixture123!' };
beforeEach(() => {
  vi.resetAllMocks();
  h.headers = new Map([['host', 'localhost:3000']]);
  h.client.mockResolvedValue({
    auth: {
      signInWithPassword: h.signIn,
      signUp: h.signUp,
      signInWithOtp: h.otp,
      signOut: h.signOut,
    },
  });
  h.signIn.mockResolvedValue({ error: null });
  h.signUp.mockResolvedValue({ data: { session: null }, error: null });
  h.otp.mockResolvedValue({ error: null });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Network forbidden in offline workflow tests');
    }),
  );
});
// These invoke the real Next server actions with Auth and request headers mocked.
// No account, email, browser session, PostgreSQL row, or provider is created.
describe('readiness workflow: web authentication actions', () => {
  it('rejects invalid registration before calling Supabase', async () => {
    const result = await signUpAction(
      {},
      form({ displayName: 'Fixture', email: 'bad', password: 'short' }),
    );
    expect(result.errors?.email).toBeDefined();
    expect(result.errors?.password).toBeDefined();
    expect(h.client).not.toHaveBeenCalled();
  });
  it('keeps business onboarding as the destination after successful sign-in', async () => {
    await signInAction({}, form({ ...credentials, next: '/account/businesses/new' }));
    expect(h.signIn).toHaveBeenCalledExactlyOnceWith(credentials);
    expect(h.redirect).toHaveBeenCalledExactlyOnceWith('/account/businesses/new');
  });
  it.each(['https://outside.example.invalid', '//outside.example.invalid'])(
    'rejects an external post-auth destination %s',
    async (next) => {
      await signInAction({}, form({ ...credentials, next }));
      expect(h.redirect).toHaveBeenCalledExactlyOnceWith('/account');
    },
  );
  it('rejects a backslash destination that browsers normalize into an external host', async () => {
    const next = '/\\outside.example.invalid';
    expect(new URL(next, 'https://parish.example.invalid').host).toBe('outside.example.invalid');
    await signInAction({}, form({ ...credentials, next }));
    expect(h.redirect).toHaveBeenCalledExactlyOnceWith('/account');
  });
  it('reports a failed sign-in and permits a later successful retry', async () => {
    h.signIn.mockResolvedValueOnce({ error: { message: 'Fixture failure' } });
    expect(await signInAction({}, form(credentials))).toMatchObject({
      message: 'The email or password was not recognized.',
    });
    expect(h.redirect).not.toHaveBeenCalled();
    await signInAction({}, form(credentials));
    expect(h.redirect).toHaveBeenCalledWith('/account');
  });
  it('uses the allowlisted submitting origin and preserves onboarding in a registration confirmation link', async () => {
    h.headers.set('x-forwarded-host', 'localhost:3108');
    const result = await signUpAction(
      {},
      form({ ...credentials, displayName: 'Offline Fixture', next: '/account/businesses/new' }),
    );
    expect(result.success).toMatch(/Check your email/);
    expect(h.redirect).not.toHaveBeenCalled();
    expect(h.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: 'http://localhost:3108/auth/callback?next=%2Faccount%2Fbusinesses%2Fnew',
        }),
      }),
    );
  });
  it('does not use an untrusted forwarded host when building the email callback', async () => {
    h.headers.set('x-forwarded-host', 'outside.example.invalid');
    await magicLinkAction({}, form({ email: credentials.email, next: '/account' }));
    expect(h.otp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: 'http://localhost:3000/auth/callback?next=%2Faccount',
          shouldCreateUser: false,
        },
      }),
    );
  });
  it('signs out before returning home', async () => {
    await signOutAction();
    expect(h.signOut).toHaveBeenCalledOnce();
    expect(h.redirect).toHaveBeenCalledExactlyOnceWith('/');
  });
});
