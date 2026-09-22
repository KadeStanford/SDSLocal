import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { minimumTouchTarget } from '@sds/design-tokens';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buttonPresentation, type ButtonVariant } from '@/lib/ui-presentation';
import { ThemedText } from './themed-text';

export function AppButton({
  label,
  accessibilityLabel,
  onPress,
  onPressIn,
  onPressOut,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  iconOnly = false,
  style,
}: {
  readonly label: string;
  readonly accessibilityLabel?: string;
  readonly onPress: () => void;
  readonly onPressIn?: () => void;
  readonly onPressOut?: () => void;
  readonly variant?: ButtonVariant;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly icon?: ReactNode;
  readonly iconOnly?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const state = buttonPresentation(colors, variant, disabled, loading);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={state.accessibilityState}
      disabled={state.disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.button,
        style,
        {
          backgroundColor:
            pressed && variant === 'primary' ? colors.actionPressed : state.backgroundColor,
        },
        pressed && styles.pressed,
      ]}
    >
      {loading ? <ActivityIndicator color={state.color} /> : icon}
      {!iconOnly && (
        <ThemedText type="button" style={[styles.label, { color: state.color }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    minWidth: minimumTouchTarget,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  label: { flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.82 },
});
