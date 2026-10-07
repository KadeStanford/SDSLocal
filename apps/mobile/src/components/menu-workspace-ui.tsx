import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { MerchantButton, MerchantSearch } from './merchant-ui';
import { ParishBusinessBrand } from './business-screen-header';

export type MenuStockFilter = 'all' | 'available' | 'sold-out' | 'hidden';
export function menuStockMatches(
  item: { is_visible: boolean; is_available: boolean },
  filter: MenuStockFilter,
) {
  return (
    filter === 'all' ||
    (filter === 'hidden'
      ? !item.is_visible
      : filter === 'sold-out'
        ? item.is_visible && !item.is_available
        : item.is_visible && item.is_available)
  );
}

export function MenuSetupHeader({
  services = false,
  businessName,
  canEdit,
  disabled,
  onBack,
  onAdd,
}: {
  services?: boolean;
  businessName: string;
  canEdit: boolean;
  disabled: boolean;
  onBack: () => void;
  onAdd: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <ParishBusinessBrand />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to business overview"
          disabled={disabled}
          onPress={onBack}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView name="chevron.left" tintColor={c.text} style={{ width: 18, height: 18 }} />
        </Pressable>
        <ThemedText type="title" accessibilityRole="header" style={{ flex: 1 }}>
          {services ? 'Services' : 'Menu'}
        </ThemedText>
        {canEdit && (
          <MerchantButton
            brand
            label={services ? '+ Add service' : '+ Add item'}
            disabled={disabled}
            onPress={onAdd}
          />
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {businessName} ·{' '}
        {services ? 'Your services, ready to book.' : 'Your menu, ready for customers.'}
      </ThemedText>
    </View>
  );
}

export function MenuSetupTabs<T extends string>({
  value,
  options,
  onChange,
  underline = false,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  underline?: boolean;
}) {
  const c = useTheme();
  return (
    <HorizontalScrollRow
      style={{ flexGrow: 0, flexShrink: 0 }}
      contentContainerStyle={{ gap: underline ? 20 : 8, alignItems: 'flex-start' }}
    >
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: underline ? 20 : 8 }}>
        {options.map((o) => (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: value === o.value }}
            onPress={() => onChange(o.value)}
            style={{
              minHeight: 44,
              justifyContent: 'center',
              paddingHorizontal: underline ? 0 : 14,
              paddingVertical: 10,
              borderRadius: underline ? 0 : 22,
              borderWidth: underline ? 0 : 1,
              borderBottomWidth: underline ? 2 : 1,
              borderColor: value === o.value ? c.accent : underline ? 'transparent' : c.divider,
              backgroundColor: underline
                ? 'transparent'
                : value === o.value
                  ? c.backgroundSelected
                  : c.backgroundElement,
            }}
          >
            <ThemedText
              style={{
                fontSize: 12,
                lineHeight: 18,
                fontWeight: value === o.value ? '600' : '400',
                color: value === o.value ? c.accent : c.textSecondary,
              }}
            >
              {o.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </HorizontalScrollRow>
  );
}

export function MenuSetupSearch({
  services = false,
  value,
  onChange,
  onTools,
  canEdit,
}: {
  services?: boolean;
  value: string;
  onChange: (value: string) => void;
  onTools: () => void;
  canEdit: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
      <View style={{ flex: 1 }}>
        <MerchantSearch
          value={value}
          onChange={onChange}
          placeholder={services ? 'Find a service' : 'Find a menu item'}
        />
      </View>
      {canEdit && (
        <Pressable
          onPress={onTools}
          accessibilityRole="button"
          accessibilityLabel="Inventory and visibility tools"
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.divider,
            borderRadius: 12,
            backgroundColor: c.backgroundElement,
          }}
        >
          <SymbolView
            name="slider.horizontal.3"
            tintColor={c.text}
            style={{ width: 21, height: 21 }}
          />
        </Pressable>
      )}
    </View>
  );
}

export function MenuSetupItem({
  services = false,
  name,
  category,
  price,
  photo,
  visible,
  available,
  featured,
  disabled,
  onPress,
}: {
  services?: boolean;
  name: string;
  category: string;
  price: string;
  photo: string | null;
  visible: boolean;
  available: boolean;
  featured: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const status = !visible
    ? 'Hidden'
    : available
      ? 'Available'
      : services
        ? 'Unavailable'
        : 'Sold out';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Edit ${name}. ${price}. ${status}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {photo ? (
        <Image
          source={{ uri: photo }}
          contentFit="cover"
          style={{ width: 76, height: 94, borderRadius: 12 }}
        />
      ) : (
        <View
          style={{
            width: 76,
            height: 94,
            borderRadius: 12,
            backgroundColor: c.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView
            name={services ? 'wrench.and.screwdriver' : 'fork.knife'}
            tintColor={c.textSecondary}
            style={{ width: 25, height: 25 }}
          />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 7 }}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {name}
        </ThemedText>
        <ThemedText
          style={{ fontSize: 11, lineHeight: 16, color: c.textSecondary }}
          numberOfLines={2}
        >
          {category}
          {featured ? ' · Featured' : ''}
        </ThemedText>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 6,
          }}
        >
          <ThemedText type="smallBold">{price}</ThemedText>
          <View
            style={{
              backgroundColor: visible && available ? c.backgroundSelected : c.background,
              borderRadius: 6,
              paddingHorizontal: 7,
              paddingVertical: 4,
            }}
          >
            <ThemedText
              style={{
                fontSize: 10,
                lineHeight: 14,
                color: visible && available ? c.accent : c.textSecondary,
              }}
            >
              {status}
            </ThemedText>
          </View>
        </View>
      </View>
      <SymbolView
        name="chevron.right"
        tintColor={c.textSecondary}
        style={{ width: 12, height: 12 }}
      />
    </Pressable>
  );
}

export function MenuCategoryActions({
  canEdit,
  disabled = false,
  onAdd,
}: {
  canEdit: boolean;
  disabled?: boolean;
  onAdd: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <ThemedText type="smallBold">Categories</ThemedText>
      {canEdit && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add category"
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={onAdd}
          style={{
            minHeight: 44,
            paddingHorizontal: 8,
            justifyContent: 'center',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <ThemedText type="smallBold" themeColor="accent">
            + Add category
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}
