import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveHref } from 'expo-router/build/link/href';
import { themeColors } from '@sds/design-tokens';
import { BusinessCard, type BusinessCardData } from './business-card';
import { PickupOrderCtaContent } from './pickup-order-cta';
import { PickupNavigationButton } from './pickup-navigation-button';
import { PickupOrderCard, FulfillmentActions } from './pickup/business-order-components';
import type { PickupOrder } from '@/lib/square-commerce-core';
import { RootNavigator } from './root-navigator';
import AppTabs from './app-tabs';
import { initialPickupModule } from '@/lib/pickup-discovery';
import { guestCanOpenPath } from '@/lib/navigation-policy';

type PressTarget = {
  accessibilityLabel: string;
  accessibilityRole: string;
  disabled: boolean;
  onPress: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  style: (state: { pressed: boolean }) => unknown;
  parent: string | null;
};
const h = vi.hoisted(() => ({
  targets: [] as PressTarget[],
  effects: [] as (() => unknown)[],
  focus: [] as (() => unknown)[],
  screens: [] as Record<string, unknown>[],
  triggers: [] as Record<string, unknown>[],
  push: vi.fn(),
  replace: vi.fn(),
  begin: vi.fn(),
  end: vi.fn(),
  signedIn: false,
  mode: 'customer',
  businesses: [] as { id: string; counts?: { requests: number } }[],
  services: [] as { id: string }[],
  path: '/order',
}));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useEffect: (fn: () => unknown) => {
      h.effects.push(fn);
    },
  };
});
vi.mock('react-native', async () => {
  const { createContext, useContext } = await import('react');
  const Parent = createContext<string | null>(null);
  return {
    View: ({ children }: { children: ReactNode }) => createElement('div', null, children),
    Text: ({ children }: { children: ReactNode }) => createElement('span', null, children),
    Pressable: (props: Omit<PressTarget, 'parent'> & { children: ReactNode }) => {
      const parent = useContext(Parent);
      h.targets.push({ ...props, parent });
      return createElement(
        Parent.Provider,
        { value: props.accessibilityLabel },
        createElement(
          'button',
          { 'aria-label': props.accessibilityLabel, disabled: props.disabled },
          props.children,
        ),
      );
    },
    ActivityIndicator: () => createElement('progress'),
    StyleSheet: { create: (x: unknown) => x, hairlineWidth: 1 },
    useColorScheme: () => 'light',
    Platform: { OS: 'ios', select: (x: { default: unknown }) => x.default },
  };
});
vi.mock('expo-router', () => ({
  router: { push: h.push, replace: h.replace },
  usePathname: () => h.path,
  useFocusEffect: (fn: () => unknown) => {
    h.focus.push(fn);
  },
  Stack: Object.assign(
    ({ children }: { children: ReactNode }) => createElement('main', null, children),
    {
      Screen: (props: Record<string, unknown>) => {
        h.screens.push(props);
        return createElement('section', { 'data-screen': props.name });
      },
    },
  ),
}));
vi.mock('expo-router/unstable-native-tabs', () => {
  const Empty = () => null;
  const Trigger = Object.assign(
    (props: Record<string, unknown>) => {
      h.triggers.push(props);
      return createElement('span');
    },
    { Label: Empty, Icon: Empty, Badge: Empty },
  );
  return {
    NativeTabs: Object.assign(
      ({ children }: { children: ReactNode }) => createElement('nav', null, children),
      { Trigger },
    ),
  };
});
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors.light }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: h.signedIn ? { user: { id: 'customer' } } : null, loading: false }),
}));
vi.mock('@/providers/app-mode-provider', () => ({
  useAppMode: () => ({ mode: h.mode, hasBusinessAccess: h.signedIn, loading: false }),
}));
vi.mock('@/providers/pickup-workspace-provider', () => ({
  usePickupWorkspace: () => ({ businesses: h.businesses, loading: false, error: '' }),
}));
vi.mock('@/providers/service-operations-provider', () => ({
  useServiceOperations: () => ({ businesses: h.services, loading: false, error: '' }),
}));
vi.mock('@/hooks/use-business-activity', () => ({
  useBusinessActivity: () => ({ appointments: false, requests: false, orders: false }),
}));
vi.mock('@/lib/square-commerce', () => ({
  commerce: vi.fn(),
  pickupCapabilities: vi.fn(),
  readOrderAccess: vi.fn(),
}));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: () => null }));
vi.mock('./swipe-back-view', () => ({
  useSwipeBackGestureBlocker: () => ({ beginControlGesture: h.begin, endControlGesture: h.end }),
}));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('expo-symbols', () => ({ SymbolView: () => null }));
const business: BusinessCardData = {
  id: 'cafe & branch/one',
  name: 'Bayou',
  description: '',
  category_summary: 'Coffee',
  offering_search_text: '',
  city: 'Hammond',
  region_code: 'LA',
  created_at: '2026-01-01',
  primary_color: '#176B4D',
  status: 'active',
  business_type: 'food_drink',
  loyalty_programs: [],
  business_photos: null,
  supportsPickupOrdering: true,
};
const target = (label: string) => {
  const matches = h.targets.filter((t) => t.accessibilityLabel === label);
  expect(matches).toHaveLength(1);
  return matches[0]!;
};
// Render actual React components, capture RN host props, and fire their native
// onPress callback. This exercises JS wiring, not an OS touch-dispatch simulation.
beforeEach(() => {
  h.targets = [];
  h.effects = [];
  h.focus = [];
  h.screens = [];
  h.triggers = [];
  h.path = '/order';
  h.signedIn = false;
  h.mode = 'customer';
  h.businesses = [];
  h.services = [];
  vi.clearAllMocks();
  vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');
  vi.useFakeTimers();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
describe('actual pickup entry-point native press wiring', () => {
  it('makes the Discover action a sibling, with one precise encoded order navigation', () => {
    const openBusiness = vi.fn();
    renderToStaticMarkup(
      <BusinessCard business={business} isFollowing={false} onPress={openBusiness} />,
    );
    const order = target('Order ahead');
    expect(order.parent).toBeNull();
    expect(order.accessibilityRole).toBe('button');
    expect(order.disabled).toBe(false);
    order.onPressIn?.();
    expect(h.begin).toHaveBeenCalledOnce();
    order.onPress();
    order.onPress();
    order.onPressOut?.();
    expect(h.end).toHaveBeenCalledOnce();
    expect(h.push).toHaveBeenCalledExactlyOnceWith({
      pathname: '/order',
      params: { businessId: business.id },
    });
    expect(resolveHref(h.push.mock.calls[0]![0])).toBe(
      '/order?businessId=cafe%20%26%20branch%2Fone',
    );
    expect(openBusiness).not.toHaveBeenCalled();
    target('Open Bayou. Order ahead available').onPress();
    expect(openBusiness).toHaveBeenCalledOnce();
    expect(h.push).toHaveBeenCalledOnce();
    expect(order.style({ pressed: true })).toContainEqual({ opacity: 0.82 });
  });
  it.each([false, true])('public business CTA navigates once, signedIn=%s', (signedIn) => {
    h.signedIn = signedIn;
    const state = {
      ...initialPickupModule(business.id),
      supported: true,
      loading: false,
      availability: { available: true, status: 'open' as const },
    };
    renderToStaticMarkup(
      <PickupOrderCtaContent businessId={business.id} state={state} onRefresh={vi.fn()} />,
    );
    const press = target('Order pickup');
    expect(press.parent).toBeNull();
    press.onPress();
    expect(h.push).toHaveBeenCalledExactlyOnceWith({
      pathname: '/order',
      params: { businessId: business.id },
    });
  });
  it('saved-order accessibility activation follows the same native callback', () => {
    const state = {
      ...initialPickupModule(business.id),
      orderId: 'saved/order & 1',
      loading: false,
      failed: true,
    };
    renderToStaticMarkup(
      <PickupOrderCtaContent businessId={business.id} state={state} onRefresh={vi.fn()} />,
    );
    target('View pickup order').onPress();
    expect(resolveHref(h.push.mock.calls[0]![0])).toBe('/order?orderId=saved%2Forder%20%26%201');
  });
  it.each(['closed', 'error'] as const)(
    '%s state refreshes without a dead order action',
    (kind) => {
      const refresh = vi.fn();
      const state = {
        ...initialPickupModule(business.id),
        supported: true,
        loading: false,
        failed: kind === 'error',
        availability: { available: false, status: 'closed' as const },
      };
      renderToStaticMarkup(
        <PickupOrderCtaContent businessId={business.id} state={state} onRefresh={refresh} />,
      );
      expect(h.targets).toHaveLength(1);
      h.targets[0]!.onPress();
      expect(refresh).toHaveBeenCalledOnce();
      expect(h.push).not.toHaveBeenCalled();
    },
  );
  it.each(['unsupported', 'loading', 'production'] as const)(
    'does not expose an enabled action for %s',
    (kind) => {
      if (kind === 'production') vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'production');
      const state = {
        ...initialPickupModule(business.id),
        supported: kind === 'unsupported' ? false : null,
      };
      renderToStaticMarkup(
        <PickupOrderCtaContent businessId={business.id} state={state} onRefresh={vi.fn()} />,
      );
      expect(h.targets).toHaveLength(0);
    },
  );
  it('omits the Discover action when unsupported or production-gated', () => {
    renderToStaticMarkup(
      <BusinessCard
        business={{ ...business, supportsPickupOrdering: false }}
        isFollowing={false}
        onPress={vi.fn()}
      />,
    );
    expect(h.targets.map((t) => t.accessibilityLabel)).not.toContain('Order ahead');
    h.targets = [];
    vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'production');
    renderToStaticMarkup(
      <BusinessCard business={business} isFollowing={false} onPress={vi.fn()} />,
    );
    expect(h.targets.map((t) => t.accessibilityLabel)).not.toContain('Order ahead');
  });
  it('releases the single-tap guard after a synchronous router error', () => {
    h.push.mockImplementationOnce(() => {
      throw Error('unhandled route');
    });
    renderToStaticMarkup(
      <PickupNavigationButton
        label="Order ahead"
        destination={{ pathname: '/order', params: { businessId: business.id } }}
      />,
    );
    const button = target('Order ahead');
    expect(() => button.onPress()).not.toThrow();
    button.onPress();
    expect(h.push).toHaveBeenCalledTimes(2);
  });
  it('bounds a silent navigation failure and permits retry, clearing timers on blur', () => {
    renderToStaticMarkup(
      <PickupNavigationButton
        label="Order ahead"
        destination={{ pathname: '/order', params: { businessId: business.id } }}
      />,
    );
    const cleanup = h.focus[0]!() as () => void;
    const button = target('Order ahead');
    button.onPress();
    button.onPress();
    expect(h.push).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(2500);
    button.onPress();
    expect(h.push).toHaveBeenCalledTimes(2);
    cleanup();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not push a route without an identifier', () => {
    renderToStaticMarkup(
      <PickupNavigationButton
        label="Order ahead"
        destination={{ pathname: '/order', params: { businessId: '' } }}
      />,
    );
    const button = target('Order ahead');
    expect(button.disabled).toBe(true);
    button.onPress();
    expect(h.push).not.toHaveBeenCalled();
  });
});
describe('native router registration and guest guard integration', () => {
  it.each([0, 1, 3])(
    'adds actual bottom tabs for %s eligible service businesses without exceeding five destinations',
    (count) => {
      h.signedIn = true;
      h.mode = 'business';
      h.path = '/businesses';
      h.services = Array.from({ length: count }, (_, i) => ({ id: String(i) }));
      h.businesses = [{ id: 'pickup' }];
      renderToStaticMarkup(<AppTabs />);
      const names = h.triggers.map((t) => t.name);
      expect(names).toContain('businesses');
      expect(names).toContain('staff-scan');
      expect(names).toContain('pickup-orders');
      expect(names.includes('business-appointments')).toBe(count > 0);
      expect(names.includes('business-requests')).toBe(count > 0);
      expect(names.includes('account')).toBe(count === 0);
      expect(names.length).toBeLessThanOrEqual(5);
    },
  );
  it('registers order and service request routes in the root stack, outside the native tabs route group', () => {
    renderToStaticMarkup(<RootNavigator />);
    expect(h.screens.map((s) => s.name)).toEqual([
      '(tabs)',
      'index',
      'notification',
      'business',
      'business-new',
      'listing-plans',
      'staff-invite',
      'auth/callback',
      'b/[slug]',
      'pickup-order',
      'order',
      'book-appointment',
      'appointment',
      'service-request',
      'request-form',
      'service-requests',
      'business-account',
      'event-attendees',
      'business-reviews',
      'my-service-requests',
      'my-event-reviews',
    ]);
    expect(h.screens.find((screen) => screen.name === 'order')?.options).toMatchObject({
      gestureEnabled: true,
      fullScreenGestureEnabled: false,
    });
    expect(existsSync(fileURLToPath(new URL('../app/order.tsx', import.meta.url)))).toBe(true);
    expect(existsSync(fileURLToPath(new URL('../app/(tabs)/order.tsx', import.meta.url)))).toBe(
      false,
    );
    const root = readFileSync(
      fileURLToPath(new URL('../app/_layout.tsx', import.meta.url)),
      'utf8',
    );
    expect(root).toContain('<RootNavigator />');
    expect(root).not.toContain('<AppTabs />');
  });
  it.each([false, true])('does not bounce /order back to Discover, signedIn=%s', (signedIn) => {
    h.signedIn = signedIn;
    renderToStaticMarkup(<AppTabs />);
    h.effects.forEach((effect) => effect());
    expect(h.replace).not.toHaveBeenCalled();
    expect(h.triggers.some((t) => t.name === 'order')).toBe(false);
  });
  it('allows only the exact public order path, retaining private-route protection', () => {
    expect(guestCanOpenPath('/order')).toBe(true);
    expect(guestCanOpenPath('/orders')).toBe(true);
    expect(guestCanOpenPath('/book-appointment')).toBe(true);
    expect(guestCanOpenPath('/appointment')).toBe(true);
    for (const path of [
      '/orders/admin',
      '/order/admin',
      '/appointment/admin',
      '/book-appointment/admin',
      '/business',
      '/businesses',
      '/staff-scan',
    ])
      expect(guestCanOpenPath(path)).toBe(false);
    h.path = '/business';
    renderToStaticMarkup(<RootNavigator />);
    h.effects.forEach((effect) => effect());
    expect(h.replace).toHaveBeenCalledExactlyOnceWith('/explore');
  });
  it.each(['/my-event-reviews', '/my-service-requests'])(
    'opens personal history %s from a business account',
    (path) => {
      h.signedIn = true;
      h.mode = 'business';
      h.path = path;
      renderToStaticMarkup(<RootNavigator />);
      h.effects.forEach((effect) => effect());
      expect(h.replace).not.toHaveBeenCalled();
    },
  );
  it.each(['/my-event-reviews', '/my-service-requests'])(
    'keeps personal history %s protected for guests',
    (path) => {
      h.path = path;
      renderToStaticMarkup(<RootNavigator />);
      h.effects.forEach((effect) => effect());
      expect(h.replace).toHaveBeenCalledExactlyOnceWith('/explore');
    },
  );
});

