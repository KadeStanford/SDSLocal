import { dateInputValue, parseDateInput } from '@/lib/date-input';
import { useTheme } from '@/hooks/use-theme';

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
  const c = useTheme();
  return (
    <input
      min={minimumDate ? dateInputValue(minimumDate) : undefined}
      max={maximumDate ? dateInputValue(maximumDate) : undefined}
      type="date"
      aria-label="Choose a date"
      value={dateInputValue(value)}
      onChange={(e) => {
        const date = parseDateInput(e.target.value);
        if (date) onChange(date);
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 52,
        padding: 12,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        fontSize: 18,
        color: c.text,
        backgroundColor: c.backgroundElement,
      }}
    />
  );
}
