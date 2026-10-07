import { PickupContactFields } from './pickup-contact-fields';
import { CustomerOrdersHeader } from './customer-orders-header';
import { OrderActionsSheet } from './order-actions-sheet';
import { MerchantBusinessList, type ManagedBusiness } from '../merchant-business-list';
import { CustomerOrderCard } from './customer-order-card';
import { ItemRefundPicker } from './item-refund-picker';
import { ScrollView } from 'react-native';
import { AppButton } from '../app-button';
import {
  CustomerFlowNavigation,
  PickupFlowLayout,
  PickupMerchantHeader,
} from './pickup-flow-layout';
/// <reference types="node" />
import { createElement, type ReactNode, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it, vi } from 'vitest';
import { AppRegistry, View } from 'react-native-web';
import { themeColors } from '@sds/design-tokens';
import { PickupMenu, PickupMenuRow } from './pickup-menu';
import { PickupItem } from './pickup-item';
import { PickupCart, PickupScheduler, PickupReview } from './pickup-checkout-steps';
import { PickupTimePicker } from './pickup-scheduler';
import { PickupStatus } from './pickup-status';
import { PickupCodeContent } from './pickup-code';
import { PickupScanEntry } from './pickup-manual-entry';
import { ParishBusinessBrand } from '../business-screen-header';
import { createRequire } from 'node:module';
import { PickupOrderCard, FulfillmentActions } from './business-order-components';
import { OrderReceipt, OrderTimeline, PickupIdentity } from './order-presentation';
import { ListLoading, EmptyState, StateNotice } from '../data-state';
import { ThemedText } from '../themed-text';
import { PickupOrderCtaContent } from '../pickup-order-cta';
import { initialPickupModule } from '@/lib/pickup-discovery';
import type { Product, PickupOrder, PickupSlot, Quote } from '@/lib/square-commerce-core';
const review = vi.hoisted(() => ({
  scheme: 'light' as 'light' | 'dark',
  targets: [] as {
    accessibilityLabel?: string | undefined;
    accessibilityRole?: string | undefined;
    disabled?: boolean | null | undefined;
    onPress?: (() => void) | undefined;
  }[],
}));
vi.mock('react-native-qrcode-svg', () => ({ default: () => null }));
vi.mock('@/lib/square-commerce', () => ({ commerce: vi.fn() }));
vi.mock('react-native-svg', () => ({
  default: ({ children, ...props }: { children: ReactNode }) =>
    createElement('svg', props, children),
  Path: (props: object) => createElement('path', props),
}));
vi.mock('react-native', async () => {
  const web = await vi.importActual<typeof import('react-native')>('react-native-web');
  return {
    ...web,
    Pressable: (props: ComponentProps<typeof web.Pressable>) => {
      review.targets.push({
        ...props,
        onPress: props.onPress ? () => props.onPress?.({} as never) : undefined,
      });
      return createElement(web.Pressable, props);
    },
    Modal: ({ children }: { children: ReactNode }) => createElement('section', null, children),
  };
});
vi.mock('react-native-safe-area-context', async () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
  SafeAreaView: (await vi.importActual<typeof import('react-native-web')>('react-native-web')).View,
}));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => review.scheme }));
vi.mock('@/hooks/use-theme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/use-theme')>()),
  useTheme: () => themeColors[review.scheme],
}));
vi.mock('expo-symbols', async () => ({
  SymbolView: (await import('../../test/visual-symbol')).VisualSymbol,
}));
vi.mock('@/lib/storage-url', () => ({ storagePublicUrl: () => null }));
vi.mock('@/hooks/use-reduced-motion', () => ({ useReducedMotion: () => true }));
vi.mock('expo-image', () => ({
  Image: ({
    source,
    style,
    contentFit,
  }: {
    source: { uri?: string };
    style: object;
    contentFit?: string;
  }) => {
    if (!process.env.MENU_IMAGE_RENDER_DIR || !source?.uri) return null;
    const photo = source.uri.includes('coffee')
      ? 'photo-1509042239860-f550ce710b93'
      : 'photo-1579751626657-72bc17010498';
    const local = resolve('../../.codex-tmp/playground/images', photo + '.webp');
    const bytes = readFileSync(
      existsSync(local)
        ? local
        : resolve('../../.codex-tmp/comprehensive-fixtures/images', photo + '.webp'),
    );
    return createElement('img', {
      src: 'data:image/webp;base64,' + bytes.toString('base64'),
      alt: '',
      style: { ...style, objectFit: contentFit, display: 'block' },
    });
  },
}));
vi.mock('expo-router', () => ({ router: { push: vi.fn() }, useFocusEffect: vi.fn() }));
vi.mock('@/lib/square-commerce', () => ({}));
vi.mock('@/providers/auth-provider', () => ({ useAuth: () => ({ session: null }) }));
const product: Product = {
  id: 'coffee',
  name: 'A long seasonal coffee name with oat milk',
  variation: 'Large',
  description: 'Freshly brewed coffee with your choice of milk.',
  category: 'Coffee & tea',
  image: null,
  price: 500,
  currency: 'USD',
  groups: [
    {
      id: 'milk',
      name: 'Milk choice',
      min: 1,
      max: 1,
      modifiers: [
        { id: 'oat', name: 'Oat milk', price: 50 },
        { id: 'dairy', name: 'Whole milk', price: 0 },
      ],
    },
  ],
};
it('shows server confirmation without offering another payment or preparation claims', () => {
  review.targets = [];
  const html = renderToStaticMarkup(
    <PickupStatus
      order={{ ...order, status: 'checkout_pending' }}
      confirmingPayment
      confirmationSlow
      busy={false}
      onRefresh={() => {}}
      onCheckout={() => {}}
      onNew={() => {}}
    />,
  );
  expect(html).toContain('Still checking payment');
  expect(html).toContain('Please don’t pay again');
  expect(html).not.toContain('Pay securely');
  expect(html).not.toContain('Preparing your order');
  expect(review.targets.some((t) => t.accessibilityLabel === 'Check payment status')).toBe(true);
});
it('offers payment continuation only for a verified actionable checkout and renders review states', () => {
  const cases = [
    {
      id: 'unfinished',
      providerStatus: 'PAYMENT_METHOD_REQUIRED',
      title: 'Payment not completed',
      canContinue: true,
      slow: false,
    },
    {
      id: 'verification',
      providerStatus: 'PAYMENT_ACTION_REQUIRED',
      title: 'Finish your payment',
      canContinue: true,
      slow: false,
    },
    {
      id: 'processing',
      providerStatus: 'PAYMENT_PROCESSING',
      title: 'Confirming your order',
      canContinue: false,
      slow: false,
    },
    {
      id: 'slow',
      providerStatus: 'PAYMENT_PROCESSING',
      title: 'Still checking payment',
      canContinue: false,
      slow: true,
    },
  ];
  for (const mode of ['light', 'dark'] as const)
    for (const sample of cases) {
      review.scheme = mode;
      const Screen = () => (
        <View
          style={{
            padding: 20,
            minHeight: 760,
            gap: 24,
            backgroundColor: themeColors[mode].background,
          }}
        >
          <CustomerFlowNavigation title="Pickup order" onBack={() => {}} />
          <ThemedText type="title">Pickup order</ThemedText>
          <PickupStatus
            order={{
              ...order,
              provider: 'stripe',
              status: 'checkout_pending',
              providerStatus: sample.providerStatus,
            }}
            busy={false}
            confirmingPayment
            confirmationSlow={sample.slow}
            onRefresh={() => {}}
            onCheckout={() => {}}
            onNew={undefined}
          />
        </View>
      );
      AppRegistry.registerComponent('PaymentFeedback', () => Screen);
      const { element, getStyleElement } = AppRegistry.getApplication('PaymentFeedback', {});
      const markup = renderToStaticMarkup(element);
      expect(markup).toContain(sample.title);
      expect(markup.includes('Continue payment')).toBe(sample.canContinue);
      expect(markup).toContain('Check payment status');
      if (process.env.PAYMENT_FEEDBACK_RENDER_DIR) {
        mkdirSync(process.env.PAYMENT_FEEDBACK_RENDER_DIR, { recursive: true });
        writeFileSync(
          resolve(process.env.PAYMENT_FEEDBACK_RENDER_DIR, `${sample.id}-${mode}.html`),
          `<!doctype html><meta charset="utf-8">${renderToStaticMarkup(getStyleElement())}<style>body{margin:0}*{font-family:Arial,sans-serif!important}</style>${markup}`,
        );
      }
    }
});

