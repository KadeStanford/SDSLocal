import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { CustomerSurface } from '../customer-ui';
import { ProductPhoto } from './product-photo';
import { money, type Product, type RewardOffer } from '@/lib/square-commerce-core';
import { rewardTerms } from '@/lib/pickup-rewards';

export function PickupRewardPanel({
  offer,
  selectedName,
  issue,
  saved,
  disabled,
  hasCart,
  onChoose,
  onApply,
  onSave,
  onShow,
  error,
  onRetry,
}: {
  offer: RewardOffer | null;
  selectedName?: string | undefined;
  issue?: string | null;
  saved: boolean;
  disabled: boolean;
  hasCart: boolean;
  onChoose: (product: Product) => void;
  onApply: () => void;
  onSave: () => void;
  onShow: () => void;
  error?: boolean;
  onRetry?: () => void;
}) {
  const c = useTheme();
  const [expanded, setExpanded] = useState(false);
  if (!offer && !issue && !error) return null;
  const selected = !!selectedName && !issue;
  return (
    <CustomerSurface style={{ padding: 0, overflow: 'hidden', gap: 0 }}>
      <View style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: c.backgroundSelected,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SymbolView
              name={selected ? 'checkmark.seal' : 'gift'}
              tintColor={c.accent}
              style={{ width: 24, height: 24 }}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
            <ThemedText type="card">
              {issue
                ? 'Review your reward'
                : error
                  ? 'Rewards unavailable'
                  : selected
                    ? 'Reward added'
                    : saved
                      ? 'Reward saved for later'
                      : 'You have a reward'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {selected ? selectedName : (offer?.label ?? 'Your cart is ready to continue.')}
            </ThemedText>
          </View>
        </View>
        {issue ? (
          <ThemedText type="small" accessibilityLiveRegion="polite">
            {issue}
          </ThemedText>
        ) : (
          !saved &&
          offer && (
            <ThemedText type="small" themeColor="textSecondary">
              {rewardTerms(offer)}
            </ThemedText>
          )
        )}
        {error && onRetry && (
          <AppButton
            label="Check rewards again"
            variant="secondary"
            disabled={disabled}
            onPress={onRetry}
          />
        )}
        {(!error || issue) && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(!selected || issue) && offer && (
              <AppButton
                label={
                  saved
                    ? 'Use reward'
                    : offer.type === 'percent_discount'
                      ? 'Apply to this order'
                      : expanded
                        ? 'Hide choices'
                        : 'Choose your item'
                }
                style={{ flexGrow: 1 }}
                disabled={disabled || (offer.type === 'percent_discount' && !hasCart)}
                onPress={() => {
                  onShow();
                  if (offer.type === 'percent_discount') onApply();
                  else setExpanded(!expanded || saved);
                }}
              />
            )}
            {!saved && (
              <AppButton
                label={selected ? 'Remove reward' : 'Save for later'}
                variant="secondary"
                disabled={disabled}
                style={{ flexGrow: 1 }}
                onPress={() => {
                  setExpanded(false);
                  onSave();
                }}
              />
            )}
          </View>
        )}
        {selected && (
          <ThemedText type="caption" themeColor="textSecondary">
            One reward will be used when you place this order. Removing the reward keeps the item in
            your cart at its regular price.
          </ThemedText>
        )}
      </View>
      {expanded && !saved && offer && offer.type !== 'percent_discount' && !selected && (
        <View style={{ borderTopWidth: 1, borderColor: c.divider }}>
          {offer.items.map((product, index) => (
            <Pressable
              key={product.id}
              accessibilityRole="button"
              accessibilityLabel={`Choose ${product.name}, ${product.variation} for your reward`}
              disabled={disabled}
              onPress={() => onChoose(product)}
              style={({ pressed }) => ({
                padding: 16,
                gap: 12,
                flexDirection: 'row',
                alignItems: 'center',
                borderTopWidth: index ? 1 : 0,
                borderColor: c.divider,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ProductPhoto image={product.image} />
              <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                <ThemedText type="smallBold">{product.name}</ThemedText>
                <ThemedText type="caption" themeColor="textSecondary">
                  {product.variation} · {money(product.price, product.currency)} base price
                </ThemedText>
              </View>
              <View
                style={{ backgroundColor: c.backgroundSelected, padding: 10, borderRadius: 10 }}
              >
                <SymbolView name="plus" tintColor={c.accent} style={{ width: 18, height: 18 }} />
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </CustomerSurface>
  );
}
