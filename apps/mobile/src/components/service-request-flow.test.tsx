import { beforeEach, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import ServiceRequestScreen from '@/app/service-request';
const h = vi.hoisted(() => ({
  slots: [] as any[],
  index: 0,
  effects: [] as (() => void)[],
  businessId: 'business-a',
  owner: 'customer-a',
  key: 0,
  rpc: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  dispatch: vi.fn(),
  prevent: undefined as undefined | ((event: any) => void),
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
vi.mock('expo-crypto', () => ({ randomUUID: () => `retry-${++h.key}` }));
vi.mock('expo-router', () => ({
  router: { replace: h.replace, push: vi.fn(), back: h.back },
  useLocalSearchParams: () => ({ businessId: h.businessId }),
}));
vi.mock('expo-router/react-navigation', () => ({
  useNavigation: () => ({ dispatch: h.dispatch }),
  usePreventRemove: (_enabled: boolean, callback: any) => {
    h.prevent = callback;
  },
}));
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Platform: { OS: 'ios' },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('@/components/app-chrome', () => ({ AppChrome: 'AppChrome' }));
vi.mock('@/components/page-header', () => ({ PageHeader: 'PageHeader' }));
vi.mock('@/components/customer-brand', () => ({ CustomerBrand: 'CustomerBrand' }));
vi.mock('@/components/customer-ui', () => ({ CustomerAction: 'CustomerAction' }));
vi.mock('@/components/request-form-ui', () => ({ RequestBusinessHeader: 'RequestBusinessHeader' }));
vi.mock('@/components/data-state', () => ({
  EmptyState: 'EmptyState',
  ListLoading: 'ListLoading',
  StateNotice: 'StateNotice',
}));
vi.mock('@/components/merchant-ui', () => ({
  MerchantButton: 'MerchantButton',
  MerchantHeading: 'MerchantHeading',
  MerchantSheet: 'MerchantSheet',
  merchantStyles: { screen: {}, content: {} },
}));
vi.mock('@/components/service-request-form', () => ({
  ServiceRequestForm: 'ServiceRequestForm',
  ServiceRequestReview: 'ServiceRequestReview',
}));
vi.mock('@/components/themed-text', () => ({ ThemedText: 'ThemedText' }));
vi.mock('@/hooks/use-merchant-theme', () => ({ useMerchantTheme: () => ({ background: '#fff' }) }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 80 }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    session: { user: { id: h.owner, email: 'offline-fixture@example.invalid' } },
    loading: false,
  }),
}));
vi.mock('@/lib/user-error', () => ({
  userMessageFromError: (error: any, fallback: string) => error?.message ?? fallback,
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: h.rpc,
    from: (table: string) => {
      const id = h.businessId;
      const query: any = {
        select: () => query,
        eq: () => query,
        is: () => query,
        maybeSingle: async () => ({ data: { id, name: id }, error: null }),
        order: async () => ({
          data:
            table === 'offering_items' ? [{ id: 'repair', name: 'Repair', description: '' }] : [],
          error: null,
        }),
      };
      return query;
    },
  },
}));
let renderContent: (props: any) => ReactElement, props: any, tree: any;
function render() {
  h.index = 0;
  tree = renderContent(props);
  for (const effect of h.effects.splice(0)) effect();
  return tree;
}
function mount() {
  const element = ServiceRequestScreen() as ReactElement<any>;
  renderContent = element.type as any;
  props = element.props;
  return render();
}
function find(type: string, node: any = tree): any {
  if (!node) return undefined;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(type, child);
      if (match) return match;
    }
    return undefined;
  }
  if (node.type === type) return node.props;
  return node.props?.children === undefined ? undefined : find(type, node.props.children);
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
async function reviewed() {
  mount();
  await settle();
  render();
  find('ServiceRequestForm').onChange({
    businessId: h.businessId,
    offeringId: 'repair',
    message: 'Repair my kitchen sink',
    timing: 'Next week',
  });
  render();
  find('ServiceRequestForm').onReview();
  render();
}
beforeEach(() => {
  for (const slot of h.slots) slot?.cleanup?.();
  h.slots = [];
  h.index = 0;
  h.effects = [];
  h.businessId = 'business-a';
  h.owner = 'customer-a';
  h.key = 0;
  h.rpc.mockReset();
  h.replace.mockReset();
  h.back.mockReset();
  h.dispatch.mockReset();
});
it('serializes duplicate taps and retries an uncertain submission with exactly the frozen reviewed payload', async () => {
  let fail!: (cause: unknown) => void;
  h.rpc
    .mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    )
    .mockResolvedValueOnce({ data: 'confirmed-request', error: null });
  await reviewed();
  const send = find('ServiceRequestReview').onSend;
  send();
  send();
  expect(h.rpc).toHaveBeenCalledOnce();
  fail(new TypeError('Lost response'));
  await settle();
  render();
  const review = find('ServiceRequestReview');
  expect(review.locked).toBe(true);
  expect(review.busy).toBe(false);
  review.onEdit();
  render();
  expect(find('ServiceRequestForm')).toBeUndefined();
  find('ServiceRequestReview').onSend();
  await settle();
  render();
  expect(h.rpc).toHaveBeenCalledTimes(2);
  expect(h.rpc.mock.calls[1]).toEqual(h.rpc.mock.calls[0]);
  expect(h.rpc.mock.calls[0]![1]).toMatchObject({
    p_business_id: 'business-a',
    p_offering_item_id: 'repair',
    p_request_message: 'Repair my kitchen sink',
    p_idempotency_key: 'retry-1',
  });
  expect(h.replace).toHaveBeenCalledWith({
    pathname: '/my-service-requests',
    params: { requestId: 'confirmed-request' },
  });
  const action = { type: 'REPLACE' };
  h.prevent!({ data: { action } });
  expect(h.dispatch).toHaveBeenCalledWith(action);
});
it('allows editing a definitely rejected request and uses a fresh key for the corrected submission', async () => {
  h.rpc
    .mockResolvedValueOnce({ data: null, error: { code: '22023', message: 'Service unavailable' } })
    .mockResolvedValueOnce({ data: 'confirmed-request', error: null });
  await reviewed();
  find('ServiceRequestReview').onSend();
  await settle();
  render();
  expect(find('ServiceRequestReview').locked).toBe(false);
  find('ServiceRequestReview').onEdit();
  render();
  find('ServiceRequestForm').onChange({
    businessId: h.businessId,
    offeringId: null,
    message: 'Please assess the kitchen sink',
    timing: '',
  });
  render();
  find('ServiceRequestForm').onReview();
  render();
  find('ServiceRequestReview').onSend();
  await settle();
  expect(h.rpc.mock.calls[1]![1]).toMatchObject({
    p_idempotency_key: 'retry-2',
    p_offering_item_id: null,
    p_request_message: 'Please assess the kitchen sink',
  });
});
it('ignores a late confirmation after the business/account context unmounts', async () => {
  let finish!: (data: any) => void;
  h.rpc.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await reviewed();
  find('ServiceRequestReview').onSend();
  for (const slot of h.slots) slot?.cleanup?.();
  finish({ data: 'old-request', error: null });
  await settle();
  expect(h.replace).not.toHaveBeenCalled();
  h.slots = [];
  h.effects = [];
  h.owner = 'customer-b';
  h.businessId = 'business-b';
  mount();
  await settle();
  render();
  expect(find('ServiceRequestForm').draft).toMatchObject({
    businessId: 'business-b',
    message: '',
    offeringId: null,
  });
});
it('keeps the single shared Back disabled while a request response is pending', async () => {
  h.rpc.mockImplementation(() => new Promise(() => {}));
  await reviewed();
  const header = find('PageHeader');
  expect(header.onBack).toBeTypeOf('function');
  expect(header.backDisabled).toBe(false);
  header.onBack();
  expect(h.back).toHaveBeenCalledOnce();
  find('ServiceRequestReview').onSend();
  render();
  expect(find('PageHeader').backDisabled).toBe(true);
  expect(h.rpc).toHaveBeenCalledOnce();
});