it('makes a customer request visible on the order card and offers quantities instead of amount entry', () => {
  const html = renderToStaticMarkup(
    <View>
      <PickupOrderCard
        order={{
          ...order,
          supportRequest: {
            id: 'request',
            type: 'change',
            message: 'Please remove the milk',
            response: null,
            status: 'open',
            createdAt: order.createdAt,
            resolvedAt: null,
          },
        }}
        now={Date.parse(order.createdAt)}
      />
      <ItemRefundPicker
        order={{
          ...order,
          refundItems: [
            {
              itemId: 'item',
              name: 'Coffee',
              quantity: 2,
              available: 1,
              used: 1,
              unit: 500,
              extra: 0,
            },
          ],
        }}
        disabled={false}
        onRefund={async () => {}}
      />
    </View>,
  );
  expect(html).toContain('Reply needed');
  expect(html).toContain('Please remove the milk');
  expect(html).toContain('1 of 2 available to refund');
  expect(html).toContain('Refund items');
  expect(html).not.toContain('Partial refund amount');
});
const cart = [{ variationId: 'coffee', quantity: 2, modifierIds: ['oat'] }];
const slot: PickupSlot = {
  at: '2026-09-21T15:00:00Z',
  stopId: null,
  title: 'Main Street pickup',
  address: 'A long pickup address in Hammond, Louisiana',
  timezone: 'America/Chicago',
};
const quote: Quote = {
  quoteId: 'quote',
  expiresAt: '2026-09-21T14:50:00Z',
  slot,
  subtotal: 1100,
  tax: 110,
  tip: 0,
  total: 1210,
  currency: 'USD',
};
const order: PickupOrder = {
  id: 'fixture',
  number: 'S-FIXTURE',
  status: 'preparing',
  version: 1,
  businessName: 'Local pickup layout fixture',
  pickupAt: slot.at,
  timezone: slot.timezone,
  address: slot.address,
  subtotal: 1100,
  tax: 110,
  tip: 0,
  total: 1210,
  currency: 'USD',
  createdAt: '2026-09-21T14:00:00Z',
  expiresAt: quote.expiresAt,
  checkoutUrl: null,
  items: [
    {
      name: product.name,
      quantity: '2',
      variation_name: 'Large',
      modifiers: [{ name: 'Oat milk' }],
      total_money: { amount: 1100, currency: 'USD' },
    },
  ],
};
function Gallery() {
  return (
    <View style={{ padding: 20, gap: 40, backgroundColor: themeColors[review.scheme].background }}>
      <ThemedText type="title">Pickup layout fixtures</ThemedText>
      <ThemedText type="small">
        Static component rendering only. This is not a device capture or a placed order.
      </ThemedText>
      <ThemedText type="subtitle">Public pickup availability</ThemedText>
      {(['open', 'scheduled', 'paused', 'closed', 'error', 'loading'] as const).map((kind) => (
        <PickupOrderCtaContent
          key={kind}
          businessId="fixture"
          state={{
            ...initialPickupModule('fixture'),
            supported: true,
            loading: kind === 'loading',
            failed: kind === 'error',
            physicalState: kind === 'scheduled' || kind === 'closed' ? 'closed' : 'open',
            availability:
              kind === 'open' || kind === 'scheduled'
                ? { available: true, status: 'open', slots: [slot] }
                : { available: false, status: kind === 'paused' ? 'paused' : 'no_slots' },
          }}
          onRefresh={() => {}}
        />
      ))}
      <PickupMenu products={[product]} onChoose={() => {}} onAdd={() => {}} onQuantity={() => {}} />
      <PickupItem product={product} line={cart[0]} onClose={() => {}} onSave={() => {}} />
      <PickupCart cart={cart} products={[product]} onEdit={() => {}} onRemove={() => {}} />
      <PickupScheduler
        slots={[
          slot,
          { ...slot, at: '2026-09-21T15:15:00Z' },
          { ...slot, at: '2026-09-21T15:30:00Z' },
        ]}
        place="fixed"
        slot={slot}
        onPlace={() => {}}
        onSlot={() => {}}
      />
      <PickupReview
        quote={quote}
        name="Kade Stanford"
        phone="(225) 555-0123"
        cart={cart}
        products={[product]}
        expired={false}
      />
      <PickupStatus
        order={order}
        busy={false}
        onRefresh={() => {}}
        onCheckout={() => {}}
        onNew={() => {}}
      />
      <ThemedText type="title">Business pickup workspace</ThemedText>
      <PickupIdentity
        name="A long local café & bakery business name"
        subtitle="Accepting online orders"
      />
      {(
        [
          'placed',
          'ready',
          'payment_review',
          'refund_pending',
          'refund_failed',
          'completed',
        ] as const
      ).map((status) => (
        <PickupOrderCard
          key={status}
          order={{ ...order, status, recipient: { display_name: 'Alex with a long pickup name' } }}
          now={Date.parse('2026-09-21T15:05:00Z')}
        />
      ))}
      <ThemedText type="subtitle">Order detail</ThemedText>
      <OrderReceipt order={order} />
      <OrderTimeline order={order} />
      <FulfillmentActions
        order={order}
        canRefund
        busy={false}
        onTransition={() => {}}
        onRefund={() => {}}
      />
      <ListLoading label="Loading pickup orders" rows={1} />
      <EmptyState title="You’re all caught up" message="New paid orders appear here." />
      <StateNotice
        kind="error"
        message="Couldn’t update orders. Your last results are still here."
      />
      <PickupStatus
        order={{ ...order, status: 'checkout_pending' }}
        busy={false}
        onRefresh={() => {}}
        onCheckout={() => {}}
        onNew={() => {}}
      />
      <PickupStatus
        order={{ ...order, status: 'checkout_pending' }}
        confirmingPayment
        confirmationSlow
        busy={false}
        onRefresh={() => {}}
        onCheckout={() => {}}
        onNew={() => {}}
      />
    </View>
  );
}
it('renders checkout components in light and dark themes without payment claims', () => {
  vi.stubEnv('EXPO_PUBLIC_APP_ENV', 'staging');
  AppRegistry.registerComponent('PickupReview', () => Gallery);
  for (const scheme of ['light', 'dark'] as const) {
    review.scheme = scheme;
    const { element, getStyleElement } = AppRegistry.getApplication('PickupReview', {});
    const markup = renderToStaticMarkup(element);
    expect(markup).toContain('Estimated items');
    expect(markup).toContain('Payment not confirmed');
    expect(markup).toContain('Still checking payment');
    expect(markup).toContain('Required');
    expect(markup).toContain('Schedule pickup');
    expect(markup).toContain('Online ordering paused');
    expect(markup).not.toContain('Continue Square checkout');
    if (process.env.PICKUP_RENDER_DIR) {
      const directory = resolve(process.env.PICKUP_RENDER_DIR);
      mkdirSync(directory, { recursive: true });
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pickup static layouts · ${scheme}</title>${renderToStaticMarkup(getStyleElement())}<style>[dir=auto],input{font-family:Arial,sans-serif!important}body{margin:0;background:${themeColors[scheme].background}}#root{max-width:375px;margin:auto}</style></head><body><div id="root">${markup}</div></body></html>`;
      writeFileSync(resolve(directory, `pickup-${scheme}.html`), html);
      writeFileSync(
        resolve(directory, `pickup-${scheme}-large.html`),
        html.replace(
          /(font-size|line-height):([\d.]+)px/g,
          (_, prop: string, size: string) => `${prop}:${Number(size) * 1.4}px`,
        ),
      );
    }
  }
  vi.unstubAllEnvs();
});

