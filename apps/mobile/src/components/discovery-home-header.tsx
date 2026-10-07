import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { CustomerBrand } from './customer-brand';
import { ParishPalette } from './parish-brand';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function DiscoveryHomeHeader({
  area,
  onChooseArea,
  actions,
  children,
}: {
  readonly children?: ReactNode;
  readonly actions?: ReactNode;
  readonly area: string;
  readonly onChooseArea: () => void;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{ padding: 20, borderRadius: 18, backgroundColor: ParishPalette.evergreen, gap: 22 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <CustomerBrand inverse />
          {actions}
        </View>
        <ThemedText
          accessibilityRole="header"
          style={{
            fontSize: 29,
            lineHeight: 35,
            fontWeight: '700',
            letterSpacing: -0.8,
            color: ParishPalette.ivory,
            maxWidth: 250,
          }}
        >
          Discover your parish.
        </ThemedText>
        {children}
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <SymbolView
            name="mappin.and.ellipse"
            tintColor={c.accent}
            style={{ width: 17, height: 17 }}
          />
          <ThemedText type="small" themeColor="textSecondary" style={{ flexShrink: 1 }}>
            {area}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Explore area: ${area}. Choose an area`}
          onPress={onChooseArea}
          style={({ pressed }) => ({
            minHeight: 44,
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: 9,
            backgroundColor: c.backgroundSelected,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <ThemedText type="smallBold">Change area</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
