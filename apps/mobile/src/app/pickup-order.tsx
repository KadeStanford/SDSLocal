import {
  BusinessOrderHeader,
  FulfillmentActions,
} from '@/components/pickup/business-order-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useOrderPolling } from '@/hooks/use-order-polling';
import { commerce, openCheckout } from '@/lib/square-commerce';
import { money, orderStatusLabel, type PickupOrder } from '@/lib/square-commerce-core';
import { pickupError, singleFlight } from '@/lib/pickup-workspace';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { ListLoading, StateNotice } from '@/components/data-state';
import { OrderReceipt, OrderTimeline, PickupFacts } from '@/components/pickup/order-presentation';
export default function PickupOrderDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const { mode, loading: modeLoading } = useAppMode();
  const userId = session?.user.id;
  const eligible = !!userId && mode === 'business';
  useEffect(() => {
    if (!authLoading && !modeLoading && !eligible) router.replace('/explore');
  }, [authLoading, modeLoading, eligible]);
  const read = useCallback(() => {
    if (!eligible)
      return Promise.reject(Object.assign(new Error('Sign in required'), { code: 'SIGN_IN' }));
    return commerce<{
      order: PickupOrder;
      permissions: { canRefund: boolean; canManage: boolean };
    }>('operator_detail', { orderId });
  }, [orderId, eligible, userId]);
  const state = useOrderPolling(`${userId}:${orderId}`, read);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const run = useRef(singleFlight()).current;
  const order = eligible ? state.data?.order : undefined;
  async function act(action: 'order_action' | 'refund', next?: string) {
    if (!order) return;
    await run(async () => {
      setBusy(true);
      setNotice('');
      try {
        await commerce(action, {
          orderId: order.id,
          version: order.version,
          next,
          confirmed: action === 'refund',
        });
        await state.refresh(true);
      } catch (e) {
        if (
          (e as { status?: number }).status === 409 ||
          ['BUSY', 'INVALID_TRANSITION'].includes((e as { code?: string }).code ?? '')
        ) {
          const latest = await state.refresh(true);
          setNotice(
            latest
              ? latest.order.status !== order.status
                ? `Updated from ${orderStatusLabel[order.status] ?? 'the previous status'} to ${orderStatusLabel[latest.order.status] ?? 'the latest status'}. Review the order before continuing.`
                : 'Another update is in progress. The order was refreshed; review its status before continuing.'
              : 'This order may have changed. Refresh successfully before taking another action.',
          );
        } else state.setError(pickupError(e));
      } finally {
        setBusy(false);
      }
    });
  }
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={state.loading && !!order}
            onRefresh={() => void state.refresh()}
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 24,
          gap: 24,
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
        }}
      >
        <AppButton
          label="Back to orders"
          variant="tertiary"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/pickup-orders'))}
        />
        {!!state.error && (
          <>
            <StateNotice message={state.error} kind="error" />
            <AppButton label="Retry" variant="secondary" onPress={() => void state.refresh()} />
          </>
        )}
        {!!notice && <StateNotice message={notice} />}
        {!order && !state.error && <ListLoading label="Loading order" />}
        {order && (
          <>
            <BusinessOrderHeader order={order} />
            <PickupFacts order={order} />
            <View style={{ gap: 8 }}>
              <ThemedText type="card">Pickup contact</ThemedText>
              <ThemedText>{order.recipient?.display_name || 'Pickup customer'}</ThemedText>
              {order.recipient?.phone_number && (
                <AppButton
                  label={`Call ${order.recipient.phone_number}`}
                  variant="secondary"
                  onPress={() => {
                    const phone = order.recipient?.phone_number?.replace(/[^\d+]/g, '');
                    if (phone)
                      void Linking.openURL(`tel:${phone}`).catch(() =>
                        state.setError('Your phone could not start the call.'),
                      );
                  }}
                />
              )}
            </View>
            <OrderReceipt order={order} title="Order items & total" />
            <View style={{ gap: 16 }}>
              <ThemedText type="card">Fulfillment timeline</ThemedText>
              <OrderTimeline order={order} />
            </View>
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {state.lastUpdated
                ? `Updated ${new Date(state.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · Auto-updates while open`
                : 'Checking status…'}
            </ThemedText>
            <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 16 }}>
              <ThemedText type="smallBold">
                Payment & {order.provider === 'stripe' ? 'Stripe record' : 'Square record'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Fulfill this pickup here.{' '}
                {order.provider === 'stripe'
                  ? 'Stripe keeps the payment and refund record.'
                  : 'Square keeps the payment and refund record.'}
              </ThemedText>
              {order.dashboardUrl && (
                <AppButton
                  label={order.provider === 'stripe' ? 'Open in Stripe' : 'Open in Square'}
                  variant="tertiary"
                  onPress={() =>
                    void openCheckout(order.dashboardUrl!).catch(() =>
                      state.setError(
                        `${order.provider === 'stripe' ? 'Stripe' : 'Square'} could not open. Try again.`,
                      ),
                    )
                  }
                />
              )}
              {order.squareOrderId && (
                <ThemedText selectable type="small" themeColor="textSecondary">
                  {order.provider === 'stripe' ? 'Stripe reference' : 'Square reference'}:{' '}
                  {order.squareOrderId}
                </ThemedText>
              )}
            </View>
          </>
        )}
      </ScrollView>
      {order && (
        <View
          style={{
            padding: 16,
            paddingBottom: Math.max(16, insets.bottom),
            borderTopWidth: 1,
            borderTopColor: c.divider,
            backgroundColor: c.background,
          }}
        >
          <FulfillmentActions
            order={order}
            busy={busy}
            disabled={state.loading || !!state.error}
            canRefund={state.data?.permissions.canRefund ?? false}
            onTransition={(next) => void act('order_action', next)}
            onRefund={() =>
              Alert.alert(
                'Cancel and refund this order?',
                `Request the full ${money(order.total, order.currency)} back through ${order.provider === 'stripe' ? 'Stripe' : 'Square'}. A refund is only complete after the payment provider confirms it.`,
                [
                  { text: 'Keep order', style: 'cancel' },
                  {
                    text: 'Confirm full refund',
                    style: 'destructive',
                    onPress: () => void act('refund'),
                  },
                ],
              )
            }
          />
        </View>
      )}
    </SafeAreaView>
  );
}
