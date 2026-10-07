import { ActionControl, Surface, SectionHeading } from './shared-ui';
import { surfaceLayout } from '@sds/design-tokens';
import type { ReactNode } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

// Shared proportions for customer screens; colors come from the original app theme.
export const CustomerLayout = {
  gutter: surfaceLayout.gutter,
  radius: surfaceLayout.radius,
  gap: surfaceLayout.screenGap,
} as const;

export function CustomerTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        gap: 4,
        borderRadius: 12,
        backgroundColor: c.backgroundElement,
      }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value }}
          onPress={() => onChange(option.value)}
          style={{
            flex: 1,
            minHeight: 44,
            padding: 10,
            borderRadius: 9,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: option.value === value ? c.backgroundSelected : 'transparent',
          }}
        >
          <ThemedText
            type="smallBold"
            style={{ color: option.value === value ? c.text : c.textSecondary }}
          >
            {option.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function CustomerSurface({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <Surface style={[{ padding: 16, gap: 16 }, style]}>{children}</Surface>;
}

export function CustomerAction({
  label,
  onPress,
  icon,
  disabled = false,
  accessibilityLabel,
  iconOnly = false,
}: {
  label: string;
  onPress: () => void;
  icon?: 'back' | 'edit' | 'remove';
  disabled?: boolean;
  accessibilityLabel?: string;
  iconOnly?: boolean;
}) {
  const c = useTheme();
  const names = { back: 'chevron.left', edit: 'pencil', remove: 'trash' } as const;
  return (
    <ActionControl
      compact
      label={label}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      iconOnly={iconOnly}
      color={c.text}
      icon={
        icon && (
          <SymbolView name={names[icon]} tintColor={c.accent} style={{ width: 16, height: 16 }} />
        )
      }
      style={{ backgroundColor: c.backgroundSelected, paddingHorizontal: iconOnly ? 10 : 12 }}
      labelStyle={{ fontSize: 13, lineHeight: 18, fontWeight: '600' }}
    />
  );
}

export function CustomerSectionHeading({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <SectionHeading
      title={title}
      description={detail}
      action={action}
      titleStyle={{ fontSize: 22, lineHeight: 28, letterSpacing: -0.25 }}
    />
  );
}