describe('business order real native controls', () => {
  const order = {
    id: 'order & one',
    number: 'S-123456ABCDEF',
    status: 'placed',
    version: 3,
    businessName: 'Cafe',
    pickupAt: '2026-09-21T15:00Z',
    timezone: 'America/Chicago',
    createdAt: '2026-09-21T14:00Z',
    items: [{ name: 'Coffee', quantity: '1' }],
    total: 500,
    currency: 'USD',
  } as PickupOrder;
  it('pushes the exact root detail route from the actual order card', () => {
    renderToStaticMarkup(<PickupOrderCard order={order} now={Date.parse('2026-09-21T14:00Z')} />);
    h.targets[0]!.onPress();
    expect(h.push).toHaveBeenCalledExactlyOnceWith({
      pathname: '/pickup-order',
      params: { orderId: order.id },
    });
  });
  it.each([false, true])(
    'fulfillment next action is available to operators; canRefund=%s',
    (canRefund) => {
      const next = vi.fn(),
        refund = vi.fn();
      renderToStaticMarkup(
        <FulfillmentActions
          order={order}
          canRefund={canRefund}
          busy={false}
          onTransition={next}
          onRefund={refund}
        />,
      );
      target('Accept order').onPress();
      expect(next).toHaveBeenCalledExactlyOnceWith('accepted');
      expect(h.targets.some((t) => t.accessibilityLabel === 'Cancel & refund in full')).toBe(
        canRefund,
      );
    },
  );
  it('disables fulfillment after a refresh error without claiming an action is loading', () => {
    const markup = renderToStaticMarkup(
      <FulfillmentActions
        order={order}
        canRefund
        busy={false}
        disabled
        onTransition={vi.fn()}
        onRefund={vi.fn()}
      />,
    );
    expect(target('Accept order').disabled).toBe(true);
    expect(target('Cancel & refund in full').disabled).toBe(true);
    expect(markup).not.toContain('<progress');
  });
  it.each(['payment_review', 'refund_pending', 'refund_failed'])(
    'does not offer fulfillment in %s',
    (status) => {
      renderToStaticMarkup(
        <FulfillmentActions
          order={{ ...order, status }}
          canRefund={false}
          busy={false}
          onTransition={vi.fn()}
          onRefund={vi.fn()}
        />,
      );
      expect(h.targets).toHaveLength(0);
    },
  );
  it.each([
    ['owner', true, 'business', 1, true],
    ['staff', true, 'business', 2, true],
    ['inactive staff', true, 'business', 0, false],
    ['customer', true, 'customer', 1, false],
    ['guest', false, 'business', 1, false],
    ['no enabled business', true, 'business', 0, false],
  ])('Orders tab visibility: %s', (_role, signedIn, mode, count, visible) => {
    h.signedIn = signedIn as boolean;
    h.mode = mode as string;
    h.path = '/businesses';
    h.businesses = Array.from({ length: Number(count) }, (_, i) => ({ id: String(i) }));
    renderToStaticMarkup(<AppTabs />);
    const trigger = h.triggers.find((t) => t.name === 'pickup-orders');
    expect(!!trigger).toBe(visible);
    if (trigger) expect(trigger.hidden).not.toBe(true);
  });
  it('redirects disabled current inbox to Manage with an explanation', () => {
    h.signedIn = true;
    h.mode = 'business';
    h.path = '/pickup-orders';
    renderToStaticMarkup(<AppTabs />);
    h.effects.forEach((f) => f());
    expect(h.replace).toHaveBeenCalledWith({
      pathname: '/businesses',
      params: { pickupNotice: expect.stringContaining('no longer enabled') },
    });
    expect(h.triggers.find((t) => t.name === 'pickup-orders')?.hidden).not.toBe(true);
  });
  it('badges business Orders with requests across accessible businesses', () => {
    h.signedIn = true;
    h.mode = 'business';
    h.path = '/businesses';
    h.businesses = [
      { id: 'one', counts: { requests: 2 } },
      { id: 'two', counts: { requests: 1 } },
    ];
    renderToStaticMarkup(<AppTabs />);
    const children = h.triggers.find((t) => t.name === 'pickup-orders')?.children as {
      props?: { children?: unknown };
    }[];
    expect(children[1]).toMatchObject({ props: {} }); // Empty native badge is the requested indicator dot.
    expect(children[1]?.props?.children).toBeUndefined();
  });
  it.each(['paused', 'no_slots', 'unavailable'] as const)(
    'never navigates from non-actionable public state %s',
    (status) => {
      renderToStaticMarkup(
        <PickupOrderCtaContent
          businessId="cafe"
          state={{
            ...initialPickupModule('cafe'),
            supported: true,
            loading: false,
            failed: status === 'unavailable',
            availability: { available: false, status },
          }}
          onRefresh={vi.fn()}
        />,
      );
      h.targets.forEach((t) => t.onPress());
      expect(h.push).not.toHaveBeenCalled();
    },
  );
  it('paused Discover has no enabled order action', () => {
    renderToStaticMarkup(
      <BusinessCard
        business={{ ...business, pickupStatus: 'paused' }}
        isFollowing={false}
        onPress={vi.fn()}
      />,
    );
    expect(h.targets.some((t) => t.accessibilityLabel === 'Order ahead')).toBe(false);
  });
});

