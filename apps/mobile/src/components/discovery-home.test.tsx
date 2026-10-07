import { CarouselIndicators, carouselPosition } from './discovery-carousel';
import { DiscoverySearchBar } from './discovery-search-bar';
import { DiscoveryAutocomplete } from './discovery-autocomplete';
import type { DiscoverySuggestion } from '@/lib/discovery-autocomplete';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { buildDiscoveryFeed, type DiscoveryFeedPlan } from '@/lib/discovery-feed';
import { isBusinessOpenNow } from '@/lib/discovery-core';
import { resolve } from 'node:path';
import { AppRegistry, View } from 'react-native-web';
import { StyleSheet } from 'react-native';
import { themeColors } from '@sds/design-tokens';
import { afterEach, expect, it, vi } from 'vitest';
import { DiscoveryHomeHeader } from './discovery-home-header';
import { DiscoveryShortcuts } from './discovery-shortcuts';
import { DiscoveryBusinessFeed } from './discovery-business-feed';
import type { BusinessCardData } from './business-card';
import { ThemedText } from './themed-text';

const state = vi.hoisted(() => ({
  scheme: 'dark' as 'dark' | 'light',
  targets: [] as {
    accessibilityLabel?: string;
    accessibilityState?: { checked?: boolean };
    disabled?: boolean;
    onPress?: () => void;
  }[],
}));
vi.mock('../../assets/branding/parish-pass/icon-light.png', () => ({
  default: { uri: 'data:image/png;base64,' },
}));
vi.mock('../../assets/branding/parish-pass/icon-dark.png', () => ({
  default: { uri: 'data:image/png;base64,' },
}));
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native-web')>('react-native-web');
  return {
    ...web,
    Pressable: (props: Record<string, unknown> & { children: ReactNode; style?: unknown }) => {
      state.targets.push(props as (typeof state.targets)[number]);
      const style =
        typeof props.style === 'function' ? props.style({ pressed: false }) : props.style;
      return createElement(web.View, { style }, props.children);
    },
  };
});
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => state.scheme }));
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
}));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors[state.scheme] }));
vi.mock('./swipe-back-view', () => ({
  useSwipeBackGestureBlocker: () => ({
    beginControlGesture: () => {},
    endControlGesture: () => {},
  }),
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('@/components/app-icon', async () => ({
  AppIcon: (await import('../test/visual-symbol')).VisualSymbol,
}));
vi.mock('expo-image', () => ({
  Image: ({
    source,
    style,
    contentFit,
  }: {
    source: { uri: string };
    style: object;
    contentFit: string;
  }) =>
    createElement('img', {
      src: source.uri,
      alt: '',
      style: { ...StyleSheet.flatten(style), objectFit: contentFit },
    }),
}));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: (path: string) => path }));

const sample: BusinessCardData = {
  id: 'cafe',
  name: 'Bayou & Bloom Cafe',
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
};

it('autocomplete selects the correct business, item, service or event target', () => {
  const onSelect = vi.fn();
  const onSeeResults = vi.fn();
  const suggestions: DiscoverySuggestion[] = (
    ['business', 'item', 'service', 'event'] as const
  ).map((kind) => ({
    id: kind,
    kind,
    title: `Example ${kind}`,
    subtitle: 'Sample business',
    businessId: 'business-1',
    targetId: `target-${kind}`,
    score: 100,
  }));
  const html = renderToStaticMarkup(
    createElement(DiscoveryAutocomplete, { suggestions, loading: false, onSelect, onSeeResults }),
  );
  for (const heading of ['Businesses', 'Items', 'Services', 'Events'])
    expect(html).toContain(heading);
  expect(html).toContain('discovery-suggestion-scroll');
  for (const suggestion of suggestions) {
    expect(html).toContain(suggestion.title);
    state.targets
      .find((t) => t.accessibilityLabel?.startsWith(suggestion.title + '.'))
      ?.onPress?.();
    expect(onSelect).toHaveBeenLastCalledWith(suggestion);
  }
  state.targets.at(-1)?.onPress?.();
  expect(onSeeResults).toHaveBeenCalledOnce();
});

