import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AppModeProvider } from './app-mode-provider';
import { useBusinessFeatureAccess } from '@/hooks/use-business-feature-access';
import { RewardsCodeSheet } from '@/components/rewards-code-sheet';

const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  revision: 0,
  layout: [] as (() => void)[],
  effects: [] as (() => void)[],
  user: 'customer-a' as string | null,
  members: vi.fn(),
  member: vi.fn(),
  rpc: vi.fn(),
  invoke: vi.fn(),
  summary: null,
  listeners: new Set<(state: string) => void>(),
}));
// Runs production hooks with deterministic commit/cleanup ordering. This is
// isolated component evidence, not a native renderer or provider integration.
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const same = (a: any[], b: any[]) =>
    !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const effect = (queue: 'layout' | 'effects') => (callback: () => any, deps: any[]) => {
    const i = h.index++;
    if (!same(h.slots[i]?.deps, deps)) {
      const prior = h.slots[i];
      const slot = { deps, cleanup: undefined as any };
      h.slots[i] = slot;
      h[queue].push(
        Object.assign(
          () => {
            slot.cleanup = callback();
          },
          {
            cleanup: () => prior?.cleanup?.(),
          },
        ),
      );
    }
  };
  return {
    ...actual,
    useState: (initial: any) => {
      const i = h.index++;
      const slot = (h.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial });
      return [
        slot.value,
        (next: any) => {
          const value = typeof next === 'function' ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) {
            slot.value = value;
            h.revision++;
          }
        },
      ];
    },
    useRef: (initial: any) => (h.slots[h.index++] ??= { current: initial }),
    useCallback: (callback: any, deps: any[]) => {
      const i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { deps, value: callback };
      return h.slots[i].value;
    },
    useMemo: (calculate: () => any, deps: any[]) => {
      const i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { deps, value: calculate() };
      return h.slots[i].value;
    },
    useEffect: effect('effects'),
    useLayoutEffect: effect('layout'),
  };
});
vi.mock('expo-router', async () => {
  const { useEffect } = await import('react');
  return { useFocusEffect: (callback: () => any) => useEffect(callback, [callback]) };
});
vi.mock('react-native', () => ({
  View: 'View',
  ActivityIndicator: 'ActivityIndicator',
  AppState: {
    currentState: 'active',
    addEventListener: (_: string, listener: (state: string) => void) => {
      h.listeners.add(listener);
      return { remove: () => h.listeners.delete(listener) };
    },
  },
}));
vi.mock('react-native-qrcode-svg', () => ({ default: 'QRCode' }));
vi.mock('@/components/merchant-ui', () => ({
  MerchantSheet: 'MerchantSheet',
  MerchantButton: 'MerchantButton',
}));
vi.mock('@/components/data-state', () => ({ StateNotice: 'StateNotice' }));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: h.user ? { user: { id: h.user } } : null, loading: false }),
}));
vi.mock('@/providers/listing-billing-provider', () => ({
  useListingBilling: () => ({ summary: h.summary }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: h.rpc,
    functions: { invoke: h.invoke },
    from: () => {
      const query: any = {
        select: () => query,
        eq: () => query,
        limit: () => h.members(),
        maybeSingle: () => h.member(),
      };
      return query;
    },
  },
}));
function render<T>(component: () => T): T {
  let value!: T;
  for (let i = 0; i < 10; i++) {
    const revision = h.revision;
    h.index = 0;
    value = component();
    if (revision === h.revision) break;
    if (i === 9) throw new Error('Component did not stabilize');
  }
  // React runs the old cleanup phase before starting the new effect phase.
  for (const queue of [h.layout, h.effects]) {
    const effects = queue.splice(0);
    for (const effect of effects) (effect as any).cleanup?.();
    for (const effect of effects) effect();
  }
  return value;
}
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const mode = () => render(() => (AppModeProvider({ children: null }) as any).props.value);
function nodes(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function sheet(visible = true, membershipId = 'membership-a') {
  return render(() =>
    RewardsCodeSheet({ visible, membershipId, businessName: 'Local cafe', onClose: () => {} }),
  );
}
const qr = (tree: any) => nodes(tree).find((node) => node.type === 'QRCode');
const code = (token: string) => ({
  data: { token, expiresAt: new Date(Date.now() + 45_000).toISOString() },
  error: null,
});
beforeEach(() => {
  h.slots = [];
  h.index = 0;
  h.revision = 0;
  h.layout = [];
  h.effects = [];
  h.user = 'customer-a';
  h.listeners.clear();
  vi.resetAllMocks();
  h.member.mockResolvedValue({ data: { role: 'owner' }, error: null });
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-06T04:00:00Z'));
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn() });
  vi.stubGlobal('fetch', () => {
    throw new Error('Network forbidden');
  });
});
afterEach(() => {
  for (const slot of h.slots) slot?.cleanup?.();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('keeps account B access when an older account A check finishes last', async () => {
  const a = deferred<any>(),
    b = deferred<any>();
  h.members.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  mode();
  await vi.advanceTimersByTimeAsync(0);
  h.user = 'customer-b';
  mode();
  await vi.advanceTimersByTimeAsync(0);
  b.resolve({ data: [{ id: 'membership-b' }], error: null });
  await settle();
  let current = mode();
  expect(current.hasBusinessAccess).toBe(true);
  current.setMode('business');
  expect(mode().mode).toBe('business');
  a.resolve({ data: [], error: null });
  await settle();
  expect(mode()).toMatchObject({ hasBusinessAccess: true, mode: 'business', accessError: false });
});
it('ignores a late membership response after sign-out', async () => {
  const pending = deferred<any>();
  h.members.mockReturnValue(pending.promise);
  mode();
  await vi.advanceTimersByTimeAsync(0);
  h.user = null;
  mode();
  await vi.advanceTimersByTimeAsync(0);
  pending.resolve({ data: [{ id: 'old-membership' }], error: null });
  await settle();
  expect(mode()).toMatchObject({ hasBusinessAccess: false, mode: 'customer', loading: false });
});
it('recovers from a membership failure through the same account retry', async () => {
  h.members
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: [{ id: 'owner' }], error: null });
  mode();
  await vi.advanceTimersByTimeAsync(0);
  expect(mode().accessError).toBe(true);
  await mode().refreshBusinessAccess();
  expect(mode()).toMatchObject({ hasBusinessAccess: true, accessError: false });
});
it('ignores stale business capabilities after changing the business', async () => {
  const a = deferred<any>(),
    b = deferred<any>();
  h.rpc.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  render(() => useBusinessFeatureAccess('business-a'));
  render(() => useBusinessFeatureAccess('business-b'));
  const access = (businessId: string) => ({
    data: { businessId, enforced: false, planCode: null, featureCodes: [] },
    error: null,
  });
  b.resolve(access('business-b'));
  await settle();
  expect(render(() => useBusinessFeatureAccess('business-b')).access?.businessId).toBe(
    'business-b',
  );
  a.resolve(access('business-a'));
  await settle();
  expect(render(() => useBusinessFeatureAccess('business-b')).access?.businessId).toBe(
    'business-b',
  );
});
it('removes an expired rewards QR while the refresh is still pending', async () => {
  h.invoke.mockResolvedValueOnce(code('fresh-a')).mockReturnValueOnce(new Promise(() => {}));
  let tree = sheet();
  nodes(tree)
    .find((node) => node.props?.onLayout)
    ?.props.onLayout({ nativeEvent: { layout: { width: 220 } } });
  await settle();
  tree = sheet();
  expect(qr(tree)?.props.value).toBe('fresh-a');
  await vi.advanceTimersByTimeAsync(45_000);
  expect(qr(sheet())).toBeUndefined();
  expect(h.invoke).toHaveBeenCalledTimes(2);
});
it('clears a displayed rewards QR immediately when membership changes', async () => {
  h.invoke.mockResolvedValueOnce(code('fresh-a')).mockReturnValueOnce(new Promise(() => {}));
  let tree = sheet();
  nodes(tree)
    .find((node) => node.props?.onLayout)
    ?.props.onLayout({ nativeEvent: { layout: { width: 220 } } });
  await settle();
  tree = sheet();
  expect(qr(tree)).toBeDefined();
  expect(qr(sheet(true, 'membership-b'))).toBeUndefined();
  expect(h.invoke).toHaveBeenLastCalledWith('loyalty-token', {
    body: { membershipId: 'membership-b' },
  });
});
it('ignores an unfinished rewards response after dismissal and clears subscriptions', async () => {
  const pending = deferred<any>();
  h.invoke.mockReturnValue(pending.promise);
  sheet();
  sheet(false);
  pending.resolve(code('late'));
  await settle();
  expect(qr(sheet(false))).toBeUndefined();
  for (const slot of h.slots) {
    slot?.cleanup?.();
    if (slot) slot.cleanup = undefined;
  }
  expect(h.listeners.size).toBe(0);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(h.invoke).toHaveBeenCalledTimes(1);
});
