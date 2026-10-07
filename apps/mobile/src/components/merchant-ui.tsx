import { ActionControl, ModalHeading, SectionHeading } from './shared-ui';
import { useTheme } from '@/hooks/use-theme';
import { Brand } from '@/constants/theme';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { ThemedText } from './themed-text';
import { AppIcon } from './app-icon';

export const merchantStyles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 20, gap: 20, flexGrow: 1 },
  list: { borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  input: { minHeight: 50, padding: 14, borderWidth: 1, borderRadius: 14, fontSize: 16 },
  section: { gap: 12 },
});

export function MerchantHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const c = useMerchantTheme();
  return (
    <SectionHeading
      page
      title={title}
      description={subtitle}
      action={action}
      titleStyle={{ color: c.text, fontSize: 26, lineHeight: 32 }}
      descriptionStyle={{ color: c.secondary }}
    />
  );
}
export function MerchantButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  secondary = false,
  destructive = false,
  accessibilityLabel,
  brand = true,
  icon,
  iconOnly = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  destructive?: boolean;
  accessibilityLabel?: string;
  brand?: boolean;
  icon?: ReactNode;
  iconOnly?: boolean;
}) {
  const c = useMerchantTheme(),
    theme = useTheme();
  const color = destructive ? c.danger : secondary ? c.text : brand ? Brand.onPrimary : c.onAction;
  return (
    <ActionControl
      label={label}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      loading={loading}
      icon={icon}
      iconOnly={iconOnly}
      color={color}
      style={{
        borderWidth: secondary && !brand ? 1 : 0,
        borderColor: c.border,
        backgroundColor: destructive
          ? c.dangerSurface
          : brand
            ? secondary
              ? theme.backgroundSelected
              : Brand.primary
            : secondary
              ? 'transparent'
              : c.text,
      }}
    />
  );
}
export function MerchantSearch({
  value,
  onChange,
  placeholder = 'Search',
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const c = useMerchantTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        paddingHorizontal: 14,
        backgroundColor: c.surface,
      }}
    >
      <AppIcon name="search" size={20} tintColor={c.secondary} />
      <TextInput
        variant="inline"
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.secondary}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[
          merchantStyles.input,
          { backgroundColor: 'transparent', borderWidth: 0, flex: 1, minWidth: 0, color: c.text },
        ]}
      />
    </View>
  );
}
export function MerchantFilters<T extends string>({
  value,
  options,
  onChange,
  brand = true,
}: {
  brand?: boolean;
  value: T;
  options: readonly { value: T; label: string; count?: number }[];
  onChange: (v: T) => void;
}) {
  const c = useMerchantTheme();
  const theme = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="tab"
          accessibilityLabel={o.label + (o.count === undefined ? '' : ', ' + o.count)}
          accessibilityState={{ selected: value === o.value }}
          onPress={() => onChange(o.value)}
          style={{
            minHeight: 44,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: value === o.value ? (brand ? theme.accent : c.text) : c.border,
            backgroundColor:
              value === o.value ? (brand ? theme.backgroundSelected : c.text) : c.surface,
            justifyContent: 'center',
          }}
        >
          <ThemedText
            type="smallBold"
            style={{ color: value === o.value ? (brand ? theme.text : c.onAction) : c.secondary }}
          >
            {o.label}
            {o.count === undefined ? '' : ' · ' + o.count}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}
export function MerchantStatus({
  label,
  tone = 'quiet',
}: {
  label: string;
  tone?: 'quiet' | 'success' | 'warning' | 'danger';
}) {
  const c = useMerchantTheme();
  const color =
    tone === 'success'
      ? c.success
      : tone === 'warning'
        ? c.warning
        : tone === 'danger'
          ? c.danger
          : c.secondary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
        backgroundColor:
          tone === 'warning' ? c.attention : tone === 'danger' ? c.dangerSurface : c.background,
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 8,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <ThemedText type="caption" style={{ color, flexShrink: 1 }}>
        {label}
      </ThemedText>
    </View>
  );
}
export function MerchantRow({
  title,
  subtitle,
  detail,
  status,
  onPress,
  label,
  attention = false,
  leading,
  disabled = false,
}: {
  title: string;
  subtitle?: string;
  detail?: string;
  status?: ReactNode;
  onPress: () => void;
  label?: string;
  attention?: boolean;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  const c = useMerchantTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 16,
        minHeight: 92,
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
        backgroundColor: pressed ? c.background : c.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      })}
    >
      {attention && (
        <View
          style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: c.warning }}
        />
      )}
      {leading}
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <ThemedText
            type="smallBold"
            style={{ color: c.text, flexGrow: 1, flexShrink: 1, fontSize: 16, lineHeight: 22 }}
          >
            {title}
          </ThemedText>
          {status}
        </View>
        {!!subtitle && (
          <ThemedText type="small" style={{ color: c.secondary }}>
            {subtitle}
          </ThemedText>
        )}
        {!!detail && (
          <ThemedText type="small" numberOfLines={2} style={{ color: c.secondary }}>
            {detail}
          </ThemedText>
        )}
      </View>
      {!disabled && <AppIcon name="chevron-right" size={18} />}
    </Pressable>
  );
}
/** One scrollable detail/editor with an independent footer and keyboard-safe geometry. */
export function MerchantSheet({
  visible,
  title,
  onClose,
  children,
  footer,
  blocked = false,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  blocked?: boolean;
}) {
  const c = useMerchantTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!blocked) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <Pressable
          accessibilityLabel={'Close ' + title}
          accessibilityRole="button"
          disabled={blocked}
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: '90%',
            backgroundColor: c.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
            paddingBottom: Math.max(16, insets.bottom),
          }}
        >
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <ModalHeading title={title} onClose={onClose} blocked={blocked} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ padding: 20, gap: 20 }}
          >
            {children}
          </ScrollView>
          {footer && (
            <View
              style={{
                paddingHorizontal: 20,
                paddingTop: 12,
                borderTopWidth: 1,
                borderTopColor: c.border,
                gap: 10,
              }}
            >
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function MerchantRating({
  value,
  onChange,
  disabled = false,
}: {
  value: number;
  onChange: (rating: number) => void;
  disabled?: boolean;
}) {
  const c = useMerchantTheme();
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          accessibilityRole="radio"
          accessibilityLabel={rating + ' ' + (rating === 1 ? 'star' : 'stars')}
          accessibilityState={{ checked: rating === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(rating)}
          style={{
            minWidth: 44,
            minHeight: 48,
            padding: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 0,
            borderRadius: 24,
            backgroundColor: 'transparent',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <AppIcon name="star" size={18} fill={rating <= value} />
        </Pressable>
      ))}
    </View>
  );
}
