import { View } from 'react-native';
import { ParishMark } from './parish-brand';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
export function CustomerBrand({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean;
  compact?: boolean;
}) {
  const dark = useColorScheme() === 'dark';
  return (
    <View
      accessibilityLabel="Parish Pass"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}
    >
      <ParishMark size={compact ? 30 : 28} dark={inverse || dark} />
      <ThemedText
        style={{
          flexShrink: 1,
          fontSize: compact ? 18 : 20,
          lineHeight: compact ? 24 : 26,
          fontWeight: compact ? '600' : '700',
          letterSpacing: -0.7,
          ...(inverse ? { color: '#F4F2E9' } : {}),
        }}
      >
        parish pass
      </ThemedText>
    </View>
  );
}
