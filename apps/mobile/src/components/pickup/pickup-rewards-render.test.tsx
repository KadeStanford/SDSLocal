import { PickupItem } from './pickup-item';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { View } from 'react-native';
import { Colors } from '@/constants/theme';
import { CustomerBrand } from '../customer-brand';
import { ThemedText } from '../themed-text';
import { AppButton } from '../app-button';
import { CheckoutRewardEditorView } from '../checkout-reward-editor';
import { PickupRewardPanel } from './pickup-reward-panel';
import { PickupCart, PickupReview } from './pickup-checkout-steps';
import type { Product, RewardOffer, CartLine, Quote } from '@/lib/square-commerce-core';
const state = vi.hoisted(() => ({ scheme: 'light' as 'light' | 'dark', expand: false, index: 0 }));
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useState: (value: unknown) =>
      actual.useState(state.expand && state.index++ === 0 ? true : value),
  };
});
vi.mock('react-native', async () => ({
  ...(await vi.importActual('react-native-web')),
  Modal: ({ children }: { children: ReactNode }) => createElement('section', null, children),
}));
vi.mock('react-native-safe-area-context', async () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaView: (await vi.importActual<typeof import('react-native-web')>('react-native-web')).View,
}));
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
}));
vi.mock('@/components/app-icon', async () => ({
  AppIcon: (await import('../../test/visual-symbol')).VisualSymbol,
}));
vi.mock('expo-image', () => ({
  Image: ({ source, style }: { source: { uri: string }; style: object }) =>
    createElement('img', {
      src: process.env.REWARD_PHOTO_PATH
        ? `data:image/webp;base64,${readFileSync(process.env.REWARD_PHOTO_PATH).toString('base64')}`
        : source.uri,
      style: { ...style, objectFit: 'contain', flexShrink: 0 },
    }),
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => state.scheme }));
vi.mock('@/lib/square-commerce', () => ({ commerce: vi.fn() }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: () => null }));
vi.mock('@/lib/haptics', () => ({ haptics: { selection: vi.fn() } }));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
const products: Product[] = [
  {
    id: 'coffee',
    name: 'Cold brew',
    variation: 'Regular · 12 oz',
    price: 450,
    description: 'Smooth, slow-steeped coffee.',
    currency: 'USD',
    category: 'Drinks',
    image: null,
    groups: [
      {
        id: 'extras',
        name: 'Extras',
        min: 0,
        max: 1,
        modifiers: [{ id: 'shot', name: 'Extra espresso shot', price: 100 }],
      },
    ],
  },
  {
    id: 'latte',
    name: 'Vanilla latte',
    variation: 'Regular · 12 oz',
    price: 550,
    description: '',
    currency: 'USD',
    category: 'Drinks',
    image: 'https://example.test/latte.webp',
    groups: [],
  },
  {
    id: 'tea',
    name: 'Iced sweet tea',
    variation: 'Regular · 16 oz',
    price: 350,
    description: '',
    currency: 'USD',
    category: 'Drinks',
    image: null,
    groups: [],
  },
];
const offer: RewardOffer = {
  programId: 'program',
  revision: 1,
  provider: 'square',
  type: 'free_item',
  label: 'A drink on us',
  percent: null,
  items: products,
};
const cart: CartLine[] = [
  {
    variationId: 'coffee',
    quantity: 1,
    modifierIds: ['shot'],
    rewardClaim: {
      programId: 'program',
      revision: 1,
      provider: 'square',
      type: 'free_item',
      customerId: 'fixture',
    },
  },
];
const noop = () => {};
it('renders reward discovery, choices, claimed cart, covered checkout and merchant setup in both themes', async () => {
  const { StyleSheet } = await import('react-native');
  for (const scheme of ['light', 'dark'] as const)
    for (const screen of [
      'available',
      'choices',
      'customize',
      'cart',
      'free-review',
      'business',
    ] as const) {
      state.scheme = scheme;
      state.index = 0;
      state.expand = screen === 'choices';
      const quote: Quote = {
        quoteId: 'q',
        expiresAt: '2099-01-01',
        subtotal: 450,
        tax: 0,
        tip: 0,
        total: 0,
        currency: 'USD',
        provider: 'square',
        slot: {
          at: '2026-09-30T15:00:00Z',
          stopId: null,
          address: 'Hammond, LA',
          title: 'Counter pickup',
          timezone: 'America/Chicago',
        },
        reward: { type: 'free_item', label: 'A drink on us', discountMinor: 450 },
      };
      const panel = (
        <PickupRewardPanel
          offer={offer}
          selectedName={screen === 'cart' ? 'Cold brew · Regular' : undefined}
          saved={false}
          disabled={false}
          hasCart
          onChoose={noop}
          onApply={noop}
          onSave={noop}
          onShow={noop}
        />
      );
      const body = renderToStaticMarkup(
        <View style={{ gap: 20 }}>
          {screen !== 'customize' && (
            <>
              <CustomerBrand />
              <View style={{ gap: 6 }}>
                <ThemedText type="title">
                  {screen === 'business'
                    ? 'Rewards program'
                    : screen === 'cart'
                      ? 'Your cart'
                      : screen === 'free-review'
                        ? 'Review order'
                        : 'Bayou & Bloom Cafe'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {screen === 'business'
                    ? 'Set up what your customers can claim.'
                    : screen === 'free-review'
                      ? 'Bayou & Bloom Cafe · 4 of 4'
                      : 'Pickup ordering'}
                </ThemedText>
              </View>
            </>
          )}
          {screen === 'customize' ? (
            <PickupItem
              product={products[0]!}
              line={cart[0]}
              reward={offer}
              onClose={noop}
              onSave={() => null}
            />
          ) : screen === 'business' ? (
            <CheckoutRewardEditorView
              enabled
              type="free_item"
              percent="20"
              items={products.slice(0, 2).map((p) => ({ provider: 'square', variationId: p.id }))}
              disabled={false}
              onEnabled={noop}
              onType={noop}
              onPercent={noop}
              onItems={noop}
              catalog={{ provider: 'square', products }}
              error={false}
              onRetry={noop}
            />
          ) : screen === 'free-review' ? (
            <>
              <PickupReview
                quote={quote}
                name="Jamie"
                phone="2255550130"
                cart={[{ ...cart[0]!, modifierIds: [] }]}
                products={products}
                expired={false}
              />
              <AppButton label="Place order · Free" onPress={noop} />
            </>
          ) : (
            <>
              {panel}
              {screen === 'cart' ? (
                <>
                  <PickupCart
                    cart={cart}
                    products={products}
                    rewardDiscount={450}
                    onEdit={noop}
                    onRemove={noop}
                    onQuantity={noop}
                  />
                  <AppButton label="Choose pickup time" onPress={noop} />
                </>
              ) : screen === 'available' ? (
                <View style={{ gap: 12 }}>
                  <ThemedText type="card">Drinks</ThemedText>
                  {products.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        backgroundColor: Colors[scheme].backgroundElement,
                        padding: 18,
                        borderRadius: 14,
                        gap: 10,
                        borderWidth: 1,
                        borderColor: Colors[scheme].divider,
                      }}
                    >
                      <ThemedText type="smallBold">{p.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.variation} · ${(p.price / 100).toFixed(2)}
                      </ThemedText>
                      <AppButton label="Add" variant="secondary" onPress={noop} />
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          )}
        </View>,
      );
      if (screen === 'available') expect(body).toContain('Choose your item');
      if (screen === 'choices') {
        expect(body).toContain('Choose Cold brew');
        expect(body).toContain('Paid extras cost extra');
      }
      if (screen === 'cart') {
        expect(body).toContain('Extra espresso shot');
        expect(body).toContain('$1.00');
      }
      if (screen === 'free-review') expect(body).toContain('no payment required');
      if (process.env.REWARD_RENDER_DIR) {
        const dir = resolve(process.env.REWARD_RENDER_DIR);
        mkdirSync(dir, { recursive: true });
        const css = (StyleSheet as unknown as { getSheet(): { textContent: string } }).getSheet()
          .textContent;
        writeFileSync(
          `${dir}/${screen}-${scheme}.html`,
          `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0;padding:20px;background:${Colors[scheme].background}}[dir=auto],input{font-family:Arial,sans-serif!important}</style></head><body>${body}</body></html>`,
        );
      }
    }
});
