import { View, Switch, type TextInputProps } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { ThemedText } from './themed-text';

export function CommerceField({ label, ...props }: TextInputProps & { readonly label: string }) {
  const colors = useTheme();
  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.textSecondary}
        style={[
          {
            minHeight: 52,
            padding: Spacing.three,
            borderRadius: Radius.small,
            borderWidth: 1,
            borderColor: colors.inputBorder,
            backgroundColor: colors.backgroundElement,
            color: colors.text,
            fontSize: 16,
          },
          props.style,
        ]}
      />
    </View>
  );
}
export function CommerceToggle({
  label,
  value,
  onChange,
  disabled = false,
  hint,
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (value: boolean) => void;
  readonly disabled?: boolean;
  readonly hint?: string;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.three,
      }}
    >
      <ThemedText style={{ flex: 1 }}>{label}</ThemedText>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled, checked: value }}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent }}
      />
    </View>
  );
}