it('autocomplete uses the parent business logo for each result type', () => {
  const html = renderToStaticMarkup(
    createElement(DiscoveryAutocomplete, {
      suggestions: [
        {
          id: 'event',
          kind: 'event',
          title: 'Coffee tasting',
          subtitle: 'Bayou Cafe',
          businessId: 'cafe',
          businessName: 'Bayou Cafe',
          businessPhotos: [
            {
              role: 'logo',
              media_assets: { status: 'ready', storage_path: 'https://example.test/cafe-logo.png' },
            },
          ],
          targetId: 'event',
          score: 100,
        },
      ],
      loading: false,
      onSelect: () => {},
      onSeeResults: () => {},
    }),
  );
  expect(html).toContain('https://example.test/cafe-logo.png');
  expect(html).toContain('Events');
});

it('autocomplete explains loading and no-match states', () => {
  const render = (loading: boolean) =>
    renderToStaticMarkup(
      createElement(DiscoveryAutocomplete, {
        suggestions: [],
        loading,
        onSelect: () => {},
        onSeeResults: () => {},
      }),
    );
  expect(render(true)).toContain('Checking menus and services');
  expect(render(false)).toContain('No close matches yet');
});
afterEach(() => {
  state.targets = [];
  vi.unstubAllEnvs();
});

it.each(['light', 'dark'] as const)(
  'area and quick filters preserve their callbacks in %s',
  (scheme) => {
    state.scheme = scheme;
    const choose = vi.fn(),
      change = vi.fn();
    renderToStaticMarkup(
      <>
        <DiscoveryHomeHeader area="Hammond" onChooseArea={choose} />
        <DiscoveryShortcuts value="rewards" pickupEnabled onChange={change} />
      </>,
    );
    state.targets.find((target) => target.accessibilityLabel?.includes('Choose an area'))!
      .onPress!();
    expect(choose).toHaveBeenCalledOnce();
    expect(
      state.targets.find((target) => target.accessibilityLabel === 'Rewards')!.accessibilityState
        ?.checked,
    ).toBe(true);
    state.targets.find((target) => target.accessibilityLabel === 'Order ahead')!.onPress!();
    expect(change).toHaveBeenCalledExactlyOnceWith('accepting-pickup');
  },
);
it('hides ordering outside pickup-enabled environments and disables return-preview controls', () => {
  renderToStaticMarkup(
    <DiscoveryShortcuts value="all" pickupEnabled={false} onChange={vi.fn()} interactive={false} />,
  );
  expect(state.targets.some((target) => target.accessibilityLabel === 'Order ahead')).toBe(false);
  expect(state.targets.every((target) => target.disabled)).toBe(true);
});
it('renders each business once with events between the first three and the remaining businesses', () => {
  const open = vi.fn();
  const businesses = Array.from({ length: 5 }, (_, index) => ({
    ...sample,
    id: String(index),
    name: `Business ${index}`,
  }));
  const html = renderToStaticMarkup(
    <DiscoveryBusinessFeed businesses={businesses} followingIds={new Set()} onOpenBusiness={open}>
      <ThemedText>Coming up</ThemedText>
    </DiscoveryBusinessFeed>,
  );
  for (let index = 0; index < 5; index++) expect(html.split(`>Business ${index}<`)).toHaveLength(2);
  expect(html.indexOf('Coming up')).toBeGreaterThan(html.indexOf('>Business 2<'));
  expect(html.indexOf('Coming up')).toBeLessThan(html.indexOf('>Business 3<'));
  state.targets.find((target) => target.accessibilityLabel === 'Open Business 4')!.onPress!();
  expect(open).toHaveBeenCalledExactlyOnceWith('4');
});

