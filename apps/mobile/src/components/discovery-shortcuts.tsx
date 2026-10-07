import { Pressable, StyleSheet, View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import type { DiscoveryFeature } from '@/lib/discovery-core';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { ThemedText } from './themed-text';

const shortcuts = [
  {
    value: 'all',
    label: 'All places',
    icon: { ios: 'building.2', android: 'storefront', web: 'storefront' },
  },
  {
    value: 'accepting-pickup',
    label: 'Order ahead',
    icon: { ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' },
  },
  {
    value: 'rewards',
    label: 'Rewards',
    icon: { ios: 'gift', android: 'card_giftcard', web: 'card_giftcard' },
  },
  {
    value: 'open-now',
    label: 'Open now',
    icon: { ios: 'clock', android: 'schedule', web: 'schedule' },
  },
] as const;

export function DiscoveryShortcuts({
  value,
  pickupEnabled,
  onChange,
  interactive = true,
}: {
  readonly value: DiscoveryFeature;
  readonly pickupEnabled: boolean;
  readonly onChange: (value: DiscoveryFeature) => void;
  readonly interactive?: boolean;
}) {
  const colors = useTheme();
  return (
    <HorizontalScrollRow
      style={styles.scroll}
      scrollEnabled={interactive}
      contentContainerStyle={styles.row}
    >
      {shortcuts
        .filter((shortcut) => shortcut.value !== 'accepting-pickup' || pickupEnabled)
        .map((shortcut) => {
          const selected = value === shortcut.value;
          return (
            <Pressable
              key={shortcut.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={shortcut.label}
              disabled={!interactive}
              onPress={() => onChange(shortcut.value)}
              style={({ pressed }) => [
                styles.shortcut,
                {
                  borderColor: selected ? colors.accent : colors.divider,
                  backgroundColor: selected ? colors.backgroundSelected : colors.backgroundElement,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.iconPlate,
                  {
                    backgroundColor: selected
                      ? colors.backgroundSelected
                      : colors.backgroundElement,
                  },
                ]}
              >
                <SymbolView
                  name={shortcut.icon}
                  tintColor={selected ? colors.accent : colors.textSecondary}
                  style={styles.icon}
                />
              </View>
              <ThemedText style={[styles.label, { color: selected ? colors.accent : colors.text }]}>
                {shortcut.label}
              </ThemedText>
            </Pressable>
          );
        })}
    </HorizontalScrollRow>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 8, paddingVertical: 2, alignItems: 'flex-start' },
  shortcut: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  iconPlate: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  icon: { width: 17, height: 17 },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
});
