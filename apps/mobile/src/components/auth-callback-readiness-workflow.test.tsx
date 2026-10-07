import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthCallbackScreen from '@/app/auth/callback';

const h = vi.hoisted(() => ({
  effects: [] as (() => (() => void) | void)[],
  getInitialURL: vi.fn(),
  exchange: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
  replace: vi.fn(),
  remove: vi.fn(),
  event: null as null | ((event: { url: string }) => void),
}));
vi.mock('react', async () => ({
  ...(await vi.importActual('react')),
  useRef: (value: unknown) => ({ current: value }),
  useState: (value: unknown) => [value, vi.fn()],
  useEffect: (effect: () => (() => void) | void) => {
    h.effects.push(effect);
  },
}));
vi.mock('expo-linking', () => ({
  getInitialURL: h.getInitialURL,
  addEventListener: (_type: string, event: typeof h.event) => {
    h.event = event;
    return { remove: h.remove };
  },
}));
vi.mock('expo-router', () => ({ router: { replace: h.replace } }));
vi.mock('react-native', () => ({
  ActivityIndicator: 'div',
  ScrollView: 'div',
  View: 'div',
  StyleSheet: { create: (value: unknown) => value },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'div' }));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'span' }));
vi.mock('@/components/themed-view', () => ({ ThemedView: 'div' }));
vi.mock('@/components/back-pill', () => ({ BackPill: 'button' }));
vi.mock('@/constants/theme', () => ({ Radius: { small: 4 }, Spacing: { three: 12, four: 16 } }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({ text: '#000' }) }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 0 }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: h.exchange,
      getSession: h.getSession,
      setSession: h.setSession,
    },
  },
}));
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function mount() {
  AuthCallbackScreen();
  return h.effects.splice(0).map((effect) => effect());
}
beforeEach(() => {
  vi.clearAllMocks();
  h.effects = [];
  h.event = null;
  h.exchange.mockResolvedValue({ error: null });
  h.setSession.mockResolvedValue({ error: null });
  h.getSession.mockResolvedValue({ data: { session: null } });
  vi.stubGlobal(
    'fetch',
    vi.fn(() => {
      throw new Error('Network forbidden in offline workflow tests');
    }),
  );
});
describe('readiness workflow: repeated and interrupted confirmation links', () => {
  it('exchanges an ordinary confirmation code once and returns to account', async () => {
    h.getInitialURL.mockResolvedValue('sdslocal://auth/callback?code=offline-code');
    mount();
    await settle();
    expect(h.exchange).toHaveBeenCalledExactlyOnceWith('offline-code');
    expect(h.replace).toHaveBeenCalledExactlyOnceWith('/account');
    h.event!({ url: 'sdslocal://auth/callback?code=offline-code' });
    await settle();
    expect(h.exchange).toHaveBeenCalledOnce();
  });
  it('does not navigate after leaving the screen while exchange is pending', async () => {
    let finish!: (value: unknown) => void;
    h.getInitialURL.mockResolvedValue('sdslocal://auth/callback?code=offline-code');
    h.exchange.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const cleanups = mount();
    await settle();
    cleanups.forEach((cleanup) => cleanup?.());
    finish({ error: null });
    await settle();
    expect(h.replace).not.toHaveBeenCalled();
    expect(h.remove).toHaveBeenCalledOnce();
  });
  it('exchanges only once when the URL event arrives before the initial URL read finishes', async () => {
    let finish!: (url: string) => void;
    h.getInitialURL.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    mount();
    h.event!({ url: 'sdslocal://auth/callback?code=offline-code' });
    await settle();
    finish('sdslocal://auth/callback?code=offline-code');
    await settle();
    expect(h.exchange).toHaveBeenCalledOnce();
    expect(h.replace).toHaveBeenCalledOnce();
  });
  it('does not exchange a code delivered by an initial URL read after unmount', async () => {
    let finish!: (url: string) => void;
    h.getInitialURL.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const cleanups = mount();
    cleanups.forEach((cleanup) => cleanup?.());
    finish('sdslocal://auth/callback?code=offline-code');
    await settle();
    expect(h.exchange).not.toHaveBeenCalled();
    expect(h.replace).not.toHaveBeenCalled();
  });
});
