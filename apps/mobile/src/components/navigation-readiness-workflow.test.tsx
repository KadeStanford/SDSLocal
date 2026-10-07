import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootNavigator } from './root-navigator';

const h = vi.hoisted(() => ({
  path: '/explore',
  signedIn: false,
  loading: false,
  modeLoading: false,
  mode: 'customer' as 'customer' | 'business',
  effects: [] as (() => void)[],
  replace: vi.fn(),
  screens: [] as string[],
}));
vi.mock('react', async () => ({
  ...(await vi.importActual('react')),
  useEffect: (effect: () => void) => {
    h.effects.push(effect);
  },
}));
vi.mock('expo-router', () => ({
  usePathname: () => h.path,
  router: { replace: h.replace },
  Stack: Object.assign(
    ({ children }: { children: ReactNode }) => createElement('div', null, children),
    {
      Screen: ({ name }: { name: string }) => {
        h.screens.push(name);
        return null;
      },
    },
  ),
}));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    session: h.signedIn ? { user: { id: 'offline-user' } } : null,
    loading: h.loading,
  }),
}));
vi.mock('@/providers/app-mode-provider', () => ({
  useAppMode: () => ({ mode: h.mode, loading: h.modeLoading }),
}));
function navigate(path: string) {
  h.path = path;
  h.screens = [];
  renderToStaticMarkup(<RootNavigator />);
  h.effects.splice(0).forEach((effect) => effect());
}
beforeEach(() => {
  h.signedIn = false;
  h.loading = false;
  h.modeLoading = false;
  h.mode = 'customer';
  h.effects = [];
  h.replace.mockReset();
});
describe('readiness workflow: interrupted navigation and role switching', () => {
  it('waits for both session and saved-mode restoration before applying guards', () => {
    h.loading = true;
    navigate('/business');
    expect(h.replace).not.toHaveBeenCalled();
    h.loading = false;
    h.modeLoading = true;
    navigate('/business');
    expect(h.replace).not.toHaveBeenCalled();
    h.modeLoading = false;
    navigate('/business');
    expect(h.replace).toHaveBeenCalledExactlyOnceWith('/explore');
  });
  it('supports guest public discovery, existing guest orders, booking, and confirmation links', () => {
    for (const path of [
      '/explore',
      '/calendar',
      '/b/bayou-bites',
      '/orders',
      '/order',
      '/book-appointment',
      '/appointment',
      '/auth/callback',
    ])
      navigate(path);
    expect(h.replace).not.toHaveBeenCalled();
    expect(h.screens).toEqual(
      expect.arrayContaining(['order', 'appointment', 'auth/callback', 'business-new']),
    );
  });
  it('redirects a signed-out owner from private tools while preserving public access', () => {
    h.signedIn = true;
    h.mode = 'business';
    navigate('/business');
    expect(h.replace).not.toHaveBeenCalled();
    h.signedIn = false;
    navigate('/business');
    expect(h.replace).toHaveBeenCalledWith('/explore');
    h.replace.mockClear();
    navigate('/order');
    expect(h.replace).not.toHaveBeenCalled();
  });
  it('handles repeated customer/business mode changes without redirecting shared account or order details', () => {
    h.signedIn = true;
    navigate('/businesses');
    expect(h.replace).toHaveBeenLastCalledWith('/explore');
    h.mode = 'business';
    navigate('/explore');
    expect(h.replace).toHaveBeenLastCalledWith('/businesses');
    h.replace.mockClear();
    navigate('/account');
    navigate('/order');
    expect(h.replace).not.toHaveBeenCalled();
    h.mode = 'customer';
    navigate('/pickup-orders');
    expect(h.replace).toHaveBeenLastCalledWith('/explore');
  });
});
