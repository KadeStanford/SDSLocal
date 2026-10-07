import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { BlockedBusinessesPanel } from './blocked-businesses-panel';
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
const actions = vi.hoisted(() => ({ refresh: vi.fn(), unblock: vi.fn() }));
vi.mock('react-native', () => ({
  View: 'View',
  ActivityIndicator: 'ActivityIndicator',
  Platform: { select: (v: any) => v.ios },
  StyleSheet: { create: (v: any) => v, hairlineWidth: 1 },
}));
vi.mock('@/components/app-button', () => ({ AppButton: 'AppButton' }));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => ({}) }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: h.owner ? { user: { id: h.owner } } : null }),
}));
vi.mock('@/providers/nearby-alerts-provider', () => ({
  useNearbyAlerts: () => ({ refresh: actions.refresh }),
}));
vi.mock('@/lib/customer-safety', () => ({ unblockBusiness: actions.unblock }));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => {
      const query: any = {
        select: () => query,
        eq: h.dispatch.mockImplementation(() => query),
        order: h.rpc,
      };
      return query;
    },
  },
}));
let content: (props: any) => ReactElement, props: any, tree: any;
function render() {
  h.index = 0;
  tree = content(props);
  for (const effect of h.effects.splice(0)) effect();
  return tree;
}
function mount() {
  const element = BlockedBusinessesPanel() as ReactElement<any>;
  content = element.type as any;
  props = element.props;
  render();
  return element;
}
function nodes(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function text() {
  return nodes(tree)
    .filter((n) => typeof n === 'string' || typeof n === 'number')
    .join(' ')
    .replace(/\s+/g, ' ');
}
function button(label: string) {
  return nodes(tree).find((n) => n.type === 'AppButton' && n.props.label === label)?.props;
}
async function settle() {
  await vi.advanceTimersByTimeAsync(0);
  for (let i = 0; i < 6; i++) await Promise.resolve();
  render();
}
function unmount() {
  for (const slot of h.slots) slot?.cleanup?.();
}
const row = { business_id: 'b', businesses: { id: 'b', name: 'Cafe' } };
beforeEach(() => {
  unmount();
  h.slots = [];
  h.index = 0;
  h.effects = [];
  h.owner = 'customer-a';
  h.rpc.mockReset();
  h.dispatch.mockClear();
  actions.unblock.mockReset();
  actions.refresh.mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers();
});
afterEach(() => {
  unmount();
  vi.useRealTimers();
});
it('shows retry instead of false empty state after thrown reads, and serializes retry', async () => {
  h.rpc.mockRejectedValueOnce(new Error('Offline'));
  mount();
  await settle();
  expect(text()).not.toContain('No blocked businesses');
  expect(text()).not.toContain('0 blocked');
  let finish!: (value: any) => void;
  h.rpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const retry = button('Retry blocked businesses');
  retry.onPress();
  retry.onPress();
  expect(h.rpc).toHaveBeenCalledTimes(2);
  finish({ data: [], error: null });
  await settle();
  expect(text()).toContain('No blocked businesses');
  expect(h.dispatch).toHaveBeenCalledWith('customer_id', 'customer-a');
});
it('keeps an unavailable business addressable and retries failed unblock without hiding it', async () => {
  h.rpc.mockResolvedValue({ data: [{ business_id: 'hidden-b', businesses: null }], error: null });
  actions.unblock
    .mockRejectedValueOnce(new Error('Offline'))
    .mockResolvedValueOnce({ error: null });
  mount();
  await settle();
  expect(text()).toContain('Unavailable business');
  button('Unblock').onPress();
  await settle();
  expect(text()).toContain('1 blocked business');
  expect(text()).toContain('could not be unblocked');
  button('Unblock').onPress();
  await settle();
  expect(actions.unblock).toHaveBeenLastCalledWith('customer-a', 'hidden-b');
  expect(text()).toContain('No blocked businesses');
});
it('serializes duplicate unblock taps and separates a saved unblock from refresh failure', async () => {
  h.rpc.mockResolvedValue({ data: [row], error: null });
  let finish!: (value: any) => void;
  actions.unblock.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  actions.refresh.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(undefined);
  mount();
  await settle();
  const action = button('Unblock');
  action.onPress();
  action.onPress();
  render();
  expect(actions.unblock).toHaveBeenCalledTimes(1);
  expect(button('Unblock').loading).toBe(true);
  finish({ error: null });
  await settle();
  expect(text()).toContain('No blocked businesses');
  expect(text()).toContain('Cafe is no longer blocked');
  expect(text()).not.toContain('could not be unblocked');
  button('Refresh recommendations').onPress();
  await settle();
  expect(actions.unblock).toHaveBeenCalledTimes(1);
  expect(button('Refresh recommendations')).toBeUndefined();
});
it('ignores abandoned mutation results and scopes private state to account identity', async () => {
  h.rpc.mockResolvedValue({ data: [row], error: null });
  let finish!: (value: any) => void;
  actions.unblock.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const first = mount();
  await settle();
  button('Unblock').onPress();
  unmount();
  finish({ error: null });
  await settle();
  expect(actions.refresh).not.toHaveBeenCalled();
  h.owner = 'customer-b';
  const second = BlockedBusinessesPanel() as ReactElement;
  expect(first.key).not.toEqual(second.key);
  h.owner = '';
  const guest = BlockedBusinessesPanel() as ReactElement<any>;
  expect(guest.props.children).toContain('Sign in');
});
it('rejects malformed data without declaring a known empty list', async () => {
  h.rpc.mockResolvedValue({ data: [{ business_id: null, businesses: null }], error: null });
  mount();
  await settle();
  expect(button('Retry blocked businesses')).toBeDefined();
  expect(text()).not.toContain('No blocked businesses');
  expect(button('Unblock')).toBeUndefined();
});
