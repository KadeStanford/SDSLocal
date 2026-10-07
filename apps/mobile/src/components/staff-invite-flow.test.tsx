import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import StaffInviteScreen from '@/app/staff-invite';
const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  effects: [] as (() => void)[],
  businessId: 'business-a',
  owner: 'customer-a',
  rpc: vi.fn(),
  replace: vi.fn(),
  dispatch: vi.fn(),
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  const same = (a: unknown[] | undefined, b: unknown[] | undefined) =>
    !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  return {
    ...actual,
    useRef: (initial: unknown) => {
      const i = h.index++;
      return (h.slots[i] ??= { current: initial });
    },
    useState: (initial: any) => {
      const i = h.index++;
      const slot = (h.slots[i] ??= { value: typeof initial === 'function' ? initial() : initial });
      return [
        slot.value,
        (next: any) => {
          slot.value = typeof next === 'function' ? next(slot.value) : next;
        },
      ];
    },
    useCallback: (callback: unknown, deps: unknown[]) => {
      const i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { value: callback, deps };
      return h.slots[i].value;
    },
    useEffect: (effect: () => any, deps: unknown[]) => {
      const i = h.index++;
      if (!same(h.slots[i]?.deps, deps)) {
        const prior = h.slots[i];
        const slot = { deps, cleanup: undefined as any };
        h.slots[i] = slot;
        h.effects.push(() => {
          prior?.cleanup?.();
          slot.cleanup = effect();
        });
      }
    },
  };
});
const access = vi.hoisted(() => ({ refresh: vi.fn(), mode: vi.fn(), authLoading: false }));
vi.mock('expo-router', () => ({
  router: { replace: h.replace, push: h.dispatch },
  useLocalSearchParams: () => ({ token: h.businessId }),
}));
vi.mock('react-native', () => ({
  Platform: { select: (value: any) => value.ios },
  View: 'View',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: (value: any) => value },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/components/app-button', () => ({ AppButton: 'AppButton' }));
vi.mock('@/components/customer-brand', () => ({ CustomerBrand: 'CustomerBrand' }));
vi.mock('@/components/flow-layout', () => ({ FlowIdentity: 'FlowIdentity' }));
vi.mock('@/components/back-pill', () => ({ BackPill: 'BackPill' }));
vi.mock('@/components/swipe-back-view', () => ({ SwipeBackView: 'SwipeBackView' }));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/components/themed-view', () => ({ ThemedView: 'ThemedView' }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({}) }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 80 }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    session: h.owner ? { user: { id: h.owner } } : null,
    loading: access.authLoading,
  }),
}));
vi.mock('@/providers/app-mode-provider', () => ({
  useAppMode: () => ({ refreshBusinessAccess: access.refresh, setMode: access.mode }),
}));
vi.mock('@/lib/user-error', () => ({
  userMessageFromError: (error: any, fallback: string) => error?.message ?? fallback,
}));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: h.rpc } }));
let content: (props: any) => ReactElement, props: any, tree: any;
function render() {
  h.index = 0;
  tree = content(props);
  for (const effect of h.effects.splice(0)) effect();
  return tree;
}
function mount() {
  const route = StaffInviteScreen() as ReactElement<any>;
  content = route.type as any;
  props = route.props;
  render();
  return route;
}
function nodes(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function button(label: string) {
  return nodes(tree).find((n) => n.type === 'AppButton' && n.props.label === label)?.props;
}
async function settle() {
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  render();
}
function unmount() {
  for (const slot of h.slots) slot?.cleanup?.();
}
afterEach(() => {
  unmount();
  vi.useRealTimers();
});
beforeEach(() => {
  unmount();
  h.slots = [];
  h.index = 0;
  h.effects = [];
  h.owner = 'staff-a';
  h.businessId = 'invite-a';
  h.rpc.mockReset();
  h.replace.mockReset();
  h.dispatch.mockReset();
  access.mode.mockReset();
  access.refresh.mockReset().mockResolvedValue(true);
  access.authLoading = false;
  vi.useFakeTimers();
});
it('stops after rejection, exposes retry, and serializes duplicate retry taps', async () => {
  h.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Expired invite' } });
  mount();
  await settle();
  expect(h.rpc).toHaveBeenCalledTimes(1);
  for (let i = 0; i < 3; i++) {
    render();
    await settle();
  }
  expect(h.rpc).toHaveBeenCalledTimes(1);
  let finish!: (value: any) => void;
  h.rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const retry = button('Retry invitation');
  retry.onPress();
  retry.onPress();
  render();
  expect(h.rpc).toHaveBeenCalledTimes(2);
  expect(h.rpc).toHaveBeenLastCalledWith('accept_business_staff_invite', { p_token: 'invite-a' });
  expect(nodes(tree).find((n) => n.type === 'BackPill')?.props.disabled).toBe(true);
  finish({ data: [{ business_id: 'b', business_name: 'Cafe', role: 'staff' }], error: null });
  await settle();
  button('Open business workspace').onPress();
  expect(access.mode).toHaveBeenCalledWith('business');
  expect(h.replace).toHaveBeenCalledWith({
    pathname: '/business',
    params: { id: 'b', section: 'preview' },
  });
});
it('retries access refresh without accepting the invitation twice', async () => {
  h.rpc.mockResolvedValue({
    data: { business_id: 'b', business_name: 'Cafe', role: 'staff' },
    error: null,
  });
  access.refresh.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  mount();
  await settle();
  expect(button('Open business workspace')).toBeUndefined();
  button('Refresh business access').onPress();
  await settle();
  expect(h.rpc).toHaveBeenCalledTimes(1);
  expect(access.refresh).toHaveBeenCalledTimes(2);
  expect(button('Open business workspace')).toBeDefined();
});
it('ignores abandoned acceptance results before refreshing private access', async () => {
  let finish!: (value: any) => void;
  h.rpc.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  mount();
  await settle();
  unmount();
  finish({ data: { business_id: 'b', business_name: 'Cafe', role: 'staff' }, error: null });
  await settle();
  expect(access.refresh).not.toHaveBeenCalled();
  expect(h.replace).not.toHaveBeenCalled();
});
it('retains the invitation through guest sign-in and scopes state to account and token', () => {
  h.owner = '';
  const guest = mount();
  button('Sign in or create account').onPress();
  expect(h.dispatch).toHaveBeenCalledWith({
    pathname: '/account',
    params: { staffInvite: 'invite-a' },
  });
  h.owner = 'staff-b';
  const account = StaffInviteScreen() as ReactElement;
  h.businessId = 'invite-b';
  const invite = StaffInviteScreen() as ReactElement;
  expect(guest.key).not.toEqual(account.key);
  expect(account.key).not.toEqual(invite.key);
  expect(h.rpc).not.toHaveBeenCalled();
});
it('catches thrown requests and rejects malformed accepted responses', async () => {
  h.rpc
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ data: { business_id: 'b', role: 'owner' }, error: null });
  mount();
  await settle();
  button('Retry invitation').onPress();
  await settle();
  expect(button('Retry invitation')).toBeDefined();
  expect(access.refresh).not.toHaveBeenCalled();
});
