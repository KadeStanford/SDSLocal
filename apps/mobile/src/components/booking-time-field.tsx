import { useState } from 'react';
import { Platform, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { MerchantButton, MerchantSheet } from './merchant-ui';
import { FormField } from './form-field';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DateField } from './date-field';
export function BookingTimeField({
  label,
  value,
  onChange,
  disabled = false,
  mode = 'time',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  mode?: 'date' | 'time';
}) {
  const [open, setOpen] = useState(false),
    scheme = useColorScheme();
  if (mode === 'date')
    return (
      <FormField label={label}>
        <DateField label={label} value={value} onChange={onChange} disabled={disabled} required />
      </FormField>
    );
  const date = new Date();
  const [h, m] = value.split(':').map(Number);
  date.setHours(h || 0, m || 0, 0, 0);
  const formatted = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <FormField label={label}>
      <MerchantButton
        brand
        secondary
        label={formatted}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <MerchantSheet
        visible={open}
        title={label}
        onClose={() => setOpen(false)}
        footer={<MerchantButton brand label="Done" onPress={() => setOpen(false)} />}
      >
        <View>
          <DateTimePicker
            mode={mode}
            value={date}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            presentation="inline"
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            onValueChange={(_, d) =>
              onChange(
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
              )
            }
          />
        </View>
      </MerchantSheet>
    </FormField>
  );
}
