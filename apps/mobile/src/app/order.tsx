import { FlowSection } from '@/components/flow-layout';
import { PickupRewardPanel } from '@/components/pickup/pickup-reward-panel';
import { PickupContactFields } from '@/components/pickup/pickup-contact-fields';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { PickupScrollView } from '@/components/pickup/pickup-scroll-view';
import { router, useLocalSearchParams } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { PickupMenu, type MenuBrowseState } from '@/components/pickup/pickup-menu';
import { PickupItem } from '@/components/pickup/pickup-item';
import { PickupActionButton } from '@/components/pickup/pickup-action-button';
import {
  PickupCart,
  PickupScheduler,
  PickupReview,
} from '@/components/pickup/pickup-checkout-steps';
import {
  CustomerFlowNavigation,
  PickupFlowLayout,
  PickupMerchantHeader,
} from '@/components/pickup/pickup-flow-layout';
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
import { commerce } from '@/lib/square-commerce';
import { pickupClockLabel } from '@/lib/pickup-checkout-presentation';
import { cartBarSummary, groupMenuProducts } from '@/lib/pickup-menu-controls';
import { getTodayHours } from '@/lib/discovery-core';
import { money } from '@/lib/square-commerce-core';
import { useAuth } from '@/providers/auth-provider';

