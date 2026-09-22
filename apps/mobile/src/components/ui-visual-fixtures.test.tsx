/// <reference types="node" />
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { themeColors } from '@sds/design-tokens';
import { AppRegistry, View } from 'react-native-web';
import { BusinessLogo } from './business-logo';
import { BusinessCard, type BusinessCardData } from './business-card';
import { EventCard } from './event-card';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { EmptyState, ListLoading, StateNotice } from './data-state';
import { BusinessBrandHeader } from './business-brand-header';
import { EventDetailHeading } from './event-detail-heading';

const review = vi.hoisted(() => ({ scheme: 'dark' as 'dark' | 'light' }));
vi.mock('react-native', async () => vi.importActual('react-native-web'));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => review.scheme }));
vi.mock('@/hooks/use-theme', () => ({ useTheme: () => themeColors[review.scheme] }));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: () => {} }));
vi.mock('expo-symbols', () => ({ SymbolView: () => null }));
vi.mock('expo-image', () => ({
  Image: ({
    source,
    contentFit,
    style,
  }: {
    source: { uri: string };
    contentFit: string;
    style: object;
  }) =>
    createElement('img', {
      src: source.uri,
      alt: '',
      style: { ...style, objectFit: contentFit, display: 'block' },
    }),
}));
vi.mock('@/lib/storage-url', () => ({
  storagePublicUrl: (path: string) => {
    const [width, height] = path === 'wide' ? [240, 60] : path === 'tall' ? [60, 180] : [90, 90];
    return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" rx="5" fill="none" stroke="white" stroke-width="4"/><text x="50%" y="55%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="18">TEST</text></svg>`)}`;
  },
}));

const photos = (storage_path: string) => [
  { role: 'logo', media_assets: { status: 'ready', storage_path } },
];
const business: BusinessCardData = {
  id: 'fixture',
  name: 'Long business name for wrapping and identity verification',
  description: '',
  category_summary: 'Services',
  offering_search_text: '',
  city: 'Hammond',
  region_code: 'LA',
  created_at: '2026-01-01',
  primary_color: '#176B4D',
  status: 'active',
  business_type: 'services',
  loyalty_programs: [],
  business_photos: null,
};
function Gallery() {
  return (
    <View style={{ backgroundColor: themeColors[review.scheme].background, padding: 16, gap: 16 }}>
      <ThemedText type="title">UI render fixtures</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Local geometry fixtures. No accounts, business logos, rewards or events are created.
      </ThemedText>
      {['#71334D', '#E2B75E', '#254A78'].map((color) => (
        <View
          key={color}
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            backgroundColor: themeColors[review.scheme].backgroundElement,
          }}
        >
          <BusinessBrandHeader
            name="Business identity sample"
            title="Rewards program"
            color={color}
            photos={photos('wide')}
            trailing
          />
          <View style={{ padding: 16, gap: 8 }}>
            <ThemedText>3 of 6 visits</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              Your progress stays easy to read.
            </ThemedText>
          </View>
        </View>
      ))}
      <EventDetailHeading
        title="An evening of live music and local food"
        businessName="Long business name for event hosting"
        color="#71334D"
        when="Sep 25 · 6:00 PM–9:00 PM"
        where="A longer street address in Hammond, Louisiana"
        onOpenPhoto={() => {}}
      />
      <EventDetailHeading
        title="Event artwork layout sample"
        businessName="Business identity sample"
        color="#254A78"
        image={`data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#F6F5F0"/><text x="150" y="195" text-anchor="middle" font-size="24" fill="#254A78">EVENT ART TEST</text></svg>')}`}
        when="Sep 25 · 6 PM"
        where="Online event"
        onOpenPhoto={() => {}}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {['wide', 'tall', 'square'].map((path) => (
          <View key={path} style={{ gap: 4 }}>
            <BusinessLogo name={path} photos={photos(path)} size={64} />
            <ThemedText type="small">{path}</ThemedText>
          </View>
        ))}
        <View style={{ gap: 4 }}>
          <BusinessLogo name="No logo" size={64} />
          <ThemedText type="small">missing</ThemedText>
        </View>
      </View>
      <EventCard
        title="Long event name to verify wrapping at a narrow mobile width"
        businessName={business.name}
        photos={photos('wide')}
        startsAt="2026-10-02T10:00:00Z"
        metadata="10 AM · A longer address with missing optional details"
        reminder
        onPress={() => {}}
      />
      <BusinessCard business={business} isFollowing onPress={() => {}} />
      <View
        style={{
          backgroundColor: themeColors[review.scheme].backgroundElement,
          padding: 16,
          borderRadius: 16,
          gap: 12,
        }}
      >
        <ThemedText type="card">Reward progress</ThemedText>
        <ThemedText>3 of 6 visits · Not ready to redeem</ThemedText>
        <AppButton label="View reward" onPress={() => {}} />
      </View>
      <AppButton label="Save changes" onPress={() => {}} />
      <AppButton label="Cancel" variant="secondary" onPress={() => {}} />
      <AppButton label="Try again" variant="tertiary" onPress={() => {}} />
      <AppButton label="Delete account" variant="destructive" onPress={() => {}} />
      <AppButton label="Saving changes…" loading onPress={() => {}} />
      <AppButton label="Continue" disabled onPress={() => {}} />
      <StateNotice kind="error" message="We couldn’t save your changes. Try again." />
      <StateNotice kind="success" message="Changes saved." />
      <StateNotice message="You’re offline. Saved information is still available." />
      <EmptyState
        title="No rewards yet"
        message="Join a business reward program to see your progress here."
        actionLabel="Discover businesses"
        onAction={() => {}}
      />
      <ListLoading label="Loading businesses" rows={2} />
    </View>
  );
}

it('renders real shared components in both themes for optional local visual inspection', () => {
  AppRegistry.registerComponent('UiReview', () => Gallery);
  for (const scheme of ['light', 'dark'] as const) {
    review.scheme = scheme;
    const { element, getStyleElement } = AppRegistry.getApplication('UiReview', {});
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('Long event name');
    expect(markup).toContain('Save changes');
    if (process.env.UI_RENDER_DIR) {
      const directory = resolve(process.env.UI_RENDER_DIR);
      mkdirSync(directory, { recursive: true });
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Shared UI fixtures · ${scheme}</title>${renderToStaticMarkup(getStyleElement())}<style>body{margin:0;background:${themeColors[scheme].background}}#root{max-width:430px;margin:auto}</style></head><body><div id="root">${markup}</div></body></html>`;
      writeFileSync(resolve(directory, `fixtures-${scheme}.html`), html);
      writeFileSync(
        resolve(directory, `fixtures-${scheme}-large.html`),
        html.replace(
          /(font-size|line-height):([\d.]+)px/g,
          (_, property: string, size: string) => `${property}:${Number(size) * 1.4}px`,
        ),
      );
    }
  }
});
