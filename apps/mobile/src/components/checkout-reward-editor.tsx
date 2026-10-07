import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { commerce } from '@/lib/square-commerce';
import { money, type CheckoutRewardType, type Product } from '@/lib/square-commerce-core';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { CommerceField, CommerceToggle } from './commerce-fields';
import { CustomerSurface } from './customer-ui';
import { rewardTerms } from '@/lib/pickup-rewards';
export interface RewardMenuItem {
  provider: 'square' | 'stripe';
  variationId: string;
}
export function CheckoutRewardEditor({
  businessId,
  enabled,
  type,
  percent,
  items,
  disabled,
  onEnabled,
  onType,
  onPercent,
  onItems,
}: {
  businessId: string;
  enabled: boolean;
  type: CheckoutRewardType;
  percent: string;
  items: RewardMenuItem[];
  disabled: boolean;
  onEnabled: (v: boolean) => void;
  onType: (v: CheckoutRewardType) => void;
  onPercent: (v: string) => void;
  onItems: (v: RewardMenuItem[]) => void;
}) {
  const [loaded, setLoaded] = useState<{
    businessId: string;
    attempt: number;
    catalog: { provider: 'square' | 'stripe'; products: Product[] } | null;
    error: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = loaded?.businessId === businessId && loaded.attempt === attempt ? loaded : null;
  const catalog = current?.catalog ?? null;
  const error = current?.error ?? false;
  useEffect(() => {
    let active = true;
    void commerce<{ provider: 'square' | 'stripe'; products: Product[] }>('reward_catalog', {
      businessId,
    }).then(
      (result) => {
        if (active) setLoaded({ businessId, attempt, catalog: result, error: false });
      },
      () => {
        if (active) setLoaded({ businessId, attempt, catalog: null, error: true });
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, attempt]);
  return (
    <CheckoutRewardEditorView
      {...{
        enabled,
        type,
        percent,
        items,
        disabled,
        onEnabled,
        onType,
        onPercent,
        onItems,
        catalog,
        error,
      }}
      onRetry={() => setAttempt((v) => v + 1)}
    />
  );
}
export function CheckoutRewardEditorView({
  enabled,
  type,
  percent,
  items,
  disabled,
  onEnabled,
  onType,
  onPercent,
  onItems,
  catalog,
  error,
  onRetry,
}: Omit<Parameters<typeof CheckoutRewardEditor>[0], 'businessId'> & {
  catalog: { provider: 'square' | 'stripe'; products: Product[] } | null;
  error: boolean;
  onRetry: () => void;
}) {
  const c = useTheme();
  const [search, setSearch] = useState('');
  const available = catalog?.products.filter((p) => p.available !== false && p.price > 0) ?? [];
  const missing = items.filter(
    (i) => i.provider !== catalog?.provider || !available.some((p) => p.id === i.variationId),
  );
  return (
    <CustomerSurface>
      <View style={{ gap: 4 }}>
        <ThemedText type="card">Rewards at checkout</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Let customers choose a reward while ordering from your menu.
        </ThemedText>
      </View>
      <CommerceToggle
        label="Redeem in mobile orders"
        value={enabled}
        onChange={onEnabled}
        disabled={disabled}
      />
      {enabled && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(
              [
                ['free_item', 'Free item'],
                ['item_discount', 'Item discount'],
                ['bogo', 'Buy one, get one'],
                ['percent_discount', 'Order discount'],
              ] as const
            ).map(([value, label]) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: type === value, disabled }}
                disabled={disabled}
                onPress={() => onType(value)}
                style={{
                  padding: 12,
                  minHeight: 44,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: type === value ? c.accent : c.divider,
                  backgroundColor: type === value ? c.backgroundSelected : c.backgroundElement,
                }}
              >
                <ThemedText type="smallBold">{label}</ThemedText>
              </Pressable>
            ))}
          </View>
          {['item_discount', 'percent_discount'].includes(type) && (
            <CommerceField
              label="Discount percentage"
              value={percent}
              onChangeText={onPercent}
              keyboardType="number-pad"
              editable={!disabled}
            />
          )}
          <ThemedText type="small" themeColor="textSecondary">
            {rewardTerms({ type, percent: Number(percent) })}
          </ThemedText>
          {type !== 'percent_discount' && (
            <>
              <ThemedText type="smallBold">
                Eligible menu items · {items.length} selected
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Choose the exact items and sizes customers may claim. One reward covers one base
                item.
              </ThemedText>
              {error ? (
                <AppButton label="Reload ordering menu" variant="secondary" onPress={onRetry} />
              ) : !catalog ? (
                <ThemedText type="small">Loading your ordering menu…</ThemedText>
              ) : (
                <>
                  {!!missing.length && (
                    <View style={{ gap: 8 }}>
                      <ThemedText type="small">
                        {missing.length} selected items are no longer in this ordering menu. Remove
                        them and choose replacements.
                      </ThemedText>
                      <AppButton
                        label="Remove unavailable items"
                        variant="secondary"
                        disabled={disabled}
                        onPress={() => onItems(items.filter((i) => !missing.includes(i)))}
                      />
                    </View>
                  )}
                  <CommerceField
                    label="Find a menu item"
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search items or sizes"
                  />
                  {!available.length && (
                    <ThemedText type="small">
                      Set up your mobile ordering menu before enabling an item reward.
                    </ThemedText>
                  )}
                  {available
                    .filter((p) =>
                      `${p.name} ${p.variation}`.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((p) => {
                      const checked = items.some(
                        (i) => i.provider === catalog.provider && i.variationId === p.id,
                      );
                      return (
                        <Pressable
                          key={p.id}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked, disabled }}
                          disabled={disabled}
                          onPress={() =>
                            onItems(
                              checked
                                ? items.filter(
                                    (i) =>
                                      !(i.provider === catalog.provider && i.variationId === p.id),
                                  )
                                : items.length < 30
                                  ? [...items, { provider: catalog.provider, variationId: p.id }]
                                  : items,
                            )
                          }
                          style={{
                            flexDirection: 'row',
                            gap: 12,
                            alignItems: 'center',
                            paddingVertical: 14,
                            borderBottomWidth: 1,
                            borderColor: c.divider,
                          }}
                        >
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: checked ? c.accent : c.inputBorder,
                              backgroundColor: checked ? c.backgroundSelected : c.background,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {checked && (
                              <SymbolView
                                name="checkmark"
                                tintColor={c.accent}
                                style={{ width: 18, height: 18 }}
                              />
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                            <ThemedText type="smallBold">{p.name}</ThemedText>
                            <ThemedText type="caption" themeColor="textSecondary">
                              {p.variation} · {money(p.price, p.currency)}
                            </ThemedText>
                          </View>
                        </Pressable>
                      );
                    })}
                </>
              )}
            </>
          )}
        </>
      )}
    </CustomerSurface>
  );
}
