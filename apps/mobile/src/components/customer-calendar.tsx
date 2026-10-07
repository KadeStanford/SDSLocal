import { Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { useTheme } from '@/hooks/use-theme';

export function calendarDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function eventDateBarDays(month: Date) {
  return Array.from(
    { length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() },
    (_, index) => {
      const date = new Date(month.getFullYear(), month.getMonth(), index + 1);
      return { date, key: calendarDateKey(date) };
    },
  );
}

/** A horizontal date selector with full-size targets and month-to-month navigation. */
export function CustomerCalendar({
  month,
  counts,
  selectedDay,
  onSelectDay,
  onChangeMonth,
  onToday,
}: {
  month: Date;
  counts: ReadonlyMap<string, number>;
  selectedDay: string;
  onSelectDay: (key: string) => void;
  onChangeMonth: (offset: number) => void;
  onToday: () => void;
}) {
  const c = useTheme();
  const dates = eventDateBarDays(month);
  const selectedIndex = Math.max(
    0,
    dates.findIndex((day) => day.key === selectedDay),
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <ThemedText type="card" style={{ flex: 1, minWidth: 0 }}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Today"
          onPress={onToday}
          style={{ minHeight: 44, minWidth: 50, alignItems: 'center', justifyContent: 'center' }}
        >
          <ThemedText type="smallBold" style={{ color: c.accent }}>
            Today
          </ThemedText>
        </Pressable>
        {[-1, 1].map((offset) => (
          <Pressable
            key={offset}
            accessibilityRole="button"
            accessibilityLabel={offset < 0 ? 'Previous month' : 'Next month'}
            onPress={() => onChangeMonth(offset)}
            style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}
          >
            <ThemedText type="subtitle">{offset < 0 ? '‹' : '›'}</ThemedText>
          </Pressable>
        ))}
      </View>
      <HorizontalScrollRow
        key={`${month.getFullYear()}-${month.getMonth()}-${selectedDay}`}
        testID="event-date-bar"
        contentOffset={{ x: Math.max(0, selectedIndex * 64 - 64), y: 0 }}
        contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
        style={{ flexGrow: 0 }}
      >
        {dates.map(({ date, key }) => {
          const selected = key === selectedDay,
            count = counts.get(key) ?? 0,
            today = key === calendarDateKey(new Date());
          return (
            <Pressable
              key={key}
              testID={`event-date-${key}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}${today ? ', today' : ''}, ${count} ${count === 1 ? 'event' : 'events'}`}
              onPress={() => onSelectDay(key)}
              style={{
                width: 56,
                minHeight: 82,
                paddingVertical: 10,
                gap: 3,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: selected ? c.accent : c.backgroundElement,
                borderWidth: 1,
                borderColor: selected ? c.accent : c.divider,
              }}
            >
              <ThemedText
                type="small"
                style={{ fontSize: 12, color: selected ? c.onAccent : c.textSecondary }}
              >
                {date.toLocaleDateString(undefined, { weekday: 'short' })}
              </ThemedText>
              <ThemedText type="card" style={{ color: selected ? c.onAccent : c.text }}>
                {date.getDate()}
              </ThemedText>
              <View
                accessible={false}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: count ? (selected ? c.onAccent : c.accent) : 'transparent',
                }}
              />
            </Pressable>
          );
        })}
      </HorizontalScrollRow>
    </View>
  );
}
