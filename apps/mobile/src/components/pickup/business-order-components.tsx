import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { money, nextPickupAction, pickupLabel, type PickupOrder } from '@/lib/square-commerce-core';
import { orderAge, orderUrgency, shortOrderNumber } from '@/lib/pickup-workspace';
import { OrderBadge } from './order-presentation';
import { businessOrderStage } from '@/lib/business-order-stage';

export function BusinessOrderHeader({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const count = order.items.reduce((total, item) => total + Number(item.quantity), 0);
  const stage = businessOrderStage(order.status);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <ThemedText type="caption" themeColor="textSecondary">
          PICKUP ORDER
        </ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 180, minWidth: 0, gap: 4 }}>
            <ThemedText type="title">#{shortOrderNumber(order.number)}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {count} {count === 1 ? 'item' : 'items'} ·{' '}
              {pickupLabel({
                at: order.pickupAt,
                timezone: order.business?.timezone ?? order.timezone,
              })}
            </ThemedText>
          </View>
          <OrderBadge status={order.status} />
        </View>
      </View>
      <View
        style={{
          padding: 16,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.backgroundElement,
          gap: 6,
        }}
      >
        <ThemedText type="small" themeColor="textSecondary">
          {stage.title}
        </ThemedText>
        <ThemedText type="card">{order.recipient?.display_name || 'Pickup customer'}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {stage.instruction}
        </ThemedText>
      </View>
    </View>
  );
}

export function PickupOrderCard({ order, now }: { order: PickupOrder; now: number }) {
  const c = useTheme();
  const urgency = orderUrgency(order, now);
  const count = order.items.reduce((n, i) => n + Number(i.quantity), 0);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Order ${shortOrderNumber(order.number)}, ${order.recipient?.display_name ?? 'Pickup customer'}, ${pickupLabel({ at: order.pickupAt, timezone: order.business?.timezone ?? order.timezone })}`}
      onPress={() => router.push({ pathname: '/pickup-order', params: { orderId: order.id } })}
      style={({ pressed }) => ({
        padding: 16,
        gap: 12,
        borderRadius: 16,
        backgroundColor: c.backgroundElement,
        opacity: pressed ? 0.8 : 1,
        minHeight: 48,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <ThemedText type="smallBold">#{shortOrderNumber(order.number)}</ThemedText>
        <OrderBadge status={order.status} />
      </View>
      <View style={{ gap: 4 }}>
        <ThemedText type="card">{order.recipient?.display_name || 'Pickup customer'}</ThemedText>
        <ThemedText type="smallBold">
          {pickupLabel({
            at: order.pickupAt,
            timezone: order.business?.timezone ?? order.timezone,
          })}
        </ThemedText>
        {urgency && (
          <ThemedText type="smallBold" style={{ color: c.warningText }}>
            {urgency}
          </ThemedText>
        )}
      </View>
      {order.supportRequest?.status === 'open' && (
        <View style={{ padding: 10, borderRadius: 8, backgroundColor: c.warningSurface }}>
          <ThemedText type="smallBold" style={{ color: c.warningText }}>
            Customer request · Reply needed
          </ThemedText>
          <ThemedText type="small" numberOfLines={2}>
            {order.supportRequest.message}
          </ThemedText>
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
        {count} {count === 1 ? 'item' : 'items'} · {order.items.map((i) => i.name).join(', ')}
      </ThemedText>
      <View
        style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }}
      >
        <ThemedText type="small" themeColor="textSecondary">
          {orderAge(order.createdAt, now)}
        </ThemedText>
        <ThemedText type="smallBold">
          {money(order.total, order.currency)} · View order ›
        </ThemedText>
      </View>
    </Pressable>
  );
}
export function FulfillmentActions({
  order,
  canRefund,
  busy,
  disabled = false,
  onTransition,
  onRefund,
  onMore,
}: {
  order: PickupOrder;
  canRefund: boolean;
  busy: boolean;
  disabled?: boolean;
  onTransition: (next: string) => void;
  onRefund: () => void;
  onMore?: () => void;
}) {
  const next = nextPickupAction[order.status];
  const c = useTheme();
  if (onMore) {
    const canReview =
      canRefund &&
      [
        'placed',
        'accepted',
        'preparing',
        'ready',
        'completed',
        'refund_failed',
        'refund_pending',
        'payment_review',
      ].includes(order.status);
    const activate = () =>
      next
        ? next.next === 'completed'
          ? router.push({ pathname: '/staff-scan', params: { businessId: order.businessId } })
          : onTransition(next.next)
        : onMore();
    return (
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {(next || canReview) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              next?.next === 'completed'
                ? 'Scan to confirm pickup'
                : (next?.label ?? 'Order actions')
            }
            accessibilityState={{ disabled: busy || disabled, busy }}
            disabled={busy || disabled}
            onPress={activate}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 52,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: c.text,
              opacity: busy || disabled ? 0.5 : pressed ? 0.8 : 1,
            })}
          >
            <ThemedText type="smallBold" style={{ color: c.background, textAlign: 'center' }}>
              {next?.next === 'completed' ? 'Confirm pickup' : (next?.label ?? 'Order actions')}
            </ThemedText>
          </Pressable>
        )}
        {next && canReview && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Order actions"
            accessibilityState={{ disabled: busy || disabled }}
            disabled={busy || disabled}
            onPress={onMore}
            style={{
              minHeight: 52,
              width: 52,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText style={{ fontSize: 26, lineHeight: 28 }}>⋯</ThemedText>
          </Pressable>
        )}
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {next && (
        <AppButton
          label={next.next === 'completed' ? 'Scan to confirm pickup' : next.label}
          loading={busy}
          disabled={disabled}
          onPress={() =>
            next.next === 'completed'
              ? router.push({ pathname: '/staff-scan', params: { businessId: order.businessId } })
              : onTransition(next.next)
          }
        />
      )}
      {canRefund &&
        [
          'placed',
          'accepted',
          'preparing',
          'ready',
          'completed',
          'refund_failed',
          'refund_pending',
          'payment_review',
        ].includes(order.status) &&
        (!order.disputeState || ['WON', 'RESOLVED'].includes(order.disputeState)) && (
          <AppButton
            label={
              order.status === 'refund_pending'
                ? 'Check pending refund'
                : (order.refundedMinor ?? 0) > 0
                  ? 'Refund remaining payment'
                  : order.total === 0
                    ? 'Cancel & restore reward'
                    : 'Cancel & refund in full'
            }
            variant="destructive"
            disabled={busy || disabled}
            onPress={onRefund}
          />
        )}
      {!canRefund && (
        <ThemedText type="small" themeColor="textSecondary">
          Only an owner can cancel or refund an order.
        </ThemedText>
      )}
    </View>
  );
}
