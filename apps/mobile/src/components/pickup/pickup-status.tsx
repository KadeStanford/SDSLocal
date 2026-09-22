import { useState, type ReactNode } from 'react';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { AppButton } from '../app-button';
import { BusinessLogo } from '../business-logo';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { fulfillmentSteps, orderTracking } from '@/lib/pickup-order-flow';
import { orderStatusLabel, pickupLabel, type PickupOrder } from '@/lib/square-commerce-core';
import { buildDirectionsUrl } from '@/lib/external-actions';
import { brandColor, readableTextColor } from '@/lib/color-contrast';
import { storagePublicUrl } from '@/lib/storage-url';
import { shortOrderNumber } from '@/lib/pickup-workspace';
import { OrderReceipt, OrderTimeline } from './order-presentation';

export function CustomerOrderIdentity({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const background = order.business?.primaryColor
    ? brandColor(order.business.primaryColor)
    : c.backgroundElement;
  const foreground = order.business?.primaryColor ? readableTextColor(background) : c.text;
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
    }[order.status as 'placed' | 'accepted' | 'preparing'] ?? tracking.message;
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
          <ThemedText type="smallBold" style={{ color: c.accent, letterSpacing: 0.7 }}>
            ORDER STATUS
          </ThemedText>
          <ThemedText type="card" accessibilityLiveRegion="polite">
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
            NEXT UP
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
}: {
  order: PickupOrder;
  busy: boolean;
  onRefresh: () => void;
  onCheckout: () => void;
  onNew: (() => void) | undefined;
  lastUpdated?: number | null;
  onError?: (message: string) => void;
  pickupCode?: ReactNode;
}) {
  const c = useTheme();
  const tracking = orderTracking(order.status);
  const [activity, setActivity] = useState(false);
  const directions = buildDirectionsUrl(
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    { address: order.address, label: order.businessName },
  );
  const open = (url: string) => {
    void Linking.openURL(url).catch(() =>
      onError?.('This action could not open. Please try again.'),
    );
  };
  return (
    <View style={{ gap: 16 }}>
      <CustomerOrderIdentity order={order} />
      <View
        style={{ padding: 20, borderRadius: 20, backgroundColor: c.backgroundElement, gap: 16 }}
      >
        <CustomerOrderProgress order={order} />
        {tracking.index >= 0 && (
          <>
            <AppButton
              label={activity ? 'Hide order activity' : 'View order activity'}
              variant="tertiary"
              onPress={() => setActivity((old) => !old)}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
            />
            {activity && <OrderTimeline order={order} />}
          </>
        )}
      </View>
      {pickupCode}
      {order.checkoutUrl && order.status === 'checkout_pending' && (
        <AppButton
          label={
            order.provider === 'stripe' ? 'Continue secure checkout' : 'Continue Square checkout'
          }
          loading={busy}
          onPress={onCheckout}
        />
      )}
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
          variant="tertiary"
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