it('shows a visible customer Orders tab for guests and signed-in customers in staging', () => {
  vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');
  for (const signedIn of [false, true]) {
    h.signedIn = signedIn;
    h.mode = 'customer';
    h.path = '/orders';
    h.triggers = [];
    h.effects = [];
    renderToStaticMarkup(<AppTabs />);
    expect(h.triggers.find((t) => t.name === 'orders')?.hidden).not.toBe(true);
    expect(h.triggers.some((t) => t.name === 'orders')).toBe(true);
  }
  vi.unstubAllEnvs();
});

const compactOrder = {
  id: 'compact-order',
  businessId: 'business-one',
  status: 'ready',
  version: 1,
} as PickupOrder;
it.each([true, false])(
  'compact pickup footer routes to scan and respects refund permissions: owner=%s',
  (owner) => {
    const more = vi.fn();
    const refund = vi.fn();
    const transition = vi.fn();
    const html = renderToStaticMarkup(
      <FulfillmentActions
        order={{ ...compactOrder, status: 'ready' }}
        canRefund={owner}
        busy={false}
        onTransition={transition}
        onRefund={refund}
        onMore={more}
      />,
    );
    target('Scan to confirm pickup').onPress();
    expect(h.push).toHaveBeenCalledWith({
      pathname: '/staff-scan',
      params: { businessId: compactOrder.businessId },
    });
    expect(transition).not.toHaveBeenCalled();
    expect(refund).not.toHaveBeenCalled();
    expect(html).not.toContain('Refund remaining payment');
    expect(h.targets.some((t) => t.accessibilityLabel === 'Order actions')).toBe(owner);
    if (owner) {
      target('Order actions').onPress();
      expect(more).toHaveBeenCalledOnce();
    }
  },
);
it('compact actions are disabled while the order cannot be refreshed', () => {
  renderToStaticMarkup(
    <FulfillmentActions
      order={{ ...compactOrder, status: 'ready' }}
      canRefund
      busy={false}
      disabled
      onTransition={vi.fn()}
      onRefund={vi.fn()}
      onMore={vi.fn()}
    />,
  );
  expect(target('Scan to confirm pickup').disabled).toBe(true);
  expect(target('Order actions').disabled).toBe(true);
});
