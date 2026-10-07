import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { BusinessLocationMap, type BusinessLocationMapStop } from './business-location-map';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { ThemedText } from './themed-text';
import { AppButton } from './app-button';
import { useTheme } from '@/hooks/use-theme';
import { groupMapStops } from '@/lib/business-stop-map';

type Stop = BusinessLocationMapStop & {
  starts_at: string;
  ends_at: string;
  address_text: string | null;
};
export function BusinessStopSchedule({
  stops,
  timezone,
  onDirections,
  onInteractionChange,
}: {
  stops: readonly Stop[];
  timezone: string;
  onDirections: (stop: Stop) => void;
  onInteractionChange?: (active: boolean) => void;
}) {
  const c = useTheme();
  const [selectedId, setSelectedId] = useState(stops[0]?.id);
  const selected = stops.find((stop) => stop.id === selectedId) ?? stops[0];
  const [showMap, setShowMap] = useState(false);
  if (!selected) return <ThemedText>No upcoming stops have been published yet.</ThemedText>;
  const date = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Date(value).toLocaleDateString('en-US', { ...options, timeZone: timezone });
  const time = (value: string) =>
    new Date(value).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    });
  const locations = groupMapStops(stops).length;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ThemedText type="small" themeColor="textSecondary" style={{ flex: 1 }}>
          {stops.length} stops · {locations} {locations === 1 ? 'location' : 'locations'}
        </ThemedText>
        <AppButton
          label={showMap ? 'Hide map' : 'Show map'}
          variant="secondary"
          onPress={() => setShowMap((value) => !value)}
          style={{ minHeight: 44 }}
        />
      </View>
      {showMap && (
        <>
          <BusinessLocationMap
            stops={stops}
            height={190}
            {...(onInteractionChange ? { onInteractionChange } : {})}
          />
          <ThemedText type="caption" themeColor="textSecondary">
            Pins group repeat visits to the same location. Select a stop below for its address and
            directions.
          </ThemedText>
        </>
      )}
      <HorizontalScrollRow
        accessibilityLabel="Choose a scheduled stop"
        contentContainerStyle={{ gap: 8 }}
      >
        {stops.map((stop, index) => (
          <Pressable
            key={stop.id}
            accessibilityRole="button"
            accessibilityLabel={`${date(stop.starts_at, { weekday: 'long', month: 'short', day: 'numeric' })}, ${time(stop.starts_at)}, ${stop.title}`}
            accessibilityState={{ selected: stop.id === selected.id }}
            onPress={() => setSelectedId(stop.id)}
            style={{
              width: 84,
              minHeight: 98,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: 8,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: stop.id === selected.id ? c.accent : c.divider,
              backgroundColor: stop.id === selected.id ? c.backgroundSelected : c.background,
            }}
          >
            <ThemedText
              type="caption"
              themeColor={stop.id === selected.id ? 'accent' : 'textSecondary'}
            >
              {date(stop.starts_at, { weekday: 'short' })}
            </ThemedText>
            <ThemedText type="card">
              {date(stop.starts_at, { month: 'short', day: 'numeric' })}
            </ThemedText>
            <ThemedText type="caption" themeColor="textSecondary">
              {index === 0 ? 'Next stop' : time(stop.starts_at)}
            </ThemedText>
          </Pressable>
        ))}
      </HorizontalScrollRow>
      <View
        style={{
          padding: 16,
          gap: 8,
          borderRadius: 16,
          backgroundColor: c.background,
          borderWidth: 1,
          borderColor: c.divider,
        }}
      >
        <ThemedText type="caption" themeColor="accent">
          STOP {stops.indexOf(selected) + 1} OF {stops.length} ·{' '}
          {date(selected.starts_at, { month: 'short', day: 'numeric' })}
        </ThemedText>
        <ThemedText type="card">{selected.title}</ThemedText>
        <ThemedText type="smallBold">
          {time(selected.starts_at)} – {time(selected.ends_at)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {selected.address_text || 'Location pinned on map'}
        </ThemedText>
        <AppButton
          label="Get directions"
          variant="secondary"
          onPress={() => onDirections(selected)}
          style={{ marginTop: 4 }}
        />
      </View>
      <ThemedText type="caption" themeColor="textSecondary">
        Swipe dates to explore the schedule · Times shown in the business’s time zone
      </ThemedText>
    </View>
  );
}
