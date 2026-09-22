import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import { FlatList, Pressable, RefreshControl, TextInput, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { AppButton } from '../app-button';
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
import { QuantityStepper } from './quantity-stepper';

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
  const compact = !safeProductImage(product.image);
  return (
    <View
      style={{
        padding: 16,
        gap: compact ? 12 : 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        flexDirection: compact ? 'row' : 'column',
        flexWrap: compact ? 'wrap' : 'nowrap',
        alignItems: compact ? 'center' : 'stretch',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={itemAccessibilityLabel(product)}
        accessibilityState={{ disabled: blocked }}
        disabled={blocked}
        onPress={() => (hasVariants ? onChoose(product, variants) : onChoose(product))}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 14,
          minHeight: compact ? 48 : 88,
          ...(compact
            ? { flexGrow: 1, flexBasis: 140, minWidth: 0 }
            : { width: '100%', alignSelf: 'stretch' }),
          opacity: pressed ? 0.75 : 1,
        })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText type="card">{product.name}</ThemedText>
          {hasVariants ? (
            <ThemedText type="small" themeColor="textSecondary">
              {variants.map((variant) => variant.variation || 'Regular').join(' · ')}
            </ThemedText>
          ) : (
            !!product.variation &&
            product.variation !== 'Regular' && (
              <ThemedText type="small" themeColor="textSecondary">
                {product.variation}
              </ThemedText>
            )
          )}
          {!!product.description && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {product.description}
            </ThemedText>
          )}
          {unavailable && (
            <ThemedText type="smallBold" themeColor="textSecondary">
              Currently unavailable
            </ThemedText>
          )}
          {compact && (
            <ThemedText type="smallBold">{money(product.price, product.currency)}</ThemedText>
          )}
        </View>
        <ProductPhoto image={product.image} />
      </Pressable>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          ...(compact
            ? {}
            : {
                borderTopWidth: 1,
                borderTopColor: c.divider,
                paddingTop: 12,
              }),
        }}
      >
        {!compact && (
          <ThemedText type="smallBold">{money(product.price, product.currency)}</ThemedText>
        )}
        {!hasCustomization(product) && quantity > 0 ? (
          <QuantityStepper
            name={product.name}
            quantity={quantity}
            disabled={blocked}
            onChange={(delta) => onQuantity(product, delta)}
          />
        ) : (
          <AppButton
            label={
              hasVariants ? 'Choose size' : hasCustomization(product) ? 'Choose options' : '+ Add'
            }
            accessibilityLabel={`${hasVariants ? 'Choose a variation for' : hasCustomization(product) ? 'Choose options for' : 'Add one'} ${product.name}`}
            variant="secondary"
            disabled={blocked}
            onPress={() => (hasVariants ? onChoose(product, variants) : onAdd(product))}
            style={{ minWidth: 80, borderRadius: 24 }}
          />
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
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(24, bottom) }}
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
              accessibilityLabel="Search pickup menu"
              placeholder="Search the menu"
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
            <HorizontalScrollRow contentContainerStyle={{ gap: 8 }}>
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
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 24,
                    justifyContent: 'center',
                    backgroundColor: selected === name ? c.actionPrimary : c.backgroundElement,
                  }}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: selected === name ? c.onAction : c.text }}
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
          <View style={{ paddingBottom: 12 }}>
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