const actualCatalog: Product[] = [
  ['side', 'TEST Market Side', 600],
  ['brew', 'TEST Cold Brew', 450],
  ['sandwich', 'TEST Pressed Sandwich', 1200],
  ['bowl', 'TEST Seasonal Grain Bowl', 1500],
].map(([id, name, price]) => ({
  ...product,
  id: String(id),
  name: String(name),
  price: Number(price),
  variation: 'Regular',
  description:
    (
      {
        side: 'Seasonal vegetables, prepared fresh.',
        coffee: 'Slow-steeped and served over ice.',
        sandwich: 'Toasted sourdough with a house-made spread.',
        bowl: 'Grains, greens and seasonal vegetables.',
      } as Record<string, string>
    )[String(id)] ?? '',
  category: 'Menu',
  groups: [],
}));
function PhoneFixture({ step }: { step: 'menu' | 'cart' | 'pickup' | 'contact' | 'review' }) {
  const fixtureCart = [{ variationId: 'side', quantity: 1, modifierIds: [] }];
  const slots = Array.from({ length: 24 }, (_, i) => ({
    ...slot,
    at: new Date(Date.parse('2026-09-21T14:00:00Z') + i * 900000).toISOString(),
  }));
  const fixtureQuote = { ...quote, slot: slots[0]!, subtotal: 600, tax: 60, total: 660 };
  const titles = {
    menu: 'Order pickup',
    cart: 'Your cart',
    pickup: 'Pickup time',
    contact: 'Pickup contact',
    review: 'Review order',
  };
  const content =
    step === 'cart' ? (
      <PickupCart
        cart={fixtureCart}
        products={actualCatalog}
        onEdit={() => {}}
        onRemove={() => {}}
        onQuantity={() => {}}
      />
    ) : step === 'pickup' ? (
      <PickupScheduler
        slots={slots}
        place="fixed"
        slot={slots[0]!}
        onPlace={() => {}}
        onSlot={() => {}}
      />
    ) : step === 'review' ? (
      <PickupReview
        quote={fixtureQuote}
        name="Kade Stanford"
        phone="+12255550123"
        cart={fixtureCart}
        products={actualCatalog}
        expired={false}
        onEdit={() => {}}
      />
    ) : (
      <PickupContactFields
        name="Kade Stanford"
        phone="(225) 555-0123"
        onName={() => {}}
        onPhone={() => {}}
      />
    );

  return (
    <PickupFlowLayout
      navigation={
        <CustomerFlowNavigation
          title={titles[step]}
          subtitle={step !== 'menu' ? 'Bayou Bites' : undefined}
          step={
            step !== 'menu'
              ? ['menu', 'cart', 'pickup', 'contact', 'review'].indexOf(step)
              : undefined
          }
          onBack={() => {}}
        />
      }
      footer={
        <AppButton
          label={
            step === 'menu'
              ? 'View cart (1) · $6.00'
              : step === 'pickup'
                ? 'Continue · 9:00 AM'
                : step === 'review'
                  ? 'Secure payment · $6.60'
                  : step === 'contact'
                    ? 'Review order'
                    : 'Choose pickup time'
          }
          onPress={() => {}}
        />
      }
    >
      {step === 'menu' ? (
        <PickupMenu
          products={actualCatalog}
          cart={fixtureCart}
          onChoose={() => {}}
          onAdd={() => {}}
          onQuantity={() => {}}
          header={
            <View style={{ gap: 16 }}>
              <PickupMerchantHeader name="Bayou Bites" color="#EA8A39" />
              <View style={{ gap: 4 }}>
                <ThemedText type="smallBold">Accepting pickup orders</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Next pickup Monday, Sep 21, 9:00 AM
                </ThemedText>
              </View>
            </View>
          }
        />
      ) : (
        <ScrollView
          style={{ flex: 1, minHeight: 0 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 24 }}
        >
          {content}
        </ScrollView>
      )}
    </PickupFlowLayout>
  );
}
it('renders complete viewport shells with the real four-item catalog and safe-area footer', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const step of ['menu', 'cart', 'pickup', 'contact', 'review'] as const) {
      review.scheme = scheme;
      AppRegistry.registerComponent(
        'PickupPhone',
        () =>
          function PickupPhoneFixture() {
            return <PhoneFixture step={step} />;
          },
      );
      const { element, getStyleElement } = AppRegistry.getApplication('PickupPhone', {});
      const markup = renderToStaticMarkup(element);
      expect(markup).toContain('pickup-sticky-footer');
      if (step === 'menu' && process.env.MENU_IMAGE_RENDER_DIR) {
        const directory = resolve(process.env.MENU_IMAGE_RENDER_DIR);
        mkdirSync(directory, { recursive: true });
        const imageProducts: Product[] = [
          {
            id: 'margherita',
            name: 'Margherita pizza',
            description: 'Tomato, fresh mozzarella, basil and olive oil.',
            price: 1400,
            image: 'https://fixture.example/pizza',
            currency: 'USD',
            category: 'House specialties',
            groups: [
              {
                id: 'crust',
                name: 'Crust',
                min: 1,
                max: 1,
                modifiers: [
                  { id: 'classic', name: 'Classic crust', price: 0 },
                  { id: 'thin', name: 'Thin crust', price: 0 },
                  { id: 'gluten-free', name: 'Gluten-free crust', price: 250 },
                ],
              },
              {
                id: 'extras',
                name: 'Extras',
                min: 0,
                max: 2,
                modifiers: [
                  { id: 'mozzarella', name: 'Extra mozzarella', price: 200 },
                  { id: 'basil', name: 'Fresh basil', price: 50 },
                ],
              },
            ],
            variation: 'Regular',
          },
          {
            id: 'pepperoni',
            name: 'Pepperoni pizza',
            description: 'Classic pepperoni with house tomato sauce.',
            price: 1650,
            image: 'https://fixture.example/pizza',
            currency: 'USD',
            category: 'House specialties',
            groups: [],
            variation: 'Regular',
          },
          {
            id: 'coffee',
            name: 'Cold brew',
            description: 'Slow-steeped overnight. Smooth and refreshing.',
            price: 450,
            image: 'https://fixture.example/coffee',
            currency: 'USD',
            category: 'Sides & favorites',
            groups: [],
            variation: 'Regular',
          },
          {
            id: 'bread',
            name: 'Garlic bread',
            description: 'Toasted with garlic butter and herbs.',
            price: 500,
            image: null,
            currency: 'USD',
            category: 'Sides & favorites',
            groups: [],
            variation: 'Regular',
          },
        ];
        function PhotoMenuFixture() {
          return (
            <View
              style={{
                backgroundColor: themeColors[scheme].background,
                paddingTop: 24,
                paddingBottom: 16,
              }}
            >
              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <CustomerFlowNavigation title="Menu" onBack={() => {}} />
              </View>
              <PickupMenu
                products={imageProducts}
                cart={[{ variationId: 'coffee', quantity: 1, modifierIds: [] }]}
                onChoose={() => {}}
                onAdd={() => {}}
                onQuantity={() => {}}
              />
            </View>
          );
        }
        AppRegistry.registerComponent('PhotoMenu', () => PhotoMenuFixture);
        const photoApp = AppRegistry.getApplication('PhotoMenu', {});
        const body = renderToStaticMarkup(photoApp.element);
        writeFileSync(
          resolve(directory, `menu-${scheme}.html`),
          `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderToStaticMarkup(photoApp.getStyleElement())}<style>html,body{margin:0;background:${themeColors[scheme].background}}[dir=auto]{font-family:Arial,sans-serif!important}</style><body>${body}</body></html>`,
        );
        for (const scenario of ['options', 'selected', 'no-photo', 'unavailable'] as const) {
          const first = imageProducts[0]!;
          const detailProduct = {
            ...first,
            image: scenario === 'no-photo' ? null : first.image,
            available: scenario !== 'unavailable',
          };
          AppRegistry.registerComponent(
            'InsetItem',
            () =>
              function InsetItemFixture() {
                return (
                  <PickupItem
                    product={detailProduct}
                    variants={[
                      detailProduct,
                      { ...detailProduct, id: 'large', variation: '16 inch', price: 1900 },
                    ]}
                    {...(scenario === 'selected'
                      ? {
                          line: {
                            variationId: first.id,
                            quantity: 4,
                            modifierIds: ['classic', 'mozzarella'],
                          },
                        }
                      : {})}
                    onClose={() => {}}
                    onSave={() => {}}
                  />
                );
              },
          );
          const itemApp = AppRegistry.getApplication('InsetItem', {});
          writeFileSync(
            resolve(directory, `${scenario}-${scheme}.html`),
            `<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderToStaticMarkup(itemApp.getStyleElement())}<style>html,body,section,#root{height:100%;margin:0;background:${themeColors[scheme].background}}section{display:flex;flex-direction:column}[dir=auto]{font-family:Arial,sans-serif!important}</style><body>${renderToStaticMarkup(itemApp.element)}</body></html>`,
          );
        }
      }
      if (step === 'menu') {
        for (const p of actualCatalog) expect(markup).toContain(p.name);
        expect(markup).toContain('Add one TEST Cold Brew');
        expect(markup).not.toContain('Search the menu');
      }
      if (step === 'pickup') {
        expect(markup.match(/role="radio"/g) ?? []).toHaveLength(1);
        expect(markup).toContain('Soonest available');
        expect(markup).toContain('Choose another time');
        expect(markup).not.toContain('Show later times');
        expect(markup).toContain('Continue · 9:00 AM');
      }
      if (step === 'review') {
        expect(markup).toContain('(225) 555-0123');
        for (const label of ['pickup', 'contact', 'order summary'])
          expect(markup).toContain(`Edit ${label}`);
      }
      if (process.env.PICKUP_RENDER_DIR) {
        const directory = resolve(process.env.PICKUP_RENDER_DIR);
        mkdirSync(directory, { recursive: true });
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer pickup ${step} · ${scheme}</title>${renderToStaticMarkup(getStyleElement())}<style>[dir=auto],input{font-family:Arial,sans-serif!important}html,body{margin:0;height:100%;overflow:hidden;background:${themeColors[scheme].background}}#root{height:100%;display:flex;flex-direction:column}#root>div{flex:1;min-height:0}</style></head><body><div id="root">${markup}</div></body></html>`;
        writeFileSync(resolve(directory, `${step}-${scheme}.html`), html);
        writeFileSync(
          resolve(directory, `${step}-${scheme}-large.html`),
          html.replace(
            /(font-size|line-height):([\d.]+)px/g,
            (_, prop: string, size: string) => `${prop}:${Number(size) * 1.4}px`,
          ),
        );
      }
    }
});

