import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import type { ReactElement } from 'react';
import { AuthProvider } from './auth-provider';

const h = vi.hoisted(() => ({
  values: [] as unknown[],
  index: 0,
  effects: [] as (() => (() => void) | void)[],
  getSession: vi.fn(),
  unsubscribe: vi.fn(),
  listener: null as null | ((event: string, session: Session | null) => void),
}));
// A deterministic effect/state harness runs the production provider. It does not
// emulate Supabase Auth, React's scheduler, native storage, or a device renderer.
vi.mock('react', async () => ({
  ...(await vi.importActual('react')),
  useState: (initial: unknown) => {
    const index = h.index++;
    if (!(index in h.values)) h.values[index] = typeof initial === 'function' ? initial() : initial;
    return [
      h.values[index],
      (value: unknown) => {
        h.values[index] = value;
      },
    ];
  },
  useEffect: (effect: () => (() => void) | void) => {
    h.effects.push(effect);
  },
  useMemo: (calculate: () => unknown) => calculate(),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: h.getSession,
      onAuthStateChange: (listener: typeof h.listener) => {
        h.listener = listener;
        return { data: { subscription: { unsubscribe: h.unsubscribe } } };
      },
    },
  },
}));
vi.mock('@/lib/auth-storage', () => ({
  getSecureStorageWarning: () => null,
  subscribeToSecureStorageWarning: () => vi.fn(),
}));
vi.mock('@/lib/biometric-auth', () => ({ clearBiometricSignInRefreshToken: vi.fn() }));

const userA = { user: { id: 'customer-a' }, access_token: 'offline-fixture-a' } as Session;
const userB = { user: { id: 'customer-b' }, access_token: 'offline-fixture-b' } as Session;
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function render() {
  h.index = 0;
  return (
    AuthProvider({ children: null }) as ReactElement<{
      value: { session: Session | null; loading: boolean };
    }>
  ).props.value;
}
function mount() {
  render();
  return h.effects.splice(0).map((effect) => effect());
}
beforeEach(() => {
  h.values = [];
  h.index = 0;
  h.effects = [];
  h.listener = null;
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Network forbidden in offline workflow tests');
    }),
  );
});

describe('readiness workflow: interrupted authentication', () => {
  it('loads a restored session and unsubscribes on unmount', async () => {
    h.getSession.mockResolvedValue({ data: { session: userA } });
    const cleanups = mount();
    await settle();
    expect(render()).toMatchObject({ session: userA, loading: false });
    cleanups.forEach((cleanup) => cleanup?.());
    expect(h.unsubscribe).toHaveBeenCalledOnce();
  });
  it('keeps the newest account after repeated A/B/A auth events', async () => {
    h.getSession.mockResolvedValue({ data: { session: null } });
    mount();
    await settle();
    h.listener!('SIGNED_IN', userA);
    h.listener!('SIGNED_IN', userB);
    h.listener!('SIGNED_IN', userA);
    expect(render().session?.user.id).toBe('customer-a');
  });
  it('does not resurrect the old account when session restoration completes after sign-out', async () => {
    let finish!: (value: unknown) => void;
    h.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount();
    h.listener!('SIGNED_OUT', null);
    finish({ data: { session: userA } });
    await settle();
    expect(render()).toMatchObject({ session: null, loading: false });
  });
  it('does not replace a newly signed-in account with a stale empty restored session', async () => {
    let finish!: (value: unknown) => void;
    h.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount();
    h.listener!('SIGNED_IN', userB);
    finish({ data: { session: null } });
    await settle();
    expect(render().session?.user.id).toBe('customer-b');
  });
  it('does not erase a newer sign-in when the earlier restoration request fails', async () => {
    let reject!: (reason: unknown) => void;
    h.getSession.mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    );
    mount();
    h.listener!('SIGNED_IN', userB);
    reject(new TypeError('Interrupted local session read'));
    await settle();
    expect(render().session?.user.id).toBe('customer-b');
  });
  it('ignores restoration and queued auth events after unmount', async () => {
    let finish!: (value: unknown) => void;
    h.getSession.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const cleanups = mount();
    cleanups.forEach((cleanup) => cleanup?.());
    finish({ data: { session: userA } });
    h.listener!('SIGNED_IN', userB);
    await settle();
    expect(render()).toMatchObject({ session: null, loading: true });
    expect(h.unsubscribe).toHaveBeenCalledOnce();
  });
});
