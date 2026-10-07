import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { ListingBillingProvider, useListingBilling } from './listing-billing-provider';

const h = vi.hoisted(() => ({
  effects: [] as (() => void | (() => void))[],
  billing: null as ReturnType<typeof useListingBilling> | null,
  sdk: {
    isConfigured: vi.fn(),
    configure: vi.fn(),
    logIn: vi.fn(),
    logOut: vi.fn(),
    getOfferings: vi.fn(),
  },
  rpc: vi.fn(),
  catalog: vi.fn(),
}));

// Run the provider's actual startup effect and exposed refresh callback. SSR
// supplies React's hook identities without requiring a native purchase sheet.
vi.mock('react', async () => ({
  ...(await vi.importActual('react')),
  useEffect: (effect: () => void | (() => void)) => {
    h.effects.push(effect);
  },
}));
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: { addEventListener: () => ({ remove: vi.fn() }) },
}));
vi.mock('react-native-purchases', () => ({ default: h.sdk }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ loading: false, session: { user: { id: 'sandbox-owner' } } }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: h.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        then: (resolve: (value: unknown) => unknown) => h.catalog().then(resolve),
      };
      return query;
    },
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  h.effects = [];
  h.billing = null;
  vi.stubEnv('EXPO_PUBLIC_REVENUECAT_IOS_API_KEY', 'appl_test-public');
  h.sdk.isConfigured.mockResolvedValue(false);
  h.rpc.mockResolvedValue({ data: { billingEnabled: true, status: 'none' }, error: null });
  h.catalog.mockResolvedValue({
    data: [{ product_id: 'listing_essentials_monthly_v1' }],
    error: null,
  });
  h.sdk.getOfferings.mockResolvedValue({
    all: {
      business_listing: {
        availablePackages: [
          {
            product: {
              identifier: 'listing_essentials_monthly_v1',
              productCategory: 'SUBSCRIPTION',
              subscriptionPeriod: 'P1M',
              price: 19,
              priceString: '$19.00',
              introPrice: null,
            },
          },
        ],
      },
    },
    current: null,
  });
});

function mount() {
  function ReadBilling() {
    h.billing = useListingBilling();
    return null;
  }
  renderToStaticMarkup(
    <ListingBillingProvider>
      <ReadBilling />
    </ListingBillingProvider>,
  );
  return h.effects.map((effect) => effect());
}

it('retry reloads store products and the server summary after the first store failure', async () => {
  h.sdk.getOfferings.mockRejectedValueOnce({ code: '23' });
  const cleanups = mount();
  await vi.waitFor(() => expect(h.sdk.getOfferings).toHaveBeenCalledOnce());
  await h.billing!.refresh();
  expect(h.sdk.getOfferings).toHaveBeenCalledTimes(2);
  expect(h.rpc).toHaveBeenCalledTimes(2);
  expect(h.catalog).toHaveBeenCalledOnce();
  expect(h.sdk.configure).toHaveBeenCalledExactlyOnceWith({
    apiKey: 'appl_test-public',
    appUserID: 'sandbox-owner',
  });
  cleanups.forEach((cleanup) => cleanup?.());
  vi.unstubAllEnvs();
});

it('retry repairs failed native initialization before requesting store products', async () => {
  h.sdk.isConfigured.mockRejectedValueOnce(new Error('Native startup failed'));
  const cleanups = mount();
  await vi.waitFor(() => expect(h.sdk.isConfigured).toHaveBeenCalledOnce());
  await h.billing!.refresh();
  expect(h.sdk.isConfigured).toHaveBeenCalledTimes(2);
  expect(h.sdk.getOfferings).toHaveBeenCalledOnce();
  expect(h.rpc).toHaveBeenCalledTimes(2);
  cleanups.forEach((cleanup) => cleanup?.());
  vi.unstubAllEnvs();
});
