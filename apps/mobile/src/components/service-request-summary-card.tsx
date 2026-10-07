import { Pressable, View } from 'react-native';
import { AppIcon } from './app-icon';
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
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <ThemedText type="small" themeColor="textSecondary">
          Received{' '}
          {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </ThemedText>
        <ThemedText
          style={{
            fontSize: 13,
            lineHeight: 18,
            color: status === 'New request' ? c.warningText : c.accent,
            backgroundColor: status === 'New request' ? c.warningSurface : c.backgroundSelected,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 8,
          }}
        >
          {status === 'New request' ? 'New' : status}
        </ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: c.backgroundSelected,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText type="smallBold" themeColor="accent">
            {initials}
          </ThemedText>
        </View>
        <ThemedText type="card" style={{ flex: 1 }}>
          {name}
        </ThemedText>
      </View>
      <ThemedText numberOfLines={3}>{message}</ThemedText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: c.accent,
        }}
      >
        <ThemedText type="smallBold" style={{ color: c.onAccent }}>
          Review request
        </ThemedText>
        <AppIcon name="chevron-right" size={18} tintColor={c.onAccent} />
      </View>
    </Pressable>
  );
}
