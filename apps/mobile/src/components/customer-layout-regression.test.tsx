import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { Colors } from '@/constants/theme';
import { DiscoveryHomeHeader } from './discovery-home-header';
import { DiscoverySearchBar } from './discovery-search-bar';
import { AppChrome } from './app-chrome';
import { BusinessReviewSection } from './pickup/business-review-section';

const state = vi.hoisted(() => ({ scheme: 'light' as 'light' | 'dark', reviews: false, index: 0 }));
const reviews = vi.hoisted(() => [
  {
    id: 'first',
    source: 'event',
    event_title:
      'Seasonal flower arranging — weekend edition with local growers and garden designers',
    rating: 4,
    review_text:
      '[Demo review] A lovely neighborhood outing. Clear instructions and plenty of time to ask questions.',
    merchant_response:
      'Thank you for joining our demo event. We look forward to welcoming you again!',
    created_at: '2026-09-26T12:00:00Z',
  },
  {
    id: 'second',
    source: 'event',
    event_title: 'Seasonal flower arranging — weekend edition',
    rating: 5,
    review_text:
      '[Demo review] Friendly hosts and a thoughtful selection. I would come back for the next session.',
    merchant_response:
      'Thank you for joining our demo event. We look forward to welcoming you again!',
    created_at: '2026-09-26T12:00:00Z',
  },
]);
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (initial: unknown) =>
      actual.useState(state.reviews && state.index++ === 0 ? reviews : initial),
  };
});
vi.mock('react-native', async () => await vi.importActual('react-native-web'));
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
}));
vi.mock('expo-symbols', async () => ({
  SymbolView: (await import('../test/visual-symbol')).VisualSymbol,
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() } }));
vi.mock('expo-image', () => ({ Image: () => null }));
vi.mock('react-native-safe-area-context', async () => ({
  SafeAreaView: (await vi.importActual<typeof import('react-native-web')>('react-native-web')).View,
}));
vi.mock('react-native-gesture-handler', async () => ({
  GestureHandlerRootView: (
    await vi.importActual<typeof import('react-native-web')>('react-native-web')
  ).View,
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => state.scheme }));
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ session: { user: { id: 'fixture' } } }),
}));
vi.mock('@/providers/app-mode-provider', () => ({ useAppMode: () => ({ mode: 'customer' }) }));
vi.mock('@/providers/notification-provider', () => ({
  useNotifications: () => ({ unreadCount: 3, refreshUnreadCount: vi.fn() }),
}));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/haptics', () => ({ haptics: { selection: vi.fn() } }));
vi.mock('./mode-switch', () => ({ ModeSwitch: () => null }));
vi.mock('./alerts-inbox', () => ({ AlertsInboxHeader: () => null, AlertsInboxList: () => null }));

it('renders the actual alerts control within Home and full event review details for layout checks', async () => {
  const { StyleSheet } = await import('react-native');
  for (const scheme of ['light', 'dark'] as const) {
    state.scheme = scheme;
    for (const screen of ['home', 'reviews'] as const) {
      state.reviews = screen === 'reviews';
      state.index = 0;
      const body = renderToStaticMarkup(
        screen === 'home' ? (
          <DiscoveryHomeHeader
            area="Hammond, LA"
            onChooseArea={() => {}}
            actions={<AppChrome inline />}
          >
            <DiscoverySearchBar onBrandSurface query="" onQuery={() => {}} onFilters={() => {}} />
          </DiscoveryHomeHeader>
        ) : (
          <BusinessReviewSection
            businessId="fixture"
            summary={{ averageRating: 4.5, reviewCount: 2 }}
          />
        ),
      );
      if (screen === 'home') {
        expect(body).toContain('Alerts, 3 unread');
        expect(body.indexOf('Parish Pass')).toBeLessThan(body.indexOf('Alerts, 3 unread'));
        expect(body.indexOf('Alerts, 3 unread')).toBeLessThan(
          body.indexOf('Discover your parish.'),
        );
      } else {
        expect(body).toContain(reviews[0]!.event_title);
        expect(body).toContain('4 out of 5 stars');
        expect(body).toContain('Business response');
      }
      if (process.env.LAYOUT_FIX_RENDER_DIR) {
        const dir = resolve(process.env.LAYOUT_FIX_RENDER_DIR);
        mkdirSync(dir, { recursive: true });
        const sheet = (StyleSheet as unknown as { getSheet(): { textContent: string } }).getSheet()
          .textContent;
        writeFileSync(
          `${dir}/${screen}-${scheme}.html`,
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${sheet}body{margin:0;padding:20px;background:${Colors[scheme].background}}[dir=auto],input{font-family:Arial,sans-serif!important}</style></head><body>${body}</body></html>`,
        );
      }
    }
  }
});
