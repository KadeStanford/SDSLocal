import { View, StyleSheet } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { ThemedText } from '../themed-text';
import { BusinessLogo } from '../business-logo';
import { useTheme } from '@/hooks/use-theme';
import { storagePublicUrl } from '@/lib/storage-url';
import {
  money,
  orderStatusLabel,
  pickupLabel,
  type PickupBusiness,
  type PickupOrder,
  type OrderSnapshot,
} from '@/lib/square-commerce-core';
import { fulfillmentSteps, orderTracking } from '@/lib/pickup-order-flow';
import { attentionStates, shortOrderNumber } from '@/lib/pickup-workspace';
export const pickupStyles = StyleSheet.create({
  section: { gap: 16 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  surface: { padding: 16, borderRadius: 16, gap: 16 },
  rule: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
});
export function OrderBadge({ status, label }: { status: string; label?: string }) {
  const c = useTheme();
  const alert = attentionStates.includes(status);
  const done = ['ready', 'completed', 'placed'].includes(status);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: alert ? c.warningSurface : done ? c.successSurface : c.backgroundSelected,
      }}
    >
      <ThemedText
        type="smallBold"
        style={{ color: alert ? c.warningText : done ? c.successText : c.textSecondary }}
      >
        {label ?? orderStatusLabel[status] ?? 'Updating order'}
      </ThemedText>
    </View>
  );
}
export function PickupIdentity({
  business,
  name,
  subtitle,
}: {
  business?: PickupBusiness | null | undefined;
  name: string;
  subtitle?: string;
}) {
  const c = useTheme();
  const color = business?.primaryColor;
  return (
    <View
      style={[
        pickupStyles.row,
        {
          alignItems: 'center',
          borderLeftWidth: 3,
          borderLeftColor: color && /^#[\da-f]{6}$/i.test(color) ? color : c.accent,
          paddingLeft: 12,
        },
      ]}
    >
      <BusinessLogo
        name={name}
        uri={business?.logoPath ? storagePublicUrl(business.logoPath) : null}
        size={48}
        decorative
      />
      <View style={pickupStyles.grow}>
        <ThemedText type="card">{name}</ThemedText>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
    </View>
  );
}
export function ReceiptItem({ item, currency }: { item: OrderSnapshot; currency: string }) {
  const c = useTheme();
  return (
    <View style={pickupStyles.row}>
      <View
        style={{ minWidth: 28, padding: 4, borderRadius: 6, backgroundColor: c.backgroundSelected }}
      >
        <ThemedText type="smallBold" style={{ textAlign: 'center' }}>
          {item.quantity}×
        </ThemedText>
      </View>
      <View style={pickupStyles.grow}>
        <ThemedText type="smallBold">{item.name}</ThemedText>
        {!!item.refundedQuantity && (
          <ThemedText type="small" style={{ color: c.warningText }}>
            {item.refundedQuantity} refunded
          </ThemedText>
        )}
        {!!item.variation_name && item.variation_name !== 'Regular' && (
          <ThemedText type="small" themeColor="textSecondary">
            {item.variation_name}
          </ThemedText>
        )}
        {item.modifiers?.map((m, i) => (
          <ThemedText key={i} type="small" themeColor="textSecondary">
            + {m.name}
          </ThemedText>
        ))}
      </View>
      {item.total_money && (
        <ThemedText type="smallBold" style={{ maxWidth: '35%' }}>
          {money(item.total_money.amount, currency)}
        </ThemedText>
      )}
    </View>
  );
}
export function ReceiptTotal({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string;
  value: number;
  currency: string;
  strong?: boolean;
}) {
  return (
    <View style={[pickupStyles.row, { justifyContent: 'space-between' }]}>
      <ThemedText
        type={strong ? 'card' : 'small'}
        style={pickupStyles.grow}
        themeColor={strong ? 'text' : 'textSecondary'}
      >
        {label}
      </ThemedText>
      <ThemedText type={strong ? 'card' : 'smallBold'}>{money(value, currency)}</ThemedText>
    </View>
  );
}
export function OrderReceipt({
  order,
  title = 'Your receipt',
}: {
  order: PickupOrder;
  title?: string;
}) {
  const c = useTheme();
  return (
    <View style={[pickupStyles.surface, { backgroundColor: c.backgroundElement }]}>
      <ThemedText type="card">{title}</ThemedText>
      {order.items.map((item, i) => (
        <ReceiptItem key={i} item={item} currency={order.currency} />
      ))}
      <View style={[pickupStyles.rule, { borderTopColor: c.divider, gap: 8 }]}>
        <ReceiptTotal label="Items" value={order.subtotal} currency={order.currency} />
        {order.reward && order.reward.discountMinor > 0 && (
          <ReceiptTotal
            label={order.reward.label || 'Reward discount'}
            value={-order.reward.discountMinor}
            currency={order.currency}
          />
        )}
        <ReceiptTotal label="Tax" value={order.tax} currency={order.currency} />
        {!!order.tip && <ReceiptTotal label="Tip" value={order.tip} currency={order.currency} />}
        <ReceiptTotal label="Total" value={order.total} currency={order.currency} strong />
        {order.total === 0 && order.reward && (
          <ThemedText type="small" themeColor="textSecondary">
            {order.status === 'refunded'
              ? 'Order cancelled · reward restored'
              : 'Covered by your reward · no payment collected'}
          </ThemedText>
        )}
        {(order.refundedMinor ?? 0) > 0 ? (
          <ReceiptTotal
            label="Refunded"
            value={order.refundedMinor ?? 0}
            currency={order.currency}
          />
        ) : null}
        {(order.refundedMinor ?? 0) > 0 ? (
          <ReceiptTotal
            label="Remaining payment"
            value={order.remainingMinor ?? order.total}
            currency={order.currency}
          />
        ) : null}
      </View>
    </View>
  );
}
export function PickupFacts({ order }: { order: PickupOrder }) {
  const c = useTheme();
  return (
    <View style={[pickupStyles.surface, { backgroundColor: c.backgroundElement }]}>
      <View style={pickupStyles.row}>
        <SymbolView
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          tintColor={c.textSecondary}
          style={{ width: 22, height: 22 }}
        />
        <View style={pickupStyles.grow}>
          <ThemedText type="small" themeColor="textSecondary">
            Pickup time
          </ThemedText>
          <ThemedText type="smallBold">
            {pickupLabel({
              at: order.pickupAt,
              timezone: order.business?.timezone ?? order.timezone,
            })}
          </ThemedText>
        </View>
      </View>
      {!!order.address && (
        <View style={pickupStyles.row}>
          <SymbolView
            name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
            tintColor={c.textSecondary}
            style={{ width: 22, height: 22 }}
          />
          <View style={pickupStyles.grow}>
            <ThemedText type="small" themeColor="textSecondary">
              Pickup location
            </ThemedText>
            <ThemedText>{order.address}</ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}
export function OrderTimeline({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const tracking = orderTracking(order.status);
  if (tracking.index < 0) return null;
  return (
    <View accessibilityLabel="Pickup progress" style={{ gap: 0 }}>
      {fulfillmentSteps.map(([key, label], i) => {
        const complete = i < tracking.index;
        const current = i === tracking.index;
        const at =
          order.events?.find((e) => e.status === key)?.at ??
          (key === 'placed' ? order.paidAt : key === 'completed' ? order.completedAt : null);
        return (
          <View key={key} style={{ flexDirection: 'row', gap: 12, minHeight: 52 }}>
            <View accessible={false} style={{ width: 28, alignItems: 'center' }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: complete || current ? c.accent : c.backgroundSelected,
                }}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: complete || current ? c.onAccent : c.textSecondary }}
                >
                  {complete ? '✓' : i + 1}
                </ThemedText>
              </View>
              {i < 4 && (
                <View
                  style={{
                    width: 2,
                    flex: 1,
                    minHeight: 16,
                    backgroundColor: complete ? c.accent : c.divider,
                  }}
                />
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, paddingBottom: 14 }}>
              <ThemedText
                type={current ? 'smallBold' : 'small'}
                themeColor={current ? 'text' : 'textSecondary'}
                accessibilityLabel={`${label}, ${complete ? 'complete' : current ? 'current' : 'upcoming'}`}
              >
                {label}
                {current ? ' · Now' : ''}
              </ThemedText>
              {at && (
                <ThemedText type="caption" themeColor="textSecondary">
                  {new Date(at).toLocaleTimeString('en-US', {
                    timeZone: order.business?.timezone ?? order.timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </ThemedText>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
export function OrderHero({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const attention = attentionStates.includes(order.status);
  const paid = ['placed', 'accepted', 'preparing', 'ready', 'completed'].includes(order.status);
  return (
    <View style={{ gap: 16 }}>
      <PickupIdentity
        business={order.business}
        name={order.businessName}
        subtitle={`Pickup · #${shortOrderNumber(order.number)}`}
      />
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <View
          style={{
            padding: 12,
            borderRadius: 16,
            backgroundColor: attention ? c.warningSurface : paid ? c.successSurface : c.infoSurface,
          }}
        >
          <SymbolView
            name={
              attention
                ? { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }
                : paid
                  ? { ios: 'checkmark.seal.fill', android: 'check_circle', web: 'check_circle' }
                  : { ios: 'clock.fill', android: 'schedule', web: 'schedule' }
            }
            tintColor={attention ? c.warningText : paid ? c.successText : c.infoText}
            style={{ width: 28, height: 28 }}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText type="subtitle" accessibilityLiveRegion="polite">
            {orderStatusLabel[order.status] ?? 'Order status'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{orderTracking(order.status).message}</ThemedText>
        </View>
      </View>
    </View>
  );
}