it('wires separate item-body inspection, quick add, quantity controls, and unavailable state', () => {
  const p = actualCatalog[0]!;
  const choose = vi.fn();
  const add = vi.fn();
  const quantity = vi.fn();
  review.targets = [];
  renderToStaticMarkup(
    <PickupMenuRow
      product={p}
      quantity={0}
      disabled={false}
      onChoose={choose}
      onAdd={add}
      onQuantity={quantity}
    />,
  );
  review.targets.find((t) => t.accessibilityLabel === 'Add one TEST Market Side')?.onPress?.();
  expect(add).toHaveBeenCalledWith(p);
  expect(choose).not.toHaveBeenCalled();
  expect(quantity).not.toHaveBeenCalled();
  review.targets
    .find((t) => t.accessibilityLabel?.startsWith('View TEST Market Side'))
    ?.onPress?.();
  expect(choose).toHaveBeenCalledWith(p);
  review.targets = [];
  renderToStaticMarkup(
    <PickupMenuRow
      product={p}
      quantity={1}
      disabled={false}
      onChoose={choose}
      onAdd={add}
      onQuantity={quantity}
    />,
  );
  review.targets.find((t) => t.accessibilityLabel?.startsWith('Increase'))?.onPress?.();
  review.targets.find((t) => t.accessibilityLabel?.startsWith('Decrease'))?.onPress?.();
  expect(quantity.mock.calls).toEqual([
    [p, 1],
    [p, -1],
  ]);
  review.targets = [];
  const html = renderToStaticMarkup(
    <PickupMenuRow
      product={{ ...p, available: false }}
      quantity={0}
      disabled={false}
      onChoose={choose}
      onAdd={add}
      onQuantity={quantity}
    />,
  );
  expect(html).toContain('Currently unavailable');
  expect(review.targets.every((t) => t.disabled)).toBe(true);
});
it('wires review edit links to the exact earlier steps and pickup selection to its actual slot', () => {
  const edit = vi.fn();
  review.targets = [];
  renderToStaticMarkup(
    <PickupReview
      quote={quote}
      name="Fixture"
      phone="+12255550123"
      cart={cart}
      products={[product]}
      expired={false}
      onEdit={edit}
    />,
  );
  for (const label of ['Edit pickup', 'Edit contact', 'Edit order summary'])
    review.targets.find((t) => t.accessibilityLabel === label)?.onPress?.();
  expect(edit.mock.calls).toEqual([['pickup'], ['contact'], ['cart']]);
  const pick = vi.fn();
  review.targets = [];
  renderToStaticMarkup(
    <PickupScheduler slots={[slot]} slot={null} place="fixed" onPlace={() => {}} onSlot={pick} />,
  );
  review.targets.find((t) => t.accessibilityRole === 'radio')?.onPress?.();
  expect(pick).toHaveBeenCalledWith(slot);
});