function Gallery() {
  const colors = themeColors[state.scheme];
  return (
    <View style={{ backgroundColor: colors.background, padding: 20, gap: 18 }}>
      <DiscoveryHomeHeader area="Hammond, Louisiana" onChooseArea={() => {}}>
        <DiscoverySearchBar query="" onQuery={() => {}} onFilters={() => {}} />
      </DiscoveryHomeHeader>
      <DiscoveryShortcuts value="all" pickupEnabled onChange={() => {}} />
      <DiscoveryBusinessFeed
        businesses={[
          {
            ...sample,
            business_photos: [
              {
                role: 'cover',
                media_assets: {
                  storage_path:
                    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
                  status: 'ready',
                },
              },
            ],
            supportsPickupOrdering: true,
          },
          { ...sample, id: 'long', name: 'Magnolia & Main Kitchen' },
          {
            ...sample,
            id: 'care',
            name: 'Cypress & Co Home Care',
            category_summary: 'Home services',
            business_type: 'services',
          },
        ]}
        followingIds={new Set()}
        onOpenBusiness={() => {}}
      />
    </View>
  );
}
it('renders the actual home components in both themes for visual review', () => {
  vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');
  AppRegistry.registerComponent('ParishReview', () => Gallery);
  for (const scheme of ['light', 'dark'] as const) {
    state.scheme = scheme;
    const { element, getStyleElement } = AppRegistry.getApplication('ParishReview', {});
    const html = `<!doctype html><html><head><meta charset="utf-8">${renderToStaticMarkup(getStyleElement())}<style>[dir=auto],input{font-family:Arial,sans-serif!important}body{margin:0;background:${themeColors[scheme].background}}#root{max-width:430px;margin:auto}</style></head><body><div id="root">${renderToStaticMarkup(element)}</div></body></html>`;
    expect(html).toContain('Parish Pass');
    if (process.env.UI_RENDER_DIR) {
      mkdirSync(process.env.UI_RENDER_DIR, { recursive: true });
      writeFileSync(resolve(process.env.UI_RENDER_DIR, `parish-${scheme}.html`), html);
    }
  }
});

it('keeps discovery search clearing and filters actionable', () => {
  const query = vi.fn();
  const filters = vi.fn();
  renderToStaticMarkup(
    <DiscoverySearchBar query="coffee" onQuery={query} onFilters={filters} active={1} />,
  );
  state.targets.find((t) => t.accessibilityLabel === 'Clear search')!.onPress!();
  state.targets.find((t) => t.accessibilityLabel === 'Filters (1)')!.onPress!();
  expect(query).toHaveBeenCalledExactlyOnceWith('');
  expect(filters).toHaveBeenCalledExactlyOnceWith();
});

