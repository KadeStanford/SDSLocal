import { ThemedText } from './themed-text';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAppMode } from '@/providers/app-mode-provider';

import { ModeSwitch } from './mode-switch';
import { router } from 'expo-router';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';

/** Shared utility actions for top-level customer and business screens. */
export function AppChrome({
  inline = false,
  accountScreen = false,
  showModeSwitch = true,
  onBack,
}: {
  inline?: boolean;
  accountScreen?: boolean;
  showModeSwitch?: boolean;
  onBack?: (() => void) | undefined;
}) {
  const { mode } = useAppMode();
  const businessMode = mode === 'business';
  const colors = useTheme();

  if (!businessMode && !onBack) return null;
  return (
    <View
      style={[
        styles.row,
        inline
          ? styles.rowInline
          : businessMode && showModeSwitch
            ? styles.rowBusiness
            : styles.rowCustomer,
      ]}
    >
      {businessMode && showModeSwitch ? <ModeSwitch /> : null}
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={onBack}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView
            name="chevron.left"
            tintColor={colors.text}
            style={{ width: 18, height: 18 }}
          />
        </Pressable>
      )}
      {businessMode && !accountScreen && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          onPress={() => router.push('/business-account' as never)}
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView
            name="person.crop.circle"
            tintColor={colors.text}
            style={{ width: 25, height: 25 }}
          />
          <ThemedText type="small">Account</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  rowCustomer: { justifyContent: 'flex-end' },
  rowBusiness: { justifyContent: 'space-between' },
  rowInline: { flexShrink: 0 },
});