it('keeps picker date changes and cancellation separate from the committed pickup', () => {
  const pick = vi.fn();
  const close = vi.fn();
  review.targets = [];
  renderToStaticMarkup(
    <PickupTimePicker
      slots={[slot, { ...slot, at: '2026-09-22T15:00:00Z' }]}
      slot={slot}
      place="fixed"
      onClose={close}
      onConfirm={pick}
    />,
  );
  const dates = review.targets.filter((t) => t.accessibilityRole === 'tab');
  expect(dates).toHaveLength(2);
  dates[1]?.onPress?.();
  expect(pick).not.toHaveBeenCalled();
  review.targets.find((t) => t.accessibilityLabel === 'Cancel')?.onPress?.();
  expect(close).toHaveBeenCalledOnce();
});

it('confirms only an available slot from the selected location', () => {
  const pick = vi.fn();
  review.targets = [];
  renderToStaticMarkup(
    <PickupTimePicker
      slots={[slot]}
      place="fixed"
      slot={slot}
      onClose={() => {}}
      onConfirm={pick}
    />,
  );
  review.targets.find((t) => t.accessibilityLabel === 'Use 10:00 AM')?.onPress?.();
  expect(pick).toHaveBeenCalledWith(slot);
  review.targets = [];
  renderToStaticMarkup(
    <PickupTimePicker
      slots={[slot]}
      place="fixed"
      slot={{ ...slot, stopId: 'other' }}
      onClose={() => {}}
      onConfirm={pick}
    />,
  );
  expect(review.targets.find((t) => t.accessibilityLabel === 'Choose a time')?.disabled).toBe(true);
});

