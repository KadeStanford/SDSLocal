import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { themeColors } from '@sds/design-tokens';
import { BusinessLogo, businessLogoUrl } from './business-logo';
import { BusinessIdentityRow } from './business-identity-row';
import { BusinessCard, type BusinessCardData } from './business-card';
import { EventCard } from './event-card';
import { AppButton } from './app-button';
import { EmptyState, ListLoading } from './data-state';

vi.mock('react-native', () => {
  const element = (tag: string) =>
    function MockElement({
      children,
      accessibilityLabel,
      accessibilityState,
      disabled,
      ...props
    }: Record<string, unknown>) {
      return createElement(
        tag,
        {
          'aria-label': accessibilityLabel,
          'aria-disabled': disabled ?? (accessibilityState as { disabled?: boolean })?.disabled,
          'aria-busy': (accessibilityState as { busy?: boolean })?.busy,
          'data-accessible': props.accessible,
        },
        children as React.ReactNode,
      );
    };
  return {
    View: element('div'),
    Text: element('span'),
    Pressable: element('button'),
    ActivityIndicator: element('progress'),
    StyleSheet: { create: (v: unknown) => v, hairlineWidth: 1 },
    useColorScheme: () => 'dark',
    useWindowDimensions: () => ({ width: 390, height: 844, scale: 3, fontScale: 1 }),
    Platform: { select: (v: { default: unknown }) => v.default },
  };
});
vi.mock('@/constants/theme', () => ({
  Colors: themeColors,
  Brand: { primary: '#176B4D', onPrimary: '#FFFFFF' },
  Radius: { small: 12, medium: 16 },
  Spacing: { one: 4, two: 8, three: 16, four: 24 },
}));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors.dark }));
vi.mock('@/lib/storage-url', () => ({
  storagePublicUrl: (path: string) => `https://media.example.test/${path}`,
}));
vi.mock('./themed-text', () => ({
  ThemedText: ({ children }: { children: React.ReactNode }) =>
    createElement('span', null, children),
}));
vi.mock('expo-image', () => ({
  Image: ({
    source,
    contentFit,
    cachePolicy,
  }: {
    source: { uri: string };
    contentFit: string;
    cachePolicy: string;
  }) =>
    createElement('img', { src: source.uri, 'data-fit': contentFit, 'data-cache': cachePolicy }),
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('expo-symbols', () => ({
  SymbolView: () => createElement('span', { 'data-symbol': true }),
}));

const photos = ['cover', 'logo'].map((role) => ({
  role,
  media_assets: { status: 'ready', storage_path: `${role}.png` },
}));
const business: BusinessCardData = {
  id: 'b',
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
  business_photos: photos,
};
describe('rendered shared UI contracts (host components mocked)', () => {
  it('renders distinct cover photography and contained business identity', () => {
    const html = renderToStaticMarkup(
      <BusinessCard business={business} isFollowing={false} onPress={() => {}} />,
    );
    expect(html).toContain('src="https://media.example.test/cover.png" data-fit="cover"');
    expect(html).toContain('src="https://media.example.test/logo.png" data-fit="contain"');
    expect(html).toContain('Open Bayou &amp; Bloom Cafe');
  });
  it('keeps the cover when no logo exists and renders a restrained monogram', () => {
    const html = renderToStaticMarkup(
      <BusinessCard
        business={{ ...business, business_photos: photos.slice(0, 1) }}
        isFollowing={false}
        onPress={() => {}}
      />,
    );
    expect(html).toContain('cover.png');
    expect(html).not.toContain('logo.png');
    expect(html).toContain('>BB<');
  });
  it('does not crop or rewrite a signed logo URL', () => {
    const uri = 'https://media.example.test/brand.png?token=abc';
    expect(
      businessLogoUrl([{ role: 'logo', media_assets: { status: 'ready', storage_path: uri } }]),
    ).toBe(uri);
    expect(renderToStaticMarkup(<BusinessLogo name="Cafe" uri={uri} />)).toContain(
      'data-fit="contain"',
    );
  });
  it('announces the logo only when it supplies standalone identity', () => {
    expect(renderToStaticMarkup(<BusinessLogo name="Cafe" />)).toContain('aria-label="Cafe logo"');
    const row = renderToStaticMarkup(<BusinessIdentityRow name="Cafe" photos={photos} />);
    expect(row).toContain('>Cafe<');
    expect(row).not.toContain('aria-label="Cafe logo"');
  });
  it('connects events to the host and announces reminder status', () => {
    const html = renderToStaticMarkup(
      <EventCard
        title="Market brunch"
        businessName="Cafe"
        photos={photos}
        startsAt="2026-10-02T10:00:00Z"
        metadata="10 AM · Market Square"
        reminder
        onPress={() => {}}
      />,
    );
    expect(html).toContain('Market brunch, Cafe, 10 AM · Market Square, reminder on');
    expect(html).toContain('logo.png');
    expect(html).toContain('Reminder on');
  });
  it('disables loading buttons, keeps their label, and labels icon-only actions', () => {
    const html = renderToStaticMarkup(
      <AppButton label="Save changes" loading onPress={() => {}} />,
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('>Save changes<');
    expect(
      renderToStaticMarkup(
        <AppButton label="Close" iconOnly icon={<span>×</span>} onPress={() => {}} />,
      ),
    ).toContain('aria-label="Close"');
  });
  it('renders optional empty-state actions and a labeled reserved loading state', () => {
    expect(
      renderToStaticMarkup(
        <EmptyState title="No rewards yet" message="Join a business reward program." />,
      ),
    ).not.toContain('<button');
    expect(
      renderToStaticMarkup(
        <EmptyState
          title="No rewards yet"
          message="Join a program."
          actionLabel="Discover businesses"
          onAction={() => {}}
        />,
      ),
    ).toContain('Discover businesses');
    expect(renderToStaticMarkup(<ListLoading label="Loading businesses" />)).toContain(
      'aria-busy="true"',
    );
  });
});
