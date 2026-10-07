import { Pressable, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from '../app-icon';
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
        gap: 12,
        alignSelf: 'flex-start',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${name} quantity${quantity === 1 && minimum === 0 ? ', remove from cart' : ''}`}
        accessibilityState={{ disabled: disabled || quantity <= minimum }}
        disabled={disabled || quantity <= minimum}
        onPress={() => onChange(-1)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.divider,
          backgroundColor: c.backgroundElement,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || quantity <= minimum ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <QuantityIcon color={c.accent} />
      </Pressable>
      <ThemedText
        type="smallBold"
        accessibilityLabel={`${name} quantity, ${quantity}`}
        accessibilityLiveRegion="polite"
        style={{
          minWidth: 24,
          textAlign: 'center',
          fontSize: 18,
          lineHeight: 24,
          fontVariant: ['tabular-nums'],
        }}
      >
        {quantity}
      </ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${name} quantity`}
        accessibilityState={{ disabled: disabled || quantity >= 20 }}
        disabled={disabled || quantity >= 20}
        onPress={() => onChange(1)}
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.divider,
          backgroundColor: c.backgroundElement,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || quantity >= 20 ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        <QuantityIcon color={c.accent} plus />
      </Pressable>
    </View>
  );
}

/** Quantity controls use the same canonical strokes as navigation and actions. */
export function QuantityIcon({ color, plus = false }: { color: string; plus?: boolean }) {
  return <AppIcon name={plus ? 'plus' : 'minus'} size={20} tintColor={color} />;
}