function StatusPhoneFixture({ screen }: { screen: string }) {
  const statusOrder: PickupOrder = {
    ...order,
    businessName: 'Bayou & Bloom Cafe',
    number: 'S-076925',
    status: screen === 'completed' ? 'completed' : 'placed',
    business: {
      id: 'fixture',
      name: 'Bayou & Bloom Cafe',
      primaryColor: '#F3B767',
      phone: '+12255550123',
      timezone: 'America/Chicago',
      logoPath: null,
    },
    total: 4500,
    subtotal: 4500,
    tax: 0,
    items: [
      { name: 'TEST Market Side', quantity: '1', total_money: { amount: 600, currency: 'USD' } },
      {
        name: 'TEST Pressed Sandwich',
        quantity: '2',
        total_money: { amount: 2400, currency: 'USD' },
      },
      {
        name: 'TEST Seasonal Grain Bowl',
        quantity: '1',
        total_money: { amount: 1500, currency: 'USD' },
      },
    ],
  };
  if (screen === 'orders')
    return (
      <View style={{ flex: 1, backgroundColor: themeColors[review.scheme].background }}>
        <CustomerOrdersHeader signedIn view="current" onView={() => {}} />
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <CustomerOrderCard order={statusOrder} />
          <CustomerOrderCard
            order={{
              ...statusOrder,
              id: 'fixture-2',
              businessName: 'Magnolia & Main Kitchen',
              status: 'ready',
              business: null,
            }}
          />
        </ScrollView>
      </View>
    );
  return (
    <PickupFlowLayout
      navigation={
        <CustomerFlowNavigation
          title={screen === 'orders' ? 'Your orders' : 'Pickup order'}
          onBack={() => {}}
          onOrders={screen !== 'orders' ? () => {} : undefined}
        />
      }
    >
      <ScrollView
        style={{ flex: 1, minHeight: 0 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 34, gap: 16 }}
      >
        {screen === 'orders' ? (
          <>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AppButton label="Current" onPress={() => {}} style={{ flex: 1 }} />
              <AppButton
                label="History"
                variant="secondary"
                onPress={() => {}}
                style={{ flex: 1 }}
              />
            </View>
            <CustomerOrderCard order={statusOrder} />
            <CustomerOrderCard
              order={{
                ...statusOrder,
                id: 'fixture-2',
                businessName: 'A long neighborhood coffee and bakery business name',
                status: 'ready',
                business: null,
              }}
            />
          </>
        ) : (
          <PickupStatus
            order={statusOrder}
            busy={false}
            lastUpdated={Date.parse('2026-09-20T23:02:00Z')}
            onRefresh={() => {}}
            onCheckout={() => {}}
            onNew={() => {}}
          />
        )}
      </ScrollView>
    </PickupFlowLayout>
  );
}
it('renders compact status and customer order cards as full phone screens', () => {
  for (const scheme of ['light', 'dark'] as const)
    for (const screen of ['status', 'completed', 'orders']) {
      review.scheme = scheme;
      AppRegistry.registerComponent(
        'CustomerHistoryPhone',
        () =>
          function CustomerHistoryFixture() {
            return <StatusPhoneFixture screen={screen} />;
          },
      );
      const { element, getStyleElement } = AppRegistry.getApplication('CustomerHistoryPhone', {});
      const markup = renderToStaticMarkup(element);
      expect(markup).toContain('Bayou &amp; Bloom Cafe');
      if (screen !== 'orders') {
        expect(markup).toContain('View order activity');
        expect(markup).not.toContain('upcoming');
        expect(markup).toContain('Your receipt');
      }
      if (process.env.PICKUP_RENDER_DIR) {
        const directory = resolve(process.env.PICKUP_RENDER_DIR);
        mkdirSync(directory, { recursive: true });
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Customer ${screen} · ${scheme}</title>${renderToStaticMarkup(getStyleElement())}<style>[dir=auto],input{font-family:Arial,sans-serif!important}html,body{margin:0;height:100%;overflow:hidden;background:${themeColors[scheme].background}}#root{height:100%;display:flex;flex-direction:column}#root>div{flex:1;min-height:0}</style></head><body><div id="root">${markup}</div></body></html>`;
        writeFileSync(resolve(directory, `${screen}-${scheme}.html`), html);
        writeFileSync(
          resolve(directory, `${screen}-${scheme}-large.html`),
          html.replace(
            /(font-size|line-height):([\d.]+)px/g,
            (_, prop: string, size: string) => `${prop}:${Number(size) * 1.4}px`,
          ),
        );
      }
    }
});

