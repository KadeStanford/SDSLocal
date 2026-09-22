import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useAppMode } from '@/providers/app-mode-provider';

export function ModeSwitch() {
  const { mode, setMode, hasBusinessAccess } = useAppMode();
  if (!hasBusinessAccess) return null;

  return (
    <View accessibilityLabel="App mode" accessibilityRole="radiogroup" style={styles.container}>
      <ModeOption
        active={mode === 'customer'}
        label="Customer"
        onPress={() => setMode('customer')}
      />
      <ModeOption
        active={mode === 'business'}
        label="Business"
        onPress={() => setMode('business')}
      />
    </View>
  );
}

function ModeOption({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.option,
        active && styles.optionActive,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText style={[styles.optionText, active && styles.optionTextActive]} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    backgroundColor: '#26362E',
    gap: Spacing.one,
  },
  option: {
    minHeight: 44,
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  optionActive: { backgroundColor: '#D9F2E5' },
  optionText: { color: '#F3F7F4' },
  optionTextActive: { color: '#123D2C' },
  pressed: { opacity: 0.72 },
});
