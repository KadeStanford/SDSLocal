import { inputPresets } from '@/lib/input-presets';
import { MerchantFilters } from './merchant-ui';
import { EventFilterSheet } from './event-filter-sheet';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { useTheme } from '@/hooks/use-theme';
import {
  defaultEventDirectoryFilter,
  eventDirectorySections,
  filterDirectoryEvents,
  type DirectoryEvent,
  type EventDirectoryFilter,
} from '@/lib/event-directory';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { BusinessPreviewCarousel, BusinessPreviewSection } from './business-preview-section';

export function EventDirectory({
  events,
  onOpen,
  now = new Date(),
  initialBusinessId = '',
}: {
  events: readonly DirectoryEvent[];
  onOpen: (id: string) => void;
  now?: Date;
  initialBusinessId?: string;
}) {
  const c = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(720, width - 40);
  const [filter, setFilter] = useState(defaultEventDirectoryFilter);
  const [all, setAll] = useState(Boolean(initialBusinessId));
  const [businessId, setBusinessId] = useState(initialBusinessId);
  const [limit, setLimit] = useState(12);
  const [picker, setPicker] = useState<'city' | 'category' | null>(null);
  const [optionQuery, setOptionQuery] = useState('');
  const change = (update: Partial<EventDirectoryFilter>) => {
    setFilter((f) => ({ ...f, ...update }));
    setLimit(12);
  };
  const scoped = businessId ? events.filter((e) => e.businessId === businessId) : events;
  const results = filterDirectoryEvents(scoped, filter, now);
  const filtered =
    all || Boolean(filter.query.trim() || filter.city || filter.category || filter.when !== 'any');
  const options = [
    ...new Set(scoped.map((e) => (picker === 'city' ? e.city : e.category)).filter(Boolean)),
  ].sort();
  const fieldStyle = {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    color: c.text,
    backgroundColor: c.backgroundElement,
    fontSize: 16,
  };
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 12 }}>
        <TextInput
          accessibilityLabel="Search events"
          placeholder="Search events, venues or interests"
          {...inputPresets.search}
          placeholderTextColor={c.textSecondary}
          value={filter.query}
          onChangeText={(query) => change({ query })}
          style={fieldStyle}
        />
        <MerchantFilters
          value={filter.when}
          onChange={(when) => change({ when })}
          options={[
            { value: 'any', label: 'Any date' },
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Next 7 days' },
            { value: 'weekend', label: 'This weekend' },
          ]}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <AppButton
            label={filter.city || 'All areas'}
            variant="secondary"
            onPress={() => {
              setOptionQuery('');
              setPicker('city');
            }}
            style={{ flex: 1 }}
          />
          <AppButton
            label={filter.category || 'All categories'}
            variant="secondary"
            onPress={() => {
              setOptionQuery('');
              setPicker('category');
            }}
            style={{ flex: 1 }}
          />
        </View>
        {!!businessId && (
          <View
            style={{ padding: 12, borderRadius: 12, backgroundColor: c.backgroundSelected, gap: 8 }}
          >
            <ThemedText type="smallBold">
              Events at {scoped[0]?.businessName || 'this business'}
            </ThemedText>
            <AppButton
              label="Explore all businesses"
              variant="secondary"
              onPress={() => {
                setBusinessId('');
                setAll(false);
                change(defaultEventDirectoryFilter);
              }}
            />
          </View>
        )}
      </View>
      {filtered ? (
        <View style={{ gap: 12 }}>
          <BusinessPreviewSection
            title={`${results.length} ${results.length === 1 ? 'event' : 'events'}`}
            action="Reset"
            onSeeAll={() => {
              change(defaultEventDirectoryFilter);
              setAll(false);
            }}
          />
          {!results.length && (
            <View
              style={{
                padding: 20,
                borderRadius: 16,
                backgroundColor: c.backgroundElement,
                gap: 8,
              }}
            >
              <ThemedText type="card">No events match yet</ThemedText>
              <ThemedText themeColor="textSecondary">
                Try another date, area or category.
              </ThemedText>
            </View>
          )}
          {results.slice(0, limit).map((event) => (
            <DirectoryEventCard key={event.id} event={event} onOpen={onOpen} compact />
          ))}
          {results.length > limit && (
            <AppButton
              label={`Show next ${Math.min(12, results.length - limit)} events`}
              variant="secondary"
              onPress={() => setLimit((n) => n + 12)}
            />
          )}
        </View>
      ) : (
        <>
          {eventDirectorySections(scoped, now).map((section) => (
            <BusinessPreviewSection
              key={section.title}
              title={section.title}
              onSeeAll={() => {
                change({ ...defaultEventDirectoryFilter, ...section.filter });
                setAll(true);
              }}
            >
              <BusinessPreviewCarousel
                label={section.title}
                count={section.events.length}
                width={cardWidth}
              >
                {section.events.map((event) => (
                  <View key={event.id} style={{ width: cardWidth }}>
                    <DirectoryEventCard event={event} onOpen={onOpen} />
                  </View>
                ))}
              </BusinessPreviewCarousel>
            </BusinessPreviewSection>
          ))}
          <AppButton
            label={`Browse all ${results.length} events`}
            variant="secondary"
            onPress={() => setAll(true)}
          />
        </>
      )}
      <EventFilterSheet
        kind={picker}
        value={picker ? filter[picker] : ''}
        options={options}
        query={optionQuery}
        onQueryChange={setOptionQuery}
        onClose={() => setPicker(null)}
        onSelect={(value) => {
          if (picker) change({ [picker]: value });
          setPicker(null);
        }}
      />
    </View>
  );
}

export function DirectoryEventCard({
  event,
  onOpen,
  compact = false,
}: {
  event: DirectoryEvent;
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const c = useTheme();
  const date = new Date(event.startsAt);
  const dateLabel = date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: event.timezone,
  });
  const time = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: event.timezone,
  });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${event.businessName}, ${dateLabel}, ${time}`}
      onPress={() => onOpen(event.id)}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.backgroundElement,
        borderRadius: 18,
        padding: compact ? 14 : 0,
        overflow: 'hidden',
        gap: compact ? 12 : 0,
        flexDirection: compact ? 'row' : 'column',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {event.imageUri ? (
        <Image
          source={{ uri: event.imageUri }}
          contentFit="cover"
          accessibilityLabel={event.title}
          style={
            compact
              ? { width: 88, height: 88, borderRadius: 12 }
              : { width: '100%', aspectRatio: 16 / 9 }
          }
        />
      ) : (
        <View style={{ padding: 14, borderRadius: 11, backgroundColor: c.backgroundSelected }}>
          <ThemedText type="card">{dateLabel}</ThemedText>
        </View>
      )}
      <View style={{ gap: 8, padding: compact ? 0 : 16, flex: compact ? 1 : undefined, minWidth: 0 }}>
        <ThemedText type="caption" themeColor="accent">
          {dateLabel} · {time}
        </ThemedText>
        <ThemedText type="card" numberOfLines={2}>
          {event.title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {event.businessName}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
          {event.city || event.address || 'Location in event details'}
        </ThemedText>
      </View>
    </Pressable>
  );
}
