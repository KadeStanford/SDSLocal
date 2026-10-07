import { AppIcon } from '@/components/app-icon';
import { pendingPaymentPresentation } from '@/lib/pending-payment';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '../themed-text';
import { BusinessLogo } from '../business-logo';
import { OrderBadge } from './order-presentation';
import { useTheme } from '@/hooks/use-theme';
import { money, pickupLabel, type PickupOrder } from '@/lib/square-commerce-core';
import { storagePublicUrl } from '@/lib/storage-url';
import { shortOrderNumber } from '@/lib/pickup-workspace';
import { customerOrderView } from '@/lib/customer-orders';
export function CustomerOrderCard({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const history = customerOrderView(order.status) === 'history';
  const count = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const background = c.backgroundElement;
  const foreground = c.text;
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.divider,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${order.businessName} order ${shortOrderNumber(order.number)}, ${order.status.replaceAll('_', ' ')}`}
        onPress={() => router.push({ pathname: '/order', params: { orderId: order.id } })}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 0 }}>
          {' '}
          <OrderBadge
            status={order.status}
            {...(order.status === 'checkout_pending'
              ? { label: pendingPaymentPresentation(order).title }
              : {})}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            padding: 20,
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
            <ThemedText type="small" style={{ color: c.textSecondary }}>
              #{shortOrderNumber(order.number)}
              {count ? ` · ${count} ${count === 1 ? 'item' : 'items'}` : ''}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={18} />
        </View>
        <View
          style={{
            padding: 20,
            paddingTop: 16,
            gap: 12,
            borderTopWidth: 1,
            borderTopColor: c.divider,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1, minWidth: 0 }}>
              {history ? 'Ordered ' : 'Pickup '}
              {pickupLabel({
                at: history ? order.createdAt : order.pickupAt,
                timezone: order.business?.timezone ?? order.timezone,
              })}
            </ThemedText>
            <ThemedText type="smallBold" style={{ maxWidth: '35%' }}>
              {money(order.total, order.currency)}
            </ThemedText>
          </View>
        </View>
        <View
          style={{
            minHeight: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            backgroundColor: c.accent,
            paddingHorizontal: 20,
            paddingVertical: 13,
          }}
        >
          <ThemedText type="smallBold" style={{ color: c.onAccent, fontSize: 16, lineHeight: 22 }}>
            View order
          </ThemedText>
          <AppIcon name="chevron-right" tintColor={c.onAccent} size={20} />
        </View>
      </Pressable>
      {history && order.status === 'completed' && order.businessId && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <AppButton
            label="Order again"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/order',
                params: {
                  businessId: order.businessId!,
                  reorderFromOrderId: order.id,
                },
              } as never)
            }
          />
        </View>
      )}
    </View>
  );
}