const managed: ManagedBusiness[] = [
  {
    id: 'owner',
    name: 'Bayou & Bloom Cafe',
    slug: 'bayou',
    business_type: 'food_drink',
    status: 'active',
    primary_color: null,
    role: 'owner',
    business_photos: null,
  },
  {
    id: 'staff',
    name: 'Smoothie Hut',
    slug: 'smoothie',
    business_type: 'food_drink',
    status: 'draft',
    primary_color: null,
    role: 'staff',
    business_photos: null,
  },
];
it.each(['light', 'dark'] as const)(
  'business list preserves owner/staff destinations and filters in %s',
  (scheme) => {
    review.scheme = scheme;
    review.targets = [];
    const open = vi.fn();
    const props = {
      businesses: managed,
      search: '',
      filter: 'all' as const,
      onSearch: vi.fn(),
      onFilter: vi.fn(),
      onOpen: open,
      onAdd: vi.fn(),
      onPlan: vi.fn(),
      onStaffScan: vi.fn(),
      planMessage: 'No listing plan yet',
    };
    const html = renderToStaticMarkup(<MerchantBusinessList {...props} />);
    for (const [name, id, section] of [
      ['Bayou & Bloom Cafe', 'owner', null],
      ['Smoothie Hut', 'staff', 'preview'],
    ] as const) {
      review.targets.find((t) => t.accessibilityLabel?.startsWith(name + ','))!.onPress!();
      expect(open).toHaveBeenCalledWith(id, section);
    }
    expect(html.indexOf('Bayou &amp; Bloom Cafe')).toBeLessThan(
      html.indexOf('Manage subscription'),
    );
    const filtered = renderToStaticMarkup(<MerchantBusinessList {...props} filter="published" />);
    expect(filtered).toContain('Bayou &amp; Bloom Cafe');
    expect(filtered).not.toContain('Smoothie Hut');
    const searched = renderToStaticMarkup(<MerchantBusinessList {...props} search="smoothie" />);
    expect(searched).toContain('Smoothie Hut');
    expect(searched).not.toContain('Bayou &amp; Bloom Cafe');
  },
);

