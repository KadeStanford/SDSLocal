import { FlowSection, FlowIdentity } from '@/components/flow-layout';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import {
  BusinessOrderHeader,
  FulfillmentActions,
} from '@/components/pickup/business-order-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, RefreshControl, ScrollView, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { useOrderPolling } from '@/hooks/use-order-polling';
import { commerce, openCheckout } from '@/lib/square-commerce';
import {
  money,
  orderStatusLabel,
  type OrderSupportRequest,
  type PickupOrder,
} from '@/lib/square-commerce-core';
import { pickupError, singleFlight } from '@/lib/pickup-workspace';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { ListLoading, StateNotice } from '@/components/data-state';
import { OrderReceipt, OrderTimeline, PickupFacts } from '@/components/pickup/order-presentation';
import { OrderActionsSheet } from '@/components/pickup/order-actions-sheet';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
export default function PickupOrderDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { session, loading: authLoading } = useAuth();
  const { mode, loading: modeLoading } = useAppMode();
  const userId = session?.user.id;
  const workspace = usePickupWorkspace();
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
      supportRequests: OrderSupportRequest[];
    }>('operator_detail', { orderId });
  }, [orderId, eligible, userId]);
  const state = useOrderPolling(`${userId}:${orderId}`, read);
  const pullRefresh = usePullRefresh(() => state.refresh());
  const [busy, setBusy] = useState(false);
  const [showOrderActions, setShowOrderActions] = useState(false);
  const [requestCancellation, setRequestCancellation] = useState(false);
  const [notice, setNotice] = useState('');
  const [supportReply, setSupportReply] = useState('');
  const run = useRef(singleFlight()).current;
  const order = eligible ? state.data?.order : undefined;
  async function act(
    action: 'order_action' | 'refund' | 'resolve_payment_review',
    next?: string,
    items?: { itemId: string; quantity: number }[],
  ) {
    if (!order) return;
    await run(async () => {
      setBusy(true);
      setNotice('');
      try {
        const result = await commerce<{ order: PickupOrder }>(action, {
          orderId: order.id,
          version: order.version,
          next,
          items,
          confirmed: action !== 'order_action',
        });
        state.updateData((data) => ({ ...data, order: result.order }));
        void workspace.refresh();
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
  async function replyToOrderRequest(requestId: string, resolution: 'resolved' | 'declined') {
    if (!order || supportReply.trim().length < 3) return;
    await run(async () => {
      setBusy(true);
      setNotice('');
      try {
        const result = await commerce<{ supportRequest: OrderSupportRequest }>(
          'resolve_order_request',
          {
            orderId: order.id,
            requestId,
            resolution,
            response: supportReply,
          },
        );
        state.updateData((data) => ({
          ...data,
          supportRequests: data.supportRequests.map((request) =>
            request.id === result.supportRequest.id ? result.supportRequest : request,
          ),
        }));
        setSupportReply('');
        setNotice('Reply sent to the customer.');
        void workspace.refresh();
        await state.refresh(true);
      } catch (e) {
        state.setError(pickupError(e));
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
          <RefreshControl refreshing={pullRefresh.refreshing} onRefresh={pullRefresh.onRefresh} />
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
              <FlowIdentity name={order.recipient?.display_name || 'Pickup customer'} />
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
            {(state.data?.supportRequests.length ?? 0) > 0 && (
              <View style={{ gap: 12 }}>
                <ThemedText type="card" accessibilityLiveRegion="polite">
                  Customer requests ·{' '}
                  {state.data?.supportRequests.filter((r) => r.status === 'open').length ?? 0}{' '}
                  awaiting reply
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  Cancel & refund returns the remaining payment and closes the request after
                  confirmation. Use a reply for other agreed changes.
                </ThemedText>
                {state.data?.supportRequests.map((request) => (
                  <View
                    key={request.id}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      gap: 10,
                      backgroundColor: c.backgroundElement,
                      borderWidth: request.status === 'open' ? 2 : 1,
                      borderColor: request.status === 'open' ? c.warningText : c.divider,
                    }}
                  >
                    <ThemedText type="smallBold">
                      {supportRequestLabel(request.type)} ·{' '}
                      {request.status === 'open'
                        ? 'Action needed — reply to customer'
                        : request.status === 'resolved'
                          ? 'Reply sent · resolved'
                          : 'Reply sent · declined'}
                    </ThemedText>
                    <FlowSection title="Customer message">
                      <ThemedText>{request.message}</ThemedText>
                    </FlowSection>
                    {request.status === 'open' ? (
                      <>
                        <TextInput
                          accessibilityLabel="Reply to customer request"
                          placeholder="Write a short reply"
                          placeholderTextColor={c.textSecondary}
                          value={supportReply}
                          editable={!busy && !state.loading && !state.error}
                          onChangeText={setSupportReply}
                          maxLength={1500}
                          multiline
                          textAlignVertical="top"
                          style={{
                            minHeight: 88,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: c.background,
                            color: c.text,
                            fontSize: 16,
                          }}
                        />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {request.type === 'cancel' &&
                            state.data?.permissions.canRefund &&
                            !!order.paidAt &&
                            [
                              'placed',
                              'accepted',
                              'preparing',
                              'ready',
                              'refund_failed',
                              'payment_review',
                            ].includes(order.status) &&
                            (!order.disputeState ||
                              ['WON', 'RESOLVED'].includes(order.disputeState)) && (
                              <AppButton
                                label="Cancel & refund"
                                variant="destructive"
                                disabled={busy || state.loading || !!state.error}
                                onPress={() => {
                                  setRequestCancellation(true);
                                  setShowOrderActions(true);
                                }}
                              />
                            )}
                          <AppButton
                            label="Resolve & reply"
                            disabled={
                              busy ||
                              state.loading ||
                              !!state.error ||
                              supportReply.trim().length < 3
                            }
                            loading={busy}
                            onPress={() => void replyToOrderRequest(request.id, 'resolved')}
                          />
                          <AppButton
                            label="Decline & reply"
                            variant="secondary"
                            disabled={
                              busy ||
                              state.loading ||
                              !!state.error ||
                              supportReply.trim().length < 3
                            }
                            onPress={() => void replyToOrderRequest(request.id, 'declined')}
                          />
                        </View>
                      </>
                    ) : (
                      <ThemedText themeColor="textSecondary">{request.response}</ThemedText>
                    )}
                  </View>
                ))}
              </View>
            )}
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
            onMore={() => {
              setRequestCancellation(false);
              setShowOrderActions(true);
            }}
            onRefund={() => {
              setRequestCancellation(false);
              setShowOrderActions(true);
            }}
          />
        </View>
      )}
      {order && (
        <OrderActionsSheet
          visible={showOrderActions}
          initialMode={requestCancellation ? 'full' : 'actions'}
          onClose={() => setShowOrderActions(false)}
          order={order}
          canRefund={state.data?.permissions.canRefund ?? false}
          disabled={busy || state.loading || !!state.error}
          onRefund={(items) => act('refund', undefined, items)}
          onReview={() => act('resolve_payment_review')}
        />
      )}
    </SafeAreaView>
  );
}

function supportRequestLabel(type: OrderSupportRequest['type']) {
  return type === 'cancel'
    ? 'Cancellation request'
    : type === 'change'
      ? 'Order change request'
      : 'Other help';
}