// Expanded local review catalog; names, ratings, logos, locations, and schedules are fixtures only.
const reviewLogo = (kind: string, label: string, color: string) => {
  if (kind === 'cafe' || kind === 'services')
    return `data:image/svg+xml;base64,${Buffer.from(readFileSync(resolve(import.meta.dirname, `../test/fixtures/discovery/${kind}.svg`), 'utf8')).toString('base64')}`;
  const shapes =
    kind === 'mobile'
      ? '<path d="M20 38h63v39H20zM83 49h15l12 15v13H83"/><circle cx="37" cy="82" r="8"/><circle cx="91" cy="82" r="8"/><path d="M31 48h36v16H31z"/>'
      : kind === 'shop'
        ? '<path d="M35 45h58l5 42H30zM47 45V32a17 17 0 0 1 34 0v13"/>'
        : '<path d="M35 25v30m10-30v30m10-30v30M35 49q10 19 20 0M45 64v25M84 25v64M84 25q-24 21 0 37"/>';
  return `data:image/svg+xml;base64,${Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="${color}"/><g fill="none" stroke="#F4F2E9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${shapes}</g><text x="64" y="111" font-family="Arial" font-size="8" text-anchor="middle" fill="#F4F2E9">${label}</text></svg>`).toString('base64')}`;
};
function reviewBusinesses(): BusinessCardData[] {
  const create = (
    id: string,
    name: string,
    type: string,
    category: string,
    offering: string,
    photo: string,
    logoKind: string,
    color: string,
    opens: string,
    closes: string,
  ): BusinessCardData => ({
    ...sample,
    id,
    name,
    business_type: type,
    category_summary: category,
    offering_search_text: offering,
    timezone: 'America/Chicago',
    distanceMiles: id === 'cafe' ? 0.4 : id === 'services' ? 1.2 : 0.8,
    hours: [{ day_of_week: 2, opens_at: opens, closes_at: closes, is_closed: false }],
    supportsPickupOrdering: type === 'food_drink' || type === 'mobile',
    has_active_rewards: id === 'cafe' || id === 'mobile',
    loyalty_programs: id === 'cafe' || id === 'mobile' ? [{ id: 'sample', is_active: true }] : [],
    reviewSummary: {
      averageRating: id === 'cafe' ? 4.9 : 4.8,
      reviewCount: id === 'cafe' ? 128 : 42,
    },
    business_photos: [
      {
        role: 'cover',
        media_assets: {
          storage_path: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=800&q=80`,
          status: 'ready',
        },
      },
      {
        role: 'logo',
        media_assets: {
          storage_path: reviewLogo(logoKind, name.toUpperCase().replace(/&/g, '&amp;'), color),
          status: 'ready',
        },
      },
    ],
    ...(type === 'mobile'
      ? {
          stops: [
            {
              starts_at: '2026-09-29T16:00:00Z',
              ends_at: '2026-09-29T19:00:00Z',
              is_published: true,
              latitude: 30.501,
              longitude: -90.461,
            },
          ],
        }
      : {}),
  });
  const retail = JSON.parse(
    readFileSync(
      resolve(import.meta.dirname, '../../../../supabase/seed/discovery-retail.json'),
      'utf8',
    ),
  ) as {
    id: string;
    name: string;
    category: string;
    description: string;
    photo: string;
    color: string;
  }[];
  return [
    ...retail.map((b) =>
      create(
        b.id,
        b.name,
        'retail',
        b.category,
        b.description,
        b.photo,
        'shop',
        b.color,
        '09:00',
        '19:00',
      ),
    ),
    create(
      'cafe',
      'Bayou & Bloom Cafe',
      'food_drink',
      'Coffee, brunch, pastries',
      'Breakfast biscuit, half muffuletta sandwich, seasonal latte',
      'photo-1554118811-1e0d58224f24',
      'cafe',
      '#305747',
      '07:00',
      '15:00',
    ),
    create(
      'kitchen',
      'Cane & Clove Kitchen',
      'food_drink',
      'Southern plates, seasonal cocktails, dessert',
      'Lunch salad, smoked chicken supper, blackened catfish',
      'photo-1517248135467-4c7edcad34c4',
      'food',
      '#783E2D',
      '11:00',
      '21:00',
    ),
    create(
      'services',
      'Cypress & Co Home Care',
      'services',
      'Home services, repairs, maintenance',
      'Home refresh, repair visit',
      'photo-1600585154340-be6161a56a0c',
      'services',
      '#294859',
      '08:00',
      '17:00',
    ),
    create(
      'mobile',
      'Roaming Roots Food Truck',
      'mobile',
      'Food trucks, mobile food, catering',
      'Citrus grain bowl, pressed sandwich, cold brew',
      'photo-1565123409695-7b5ef63a2efb',
      'mobile',
      '#7F492C',
      '11:00',
      '14:00',
    ),
    create(
      'cafe-2',
      'Oak Street Coffee',
      'food_drink',
      'Coffee, breakfast',
      'Breakfast bagels, espresso, pastries',
      'photo-1501339847302-ac426a4a7cbb',
      'food',
      '#436653',
      '06:00',
      '16:00',
    ),
    create(
      'cafe-3',
      'Morning Bell Bakery',
      'food_drink',
      'Breakfast, bakery',
      'Breakfast croissant, latte, pastries',
      'photo-1517433367423-c7e5b0f35086',
      'shop',
      '#8C6243',
      '06:30',
      '15:00',
    ),
    create(
      'kitchen-2',
      'Magnolia & Main Kitchen',
      'food_drink',
      'Southern plates',
      'Lunch sandwich, dinner seafood, grilled chicken',
      'photo-1414235077428-338989a2e8c0',
      'food',
      '#543E43',
      '11:00',
      '22:00',
    ),
    create(
      'kitchen-3',
      'The Courtyard Table',
      'food_drink',
      'Restaurant',
      'Lunch salad, dinner pasta, seasonal seafood',
      'photo-1555396273-367ea4eb4db5',
      'food',
      '#436653',
      '11:00',
      '21:30',
    ),
    create(
      'services-2',
      'Porchlight Home Services',
      'services',
      'Home services, repairs',
      'Home maintenance, repair visit',
      'photo-1600047509807-ba8f99d2cdde',
      'shop',
      '#785844',
      '08:00',
      '18:00',
    ),
    create(
      'services-3',
      'Parish Garden Care',
      'services',
      'Home services, landscaping',
      'Lawn care, seasonal garden maintenance',
      'photo-1416879595882-3373a0480b5b',
      'shop',
      '#436653',
      '08:00',
      '17:00',
    ),
    create(
      'mobile-2',
      'Bayou Bowl Truck',
      'mobile',
      'Food trucks',
      'Rice bowls, lunch, street food',
      'photo-1504674900247-0877df9cc836',
      'mobile',
      '#436653',
      '11:00',
      '14:00',
    ),
    create(
      'mobile-3',
      'Rolling Fork Kitchen',
      'mobile',
      'Food trucks',
      'Lunch tacos, sandwiches',
      'photo-1565299624946-b28f40a0ae38',
      'mobile',
      '#543E43',
      '11:00',
      '14:00',
    ),
    create(
      'shop-2',
      'Common Ground Goods',
      'retail',
      'Gifts, home goods',
      'Local gifts, handmade home goods',
      'photo-1473181488821-2d23949a045a',
      'shop',
      '#436653',
      '10:00',
      '18:00',
    ),
    create(
      'shop',
      'Lantern Row Market',
      'retail',
      'Gifts, home goods, local makers',
      'Handmade gifts, home goods',
      'photo-1441986300917-64674bd600d8',
      'shop',
      '#294859',
      '10:00',
      '18:00',
    ),
  ];
}
const scenarios = [
  { id: 'morning', title: 'Tuesday · 8:00 AM', at: '2026-09-29T13:00:00Z' },
  { id: 'lunch', title: 'Tuesday · 12:15 PM', at: '2026-09-29T17:15:00Z' },
  { id: 'dinner', title: 'Tuesday · 6:00 PM', at: '2026-09-29T23:00:00Z' },
  { id: 'retail', title: 'Shopping & flowers · category review', at: '2026-09-29T20:00:00Z' },
  { id: 'rain', title: 'Rainy morning · weather simulation', at: '2026-09-29T13:00:00Z' },
] as const;
it('renders time-aware Home with the production planner and components', () => {
  vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');
  for (const scenario of scenarios)
    for (const scheme of ['light', 'dark'] as const) {
      state.scheme = scheme;
      const businesses = reviewBusinesses();
      const now = new Date(scenario.at);
      const generatedPlan = buildDiscoveryFeed(businesses, {
        now,
        timeZone: 'America/Chicago',
        coordinates: { latitude: 30.5, longitude: -90.46 },
        visit: scenario.id,
        ...(scenario.id === 'rain'
          ? {
              weather: {
                observedAt: scenario.at,
                latitude: 30.5,
                longitude: -90.46,
                condition: 'rain' as const,
                temperatureC: 21,
              },
            }
          : {}),
      });
      const plan =
        scenario.id === 'retail'
          ? {
              ...generatedPlan,
              sections: generatedPlan.filters
                .filter((f) => ['boutiques', 'clothing', 'gifts', 'florists'].includes(f.id))
                .map((f) => ({ ...f, layout: 'compact' as const })),
            }
          : generatedPlan;
      // Fixture presentation uses the same hour calculation as the discovery request.
      businesses.forEach((b) =>
        Object.assign(b, { isOpenNow: isBusinessOpenNow(b.hours ?? [], now, b.timezone) }),
      );
      const Gallery = () => (
        <View style={{ padding: 20, gap: 24, backgroundColor: themeColors[scheme].background }}>
          <DiscoveryHomeHeader area="Hammond, LA" onChooseArea={() => {}}>
            <DiscoverySearchBar query="" onQuery={() => {}} onFilters={() => {}} />
          </DiscoveryHomeHeader>
          <DiscoveryBusinessFeed
            businesses={businesses}
            plan={plan}
            followingIds={new Set()}
            onOpenBusiness={() => {}}
            onCollectionChange={() => {}}
          />
        </View>
      );
      AppRegistry.registerComponent('ContextHome', () => Gallery);
      const { element, getStyleElement } = AppRegistry.getApplication('ContextHome', {});
      const html = `<!doctype html><html><head><meta charset="utf-8">${renderToStaticMarkup(getStyleElement())}<style>[dir=auto],input{font-family:Arial,sans-serif!important}body{margin:0;background:${themeColors[scheme].background}}#root{max-width:430px;margin:auto}</style></head><body><div id="root">${renderToStaticMarkup(element)}</div></body></html>`;
      if (scenario.id !== 'retail')
        expect(plan.sections[0]?.id).toBe(
          scenario.id === 'morning'
            ? 'breakfast'
            : scenario.id === 'rain'
              ? 'rain-coffee'
              : scenario.id,
        );
      if (process.env.DISCOVERY_CONTEXT_RENDER_DIR) {
        const dir = process.env.DISCOVERY_CONTEXT_RENDER_DIR;
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, `${scenario.id}-${scheme}.html`), html);
        writeFileSync(
          resolve(dir, `${scenario.id}.json`),
          JSON.stringify({ title: scenario.title, plan }, null, 2),
        );
      }
    }
});

