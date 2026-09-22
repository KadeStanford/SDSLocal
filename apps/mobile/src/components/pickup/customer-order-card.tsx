import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '../themed-text';
import { BusinessLogo } from '../business-logo';
import { OrderBadge } from './order-presentation';
import { useTheme } from '@/hooks/use-theme';
import { money, pickupLabel, type PickupOrder } from '@/lib/square-commerce-core';
import { storagePublicUrl } from '@/lib/storage-url';
import { shortOrderNumber } from '@/lib/pickup-workspace';
import { brandColor, readableTextColor } from '@/lib/color-contrast';
import { customerOrderView } from '@/lib/customer-orders';
export function CustomerOrderCard({ order }: { order: PickupOrder }) {
  const c = useTheme();
  const history = customerOrderView(order.status) === 'history';
  const count = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const background = order.business?.primaryColor
    ? brandColor(order.business.primaryColor)
    : c.backgroundElement;
  const foreground = order.business?.primaryColor ? readableTextColor(background) : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${order.businessName} order ${shortOrderNumber(order.number)}, ${order.status.replaceAll('_', ' ')}`}
      onPress={() => router.push({ pathname: '/order', params: { orderId: order.id } })}
      style={({ pressed }) => ({
        minHeight: 48,
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 16,
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
            #{shortOrderNumber(order.number)}
            {count ? ` · ${count} ${count === 1 ? 'item' : 'items'}` : ''}
          </ThemedText>
        </View>
        <ThemedText accessible={false} style={{ color: foreground }}>
          ›
        </ThemedText>
      </View>
      <View style={{ padding: 16, gap: 12 }}>
        <OrderBadge status={order.status} />
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
    </Pressable>
  );
}
