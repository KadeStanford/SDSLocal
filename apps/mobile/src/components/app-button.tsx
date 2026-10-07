import { ActionControl } from './shared-ui';
import type { ReactNode } from 'react';
import { type StyleProp, type ViewStyle, type TextStyle } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { buttonPresentation, type ButtonVariant } from '@/lib/ui-presentation';

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
  labelStyle,
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
  readonly labelStyle?: StyleProp<TextStyle>;
}) {
  const colors = useTheme();
  const state = buttonPresentation(colors, variant, disabled, loading);
  return (
    <ActionControl
      label={label}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
      loading={loading}
      icon={icon}
      iconOnly={iconOnly}
      color={state.color}
      labelStyle={labelStyle}
      style={(pressed) => [
        style,
        {
          backgroundColor:
            pressed && variant === 'primary' ? colors.actionPressed : state.backgroundColor,
        },
      ]}
    />
  );
}
