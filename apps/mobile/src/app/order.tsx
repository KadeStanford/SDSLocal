import { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { CommerceField } from '@/components/commerce-fields';
import { ThemedText } from '@/components/themed-text';
import { PickupMenu, type MenuBrowseState } from '@/components/pickup/pickup-menu';
import { PickupItem } from '@/components/pickup/pickup-item';
import {
  PickupCart,
  PickupScheduler,
  PickupReview,
} from '@/components/pickup/pickup-checkout-steps';
import { PickupFlowLayout, PickupMerchantHeader } from '@/components/pickup/pickup-flow-layout';
import { PickupStatus } from '@/components/pickup/pickup-status';
import { OrderNotificationSettings } from '@/components/pickup/order-notification-settings';
import { PickupCode } from '@/components/pickup/pickup-code';
import { usePickupOrder } from '@/hooks/use-pickup-order';
import {
  contactIssue,
  orderSteps,
  previousOrderStep,
  type OrderStep,
} from '@/lib/pickup-order-flow';
import { pickupDiscoveryEnabled, pickupModulePresentation } from '@/lib/pickup-discovery';
import { pickupClockLabel } from '@/lib/pickup-checkout-presentation';
import { cartBarSummary, groupMenuProducts } from '@/lib/pickup-menu-controls';
import { getTodayHours } from '@/lib/discovery-core';
import { money } from '@/lib/square-commerce-core';
import { useAuth } from '@/providers/auth-provider';

export default function OrderScreen() {
  const params = useLocalSearchParams<{ businessId?: string; orderId?: string }>();
  const { session } = useAuth();
  return (
    <OrderFlow
      key={`${session?.user.id ?? 'guest'}:${params.businessId ?? ''}:${params.orderId ?? ''}`}
      params={params}
    />
  );
}
function OrderFlow({ params }: { params: { businessId?: string; orderId?: string } }) {
  const flow = usePickupOrder(params);
  const { menu, order, step, cart, products, busy, quote, locked, setStep } = flow;
  const [browseState, setBrowseState] = useState<MenuBrowseState>({
    category: null,
    search: '',
    offset: 0,
  });
  const scrollOffsets = useRef<Partial<Record<OrderStep, number>>>({});
  const scroll = useRef<ScrollView>(null);
  const enabled = pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV);
  const name = order?.businessName ?? flow.identity?.name ?? menu?.businessName ?? 'Order pickup';
  const canContinue =
    cart.length > 0 && !flow.review.issues.length && menu?.available && !busy && !locked;
  const availability = pickupModulePresentation(process.env.EXPO_PUBLIC_APP_ENV, {
    businessId: flow.businessId,
    supported: menu?.status === 'unsupported' ? false : true,
    loading: !menu && busy,
    failed: menu?.status === 'unavailable',
    availability: menu,
    orderId: null,
    physicalState: flow.identity
      ? getTodayHours(flow.identity.hours, new Date(), flow.identity.timezone).state
      : 'unknown',
  });
  const titles = {
    menu: 'Menu',
    cart: 'Your cart',
    pickup: 'Pickup time',
    contact: 'Pickup contact',
    review: 'Review order',
  };
  const action =
    step === 'menu'
      ? cartBarSummary(cart, products).label
      : step === 'cart'
        ? 'Choose pickup time'
        : step === 'pickup'
          ? flow.slot
            ? `Continue · ${pickupClockLabel(flow.slot)}`
            : 'Choose a pickup time'
          : step === 'contact'
            ? 'Review order'
            : flow.expired || !quote
              ? 'Refresh total'
              : `Secure payment · ${money(quote.total, quote.currency)}`;
  function back() {
    if (!order && step !== 'menu' && !locked) setStep(previousOrderStep(step));
    else if (router.canGoBack()) router.back();
    else router.replace(order ? '/orders' : '/explore');
  }
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!order && step !== 'menu' && !locked) {
        setStep(previousOrderStep(step));
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [step, order, locked, setStep]);
  function next() {
    if (step === 'menu') setStep('cart');
    else if (step === 'cart') setStep('pickup');
    else if (step === 'pickup') setStep('contact');
    else if (step === 'contact' || flow.expired || !quote) void flow.run(flow.reviewTotal);
    else void flow.run(flow.checkout);
  }
  const refresh = () => {
    void flow.run(async () => {
      await flow.loadMenu(flow.businessId);
    });
  };
  const notices = (
    <View style={{ gap: 12 }}>
      {!!flow.error && <ThemedText accessibilityLiveRegion="polite">{flow.error}</ThemedText>}
      {flow.storageWarning && (
        <ThemedText accessibilityLiveRegion="polite">
          Your change could not be saved. Your previous cart is unchanged. Please retry.
        </ThemedText>
      )}
      {flow.resumeOrder && !order && (
        <AppButton
          label="View your previous pickup order"
          variant="secondary"
          loading={busy}
          onPress={() => {
            void flow.run(flow.resume);
          }}
        />
      )}
      {!order && locked && (
        <View style={{ gap: 8 }}>
          <ThemedText>
            Your checkout is saved. Recover its status before changing this order.
          </ThemedText>
          <AppButton
            label="Recover checkout status"
            variant="secondary"
            loading={busy}
            onPress={() => {
              void flow.run(flow.recover);
            }}
          />
        </View>
      )}
      {!order && (!menu?.available || step === 'menu') && (
        <View style={{ gap: 4 }}>
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">
            {availability.kind === 'hidden' ? 'Pickup ordering is unavailable' : availability.title}
          </ThemedText>
          {availability.kind !== 'hidden' && (
            <ThemedText type="small" themeColor="textSecondary">
              {availability.message}
            </ThemedText>
          )}
          {!menu?.available && !busy && (
            <>
              <ThemedText type="small" themeColor="textSecondary">
                Your saved cart is kept here.
              </ThemedText>
              <AppButton label="Refresh pickup options" variant="secondary" onPress={refresh} />
            </>
          )}
        </View>
      )}
    </View>
  );
  const edit = (index: number) => {
    const product = products.find((p) => p.id === cart[index]?.variationId);
    const variants = product
      ? groupMenuProducts(products).find((group) => group.products.some((p) => p.id === product.id))
          ?.products
      : undefined;
    if (product && !locked && !busy)
      flow.setEditing({ product, index, ...(variants ? { products: variants } : {}) });
  };
  return (
    <>
      <PickupFlowLayout
        navigation={
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <AppButton
              label="‹ Back"
              accessibilityLabel={step === 'menu' && !order ? 'Back to business' : 'Back'}
              variant="tertiary"
              onPress={back}
              style={{ paddingHorizontal: 4, minWidth: 64 }}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {step !== 'menu' && !order ? (
                <>
                  <ThemedText type="smallBold">{titles[step]}</ThemedText>
                  <ThemedText type="caption" themeColor="textSecondary">
                    {name} · {orderSteps.indexOf(step)} of 4
                  </ThemedText>
                </>
              ) : (
                <ThemedText type="smallBold">{order ? 'Pickup order' : 'Order pickup'}</ThemedText>
              )}
            </View>
            {order && (
              <AppButton
                label="Orders"
                accessibilityLabel="View all your orders"
                variant="tertiary"
                onPress={() => router.replace('/orders')}
              />
            )}
          </View>
        }
        footer={
          enabled && !order && (cart.length > 0 || step !== 'menu') ? (
            <View style={{ gap: 8 }}>
              {step === 'menu' && (
                <ThemedText type="caption" themeColor="textSecondary">
                  Estimated items · tax at review
                </ThemedText>
              )}
              <AppButton
                label={action}
                loading={busy}
                disabled={
                  step === 'menu'
                    ? busy
                    : step === 'review' && locked
                      ? !quote || flow.expired || !menu?.available
                      : !canContinue ||
                        (step === 'pickup' && !flow.slot) ||
                        (step === 'contact' && !!contactIssue(flow.name, flow.phone))
                }
                onPress={next}
              />
            </View>
          ) : undefined
        }
      >
        {enabled && !order && step === 'menu' ? (
          <PickupMenu
            products={products}
            cart={cart}
            disabled={busy || locked || !menu?.available}
            refreshing={busy}
            onRefresh={refresh}
            browseState={browseState}
            onBrowseChange={(change) => setBrowseState((old) => ({ ...old, ...change }))}
            onChoose={(product, variants) =>
              flow.setEditing({ product, index: null, ...(variants ? { products: variants } : {}) })
            }
            onAdd={flow.quickAdd}
            onQuantity={flow.changeQuantity}
            header={
              <View style={{ gap: 16 }}>
                <PickupMerchantHeader
                  name={name}
                  color={flow.identity?.primary_color}
                  photos={flow.identity?.photos}
                />
                {(!order || flow.error || flow.storageWarning) && notices}
              </View>
            }
          />
        ) : (
          <ScrollView
            key={order ? 'status' : step}
            ref={scroll}
            style={{ flex: 1, minHeight: 0 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 16 }}
            onScroll={(e) => {
              scrollOffsets.current[step] = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={100}
            onContentSizeChange={() =>
              scroll.current?.scrollTo({ y: scrollOffsets.current[step] ?? 0, animated: false })
            }
          >
            {!enabled ? (
              <ThemedText>Pickup ordering is not available in this environment.</ThemedText>
            ) : (
              <>
                {(!order || flow.error || flow.storageWarning) && notices}
                {order ? (
                  <>
                    <PickupStatus
                      order={order}
                      pickupCode={
                        order.status === 'ready' && (
                          <PickupCode
                            key={order.id}
                            orderId={order.id}
                            statusToken={flow.access?.statusToken}
                          />
                        )
                      }
                      lastUpdated={flow.lastUpdated}
                      onError={flow.setError}
                      busy={busy}
                      onRefresh={() => {
                        void flow.run(flow.refreshOrder);
                      }}
                      onCheckout={() => {
                        void flow.run(flow.reopen);
                      }}
                      onNew={
                        flow.businessId
                          ? () => {
                              void flow.run(flow.startAnother);
                            }
                          : undefined
                      }
                    />
                    {![
                      'checkout_pending',
                      'checkout_expired',
                      'checkout_failed',
                      'refunded',
                      'completed',
                    ].includes(order.status) && <OrderNotificationSettings />}
                  </>
                ) : (
                  <>
                    {step === 'cart' && (
                      <>
                        <PickupCart
                          cart={cart}
                          products={products}
                          disabled={busy || locked}
                          onEdit={edit}
                          onRemove={flow.removeLine}
                          onQuantity={flow.changeLineQuantity}
                        />
                        <AppButton
                          label="Add more items"
                          variant="secondary"
                          disabled={locked}
                          onPress={() => setStep('menu')}
                        />
                      </>
                    )}
                    {step === 'pickup' && (
                      <PickupScheduler
                        slots={menu?.available ? (menu.slots ?? []) : []}
                        place={flow.place}
                        slot={flow.slot}
                        onPlace={flow.choosePlace}
                        onSlot={flow.chooseSlot}
                      />
                    )}
                    {step === 'contact' && (
                      <View style={{ gap: 20 }}>
                        <ThemedText type="card">Who’s picking up?</ThemedText>
                        <CommerceField
                          label="Pickup name"
                          autoComplete="name"
                          maxLength={100}
                          value={flow.name}
                          onChangeText={flow.setName}
                          editable={!busy && !locked}
                        />
                        <CommerceField
                          label="Phone number"
                          autoComplete="tel"
                          keyboardType="phone-pad"
                          placeholder="(225) 555-0123"
                          value={flow.phone}
                          onChangeText={flow.setPhone}
                          editable={!busy && !locked}
                        />
                        <ThemedText type="small" themeColor="textSecondary">
                          Used only if the business needs to reach you about pickup.
                        </ThemedText>
                        {!!flow.phone && !!contactIssue(flow.name, flow.phone) && (
                          <ThemedText accessibilityLiveRegion="polite">
                            {contactIssue(flow.name, flow.phone)}
                          </ThemedText>
                        )}
                      </View>
                    )}
                    {step === 'review' && quote && (
                      <PickupReview
                        quote={quote}
                        name={flow.name}
                        phone={flow.phone}
                        cart={cart}
                        products={products}
                        expired={flow.expired}
                        onEdit={!locked && !busy ? setStep : undefined}
                      />
                    )}
                    {step === 'review' && !quote && (
                      <ThemedText>
                        Pickup options were refreshed. Refresh your total to review the latest
                        details.
                      </ThemedText>
                    )}
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </PickupFlowLayout>
      {flow.editing && (
        <PickupItem
          key={`${flow.editing.product.id}:${flow.editing.index}:${flow.editing.products?.map((p) => p.id).join(',') ?? ''}`}
          product={
            products.find((p) => p.id === flow.editing?.product.id) ?? {
              ...flow.editing.product,
              available: false,
            }
          }
          {...(flow.editing.products ? { variants: flow.editing.products } : {})}
          line={flow.editing.index === null ? undefined : cart[flow.editing.index]}
          disabled={busy || locked || !menu?.available}
          onClose={() => flow.setEditing(null)}
          onSave={flow.saveItem}
        />
      )}
    </>
  );
}
