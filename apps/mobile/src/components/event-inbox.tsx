import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { MenuSetupTabs } from './menu-workspace-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { ThemedText } from './themed-text';
import { MerchantButton, MerchantSearch, MerchantStatus } from './merchant-ui';

export interface ManagedEventSummary {
  readonly id: string;
  readonly title: string;
  readonly startsAt: string;
  readonly published: boolean;
  readonly publishAt: string | null;
  readonly attending: number;
  readonly waitlisted: number;
  readonly timezone?: string;
  readonly photo?: string | null;
}
export function managedEventStatus(event: ManagedEventSummary) {
  return event.published ? 'Published' : event.publishAt ? 'Scheduled' : 'Draft';
}
export function EventInbox({
  events,
  onOpen,
  onCreate,
  disabled = false,
}: {
  events: readonly ManagedEventSummary[];
  onOpen: (id: string) => void;
  onCreate?: () => void;
  disabled?: boolean;
}) {
  const c = useMerchantTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const matches = (event: ManagedEventSummary, value: string) =>
    value === 'all' ||
    (value === 'drafts'
      ? managedEventStatus(event) === 'Draft'
      : value === 'past'
        ? new Date(event.startsAt).getTime() < now
        : new Date(event.startsAt).getTime() >= now && managedEventStatus(event) !== 'Draft');
  const visible = events
    .filter(
      (event) =>
        matches(event, filter) &&
        event.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .slice()
    .sort((a, b) =>
      filter === 'past'
        ? Date.parse(b.startsAt) - Date.parse(a.startsAt)
        : Date.parse(a.startsAt) - Date.parse(b.startsAt),
    );
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <ThemedText type="small" themeColor="textSecondary">
          {events.length} events
        </ThemedText>
        {onCreate ? (
          <MerchantButton brand label="+ Add event" disabled={disabled} onPress={onCreate} />
        ) : null}
      </View>
      <MerchantSearch value={query} onChange={setQuery} placeholder="Search events" />
      <MenuSetupTabs
        underline
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'upcoming', label: 'Upcoming' },
          { value: 'drafts', label: 'Drafts' },
          { value: 'past', label: 'Past' },
          { value: 'all', label: 'All' },
        ].map((option) => ({
          ...option,
          count: events.filter((event) => matches(event, option.value)).length,
        }))}
      />
      {!!visible.length && (
        <View style={{ gap: 14 }}>
          {visible.map((event) => (
            <Pressable
              key={event.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${event.title}`}
              disabled={disabled}
              onPress={() => onOpen(event.id)}
              style={({ pressed }) => ({
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 18,
                overflow: 'hidden',
                opacity: pressed ? 0.75 : 1,
              })}
            >
              {!!event.photo && (
                <Image
                  source={{ uri: event.photo }}
                  contentFit="cover"
                  style={{ width: '100%', height: 130 }}
                />
              )}
              <View style={{ padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                <View style={{ width: 48, alignItems: 'center', gap: 3 }}>
                  <ThemedText type="small" themeColor="accent">
                    {new Intl.DateTimeFormat(undefined, {
                      month: 'short',
                      timeZone: event.timezone ?? 'America/Chicago',
                    }).format(new Date(event.startsAt))}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {new Intl.DateTimeFormat(undefined, {
                      day: 'numeric',
                      timeZone: event.timezone ?? 'America/Chicago',
                    }).format(new Date(event.startsAt))}
                  </ThemedText>
                </View>
                <View style={{ flex: 1, gap: 8 }}>
                  <MerchantStatus
                    label={managedEventStatus(event)}
                    tone={event.published ? 'success' : 'quiet'}
                  />
                  <ThemedText type="smallBold" numberOfLines={2}>
                    {event.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {new Intl.DateTimeFormat(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: event.timezone ?? 'America/Chicago',
                    }).format(new Date(event.startsAt))}{' '}
                    · {event.attending} attending
                    {event.waitlisted ? ` · ${event.waitlisted} waitlisted groups` : ''}
                  </ThemedText>
                </View>
                <SymbolView
                  name="chevron.right"
                  tintColor={c.secondary}
                  style={{ width: 14, height: 14 }}
                />
              </View>
            </Pressable>
          ))}
        </View>
      )}
      {!visible.length && (
        <ThemedText themeColor="textSecondary">
          {events.length
            ? 'No events match this view. Try another filter or search.'
            : 'No events yet. Add a date and details to get started.'}
        </ThemedText>
      )}
    </View>
  );
}
