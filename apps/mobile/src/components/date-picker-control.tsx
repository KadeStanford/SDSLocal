import { Platform } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function DatePickerControl({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: {
  value: Date;
  minimumDate?: Date | undefined;
  maximumDate?: Date | undefined;
  onChange: (date: Date) => void;
}) {
  const c = useTheme(),
    scheme = useColorScheme();
  return (
    <DateTimePicker
      {...(minimumDate ? { minimumDate } : {})}
      {...(maximumDate ? { maximumDate } : {})}
      mode="date"
      value={value}
      display={Platform.OS === 'ios' ? 'inline' : 'default'}
      presentation="inline"
      accentColor={c.accent}
      themeVariant={scheme === 'dark' ? 'dark' : 'light'}
      onValueChange={(_, next) => onChange(next)}
    />
  );
}
