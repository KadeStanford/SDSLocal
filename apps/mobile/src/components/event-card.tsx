import { AppIcon } from '@/components/app-icon';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { IdentityPhoto } from '@/lib/business-identity';
import { BusinessIdentityRow } from './business-identity-row';
import { ThemedText } from './themed-text';

export function EventCard({
  title,
  businessName,
  photos,
  startsAt,
  timezone,
  metadata,
  reminder = false,
  carousel = false,
  onPress,
}: {
  readonly title: string;
  readonly businessName: string;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly startsAt: string;
  readonly timezone?: string;
  readonly metadata: string;
  readonly reminder?: boolean;
  readonly carousel?: boolean;
  readonly onPress: () => void;
}) {
  const colors = useTheme();
  const { fontScale } = useWindowDimensions();
  const date = new Date(startsAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${businessName}, ${metadata}${reminder ? ', reminder on' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        carousel && { minHeight: 210 * Math.max(1, fontScale), alignItems: 'stretch' },
        { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
        pressed && styles.pressed,
      ]}
    >
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
        <View style={[styles.date, { backgroundColor: colors.backgroundSelected }]}>
          <ThemedText type="caption" style={{ color: colors.accent }}>
            {date.toLocaleDateString(undefined, { month: 'short', timeZone: timezone })}
          </ThemedText>
          <ThemedText type="number">
            {date.toLocaleDateString(undefined, { day: 'numeric', timeZone: timezone })}
          </ThemedText>
        </View>
        <View style={styles.copy}>
          <ThemedText
            type="card"
            numberOfLines={carousel ? 2 : undefined}
            style={carousel ? { minHeight: 48 * Math.max(1, fontScale) } : undefined}
          >
            {title}
          </ThemedText>
          <BusinessIdentityRow
            name={businessName}
            photos={photos}
            numberOfLines={carousel ? 1 : undefined}
          />
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={carousel ? 2 : undefined}
          >
            {metadata}
          </ThemedText>
          {reminder && (
            <ThemedText type="smallBold" style={{ color: colors.successText }}>
              Reminder on
            </ThemedText>
          )}
        </View>
      </View>
      <View
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          paddingVertical: 12,
          borderRadius: 12,
          backgroundColor: colors.accent,
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText type="smallBold" style={{ color: colors.onAccent }}>
          View event
        </ThemedText>
        <AppIcon name="chevron-right" size={18} tintColor={colors.onAccent} />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 96,
    flexDirection: 'column',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 18,
  },
  date: {
    width: 52,
    minHeight: 64,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    alignSelf: 'flex-start',
  },
  copy: { flex: 1, minWidth: 0, gap: Spacing.one },
  pressed: { opacity: 0.75 },
});