it('opens cancellation directly at the full refund confirmation and retains owner authorization', () => {
  review.targets = [];
  const html = renderToStaticMarkup(
    <OrderActionsSheet
      visible
      initialMode="full"
      onClose={() => {}}
      order={{ ...order, paidAt: order.createdAt }}
      canRefund
      disabled={false}
      onRefund={async () => {}}
      onReview={async () => {}}
    />,
  );
  expect(html).toContain('Confirm refund');
  expect(html).toContain('This cancels any remaining');
  expect(html).not.toContain('Select items and quantities');
  expect(review.targets.find((t) => t.accessibilityLabel === 'Confirm refund')?.disabled).toBe(
    false,
  );
  review.targets = [];
  renderToStaticMarkup(
    <OrderActionsSheet
      visible
      initialMode="full"
      onClose={() => {}}
      order={{ ...order, paidAt: order.createdAt }}
      canRefund={false}
      disabled={false}
      onRefund={async () => {}}
      onReview={async () => {}}
    />,
  );
  expect(review.targets.find((t) => t.accessibilityLabel === 'Confirm refund')?.disabled).toBe(
    true,
  );
});
it('does not offer new help requests after a full refund', () => {
  const html = renderToStaticMarkup(
    <PickupStatus
      order={{ ...order, status: 'refunded' }}
      busy={false}
      onRefresh={() => {}}
      onCheckout={() => {}}
      onNew={() => {}}
      onSupportRequest={() => {}}
    />,
  );
  expect(html).not.toContain('Send another request');
  expect(html).not.toContain('Contact the business');
});

it('shows a readable pickup code, hides expired secrets, and renders the staff fallback', async () => {
  const qr = createRequire(require.resolve('react-native-qrcode-svg'))('qrcode');
  const svg = await qr.toString(
    'sds-pickup:20000000-0000-4000-8000-000000000001:' + 'a'.repeat(64),
    { type: 'svg', width: 210, margin: 0 },
  );
  const now = Date.parse('2026-09-29T17:00:00Z');
  const code = {
    code: 'fixture-qr',
    manualCode: 'K7MP4X9R',
    expiresAt: new Date(now + 300000).toISOString(),
  };
  for (const mode of ['light', 'dark'] as const)
    for (const screen of ['customer', 'camera', 'staff', 'expired']) {
      review.scheme = mode;
      const Screen = () => (
        <View
          style={{
            padding: 20,
            minHeight: 820,
            gap: 24,
            backgroundColor: themeColors[mode].background,
          }}
        >
          {screen === 'staff' || screen === 'camera' ? (
            <>
              <ParishBusinessBrand />
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <ThemedText type="title" style={{ flex: 1 }}>
                  Confirm pickup
                </ThemedText>
                <AppButton label="Close" variant="secondary" onPress={() => {}} />
              </View>
            </>
          ) : (
            <CustomerFlowNavigation title="Pickup order" onBack={() => {}} />
          )}
          <ThemedText type="subtitle">Bayou &amp; Bloom Cafe</ThemedText>
          {screen === 'staff' || screen === 'camera' ? (
            <PickupScanEntry
              manual={screen === 'staff'}
              code={screen === 'staff' ? 'K7MP 4X9R' : ''}
              onChange={() => {}}
              onCheck={() => {}}
              onToggleMode={() => {}}
              camera={
                <View
                  style={{
                    height: 300,
                    borderRadius: 16,
                    backgroundColor: '#14211c',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 18,
                  }}
                >
                  <View
                    style={{
                      width: 180,
                      height: 180,
                      borderWidth: 2,
                      borderColor: '#7cd3b0',
                      borderRadius: 16,
                    }}
                  />
                  <ThemedText style={{ color: '#d7e9df' }} type="small">
                    Live camera appears here on your phone
                  </ThemedText>
                </View>
              }
            />
          ) : (
            <PickupCodeContent
              code={code}
              now={screen === 'expired' ? now + 300001 : now}
              busy={false}
              error=""
              onRefresh={() => {}}
              qr={createElement('div', {
                style: { width: 210, height: 210 },
                dangerouslySetInnerHTML: { __html: svg },
              })}
            />
          )}
        </View>
      );
      AppRegistry.registerComponent('PickupShortCodeReview', () => Screen);
      const { element, getStyleElement } = AppRegistry.getApplication('PickupShortCodeReview', {});
      const html = renderToStaticMarkup(element);
      expect(html).not.toContain('Copy pickup code');
      if (screen === 'customer') expect(html).toContain('K7MP 4X9R');
      if (screen === 'expired') {
        expect(html).not.toContain('K7MP');
        expect(html).toContain('Get a new pickup code');
      }
      if (screen === 'staff') {
        expect(html).toContain('Find pickup order');
        expect(html).toContain('Use camera');
        expect(html).not.toContain('Live camera appears here');
      }
      if (screen === 'camera') {
        expect(html).toContain('Enter short code');
        expect(html).not.toContain('8-character pickup code');
      }
      if (process.env.SHORT_CODE_RENDER_DIR) {
        mkdirSync(process.env.SHORT_CODE_RENDER_DIR, { recursive: true });
        writeFileSync(
          resolve(process.env.SHORT_CODE_RENDER_DIR, `${screen}-${mode}.html`),
          `<!doctype html><meta charset="utf-8">${renderToStaticMarkup(getStyleElement())}<style>body{margin:0}*{font-family:Arial,sans-serif!important}</style>${html}`,
        );
      }
    }
});
