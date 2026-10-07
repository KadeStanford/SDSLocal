import { View } from 'react-native';
import { ParishMark } from './parish-brand';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
export function CustomerBrand({ inverse = false }: { inverse?: boolean }) {
  const dark = useColorScheme() === 'dark';
  return (
    <View
      accessibilityLabel="Parish Pass"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}
    >
      <ParishMark size={28} dark={inverse || dark} />
      <ThemedText
        style={{
          flexShrink: 1,
          fontSize: 20,
          lineHeight: 26,
          fontWeight: '700',
          letterSpacing: -0.7,
          ...(inverse ? { color: '#F4F2E9' } : {}),
        }}
      >
        parish pass
      </ThemedText>
    </View>
  );
}
