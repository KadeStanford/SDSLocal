import { SymbolView } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from './themed-text';
import { ParishMark, ParishPalette } from './parish-brand';

export function ParishBusinessBrand({
  label = 'FOR BUSINESS',
  inverse = false,
}: {
  readonly label?: string;
  readonly inverse?: boolean;
}) {
  const c = useTheme();
  const dark = useColorScheme() === 'dark';
  return (
    <View style={styles.brand} accessibilityLabel="Parish Pass for Business">
      <ParishMark size={32} dark={inverse || dark} />
      <View style={{ gap: 2 }}>
        <ThemedText style={[styles.wordmark, { color: inverse ? ParishPalette.ivory : c.text }]}>
          parish pass
        </ThemedText>
        <ThemedText
          type="smallBold"
          style={[styles.badgeText, { color: inverse ? ParishPalette.mint : c.textSecondary }]}
        >
          {label}
        </ThemedText>
      </View>
    </View>
  );
}

export function BusinessScreenHeader({
  title,
  subtitle,
  action,
  label,
  masthead = false,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly action?: ReactNode;
  readonly label?: string;
  readonly masthead?: boolean;
}) {
  return (
    <View style={[styles.header, masthead && styles.masthead]}>
      <ParishBusinessBrand inverse={masthead} {...(label ? { label } : {})} />
      <View style={styles.titleRow}>
        <ThemedText
          accessibilityRole="header"
          type="title"
          style={[styles.title, masthead && { color: ParishPalette.ivory }]}
        >
          {title}
        </ThemedText>
        {action}
      </View>
      <ThemedText
        themeColor="textSecondary"
        style={[styles.subtitle, masthead && { color: '#BDCEC5' }]}
      >
        {subtitle}
      </ThemedText>
    </View>
  );
}

export function BusinessEditorHeader({
  title,
  subtitle,
  onBack,
  backLabel = 'Back to business overview',
  disabled = false,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <ParishBusinessBrand />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          disabled={disabled}
          onPress={onBack}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView name="chevron.left" tintColor={c.text} style={{ width: 18, height: 18 }} />
        </Pressable>
        <ThemedText type="title" accessibilityRole="header" style={{ flex: 1 }}>
          {title}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {subtitle}
      </ThemedText>
    </View>
  );
}

export function BusinessTabs<T extends string>({
  value,
  options,
  onChange,
}: {
  readonly value: T;
  readonly options: readonly { value: T; label: string; count?: number }[];
  readonly onChange: (value: T) => void;
}) {
  const c = useTheme();
  return (
    <View accessibilityRole="tablist" style={[styles.tabs, { borderColor: c.divider }]}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => [
            styles.tab,
            options.length === 4 && { flexBasis: '45%' },
            {
              borderColor: value === option.value ? 'transparent' : c.divider,
              backgroundColor: value === option.value ? c.backgroundSelected : 'transparent',
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{
              color: value === option.value ? c.text : c.textSecondary,
              textAlign: 'center',
            }}
          >
            {option.label}
            {option.count === undefined ? '' : ` · ${option.count}`}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

export function BusinessSearch({
  value,
  onChange,
  placeholder,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        minHeight: 48,
        paddingHorizontal: 14,
        borderWidth: 0,
        borderColor: c.divider,
        borderRadius: 12,
        backgroundColor: c.backgroundElement,
      }}
    >
      <SymbolView
        name="magnifyingglass"
        tintColor={c.textSecondary}
        style={{ width: 18, height: 18 }}
      />
      <TextInput
        variant="inline"
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        value={value}
        onChangeText={onChange}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          fontSize: 15,
          color: c.text,
          paddingVertical: 10,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  masthead: {
    backgroundColor: ParishPalette.evergreen,
    padding: 22,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 0,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 0,
    marginBottom: 16,
    borderBottomWidth: 0,
  },
  symbol: { width: 108, height: 32 },
  wordmark: { fontSize: 20, lineHeight: 24, fontWeight: '700', letterSpacing: -0.8 },
  badge: { paddingVertical: 4 },
  badgeText: { fontSize: 10, lineHeight: 14, letterSpacing: 1.4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  title: { flexGrow: 1, flexShrink: 1, fontSize: 30, lineHeight: 36, letterSpacing: -0.7 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tab: {
    flexGrow: 1,
    flexBasis: 100,
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 999,
  },
});
