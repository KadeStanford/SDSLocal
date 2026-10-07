import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { controlLayout, surfaceLayout } from '@sds/design-tokens';

/** Shared action geometry/state; callers retain semantic palettes and event contracts. */
export function ActionControl({
  label,
  accessibilityLabel,
  onPress,
  onPressIn,
  onPressOut,
  disabled = false,
  loading = false,
  icon,
  iconOnly = false,
  color,
  style,
  labelStyle,
  compact = false,
}: {
  label: string;
  accessibilityLabel?: string | undefined;
  onPress: () => void;
  onPressIn?: (() => void) | undefined;
  onPressOut?: (() => void) | undefined;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
  color: string;
  style?: StyleProp<ViewStyle> | ((pressed: boolean) => StyleProp<ViewStyle>);
  labelStyle?: StyleProp<TextStyle>;
  compact?: boolean;
}) {
  const blocked = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        {
          minHeight: compact ? 44 : controlLayout.height,
          minWidth: 44,
          borderRadius: controlLayout.radius,
          paddingHorizontal: controlLayout.paddingHorizontal,
          paddingVertical: compact ? 8 : controlLayout.paddingVertical,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: controlLayout.gap,
        },
        typeof style === 'function' ? style(pressed) : style,
        blocked ? { opacity: 0.45 } : pressed ? { opacity: 0.75 } : null,
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : icon}
      {!iconOnly && (
        <ThemedText
          type="button"
          style={[{ color, flexShrink: 1, textAlign: 'center' }, labelStyle]}
        >
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

/** A section surface, not a merchant identity card. Insets preserve unboxed editor groups. */
export function Surface({
  children,
  inset = false,
  style,
}: {
  children: ReactNode;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: inset ? 'transparent' : c.backgroundElement,
          borderColor: c.divider,
          borderWidth: inset ? 0 : 1,
          borderRadius: inset ? 0 : surfaceLayout.radius,
          padding: inset ? 0 : surfaceLayout.padding,
          gap: surfaceLayout.gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeading({
  title,
  description,
  action,
  page = false,
  style,
  titleStyle,
  descriptionStyle,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode;
  page?: boolean;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
  descriptionStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <ThemedText
          accessibilityRole="header"
          style={[
            { fontSize: page ? 28 : 18, lineHeight: page ? 34 : 24, fontWeight: '700' },
            titleStyle,
          ]}
        >
          {title}
        </ThemedText>
        {!!description && (
          <ThemedText type="small" themeColor="textSecondary" style={descriptionStyle}>
            {description}
          </ThemedText>
        )}
      </View>
      {action}
    </View>
  );
}

/** Compact sheets keep a Close control; full page flows use PageHeader and Back instead. */
export function ModalHeading({
  title,
  onClose,
  blocked = false,
}: {
  title: string;
  onClose: () => void;
  blocked?: boolean;
}) {
  const c = useTheme();
  return (
    <View testID="parish-modal-heading">
      <SectionHeading
        title={title}
        action={
          <ActionControl
            label="Close"
            accessibilityLabel={'Close ' + title}
            compact
            onPress={onClose}
            disabled={blocked}
            color={c.text}
            style={{ backgroundColor: c.backgroundSelected }}
          />
        }
      />
    </View>
  );
}
