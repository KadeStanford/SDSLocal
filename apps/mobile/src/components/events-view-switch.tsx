import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';

export function EventsViewSwitch({
  all,
  onChange,
}: {
  all: boolean;
  onChange: (all: boolean) => void;
}) {
  const c = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: 16,
        backgroundColor: c.backgroundElement,
      }}
    >
      {[
        { label: 'By date', value: false },
        { label: 'All events', value: true },
      ].map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: all === item.value }}
          onPress={() => onChange(item.value)}
          style={{
            flex: 1,
            minHeight: 44,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: all === item.value ? c.backgroundSelected : 'transparent',
          }}
        >
          <ThemedText
            type="smallBold"
            style={{ color: all === item.value ? c.accent : c.textSecondary }}
          >
            {item.label}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}
