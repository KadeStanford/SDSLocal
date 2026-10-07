import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
import { AppIcon } from './app-icon';

/** Supporting information stays available without crowding the primary customer task. */
export function BusinessDetailsDisclosure({
  title,
  summary,
  children,
  embedded = false,
}: {
  title: string;
  summary?: string;
  children: ReactNode;
  embedded?: boolean;
}) {
  const colors = useTheme();
  const [expanded, setExpanded] = useState(false);
  return (
    <View
      style={{
        borderWidth: embedded ? 0 : 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.backgroundElement,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={({ pressed }) => ({
          minHeight: 56,
          padding: 16,
          gap: 12,
          flexDirection: 'row',
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {!!summary && (
            <ThemedText type="small" themeColor="textSecondary">
              {summary}
            </ThemedText>
          )}
        </View>
        <AppIcon name={expanded ? 'minus' : 'plus'} size={18} tintColor={colors.accent} />
      </Pressable>
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>{children}</View>
      )}
    </View>
  );
}
