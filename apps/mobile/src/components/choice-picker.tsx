import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppButton } from './app-button';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { haptics } from '@/lib/haptics';

export function ChoicePicker<T extends string>({
  label,
  value,
  options,
  placeholder = 'Choose an option',
  onChange,
  disabled = false,
}: {
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
  const selectedLabel = options.find((option) => option.value === value)?.label;

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedLabel ?? placeholder}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          void haptics.selection();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.trigger,
          { backgroundColor: colors.background, borderColor: colors.inputBorder },
          pressed && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {selectedLabel ? (
          <ThemedText style={{ flex: 1 }}>{selectedLabel}</ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">{placeholder}</ThemedText>
        )}
        <ThemedText themeColor="textSecondary">⌄</ThemedText>
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
              <AppButton label="Done" variant="tertiary" onPress={() => setOpen(false)} />
            </View>
            <ScrollView style={styles.optionList} contentContainerStyle={styles.optionContent}>
              {options.map((option) => {
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
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: Spacing.one },
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
