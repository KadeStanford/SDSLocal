import { inputPresets } from '@/lib/input-presets';
import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { ThemedText } from '../themed-text';
import { SymbolView } from 'expo-symbols';
import { EmptyState } from '../data-state';
import { HorizontalScrollRow } from '../horizontal-scroll-row';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { menuCategories, itemAccessibilityLabel, safeProductImage } from '@/lib/pickup-order-flow';
import {
  filteredMenuRows,
  hasCustomization,
  simpleQuantity,
  type MenuRow,
} from '@/lib/pickup-menu-controls';
import { money, type CartLine, type Product } from '@/lib/square-commerce-core';
import { ProductPhoto } from './product-photo';
import { QuantityIcon, QuantityStepper } from './quantity-stepper';

export const PickupMenuRow = memo(function PickupMenuRow({
  product,
  products,
  quantity,
  disabled,
  onChoose,
  onAdd,
  onQuantity,
}: {
  product: Product;
  products?: Product[];
  quantity: number;
  disabled: boolean;
  onChoose: (p: Product, variants?: Product[]) => void;
  onAdd: (p: Product, variants?: Product[]) => void;
  onQuantity: (p: Product, delta: 1 | -1) => void;
}) {
  const c = useTheme();
  const variants = products?.length ? products : [product];
  const hasVariants = variants.length > 1;
  const unavailable = variants.every((variant) => variant.available === false);
  const blocked = disabled || unavailable;
  const hasPhoto = !!safeProductImage(product.image);
  const customizable = hasVariants || hasCustomization(product);
  const lowestPrice = Math.min(...variants.map((variant) => variant.price));
  return (
    <View
      style={{
        padding: 12,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        boxShadow: '0 6px 20px rgba(10, 34, 21, 0.08)',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={itemAccessibilityLabel(product)}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={() => (hasVariants ? onChoose(product, variants) : onChoose(product))}
        style={({ pressed }) => ({ minWidth: 0, opacity: pressed ? 0.75 : 1 })}
      >
        {hasPhoto && <ProductPhoto image={product.image} menu />}
        <View style={{ paddingHorizontal: 6, paddingTop: hasPhoto ? 16 : 6, gap: 8 }}>
          <ThemedText type="card" style={{ fontSize: 18, lineHeight: 24, letterSpacing: -0.25 }}>
            {product.name}
          </ThemedText>
          {!!product.description && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
              {product.description}
            </ThemedText>
          )}
          {hasVariants ? (
            <ThemedText type="caption" themeColor="textSecondary">
              {variants.map((variant) => variant.variation || 'Regular').join(' · ')}
            </ThemedText>
          ) : customizable ? (
            <ThemedText type="caption" themeColor="textSecondary">
              Options available
            </ThemedText>
          ) : (
            !!product.variation &&
            product.variation !== 'Regular' && (
              <ThemedText type="caption" themeColor="textSecondary">
                {product.variation}
              </ThemedText>
            )
          )}
        </View>
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          paddingHorizontal: 6,
          paddingTop: 20,
          paddingBottom: 6,
        }}
      >
        <View style={{ gap: 2 }}>
          {hasVariants && (
            <ThemedText type="caption" themeColor="textSecondary">
              From
            </ThemedText>
          )}
          <ThemedText
            type="smallBold"
            style={{ fontSize: 18, lineHeight: 24, fontVariant: ['tabular-nums'] }}
          >
            {money(lowestPrice, product.currency)}
          </ThemedText>
          {unavailable && (
            <ThemedText type="caption" themeColor="textSecondary">
              Currently unavailable
            </ThemedText>
          )}
        </View>
        {!customizable && quantity > 0 ? (
          <QuantityStepper
            name={product.name}
            quantity={quantity}
            disabled={blocked}
            onChange={(delta) => onQuantity(product, delta)}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            accessibilityLabel={
              (hasVariants
                ? 'Choose a variation for'
                : customizable
                  ? 'Choose options for'
                  : 'Add one') +
              ' ' +
              product.name
            }
            onPress={() => (customizable ? onChoose(product, variants) : onAdd(product))}
            style={({ pressed }) => ({
              minHeight: 48,
              minWidth: 130,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.divider,
              backgroundColor: blocked ? c.background : c.backgroundSelected,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              opacity: pressed ? 0.75 : 1,
              boxShadow: blocked ? undefined : '0 2px 3px rgba(16, 45, 37, 0.08)',
            })}
          >
            {!customizable && !unavailable && (
              <QuantityIcon color={blocked ? c.textSecondary : c.accent} plus />
            )}
            <ThemedText type="smallBold" style={{ color: blocked ? c.textSecondary : c.accent }}>
              {unavailable ? 'Unavailable' : customizable ? 'Customize' : 'Add item'}
            </ThemedText>
            {customizable && !unavailable && (
              <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                tintColor={blocked ? c.textSecondary : c.accent}
                style={{ width: 16, height: 16 }}
              />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
});

export interface MenuBrowseState {
  category: string | null;
  search: string;
  offset: number;
}
export function PickupMenu({
  products,
  cart = [],
  onChoose,
  onAdd,
  onQuantity,
  disabled = false,
  header,
  refreshing = false,
  onRefresh,
  browseState,
  onBrowseChange,
}: {
  products: Product[];
  cart?: CartLine[];
  onChoose: (p: Product, variants?: Product[]) => void;
  onAdd: (p: Product, variants?: Product[]) => void;
  onQuantity: (p: Product, delta: 1 | -1) => void;
  disabled?: boolean;
  header?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  browseState?: MenuBrowseState;
  onBrowseChange?: (change: Partial<MenuBrowseState>) => void;
}) {
  const c = useTheme();
  const bottom = useScreenBottomPadding();
  const [category, setCategory] = useState(browseState?.category ?? null);
  const [search, setSearch] = useState(browseState?.search ?? '');
  const categories = useMemo(() => menuCategories(products), [products]);
  const selected = categories.some((g) => g.name === category) ? category : null;
  const rows = useMemo(
    () => filteredMenuRows(products, selected, search),
    [products, selected, search],
  );
  const list = useRef<FlatList<MenuRow>>(null);
  const restored = useRef(false);
  const initialOffset = useRef(browseState?.offset ?? 0);
  return (
    <FlatList
      ref={list}
      style={{ flex: 1, minHeight: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: Math.max(24, bottom),
      }}
      data={rows}
      keyExtractor={(row) => row.key}
      extraData={{ cart, disabled }}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={7}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScroll={(e) => {
        if (restored.current) onBrowseChange?.({ offset: e.nativeEvent.contentOffset.y });
      }}
      scrollEventThrottle={100}
      onContentSizeChange={() => {
        if (!restored.current && rows.length) {
          restored.current = true;
          list.current?.scrollToOffset({ offset: initialOffset.current, animated: false });
        }
      }}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />
        ) : undefined
      }
      ListHeaderComponent={
        <View style={{ gap: 16, paddingBottom: 12 }}>
          {header}
          {(products.length > 8 || !!search) && (
            <TextInput
              variant="inline"
              accessibilityLabel="Search pickup menu"
              placeholder="Search the menu"
              {...inputPresets.search}
              value={search}
              onChangeText={(value) => {
                setSearch(value);
                onBrowseChange?.({ search: value, offset: 0 });
              }}
              clearButtonMode="while-editing"
              returnKeyType="search"
              autoCorrect={false}
              placeholderTextColor={c.textSecondary}
              style={{
                minHeight: 48,
                borderRadius: 12,
                padding: 12,
                fontSize: 16,
                color: c.text,
                backgroundColor: c.backgroundElement,
              }}
            />
          )}
          {categories.length > 1 && (
            <HorizontalScrollRow contentContainerStyle={{ gap: 22 }}>
              {[null, ...categories.map((g) => g.name)].map((name) => (
                <Pressable
                  key={name ?? 'all'}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: selected === name }}
                  onPress={() => {
                    setCategory(name);
                    onBrowseChange?.({ category: name, offset: 0 });
                    list.current?.scrollToOffset({ offset: 0, animated: false });
                  }}
                  style={{
                    minHeight: 48,
                    paddingHorizontal: 0,
                    paddingVertical: 12,
                    borderBottomWidth: 3,
                    borderBottomColor: selected === name ? c.accent : 'transparent',
                    justifyContent: 'center',
                    backgroundColor: c.background,
                  }}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: selected === name ? c.accent : c.textSecondary }}
                  >
                    {name ?? 'All items'}
                  </ThemedText>
                </Pressable>
              ))}
            </HorizontalScrollRow>
          )}
        </View>
      }
      renderItem={({ item }) =>
        item.kind === 'heading' ? (
          categories.length > 1 || item.name !== 'Menu' ? (
            <ThemedText
              accessibilityRole="header"
              type="card"
              style={{ paddingTop: 12, paddingBottom: 12 }}
            >
              {item.name}
            </ThemedText>
          ) : null
        ) : (
          <View>
            <PickupMenuRow
              product={item.product}
              products={item.products}
              quantity={simpleQuantity(cart, item.product)}
              disabled={disabled}
              onChoose={onChoose}
              onAdd={onAdd}
              onQuantity={onQuantity}
            />
          </View>
        )
      }
      ListEmptyComponent={
        !refreshing ? (
          <EmptyState
            title={
              search
                ? 'No matching items'
                : products.length
                  ? 'Nothing in this category'
                  : 'The menu is being prepared'
            }
            message={
              search
                ? 'Try another item name or choose All items.'
                : 'Check back or refresh for available items.'
            }
          />
        ) : null
      }
    />
  );
}
