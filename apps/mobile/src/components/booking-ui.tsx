import type { ReactNode } from 'react';
import { View } from 'react-native';
import { AppIcon } from './app-icon';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

export function BookingFact({ icon, children }: { icon: string; children: ReactNode }) {
  const c = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
      <AppIcon name={icon} size={20} tintColor={c.textSecondary} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>{children}</View>
    </View>
  );
}

/** Dates always use the business's booking timezone, including the displayed time. */
export function BookingTimeCard({
  startAt,
  timezone,
  duration,
}: {
  startAt: string;
  timezone: string;
  duration: number;
}) {
  const c = useTheme(),
    date = new Date(startAt);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { timeZone: timezone, ...options }).format(date);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 14,
        padding: 16,
        borderRadius: 16,
        backgroundColor: c.backgroundSelected,
      }}
    >
      <View
        style={{
          minWidth: 62,
          padding: 10,
          backgroundColor: c.backgroundElement,
          borderRadius: 12,
          alignItems: 'center',
          gap: 2,
        }}
      >
        <ThemedText
          style={{ fontSize: 13, lineHeight: 18, fontWeight: '600', color: c.textSecondary }}
        >
          {format({ month: 'short' })}
        </ThemedText>
        <ThemedText style={{ fontSize: 26, lineHeight: 32, fontWeight: '700' }}>
          {format({ day: 'numeric' })}
        </ThemedText>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
        <ThemedText style={{ fontSize: 17, lineHeight: 23, fontWeight: '700' }}>
          {format({ weekday: 'long' })}
        </ThemedText>
        <ThemedText style={{ fontSize: 16, lineHeight: 22 }}>
          {format({ hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {duration} minutes
        </ThemedText>
      </View>
    </View>
  );
}
