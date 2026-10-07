import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
export function ServiceRequestSummaryCard({
  name,
  message,
  status,
  date,
  onPress,
}: {
  name: string;
  message: string;
  status: string;
  date: string;
  onPress: () => void;
}) {
  const c = useTheme(),
    initials = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((_, i, a) => i === 0 || i === a.length - 1)
      .map((w) => w[0])
      .join('')
      .toUpperCase();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open request from ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 17,
        gap: 14,
        borderWidth: 1,
        borderColor: c.divider,
        borderRadius: 18,
        backgroundColor: c.backgroundElement,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            backgroundColor: c.backgroundSelected,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText type="smallBold" themeColor="accent">
            {initials}
          </ThemedText>
        </View>
        <ThemedText type="smallBold" style={{ flex: 1 }}>
          {name}
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 11,
            lineHeight: 16,
            color: status === 'New request' ? '#f3c375' : c.accent,
            backgroundColor: status === 'New request' ? '#4b3e28' : c.backgroundSelected,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 7,
          }}
        >
          {status === 'New request' ? 'New' : status}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
        {message}
      </ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderColor: c.divider,
        }}
      >
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: c.textSecondary }}>
          {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="accent">
          Review request →
        </ThemedText>
      </View>
    </Pressable>
  );
}
