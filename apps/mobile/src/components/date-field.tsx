import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import { DatePickerControl } from './date-picker-control';
import { dateInputValue, parseDateInput } from '@/lib/date-input';
import { MerchantButton, MerchantSheet } from './merchant-ui';
import { ThemedText } from './themed-text';

export function DateField({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  minimumDate,
  maximumDate,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  minimumDate?: string;
  maximumDate?: string;
}) {
  const c = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const date = parseDateInput(value);
  const formatted = date?.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${required ? ', required' : ''}: ${formatted || 'Choose a date'}`}
        accessibilityHint="Opens a date picker"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setDraft(date ?? (minimumDate ? parseDateInput(minimumDate) : null) ?? new Date());
          setOpen(true);
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          minHeight: 52,
          padding: 14,
          borderRadius: 12,
          backgroundColor: c.backgroundSelected,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        })}
      >
        <SymbolView name="calendar" tintColor={c.accent} style={{ width: 22, height: 22 }} />
        <ThemedText style={{ flex: 1 }} themeColor={date ? 'text' : 'textSecondary'}>
          {formatted || 'Choose a date'}
        </ThemedText>
        <SymbolView
          name="chevron.down"
          tintColor={c.textSecondary}
          style={{ width: 14, height: 14 }}
        />
      </Pressable>
      <MerchantSheet
        visible={open}
        title={label}
        onClose={() => setOpen(false)}
        footer={
          <View style={{ gap: 10 }}>
            <MerchantButton
              brand
              label="Use this date"
              disabled={disabled || Boolean(minimumDate && dateInputValue(draft) < minimumDate) || Boolean(maximumDate && dateInputValue(draft) > maximumDate)}
              onPress={() => {
                onChange(dateInputValue(draft));
                setOpen(false);
              }}
            />
            {!required && value && (
              <MerchantButton
                brand
                secondary
                label="Clear date"
                disabled={disabled}
                onPress={() => {
                  onChange('');
                  setOpen(false);
                }}
              />
            )}
          </View>
        }
      >
        {open && <DatePickerControl
          minimumDate={minimumDate ? parseDateInput(minimumDate) ?? undefined : undefined}
          maximumDate={maximumDate ? parseDateInput(maximumDate) ?? undefined : undefined} value={draft} onChange={setDraft} />}
      </MerchantSheet>
    </>
  );
}
