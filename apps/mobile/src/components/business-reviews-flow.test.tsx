import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import BusinessReviewsScreen from '@/app/business-reviews';
vi.mock('@/components/app-text-input', () => ({ AppTextInput: 'TextInput' }));
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
vi.mock('expo-router', () => ({
  router: { push: h.dispatch, replace: h.replace },
  useLocalSearchParams: () => ({ businessId: h.businessId }),
  useFocusEffect: (callback: any) => {
    const i = h.index++;
    if (!h.slots[i]) {
      h.slots[i] = {};
      h.effects.push(callback);
    }
  },
}));
vi.mock('react-native', () => ({
  View: 'View',
  Pressable: 'Pressable',
  FlatList: 'FlatList',
  RefreshControl: 'RefreshControl',
  TextInput: 'TextInput',
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/components/app-chrome', () => ({ AppChrome: 'AppChrome' }));
vi.mock('@/components/business-screen-header', () => ({
  BusinessScreenHeader: 'BusinessScreenHeader',
}));
vi.mock('@/components/flow-layout', () => ({
  FlowIdentity: 'FlowIdentity',
  FlowSection: 'FlowSection',
}));
vi.mock('@/components/back-pill', () => ({ BackPill: 'BackPill' }));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/components/data-state', () => ({
  EmptyState: 'EmptyState',
  ListLoading: 'ListLoading',
  StateNotice: 'StateNotice',
}));
vi.mock('@/components/merchant-ui', () => ({
  MerchantButton: 'MerchantButton',
  MerchantFilters: 'MerchantFilters',
  MerchantHeading: 'MerchantHeading',
  MerchantRow: 'MerchantRow',
  MerchantSearch: 'MerchantSearch',
  MerchantSheet: 'MerchantSheet',
  MerchantStatus: 'MerchantStatus',
  merchantStyles: { input: {} },
}));
vi.mock('@/hooks/use-merchant-theme', () => ({ useMerchantTheme: () => ({}) }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 80 }));
vi.mock('@/hooks/use-pull-refresh', () => ({
  usePullRefresh: (load: any) => ({ refreshing: false, onRefresh: load }),
}));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: h.owner } }, loading: false }),
}));
vi.mock('@/providers/app-mode-provider', () => ({
  useAppMode: () => ({ mode: 'business', loading: false }),
}));
vi.mock('@/lib/user-error', () => ({
  userMessageFromError: (_: any, fallback: string) => fallback,
}));
vi.mock('@/lib/supabase', () => ({ supabase: { rpc: h.rpc } }));
let tree: any;
function render() {
  h.index = 0;
  tree = BusinessReviewsScreen();
  for (const effect of h.effects.splice(0)) effect();
  return tree;
}
function nodes(node: any): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(nodes);
  return [node, ...nodes(node.props?.children)];
}
function find(type: string) {
  return nodes(tree).find((n) => n.type === type)?.props;
}
function footer() {
  return find('MerchantSheet').footer.props;
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
  render();
}
const review = {
  id: 'review',
  source: 'order',
  orderId: 'order',
  eventId: null,
  eventTitle: null,
  rating: 5,
  text: 'Review',
  merchantResponse: null,
  moderationStatus: 'published',
  createdAt: '2026-09-28T12:00:00Z',
};
async function draft() {
  render();
  await settle();
  const row = find('FlatList').renderItem({ item: review });
  row.props.onPress();
  render();
  find('TextInput').onChangeText('Thanks!');
  render();
}
beforeEach(() => {
  for (const slot of h.slots) slot?.cleanup?.();
  h.slots = [];
  h.index = 0;
  h.effects = [];
  h.owner = 'owner';
  h.businessId = 'business';
  h.rpc.mockReset();
  h.rpc.mockImplementation((name: string) =>
    name === 'get_business_reviews'
      ? Promise.resolve({ data: { reviews: [review] }, error: null })
      : Promise.resolve({ data: null, error: { code: '42501' } }),
  );
});
it('keeps the reply draft after rejection and enables retry after status refresh', async () => {
  await draft();
  footer().onPress();
  await settle();
  expect(find('TextInput').value).toBe('Thanks!');
  expect(footer().disabled).toBe(true);
  expect(find('MerchantSheet').visible).toBe(true);
  const refresh = nodes(tree).find(
    (n) => n.type === 'MerchantButton' && n.props.label === 'Refresh review status',
  );
  await refresh.props.onPress();
  await settle();
  expect(footer().disabled).toBe(false);
  h.rpc.mockImplementation((name: string) =>
    name === 'get_business_reviews'
      ? Promise.resolve({
          data: { reviews: [{ ...review, merchantResponse: 'Thanks!' }] },
          error: null,
        })
      : Promise.resolve({
          data: {
            id: 'review',
            source: 'order',
            merchantResponse: 'Thanks!',
            respondedAt: '2026-09-28T12:00:00Z',
          },
          error: null,
        }),
  );
  footer().onPress();
  await settle();
  expect(find('MerchantSheet').visible).toBe(false);
  expect(h.rpc).toHaveBeenCalledWith('reply_to_business_review', {
    p_business_id: 'business',
    p_review_id: 'review',
    p_source: 'order',
    p_response: 'Thanks!',
  });
});
it('does not clear a draft or show success for a mismatched save confirmation', async () => {
  await draft();
  h.rpc.mockResolvedValue({
    data: {
      id: 'other',
      source: 'order',
      merchantResponse: 'Thanks!',
      respondedAt: '2026-09-28T12:00:00Z',
    },
    error: null,
  });
  footer().onPress();
  await settle();
  expect(find('TextInput').value).toBe('Thanks!');
  expect(find('MerchantSheet').visible).toBe(true);
});
