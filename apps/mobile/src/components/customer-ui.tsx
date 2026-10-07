import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

// Shared proportions for customer screens; colors come from the original app theme.
export const CustomerLayout = { gutter: 20, radius: 14, gap: 20 } as const;

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
  const c = useTheme();
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: c.backgroundElement, borderColor: c.divider },
        style,
      ]}
    >
      {children}
    </View>
  );
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        iconOnly && { minWidth: 44, paddingHorizontal: 10 },
        { backgroundColor: c.backgroundSelected, opacity: disabled ? 0.45 : pressed ? 0.7 : 1 },
      ]}
    >
      {icon && (
        <SymbolView name={names[icon]} tintColor={c.accent} style={{ width: 16, height: 16 }} />
      )}
      {!iconOnly && (
        <ThemedText type="smallBold" style={{ fontSize: 13, lineHeight: 18 }}>
          {label}
        </ThemedText>
      )}
    </Pressable>
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
    <View style={styles.heading}>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <ThemedText style={styles.headingText}>{title}</ThemedText>
        {detail && (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        )}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: { padding: 20, borderRadius: CustomerLayout.radius, borderWidth: 1, gap: 16 },
  action: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingText: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.35 },
});
