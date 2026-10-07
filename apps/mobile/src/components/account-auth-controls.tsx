import { AppIcon } from '@/components/app-icon';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { haptics } from '@/lib/haptics';
import { Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function AuthModeButton({
  active,
  label,
  disabled,
  onPress,
}: {
  active: boolean;
  label: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        void haptics.selection();
        onPress();
      }}
      style={[styles.mode, { backgroundColor: active ? c.backgroundSelected : 'transparent' }]}
    >
      <ThemedText type="smallBold" style={{ color: active ? c.accent : c.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function RememberSessionToggle({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Stay signed in on this device"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        void haptics.selection();
        onChange(!value);
      }}
      style={styles.remember}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: value ? c.actionPrimary : c.inputBorder,
            backgroundColor: value ? c.actionPrimary : c.backgroundElement,
          },
        ]}
      >
        {value && (
          <AppIcon name="check" size={18} />
        )}
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold">Stay signed in on this device</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Keeps you signed in when you close the app.
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mode: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  remember: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  box: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