it('section controls use the full matching set and preserve business actions', () => {
  const businesses = reviewBusinesses();
  const plan: DiscoveryFeedPlan = buildDiscoveryFeed(businesses, {
    now: new Date('2026-09-29T13:00:00Z'),
    visit: 'test',
    timeZone: 'America/Chicago',
  });
  const change = vi.fn(),
    open = vi.fn();
  const html = renderToStaticMarkup(
    <DiscoveryBusinessFeed
      businesses={businesses}
      plan={plan}
      collection="services"
      followingIds={new Set()}
      onOpenBusiness={open}
      onCollectionChange={change}
    />,
  );
  expect(html).toContain('Cypress &amp; Co Home Care');
  expect(html).not.toContain('Bayou &amp; Bloom Cafe');
  expect(html).toContain('Porchlight Home Services');
  expect(html).toContain('discovery-carousel-services');
  state.targets.find((t) => t.accessibilityLabel?.startsWith('Open Cypress'))!.onPress!();
  expect(open).toHaveBeenCalledExactlyOnceWith('services');
});

it('updates carousel position and renders bounded, accessible indicators', () => {
  expect(carouselPosition(0, 320, 3)).toBe(0);
  expect(carouselPosition(320, 320, 3)).toBe(1);
  expect(carouselPosition(9999, 320, 3)).toBe(2);
  expect(carouselPosition(-40, 320, 3)).toBe(0);
  expect(carouselPosition(Number.NaN, 320, 3)).toBe(0);
  const html = renderToStaticMarkup(<CarouselIndicators position={7} total={12} />);
  expect(html).toContain('Business 8 of 12');
  expect(html).toContain('8 / 12');
});
