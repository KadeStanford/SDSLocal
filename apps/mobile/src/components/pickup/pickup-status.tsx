import { SymbolView } from 'expo-symbols';
import { pendingPaymentPresentation } from '@/lib/pending-payment';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { AppButton } from '../app-button';
import { BusinessLogo } from '../business-logo';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { fulfillmentSteps, orderTracking } from '@/lib/pickup-order-flow';
import {
  orderStatusLabel,
  pickupLabel,
  type OrderSupportType,
  type PickupOrder,
} from '@/lib/square-commerce-core';
import { buildDirectionsUrl } from '@/lib/external-actions';
import { storagePublicUrl } from '@/lib/storage-url';
import { shortOrderNumber } from '@/lib/pickup-workspace';
import { customerOrderCancelCutoff } from '@/lib/customer-orders';
import { OrderReceipt, OrderTimeline } from './order-presentation';

export function CustomerOrderIdentity({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const background = c.backgroundElement;
  const foreground = c.text;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 16,
        borderRadius: 16,
        backgroundColor: background,
      }}
    >
      <BusinessLogo
        name={order.businessName}
        uri={order.business?.logoPath ? storagePublicUrl(order.business.logoPath) : null}
        size={44}
        decorative
      />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <ThemedText type="card" style={{ color: foreground }}>
          {order.businessName}
        </ThemedText>
        <ThemedText type="small" style={{ color: foreground }}>
          Pickup · #{shortOrderNumber(order.number)}
        </ThemedText>
      </View>
    </View>
  );
}
export function CustomerOrderProgress({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const tracking = orderTracking(order.status);
  const message =
    {
      placed: 'We’ve received it and sent it to the business.',
      accepted: 'The business accepted your order and is getting it ready.',
      preparing: 'Your order is being prepared for pickup.',
    }[order.status as 'placed' | 'accepted' | 'preparing'] ??
    (order.total === 0 && order.status === 'refunded'
      ? 'This order was cancelled and your reward was restored.'
      : tracking.message);
  const prepMinutes = Number.isFinite(order.preparationMinutes)
    ? Math.max(1, Math.round(order.preparationMinutes as number))
    : null;
  const showPrepTime =
    prepMinutes !== null &&
    (order.status === 'placed' || order.status === 'accepted' || order.status === 'preparing');
  const nextStep =
    order.status === 'placed'
      ? 'The business will accept your order, then start preparing it.'
      : order.status === 'accepted'
        ? 'Your order is in the prep queue. We’ll notify you as it moves forward.'
        : order.status === 'preparing'
          ? 'We’ll let you know as soon as it is ready for pickup.'
          : order.status === 'ready'
            ? 'Show your pickup QR at the counter when you arrive.'
            : null;
  return (
    <View style={styles.progressRoot}>
      <View style={styles.progressHeader}>
        <View style={styles.progressHeading}>
          <ThemedText
            type="card"
            style={{ fontSize: 24, lineHeight: 30, letterSpacing: -0.5 }}
            accessibilityLiveRegion="polite"
          >
            {orderStatusLabel[order.status] ?? 'Order status'}
          </ThemedText>
        </View>
        {tracking.index >= 0 && (
          <View style={[styles.stepBadge, { backgroundColor: c.backgroundSelected }]}>
            <ThemedText type="smallBold">
              {tracking.index + 1}/{fulfillmentSteps.length}
            </ThemedText>
          </View>
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      {showPrepTime && (
        <View style={[styles.prepCallout, { backgroundColor: c.backgroundSelected }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              Estimated prep time
            </ThemedText>
            <ThemedText type="card">{prepMinutes} min</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            We’ll keep you posted
          </ThemedText>
        </View>
      )}
      {nextStep && (
        <View style={[styles.nextStep, { borderTopColor: c.divider }]}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            What happens next
          </ThemedText>
          <ThemedText type="small">{nextStep}</ThemedText>
        </View>
      )}
      {tracking.index >= 0 && (
        <View
          accessibilityLabel={`Pickup progress: ${fulfillmentSteps[tracking.index]?.[1]}, step ${tracking.index + 1} of 5`}
          style={{ gap: 8 }}
        >
          <View accessible={false} style={styles.progressSegments}>
            {fulfillmentSteps.map(([key], index) => (
              <View
                key={key}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 4,
                  backgroundColor: index <= tracking.index ? c.accent : c.divider,
                }}
              />
            ))}
          </View>
          <View style={styles.progressMeta}>
            <ThemedText type="smallBold">
              {fulfillmentSteps[tracking.index]?.[1] ?? 'In progress'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {tracking.terminal
                ? 'Pickup complete'
                : `Next · ${fulfillmentSteps[tracking.index + 1]?.[1] ?? 'Pickup'}`}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}
export function PickupStatus({
  order,
  busy,
  onRefresh,
  onCheckout,
  onNew,
  lastUpdated,
  onError,
  pickupCode,
  onSupportRequest,
  onReview,
  confirmingPayment = false,
  confirmationSlow = false,
}: {
  order: PickupOrder;
  busy: boolean;
  onRefresh: () => void;
  onCheckout: () => void;
  onNew: (() => void) | undefined;
  lastUpdated?: number | null;
  onError?: (message: string) => void;
  pickupCode?: ReactNode;
  onSupportRequest?: (type: OrderSupportType, message: string) => void;
  onReview?: (rating: number, text: string) => void;
  confirmingPayment?: boolean;
  confirmationSlow?: boolean;
}) {
  const c = useTheme();
  const tracking = orderTracking(order.status);
  const [activity, setActivity] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportType, setSupportType] = useState<OrderSupportType>('issue');
  const [supportMessage, setSupportMessage] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const directions = buildDirectionsUrl(
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    { address: order.address, label: order.businessName },
  );
  const cancelCutoff = customerOrderCancelCutoff(order);
  const open = (url: string) => {
    void Linking.openURL(url).catch(() =>
      onError?.('This action could not open. Please try again.'),
    );
  };
  const payment = pendingPaymentPresentation(order, confirmingPayment, confirmationSlow);
  if (order.status === 'checkout_pending')
    return (
      <View style={{ gap: 16 }}>
        <CustomerOrderIdentity order={order} />
        <View
          style={{
            padding: 24,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.divider,
            backgroundColor: c.backgroundElement,
            gap: 16,
            alignItems: 'center',
          }}
          accessibilityLiveRegion="polite"
        >
          {payment.waiting && !confirmationSlow ? (
            <ActivityIndicator
              color={c.accent}
              size="large"
              accessibilityLabel="Checking payment status"
            />
          ) : (
            <SymbolView
              name={payment.waiting ? 'clock' : 'creditcard'}
              tintColor={c.accent}
              style={{ width: 32, height: 32 }}
            />
          )}
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
            {payment.title}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
            {payment.message}
          </ThemedText>
          <View style={{ alignSelf: 'stretch', gap: 12 }}>
            {payment.canContinue && (order.checkoutUrl || order.provider === 'stripe') && (
              <AppButton label="Continue payment" loading={busy} onPress={onCheckout} />
            )}
            <AppButton
              label="Check payment status"
              variant="secondary"
              disabled={busy}
              onPress={onRefresh}
            />
          </View>
        </View>
      </View>
    );
  return (
    <View style={{ gap: 16 }}>
      <CustomerOrderIdentity order={order} />
      <View
        style={{
          padding: 20,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: c.divider,
          backgroundColor: c.backgroundElement,
          gap: 16,
        }}
      >
        <CustomerOrderProgress order={order} />
        {tracking.index >= 0 && (
          <>
            <AppButton
              label={activity ? 'Hide order activity' : 'View order activity'}
              variant="secondary"
              onPress={() => setActivity((old) => !old)}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 16 }}
            />
            {activity && <OrderTimeline order={order} />}
          </>
        )}
      </View>
      {pickupCode}
      <View
        style={{ padding: 16, borderRadius: 16, gap: 12, backgroundColor: c.backgroundElement }}
      >
        <View style={{ gap: 4 }}>
          <ThemedText type="small" themeColor="textSecondary">
            {tracking.terminal ? 'Pickup details' : 'Pickup time'}
          </ThemedText>
          <ThemedText type="card">
            {pickupLabel({
              at: order.pickupAt,
              timezone: order.business?.timezone ?? order.timezone,
            })}
          </ThemedText>
        </View>
        {!!order.address && <ThemedText themeColor="textSecondary">{order.address}</ThemedText>}
        {(directions || order.business?.phone) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {directions && (
              <AppButton
                label="Directions"
                accessibilityLabel="Get directions"
                variant={order.status === 'ready' ? 'primary' : 'secondary'}
                onPress={() => open(directions)}
                style={{ flexGrow: 1 }}
              />
            )}
            {order.business?.phone && (
              <AppButton
                label="Call business"
                variant="secondary"
                onPress={() => open(`tel:${order.business!.phone!.replace(/[^\d+]/g, '')}`)}
                style={{ flexGrow: 1 }}
              />
            )}
          </View>
        )}
      </View>
      <OrderReceipt order={order} />
      {order.status === 'completed' && onReview && (
        <View
          style={{ padding: 16, borderRadius: 16, gap: 12, backgroundColor: c.backgroundElement }}
        >
          {order.review ? (
            <View style={{ gap: 8 }}>
              <ThemedText type="card">Your verified review</ThemedText>
              <ThemedText accessibilityLabel={`${order.review.rating} out of 5 stars`}>
                {'★'.repeat(order.review.rating)}
                {'☆'.repeat(5 - order.review.rating)}
              </ThemedText>
              {!!order.review.text && (
                <ThemedText themeColor="textSecondary">{order.review.text}</ThemedText>
              )}
              {order.review.merchantResponse && (
                <View
                  style={{
                    gap: 4,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.divider,
                    paddingTop: 10,
                  }}
                >
                  <ThemedText type="smallBold">Business response</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    {order.review.merchantResponse}
                  </ThemedText>
                </View>
              )}
              {order.review.moderationStatus !== 'published' && (
                <ThemedText type="small" themeColor="textSecondary">
                  This review is not currently public.
                </ThemedText>
              )}
            </View>
          ) : (
            <>
              <ThemedText type="card">How was your pickup?</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[1, 2, 3, 4, 5].map((rating) => (
                  <Pressable
                    key={rating}
                    accessibilityRole="button"
                    accessibilityLabel={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                    accessibilityState={{ selected: reviewRating === rating }}
                    onPress={() => setReviewRating(rating)}
                    style={{
                      minWidth: 44,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ThemedText
                      type="subtitle"
                      style={{ color: reviewRating >= rating ? c.accent : c.textSecondary }}
                    >
                      ★
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <TextInput
                accessibilityLabel="Optional review"
                placeholder="Add a few words (optional)"
                placeholderTextColor={c.textSecondary}
                value={reviewText}
                onChangeText={setReviewText}
                maxLength={1200}
                multiline
                textAlignVertical="top"
                style={{
                  minHeight: 80,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: c.background,
                  color: c.text,
                  fontSize: 16,
                }}
              />
              <AppButton
                label="Post verified review"
                loading={busy}
                disabled={busy}
                onPress={() => onReview(reviewRating, reviewText)}
              />
            </>
          )}
        </View>
      )}
      {onSupportRequest &&
        !['refunded', 'cancelled', 'checkout_expired', 'checkout_failed', 'dispute_lost'].includes(
          order.status,
        ) && (
          <View
            style={{ padding: 16, borderRadius: 16, gap: 12, backgroundColor: c.backgroundElement }}
          >
            <ThemedText type="card">Need help with this order?</ThemedText>
            {!tracking.terminal &&
              ['placed', 'accepted', 'preparing', 'ready'].includes(order.status) &&
              order.supportRequest?.status !== 'open' &&
              !supportOpen && (
                <View style={{ gap: 8 }}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {cancelCutoff
                      ? `Request cancellation before ${pickupLabel({ at: new Date(cancelCutoff).toISOString(), timezone: order.timezone })}. The business confirms the request; any refund shows here after the payment provider confirms it.`
                      : 'The preparation window has started. You can still ask the business to cancel, but it must review the request.'}
                  </ThemedText>
                  <AppButton
                    label="Request cancellation"
                    variant="secondary"
                    onPress={() => {
                      setSupportType('cancel');
                      setSupportOpen(true);
                    }}
                  />
                </View>
              )}
            {order.supportRequest?.status === 'open' ? (
              <View style={{ gap: 8 }}>
                <ThemedText type="smallBold">
                  Request sent · {supportLabel(order.supportRequest.type)}
                </ThemedText>
                <ThemedText themeColor="textSecondary">{order.supportRequest.message}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  The business will reply here.
                </ThemedText>
              </View>
            ) : (
              <>
                {order.supportRequest?.response && (
                  <View style={{ gap: 6 }}>
                    <ThemedText type="smallBold">
                      {order.supportRequest.status === 'resolved'
                        ? 'Business reply'
                        : 'Business response'}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary">
                      {order.supportRequest.response}
                    </ThemedText>
                  </View>
                )}
                {!supportOpen ? (
                  <AppButton
                    label={order.supportRequest ? 'Send another request' : 'Contact the business'}
                    variant="secondary"
                    onPress={() => setSupportOpen(true)}
                  />
                ) : (
                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(tracking.terminal
                        ? (['issue'] as const)
                        : (['cancel', 'change', 'issue'] as const)
                      ).map((type) => (
                        <AppButton
                          key={type}
                          label={supportLabel(type)}
                          variant={supportType === type ? 'primary' : 'tertiary'}
                          onPress={() => setSupportType(type)}
                          style={{ minHeight: 44 }}
                        />
                      ))}
                    </View>
                    <TextInput
                      accessibilityLabel="Message to the business"
                      accessibilityHint="Describe what you need help with. Do not include payment details."
                      value={supportMessage}
                      onChangeText={setSupportMessage}
                      placeholder="What do you need help with?"
                      placeholderTextColor={c.textSecondary}
                      maxLength={1500}
                      multiline
                      textAlignVertical="top"
                      style={{
                        minHeight: 92,
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: c.background,
                        color: c.text,
                        fontSize: 16,
                      }}
                    />
                    <AppButton
                      label="Send request"
                      loading={busy}
                      disabled={busy || supportMessage.trim().length < 10}
                      onPress={() => onSupportRequest(supportType, supportMessage)}
                    />
                    <AppButton
                      label="Close"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => setSupportOpen(false)}
                    />
                  </View>
                )}
              </>
            )}
          </View>
        )}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, minWidth: 150 }}>
          <ThemedText type="caption" themeColor="textSecondary" accessibilityLiveRegion="polite">
            {lastUpdated
              ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
              : 'Checking latest status'}
          </ThemedText>
          {!tracking.terminal && (
            <ThemedText type="caption" themeColor="textSecondary">
              Updates automatically
            </ThemedText>
          )}
        </View>
        <AppButton
          label="Refresh"
          accessibilityLabel="Refresh order status"
          variant="secondary"
          loading={busy}
          onPress={onRefresh}
        />
      </View>
      {tracking.terminal && onNew && (
        <AppButton label="Start another order" variant="secondary" loading={busy} onPress={onNew} />
      )}
    </View>
  );
}

function supportLabel(type: OrderSupportType) {
  return type === 'cancel'
    ? 'Request cancellation'
    : type === 'change'
      ? 'Request a change'
      : 'Other help';
}

const styles = StyleSheet.create({
  progressRoot: {
    gap: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressHeading: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  stepBadge: {
    minWidth: 48,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  prepCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextStep: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    gap: 3,
  },
  progressSegments: {
    flexDirection: 'row',
    gap: 6,
  },
  progressMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});
