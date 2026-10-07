import { Pressable, View } from 'react-native';
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
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.divider,
          backgroundColor: c.backgroundElement,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || quantity <= minimum ? 0.4 : pressed ? 0.7 : 1,
          boxShadow: '0 2px 4px rgba(16, 45, 37, 0.06)',
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
          borderRadius: 22,
          borderWidth: 1,
          borderColor: c.divider,
          backgroundColor: c.backgroundElement,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled || quantity >= 20 ? 0.4 : pressed ? 0.7 : 1,
          boxShadow: '0 2px 4px rgba(16, 45, 37, 0.06)',
        })}
      >
        <QuantityIcon color={c.accent} plus />
      </Pressable>
    </View>
  );
}

/** Geometric strokes avoid font-baseline differences between the two symbols. */
export function QuantityIcon({ color, plus = false }: { color: string; plus?: boolean }) {
  return (
    <View
      accessible={false}
      style={{ width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: 16, height: 2, borderRadius: 1, backgroundColor: color }} />
      {plus && (
        <View
          style={{
            position: 'absolute',
            width: 2,
            height: 16,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      )}
    </View>
  );
}
