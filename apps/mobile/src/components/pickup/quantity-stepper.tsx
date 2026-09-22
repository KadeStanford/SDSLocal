import { View } from 'react-native';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
export function QuantityStepper({
  name,
  quantity,
  minimum = 0,
  disabled = false,
  onChange,
}: {
  name: string;
  quantity: number;
  minimum?: number;
  disabled?: boolean;
  onChange: (delta: 1 | -1) => void;
}) {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        backgroundColor: c.backgroundSelected,
        alignSelf: 'flex-start',
      }}
    >
      <AppButton
        label="−"
        accessibilityLabel={`Decrease ${name} quantity${quantity === 1 && minimum === 0 ? ', remove from cart' : ''}`}
        variant="tertiary"
        disabled={disabled || quantity <= minimum}
        onPress={() => onChange(-1)}
        style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 8 }}
      />
      <ThemedText
        type="smallBold"
        accessibilityLabel={`${name} quantity, ${quantity}`}
        accessibilityLiveRegion="polite"
        style={{ minWidth: 36, textAlign: 'center', paddingHorizontal: 4 }}
      >
        {quantity}
      </ThemedText>
      <AppButton
        label="+"
        accessibilityLabel={`Increase ${name} quantity`}
        variant="tertiary"
        disabled={disabled || quantity >= 20}
        onPress={() => onChange(1)}
        style={{ minWidth: 48, minHeight: 48, paddingHorizontal: 8 }}
      />
    </View>
  );
}