export default function OrderScreen() {
  const params = useLocalSearchParams<{
    businessId?: string;
    orderId?: string;
    reorderFromOrderId?: string;
  }>();
  const { session } = useAuth();
  return (
    <OrderFlow
      key={`${session?.user.id ?? 'guest'}:${params.businessId ?? ''}:${params.orderId ?? ''}:${params.reorderFromOrderId ?? ''}`}
      params={params}
    />
  );
}
function OrderFlow({
  params,
}: {
  params: { businessId?: string; orderId?: string; reorderFromOrderId?: string };
}) {
  const flow = usePickupOrder(params);
  const { menu, order, step, cart, products, busy, quote, locked, setStep } = flow;
  const [browseState, setBrowseState] = useState<MenuBrowseState>({
    category: null,
    search: '',
    offset: 0,
  });
  const scrollOffsets = useRef<Partial<Record<OrderStep | 'status', number>>>({});
  const scrollKey = order ? 'status' : step;
  const enabled = pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV);
  const name = order?.businessName ?? flow.identity?.name ?? menu?.businessName ?? 'Order pickup';
  const canContinue =
    cart.length > 0 &&
    !flow.review.issues.length &&
    !flow.rewardIssue &&
    menu?.available &&
    !busy &&
    !locked;
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
      ? flow.rewardDiscount > 0
        ? `View cart (${flow.review.count}) · ${money(flow.review.subtotal - flow.rewardDiscount, products[0]?.currency ?? 'USD')}`
        : cartBarSummary(cart, products).label
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
              : quote.total === 0
                ? 'Place order · Free'
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
    return flow.run(async () => {
      await flow.loadMenu(flow.businessId);
    });
  };
  const pullRefresh = usePullRefresh(refresh);
  const notices = (
    <View style={{ gap: 12 }}>
      {!!flow.error && <ThemedText accessibilityLiveRegion="polite">{flow.error}</ThemedText>}
      {!!flow.reorderNotice && (
        <ThemedText themeColor="textSecondary" accessibilityLiveRegion="polite">
          {flow.reorderNotice}
        </ThemedText>
      )}
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
  const rewardPanel = (
    <PickupRewardPanel
      offer={flow.rewardOffer}
      selectedName={flow.rewardName}
      issue={flow.rewardIssue}
      saved={flow.rewardSaved}
      disabled={busy || locked || !menu?.available}
      hasCart={cart.length > 0}
      onChoose={flow.chooseReward}
      onApply={flow.applyOrderReward}
      onSave={flow.saveReward}
      onShow={flow.showReward}
      error={flow.rewardError}
      onRetry={() => {
        void flow.loadRewards();
      }}
    />
  );
  const edit = (index: number) => {
    const product = products.find((p) => p.id === cart[index]?.variationId);
    const variants = product
      ? groupMenuProducts(products).find((group) => group.products.some((p) => p.id === product.id))
          ?.products
      : undefined;
    if (product && !locked && !busy)
      flow.setEditing({
        product,
        index,
        ...(cart[index]?.rewardClaim &&
        flow.rewardOffer &&
        flow.rewardOffer.type !== 'percent_discount' &&
        !flow.rewardIssue
          ? {
              reward: flow.rewardOffer,
              ...(variants
                ? {
                    products: variants.filter((p) =>
                      flow.rewardOffer!.items.some((i) => i.id === p.id),
                    ),
                  }
                : {}),
            }
          : variants
            ? { products: variants }
            : {}),
      });
  };
  return (
    <>
      <PickupFlowLayout
        navigation={
          <CustomerFlowNavigation
            title={order ? 'Pickup order' : titles[step]}
            subtitle={!order && step !== 'menu' ? name : undefined}
            step={!order && step !== 'menu' ? orderSteps.indexOf(step) : undefined}
            onBack={back}
            onOrders={order ? () => router.replace('/orders') : undefined}
          />
        }
        footer={
          enabled && !order && (cart.length > 0 || step !== 'menu') ? (
            <View style={{ gap: 8 }}>
              {step === 'menu' && (
                <ThemedText type="caption" themeColor="textSecondary">
                  Estimated items · tax at review
                </ThemedText>
              )}
              {step === 'menu' ? (
                <PickupActionButton
                  label="View cart"
                  count={flow.review.count}
                  amount={money(
                    flow.review.subtotal - flow.rewardDiscount,
                    products[0]?.currency ?? 'USD',
                  )}
                  loading={busy}
                  disabled={busy}
                  onPress={next}
                />
              ) : (
                <AppButton
                  label={action}
                  loading={busy}
                  disabled={
                    step === 'review' && locked
                      ? !quote || flow.expired || !menu?.available
                      : !canContinue ||
                        (step === 'pickup' && !flow.slot) ||
                        (step === 'contact' && !!contactIssue(flow.name, flow.phone))
                  }
                  onPress={next}
                />
              )}
            </View>
          ) : undefined
        }
      >
        {enabled && !order && step === 'menu' ? (
          <PickupMenu
            products={products}
            cart={cart}
            disabled={busy || locked || !menu?.available}
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
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
                {rewardPanel}
              </View>
            }
          />
        ) : (
          <PickupScrollView
            key={scrollKey}
            getSavedOffset={() => scrollOffsets.current[scrollKey] ?? 0}
            style={{ flex: 1, minHeight: 0 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 24, gap: 16 }}
            onOffsetChange={(offset) => {
              scrollOffsets.current[scrollKey] = offset;
            }}
            scrollEventThrottle={100}
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
                      confirmingPayment={flow.confirmingPayment}
                      confirmationSlow={flow.confirmationSlow}
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
                      onSupportRequest={(requestType, message) => {
                        void flow.run(async () => {
                          await commerce('customer_order_request', {
                            orderId: order.id,
                            statusToken:
                              flow.access?.orderId === order.id
                                ? flow.access.statusToken
                                : undefined,
                            requestType,
                            message,
                          });
                          await flow.refreshOrder();
                        });
                      }}
                      onReview={(rating, text) => {
                        void flow.run(async () => {
                          await commerce('submit_pickup_review', {
                            orderId: order.id,
                            statusToken:
                              flow.access?.orderId === order.id
                                ? flow.access.statusToken
                                : undefined,
                            rating,
                            text,
                          });
                          await flow.refreshOrder();
                        });
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
                    ].includes(order.status) && (
                      <FlowSection
                        title="Order notifications"
                        description="Manage updates for your pickup"
                        collapsible
                      >
                        <OrderNotificationSettings hideHeading />
                      </FlowSection>
                    )}
                  </>
                ) : (
                  <>
                    {step === 'cart' && (
                      <>
                        {rewardPanel}
                        <PickupCart
                          cart={cart}
                          rewardDiscount={flow.rewardDiscount}
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
                      <View style={{ gap: 12 }}>
                        <PickupContactFields
                          name={flow.name}
                          phone={flow.phone}
                          onName={flow.setName}
                          onPhone={flow.setPhone}
                          disabled={busy || locked}
                        />
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
          </PickupScrollView>
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
          reward={flow.editing.reward}
          disabled={busy || locked || !menu?.available}
          onClose={() => flow.setEditing(null)}
          onSave={flow.saveItem}
        />
      )}
    </>
  );
}
