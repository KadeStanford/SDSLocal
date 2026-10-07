import { useState } from 'react';
import { View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { ChoicePicker } from './choice-picker';
import { FormField } from './form-field';
import { merchantStyles } from './merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
export function BookingIntervalField({
  label,
  value,
  onChange,
  disabled = false,
  unit = 'minutes',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  unit?: 'minutes' | 'days';
}) {
  const c = useMerchantTheme(),
    [custom, setCustom] = useState(false);
  const options =
    unit === 'days'
      ? [
          { value: '7', label: '1 week' },
          { value: '14', label: '2 weeks' },
          { value: '30', label: '30 days' },
          { value: '60', label: '60 days' },
          { value: '90', label: '90 days' },
        ]
      : [
          { value: '0', label: 'No minimum' },
          { value: '30', label: '30 minutes' },
          { value: '60', label: '1 hour' },
          { value: '120', label: '2 hours' },
          { value: '240', label: '4 hours' },
          { value: '1440', label: '1 day' },
          { value: '2880', label: '2 days' },
          { value: '10080', label: '1 week' },
        ];
  const standard = options.some((o) => o.value === value);
  return (
    <View style={{ gap: 8 }}>
      <ChoicePicker
        label={label}
        value={custom || !standard ? 'custom' : value}
        disabled={disabled}
        options={[...options, { value: 'custom', label: 'Custom interval' }]}
        onChange={(v) => {
          setCustom(v === 'custom');
          if (v !== 'custom') onChange(v);
        }}
      />
      {(custom || !standard) && (
        <FormField label={`Number of ${unit}`}>
          <TextInput
            accessibilityLabel={`${label} in ${unit}`}
            value={value}
            editable={!disabled}
            keyboardType="number-pad"
            onChangeText={onChange}
            style={[
              merchantStyles.input,
              { color: c.text, borderColor: c.border, backgroundColor: c.surface },
            ]}
          />
        </FormField>
      )}
    </View>
  );
}
