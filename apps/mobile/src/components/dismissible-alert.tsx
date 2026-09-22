import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useCallback, useState } from 'react';
import { Animated, Dimensions, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { Brand, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { ThemedText } from './themed-text';

/** The fields shared by the alerts inbox and the compact alerts modal. */
export interface DismissibleAlertRow {
  readonly id: string;
  readonly entity_type:
    'event' | 'loyalty_membership' | 'business_update' | 'account' | 'pickup_order';
  readonly entity_id: string;
  readonly title: string;
  readonly body: string;
  readonly created_at: string;
  readonly read_at: string | null;
  readonly order_status?: string | null;
  readonly order_audience?: 'customer' | 'business' | null;
}

export function formatAlertDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export function alertTypeLabel(row: Pick<DismissibleAlertRow, 'entity_type' | 'order_audience'>) {
  if (row.entity_type === 'event') return 'Event';
  if (row.entity_type === 'business_update') return 'Business update';
  if (row.entity_type === 'loyalty_membership') return 'Rewards';
  if (row.entity_type === 'pickup_order')
    return row.order_audience === 'business' ? 'Pickup queue' : 'Pickup order';
  return 'Account';
}

export function orderAlertStatusLabel(
  status?: string | null,
  audience: 'customer' | 'business' = 'customer',
) {
  if (audience === 'business') {
    switch (status) {
      case 'placed':
        return 'Needs acceptance';
      case 'accepted':
        return 'Accepted';
      case 'preparing':
        return 'In preparation';
      case 'ready':
        return 'Ready to hand off';
      case 'completed':
        return 'Handoff recorded';
      case 'refund_pending':
        return 'Refund review';
      case 'refunded':
        return 'Refunded';
      case 'refund_failed':
        return 'Refund needs attention';
      case 'payment_review':
        return 'Payment needs review';
      default:
        return 'Order update';
    }
  }
  switch (status) {
    case 'placed':
      return 'Received';
    case 'accepted':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready for pickup';
    case 'completed':
      return 'Pickup complete';
    case 'refund_pending':
      return 'Refund in progress';
    case 'refunded':
      return 'Refunded';
    case 'refund_failed':
      return 'Refund needs attention';
    case 'payment_review':
      return 'Payment needs review';
    default:
      return 'Order update';
  }
}

export function orderAlertNextStep(
  status?: string | null,
  audience: 'customer' | 'business' = 'customer',
) {
  if (audience === 'business') {
    switch (status) {
      case 'placed':
        return 'Accept the order in the pickup queue, then start preparing it.';
      case 'accepted':
        return 'Start preparing the order and keep its status up to date.';
      case 'preparing':
        return 'Mark the order ready when it is ready for pickup.';
      case 'ready':
        return 'Scan the customer pickup QR at handoff to confirm collection.';
      case 'completed':
        return 'Handoff recorded. No further action is needed.';
      case 'refund_pending':
        return 'Review the refund status in Square.';
      case 'refunded':
        return 'The refund is complete. No further action is needed.';
      case 'refund_failed':
        return 'Review the refund in Square before continuing.';
      case 'payment_review':
        return 'Review the payment in Square before accepting the order.';
      default:
        return 'Open the pickup order to review the latest action.';
    }
  }
  switch (status) {
    case 'placed':
      return 'We’ll notify you when the business accepts it.';
    case 'accepted':
      return 'The business is getting your order ready.';
    case 'preparing':
      return 'We’ll let you know as soon as it is ready for pickup.';
    case 'ready':
      return 'Have your pickup QR ready when you arrive.';
    case 'completed':
      return 'Your pickup is complete. Thanks for ordering.';
    case 'refund_pending':
      return 'Square is confirming the refund. We’ll update you when it clears.';
    case 'refunded':
      return 'The full refund has been confirmed by Square.';
    case 'refund_failed':
      return 'The business needs to review this refund.';
    case 'payment_review':
      return 'The business needs to review the payment before continuing.';
    default:
      return 'Open the order for the latest pickup details.';
  }
}

interface DismissibleAlertProps {
  readonly alert: DismissibleAlertRow;
  readonly onOpen: () => void;
  readonly onDismiss: () => void;
  readonly surfaceColor: string;
  readonly unreadSurfaceColor: string;
}

/**
 * One consistent inbox row used by both the alerts button and the full inbox.
 * Keeping the swipe threshold and exit animation here prevents the two entry
 * points from drifting apart as the inbox evolves.
 */
export function DismissibleAlert({
  alert,
  onOpen,
  onDismiss,
  surfaceColor,
  unreadSurfaceColor,
}: DismissibleAlertProps) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const [exitProgress] = useState(() => new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;
  const isBusinessOrder =
    alert.entity_type === 'pickup_order' && alert.order_audience === 'business';
  const orderAccent = isBusinessOrder ? colors.warningText : colors.accent;

  const handleSwipeOpen = useCallback(
    (direction: 'left' | 'right') => {
      if (direction !== 'right') return;
      void haptics.medium();
      Animated.timing(exitProgress, {
        toValue: 1,
        duration: reducedMotion ? 0 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          void haptics.success();
          onDismiss();
        }
      });
    },
    [exitProgress, onDismiss, reducedMotion],
  );

  return (
    <Animated.View
      style={{
        opacity: exitProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
        transform: [
          {
            translateX: exitProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -screenWidth],
            }),
          },
        ],
      }}
    >
      <Swipeable
        containerStyle={styles.alertRowFrame}
        dragOffsetFromRightEdge={4}
        friction={1}
        overshootRight={false}
        rightThreshold={40}
        childrenContainerStyle={styles.swipeableChild}
        renderRightActions={() => (
          <View style={styles.dismissBackground}>
            <ThemedText style={styles.dismissText} type="smallBold">
              Clear
            </ThemedText>
          </View>
        )}
        onSwipeableWillOpen={handleSwipeOpen}
      >
        <Pressable
          accessibilityLabel={`${alert.title}${alert.read_at ? '' : ', unread'}`}
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [
            styles.alertRow,
            alert.entity_type === 'pickup_order' && styles.alertRowOrder,
            isBusinessOrder ? styles.alertRowBusiness : styles.alertRowCustomer,
            {
              backgroundColor: alert.read_at ? surfaceColor : unreadSurfaceColor,
              borderColor: alert.read_at ? colors.divider : orderAccent,
            },
            !alert.read_at && styles.alertRowUnread,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.alertRowCopy}>
            <View style={styles.alertRowTop}>
              <View style={styles.alertRowHeading}>
                {!alert.read_at && <View style={styles.unreadDot} />}
                <ThemedText style={[styles.alertType, { color: orderAccent }]} type="smallBold">
                  {alert.entity_type === 'pickup_order'
                    ? alert.order_audience === 'business'
                      ? 'PICKUP QUEUE'
                      : 'ORDER UPDATE'
                    : alertTypeLabel(alert)}
                </ThemedText>
              </View>
              {alert.entity_type === 'pickup_order' && (
                <View
                  style={[
                    styles.orderStatusPill,
                    {
                      borderColor: orderAccent,
                      backgroundColor: isBusinessOrder
                        ? colors.warningSurface
                        : colors.backgroundSelected,
                    },
                  ]}
                >
                  <ThemedText style={{ color: orderAccent }} type="caption">
                    {orderAlertStatusLabel(alert.order_status, alert.order_audience ?? 'customer')}
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText themeColor="textSecondary" type="small">
              {formatAlertDate(alert.created_at)}
            </ThemedText>
            <ThemedText style={styles.alertTitle} numberOfLines={2}>
              {alert.title}
            </ThemedText>
            <ThemedText style={styles.alertBody} themeColor="textSecondary" numberOfLines={3}>
              {alert.body}
            </ThemedText>
            {alert.entity_type === 'pickup_order' && (
              <ThemedText style={styles.alertHint} themeColor="textSecondary" numberOfLines={2}>
                {orderAlertNextStep(alert.order_status, alert.order_audience ?? 'customer')}
              </ThemedText>
            )}
          </View>
          <ThemedText style={styles.chevron} type="subtitle">
            ›
          </ThemedText>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  alertRowFrame: { width: '100%', overflow: 'hidden', borderRadius: Radius.large },
  swipeableChild: { flex: 1 },
  dismissBackground: {
    width: 92,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.danger,
    paddingHorizontal: Spacing.three,
  },
  dismissText: { color: Brand.onPrimary },
  alertRow: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: 'rgba(113,128,120,0.35)',
    padding: Spacing.three,
  },
  alertRowUnread: { borderWidth: 1.5 },
  alertRowOrder: { alignItems: 'flex-start', minHeight: 136, paddingVertical: Spacing.four },
  alertRowBusiness: { borderLeftWidth: 4, borderLeftColor: '#F2D992' },
  alertRowCustomer: { borderLeftWidth: 4, borderLeftColor: Brand.primary },
  alertRowCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  alertRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  alertRowHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  unreadDot: { width: 8, height: 8, borderRadius: Radius.pill, backgroundColor: Brand.primary },
  alertType: { color: Brand.primary, letterSpacing: 0.8 },
  orderStatusPill: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  alertTitle: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.15 },
  alertBody: { fontSize: 15, lineHeight: 21 },
  alertHint: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: 'rgba(113,128,120,0.28)',
  },
  chevron: { color: Brand.primary, fontSize: 30 },
  pressed: { opacity: 0.72 },
});
