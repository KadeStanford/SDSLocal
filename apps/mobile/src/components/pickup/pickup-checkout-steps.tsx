import { CustomerAction, CustomerSurface } from '../customer-ui';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { ThemedText } from '../themed-text';
import { ReceiptItem, ReceiptTotal } from './order-presentation';
import { QuantityStepper } from './quantity-stepper';
import { useTheme } from '@/hooks/use-theme';
import { ProductPhoto } from './product-photo';
import { cartReview } from '@/lib/pickup-order-flow';
import { formattedPickupPhone } from '@/lib/pickup-checkout-presentation';
import {
  money,
  pickupLabel,
  type CartLine,
  type Product,
  type Quote,
} from '@/lib/square-commerce-core';

export function PickupCart({
  cart,
  products,
  onEdit,
  onRemove,
  onQuantity,
  disabled = false,
  rewardDiscount = 0,
}: {
  cart: CartLine[];
  products: Product[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onQuantity?: (index: number, delta: 1 | -1) => void;
  disabled?: boolean;
  rewardDiscount?: number;
}) {
  const c = useTheme();
  const review = cartReview(cart, products);
  return (
    <View style={{ gap: 16 }}>
      {!cart.length && <ThemedText>Choose something from the menu to get started.</ThemedText>}
      {review.pricesChanged && (
        <ThemedText accessibilityLiveRegion="polite">
          Some prices changed. This estimate uses the current menu.
        </ThemedText>
      )}
      {review.issues.map((issue, i) => (
        <ThemedText key={i} accessibilityLiveRegion="polite">
          {issue}
        </ThemedText>
      ))}
      {cart.map((line, index) => {
        const p = products.find((p) => p.id === line.variationId);
        return (
          <View
            key={index}
            style={{
              padding: 16,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.divider,
              backgroundColor: c.backgroundElement,
              gap: 12,
            }}
          >
            <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
              <View style={{ gap: 4, flex: 1, minWidth: 0 }}>
                <ThemedText type="card">{p?.name ?? 'Item no longer available'}</ThemedText>
                {p && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {[
                      p.variation !== 'Regular' ? p.variation : '',
                      ...p.groups
                        .flatMap((g) => g.modifiers)
                        .filter((m) => line.modifierIds.includes(m.id))
                        .map((m) => m.name),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </ThemedText>
                )}
                {line.rewardClaim && rewardDiscount > 0 && (
                  <ThemedText type="caption" style={{ color: c.accent }}>
                    Reward applied to one base item
                  </ThemedText>
                )}
                <ThemedText type="smallBold">
                  {money(cartReview([line], products).subtotal, p?.currency ?? 'USD')}
                </ThemedText>
              </View>
              {p?.image && <ProductPhoto image={p.image} compact />}
            </View>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              {onQuantity && p?.available !== false && p ? (
                <QuantityStepper
                  name={p.name}
                  quantity={line.quantity}
                  disabled={disabled}
                  onChange={(delta) => onQuantity(index, delta)}
                />
              ) : (
                <ThemedText>Quantity {line.quantity}</ThemedText>
              )}
              {p && p.available !== false && (
                <CustomerAction
                  label="Edit"
                  icon="edit"
                  iconOnly
                  accessibilityLabel={`Edit ${p.name}`}
                  disabled={disabled}
                  onPress={() => onEdit(index)}
                />
              )}
              <CustomerAction
                label="Remove"
                icon="remove"
                iconOnly
                accessibilityLabel={`Remove ${p?.name ?? 'item'}`}
                disabled={disabled}
                onPress={() => onRemove(index)}
              />
            </View>
          </View>
        );
      })}
      {rewardDiscount > 0 && (
        <ReceiptTotal
          label="Reward discount"
          value={-rewardDiscount}
          currency={products[0]?.currency ?? 'USD'}
        />
      )}
      {!!cart.length && (
        <ReceiptTotal
          label="Estimated items"
          value={review.subtotal - rewardDiscount}
          currency={products[0]?.currency ?? 'USD'}
          strong
        />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Tax is calculated at review. Your cart is saved for this business on this device.
      </ThemedText>
    </View>
  );
}

export { PickupScheduler } from './pickup-scheduler';

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit?: (() => void) | undefined;
  children: ReactNode;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: c.divider,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ThemedText type="card" style={{ flex: 1 }}>
          {title}
        </ThemedText>
        {onEdit && (
          <CustomerAction
            label="Edit"
            icon="edit"
            accessibilityLabel={`Edit ${title.toLowerCase()}`}
            onPress={onEdit}
          />
        )}
      </View>
      {children}
    </View>
  );
}
export function PickupReview({
  quote,
  name,
  phone,
  cart,
  products,
  expired,
  onEdit,
}: {
  quote: Quote;
  name: string;
  phone: string;
  cart: CartLine[];
  products: Product[];
  expired: boolean;
  onEdit?: ((step: 'cart' | 'pickup' | 'contact') => void) | undefined;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 16 }}>
      <CustomerSurface style={{ gap: 0, paddingTop: 0, paddingBottom: 0 }}>
        <ReviewSection title="Pickup" onEdit={onEdit ? () => onEdit('pickup') : undefined}>
          <ThemedText>{pickupLabel(quote.slot)}</ThemedText>
          <ThemedText themeColor="textSecondary">{quote.slot.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{quote.slot.address}</ThemedText>
        </ReviewSection>
        <ReviewSection title="Contact" onEdit={onEdit ? () => onEdit('contact') : undefined}>
          <ThemedText>{name}</ThemedText>
          <ThemedText themeColor="textSecondary">{formattedPickupPhone(phone)}</ThemedText>
        </ReviewSection>
      </CustomerSurface>
      <CustomerSurface style={{ gap: 0, paddingTop: 0, paddingBottom: 0 }}>
        <ReviewSection title="Order summary" onEdit={onEdit ? () => onEdit('cart') : undefined}>
          {cart.map((line, i) => {
            const p = products.find((p) => p.id === line.variationId);
            return (
              <ReceiptItem
                key={i}
                currency={quote.currency}
                item={{
                  name: p?.name ?? 'Item unavailable',
                  quantity: String(line.quantity),
                  variation_name: p?.variation ?? '',
                  modifiers:
                    p?.groups
                      .flatMap((g) => g.modifiers)
                      .filter((m) => line.modifierIds.includes(m.id))
                      .map((m) => ({ name: m.name })) ?? [],
                  total_money: {
                    amount: cartReview([line], products).subtotal,
                    currency: quote.currency,
                  },
                }}
              />
            );
          })}
          <View
            style={{
              gap: 10,
              marginTop: 8,
              padding: 16,
              borderRadius: 12,
              backgroundColor: c.background,
            }}
          >
            <ReceiptTotal label="Subtotal" value={quote.subtotal} currency={quote.currency} />
            {quote.reward && quote.reward.discountMinor > 0 && (
              <ReceiptTotal
                label={quote.reward.label || 'Rewards discount'}
                value={-quote.reward.discountMinor}
                currency={quote.currency}
              />
            )}
            <ReceiptTotal label="Tax" value={quote.tax} currency={quote.currency} />
            {quote.tip > 0 && (
              <ReceiptTotal label="Tip" value={quote.tip} currency={quote.currency} />
            )}
            <ReceiptTotal label="Total" value={quote.total} currency={quote.currency} strong />
          </View>
        </ReviewSection>
      </CustomerSurface>
      <ThemedText type="small" themeColor="textSecondary">
        {quote.reward
          ? `Rewards applied · ${quote.reward.label}`
          : 'Choose available rewards in your cart before placing your order.'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {quote.total === 0
          ? 'Covered by your reward · no payment required'
          : `Secure checkout · ${quote.provider === 'stripe' ? 'Stripe test payment' : 'Square Sandbox test payment'}`}
      </ThemedText>
      {expired && (
        <ThemedText accessibilityLiveRegion="polite">
          Your total expired. Refresh it before continuing.
        </ThemedText>
      )}
    </View>
  );
}
