import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './app-button';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { haptics } from '@/lib/haptics';
import { FormField } from './form-field';
import { AppTextInput } from './app-text-input';
import { inputPresets } from '@/lib/input-presets';

export function ChoicePicker<T extends string>({
  label,
  value,
  options,
  placeholder = 'Choose an option',
  onChange,
  disabled = false,
  businessStyle = false,
  searchable = false,
  searchPlaceholder = 'Search options',
}: {
  readonly searchable?: boolean;
  readonly searchPlaceholder?: string;
  readonly businessStyle?: boolean;
  readonly label: string;
  readonly value: T | null;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly placeholder?: string;
  readonly onChange: (value: T) => void;
  readonly disabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filteredOptions = options.filter(
    (option) =>
      !searchable ||
      `${option.label} ${option.value}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <FormField label={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel ?? placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          void haptics.selection();
          setQuery('');
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.background, borderColor: colors.inputBorder },
          businessStyle && {
            borderWidth: 0,
            borderRadius: 10,
            backgroundColor: colors.backgroundSelected,
            paddingVertical: 14,
          },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {selectedLabel ? (
          <ThemedText type={businessStyle ? 'smallBold' : 'default'} style={{ flex: 1 }}>
            {selectedLabel}
          </ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">{placeholder}</ThemedText>
        )}
        <ThemedText themeColor="textSecondary">{businessStyle ? 'Change  ⌄' : '⌄'}</ThemedText>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setOpen(false)} transparent visible={open}>
        <View style={[styles.backdrop, { backgroundColor: colors.backdrop }]}>
          <Pressable
            accessibilityLabel="Close options"
            onPress={() => setOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceElevated,
                paddingBottom: insets.bottom + Spacing.three,
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <ThemedText style={{ flex: 1 }} type="subtitle">
                {label}
              </ThemedText>
              <AppButton
                label="Done"
                variant={businessStyle ? 'secondary' : 'tertiary'}
                onPress={() => setOpen(false)}
              />
            </View>
            {searchable && (
              <AppTextInput
                accessibilityLabel={searchPlaceholder}
                placeholder={searchPlaceholder}
                value={query}
                onChangeText={setQuery}
                {...inputPresets.search}
              />
            )}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.optionList}
              contentContainerStyle={styles.optionContent}
            >
              {filteredOptions.length === 0 && (
                <ThemedText themeColor="textSecondary">
                  No matches. Try a state name or abbreviation.
                </ThemedText>
              )}
              {filteredOptions.map((option) => {
                const selected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => {
                      void haptics.selection();
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <ThemedText
                      style={[
                        { flex: 1, paddingVertical: 8 },
                        selected ? styles.optionTextSelected : undefined,
                      ]}
                    >
                      {option.label}
                    </ThemedText>
                    {selected && <ThemedText style={styles.check}>✓</ThemedText>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </FormField>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  // Keep the complete workspace menu visible on normal phones. Longer
  // pickers (categories, states, etc.) still scroll naturally when needed.
  optionList: { maxHeight: 560 },
  optionContent: { gap: Spacing.one, paddingBottom: Spacing.two },
  option: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.medium,
    paddingHorizontal: 14,
  },
  optionSelected: { backgroundColor: Brand.primary },
  optionTextSelected: { color: Brand.onPrimary, fontWeight: '700' },
  check: { color: Brand.onPrimary, fontWeight: '700' },
});
