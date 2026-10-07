import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ListingBillingSummary } from '@/lib/listing-billing-core';
import ListingPlansScreen, { ListingPlansWorkspace } from '../app/listing-plans';

const h = vi.hoisted(() => ({
  platform: 'ios' as 'ios' | 'android',
  signedIn: true,
  loading: false,
  scheme: 'light' as 'light' | 'dark',
  summary: null as ListingBillingSummary | null,
  configured: true,
  purchasing: false,
  packages: [
    {
      key: 'essentials-yearly',
      planCode: 'essentials',
      period: 'yearly',
      price: 50,
      priceString: '$50',
    },
    {
      key: 'essentials-monthly',
      planCode: 'essentials',
      period: 'monthly',
      price: 5,
      priceString: '$5',
    },
  ],
  purchase: vi.fn(),
  refresh: vi.fn(),
  error: null as string | null,
  targets: [] as {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    disabled?: boolean;
    onPress?: () => void;
  }[],
}));
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native-web')>('react-native-web');
  return {
    ...web,
    Platform: {
      get OS() {
        return h.platform;
      },
      select: (options: Record<string, unknown>) => options.ios ?? options.default,
    },
    Pressable: (props: Record<string, unknown> & { children: ReactNode }) => {
      h.targets.push(props as (typeof h.targets)[number]);
      return createElement('button', { disabled: props.disabled as boolean }, props.children);
    },
  };
});
vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: ReactNode }) => createElement('div', null, children),
  useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }),
}));
vi.mock('expo-router', () => ({ router: { back: vi.fn() } }));
vi.mock('@/hooks/use-screen-bottom-padding', () => ({ useScreenBottomPadding: () => 34 }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => h.scheme }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: h.signedIn ? { user: { id: 'owner-id' } } : null }),
}));
vi.mock('@/providers/listing-billing-provider', () => ({
  useListingBilling: () => ({
    summary: h.summary,
    packages: h.packages,
    configured: h.configured,
    purchasing: h.purchasing,
    loading: h.loading,
    error: h.error,
    notice: null,
    purchase: h.purchase,
    restore: vi.fn(),
    refresh: h.refresh,
    manage: vi.fn(),
  }),
}));
beforeEach(() => {
  h.signedIn = true;
  h.platform = 'ios';
  h.loading = false;
  vi.stubEnv('EXPO_PUBLIC_SUPPORT_URL', 'https://parishpass.app/support');
  h.summary = {
    billingEnabled: true,
    planCode: null,
    planName: null,
    status: 'none',
    canPublish: false,
    listingLimit: 0,
    usedListings: 0,
    availableListings: 0,
    currentPeriodEnd: null,
    willRenew: false,
    provider: null,
    productId: null,
    businessIds: [],
  };
  h.configured = true;
  h.purchasing = false;
  h.error = null;
  h.packages = [
    {
      key: 'essentials-yearly',
      planCode: 'essentials',
      period: 'yearly',
      price: 50,
      priceString: '$50',
    },
    {
      key: 'essentials-monthly',
      planCode: 'essentials',
      period: 'monthly',
      price: 5,
      priceString: '$5',
    },
  ];
  vi.stubEnv('EXPO_PUBLIC_TERMS_URL', 'https://parishpass.app/terms');
  vi.stubEnv('EXPO_PUBLIC_PRIVACY_URL', 'https://parishpass.app/privacy');
});
afterEach(() => {
  h.targets = [];
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

it.each(['light', 'dark'] as const)(
  'passes the displayed monthly package to the store in %s',
  (scheme) => {
    h.scheme = scheme;
    const html = renderToStaticMarkup(<ListingPlansScreen />);
    const purchase = h.targets.find(
      (target) => target.accessibilityLabel === 'Subscribe to Essentials · $5/month',
    )!;
    expect(purchase.disabled).toBe(false);
    purchase.onPress!();
    expect(h.purchase).toHaveBeenCalledExactlyOnceWith(h.packages[1]);
    expect(h.targets.filter((target) => target.accessibilityRole === 'radio')).toHaveLength(3);
    expect(html).toContain('Subscriptions renew automatically');
    expect(html).toContain('Expired plans unpublish assigned listings');
    expect(html).toContain('Included with every paid plan');
    expect(html).toContain('Loyalty rewards, follower updates, and staff scanning');
    expect(html).toContain('Every plan covers up to three businesses');
    expect(html).toContain('Payment processing fees are separate');
    expect(html).toContain('$5');
    expect(html).toContain('No free trial');
  },
);
it.each([
  'legal',
  'configuration',
  'billing',
  'other-store',
  'busy',
  'current',
  'capacity',
] as const)('blocks a purchase when %s makes it unavailable', (reason) => {
  if (reason === 'legal') vi.stubEnv('EXPO_PUBLIC_TERMS_URL', 'http://example.com/terms');
  if (reason === 'configuration') h.configured = false;
  if (reason === 'billing') h.summary = { ...h.summary!, billingEnabled: false };
  if (reason === 'other-store') h.summary = { ...h.summary!, canPublish: true, provider: 'google' };
  if (reason === 'busy') h.purchasing = true;
  if (reason === 'current') h.summary = { ...h.summary!, canPublish: true, planCode: 'essentials' };
  if (reason === 'capacity')
    h.summary = { ...h.summary!, canPublish: true, provider: 'apple', usedListings: 4 };
  renderToStaticMarkup(<ListingPlansScreen />);
  const action = h.targets.find(
    (target) =>
      target.accessibilityLabel ===
      (reason === 'current' ? 'Current plan' : 'Subscribe to Essentials · $5/month'),
  )!;
  expect(action.disabled).toBe(true);
  expect(h.purchase).not.toHaveBeenCalled();
});

it('allows an active yearly owner to choose the monthly package of the same plan', () => {
  h.summary = {
    ...h.summary!,
    canPublish: true,
    provider: 'apple',
    planCode: 'essentials',
    productId: 'listing_essentials_yearly_v1',
    usedListings: 1,
  };
  renderToStaticMarkup(<ListingPlansScreen />);
  const action = h.targets.find(
    (target) => target.accessibilityLabel === 'Subscribe to Essentials · $5/month',
  )!;
  expect(action.disabled).toBe(false);
  action.onPress!();
  expect(h.purchase).toHaveBeenCalledExactlyOnceWith(h.packages[1]);
});

it.each(['ios', 'android'] as const)(
  'names the actual store and explains renewal on %s',
  (platform) => {
    h.platform = platform;
    const html = renderToStaticMarkup(<ListingPlansScreen />);
    expect(html).toContain(platform === 'ios' ? 'App Store' : 'Google Play');
    expect(html).toContain('The full $5 is billed each month');
    expect(html).toContain('Renews automatically until cancelled');
    expect(html).toContain('Publication requires approval');
    expect(html).toContain('Subscription support');
  },
);
it('requires authentication before purchase and preserves a visible free customer exit', () => {
  h.signedIn = false;
  const html = renderToStaticMarkup(<ListingPlansWorkspace purpose="create" onBack={() => {}} />);
  expect(html).toContain('Sign in or create an account');
  expect(html).toContain('Continue as a customer');
  const subscribe = h.targets.find(
    (target) => target.accessibilityLabel === 'Subscribe to Essentials · $5/month',
  )!;
  expect(subscribe.disabled).toBe(true);
  expect(
    h.targets.some((target) => target.accessibilityLabel === 'Continue to business setup'),
  ).toBe(false);
});
it.each(['unknown', 'syncing', 'inactive', 'full'] as const)(
  'does not continue to creation while %s',
  (reason) => {
    if (reason === 'unknown') h.summary = null;
    if (reason === 'syncing') h.loading = true;
    if (reason === 'full') h.summary = { ...h.summary!, canPublish: true, availableListings: 0 };
    renderToStaticMarkup(<ListingPlansWorkspace purpose="create" onContinue={vi.fn()} />);
    expect(
      h.targets.some((target) => target.accessibilityLabel === 'Continue to business setup'),
    ).toBe(false);
  },
);
it('continues on a verified subscription without buying a second subscription', () => {
  h.summary = {
    ...h.summary!,
    canPublish: true,
    planCode: 'essentials',
    provider: 'apple',
    availableListings: 2,
  };
  const onContinue = vi.fn();
  renderToStaticMarkup(<ListingPlansWorkspace purpose="create" onContinue={onContinue} />);
  const continueButton = h.targets.find(
    (target) => target.accessibilityLabel === 'Continue to business setup',
  )!;
  expect(continueButton.disabled).toBe(false);
  continueButton.onPress!();
  expect(onContinue).toHaveBeenCalledOnce();
  expect(h.purchase).not.toHaveBeenCalled();
});
it('blocks checkout while a public support link is missing', () => {
  vi.stubEnv('EXPO_PUBLIC_SUPPORT_URL', '');
  renderToStaticMarkup(<ListingPlansScreen />);
  expect(
    h.targets.find((target) => target.accessibilityLabel === 'Subscribe to Essentials · $5/month')!
      .disabled,
  ).toBe(true);
});

it('hides yearly billing when the store only supplies monthly plans', () => {
  h.packages = h.packages.filter((item) => item.period === 'monthly');
  const html = renderToStaticMarkup(<ListingPlansScreen />);
  expect(h.targets.some((target) => target.accessibilityRole === 'tab')).toBe(false);
  expect(html.indexOf('Essentials')).toBeLessThan(html.indexOf('Included with every paid plan'));
  expect(html).not.toContain('3 listings');
});

it('provides one actionable retry when prices fail, while keeping purchase blocked', () => {
  h.packages = [];
  h.error = 'Plans could not load from the App Store. Try again.';
  const html = renderToStaticMarkup(<ListingPlansScreen />);
  const retry = h.targets.filter((target) => target.accessibilityLabel === 'Try again');
  expect(retry).toHaveLength(1);
  expect(retry[0]!.disabled).toBe(false);
  retry[0]!.onPress!();
  expect(h.refresh).toHaveBeenCalledOnce();
  expect(
    h.targets.find((target) => target.accessibilityLabel === 'Plans unavailable')!.disabled,
  ).toBe(true);
  expect(h.targets.some((target) => target.accessibilityRole === 'tab')).toBe(false);
  expect(html).not.toContain('Business plans are unavailable right now');
  expect(h.purchase).not.toHaveBeenCalled();
});
