import { useState } from 'react';
import { View } from 'react-native';
import {
  MerchantButton,
  MerchantFilters,
  MerchantHeading,
  MerchantRow,
  MerchantSearch,
  MerchantStatus,
} from './merchant-ui';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';

export type MobileStopSummary = {
  id: string;
  title: string;
  address_text: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  is_published: boolean;
};
export function mobileStopLabel(stop: MobileStopSummary, now: number) {
  if (!stop.is_published) return 'Draft';
  if (Date.parse(stop.ends_at) < now) return 'Past';
  return Date.parse(stop.starts_at) <= now ? 'Live now' : 'Published';
}
export function mobileStopTime(stop: MobileStopSummary) {
  return (
    new Date(stop.starts_at).toLocaleString(undefined, {
      timeZone: stop.timezone,
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }) +
    ' – ' +
    new Date(stop.ends_at).toLocaleTimeString(undefined, {
      timeZone: stop.timezone,
      hour: 'numeric',
      minute: '2-digit',
    })
  );
}
export function filterMobileStops(
  stops: readonly MobileStopSummary[],
  filter: 'upcoming' | 'draft' | 'past',
  query: string,
  now: number,
) {
  const term = query.trim().toLocaleLowerCase();
  return stops
    .filter(
      (stop) =>
        (filter === 'draft'
          ? !stop.is_published
          : filter === 'past'
            ? stop.is_published && Date.parse(stop.ends_at) < now
            : stop.is_published && Date.parse(stop.ends_at) >= now) &&
        `${stop.title} ${stop.address_text ?? ''}`.toLocaleLowerCase().includes(term),
    )
    .slice()
    .sort((a, b) =>
      filter === 'past'
        ? Date.parse(b.starts_at) - Date.parse(a.starts_at)
        : Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
}
export function MobileStopInbox({
  stops,
  now,
  canEdit,
  onCreate,
  onSelect,
}: {
  stops: readonly MobileStopSummary[];
  now: number;
  canEdit: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  const c = useMerchantTheme();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'upcoming' | 'draft' | 'past'>('upcoming');
  const rows = filterMobileStops(stops, filter, query, now);
  return (
    <View style={{ gap: 16 }}>
      <MerchantHeading title="Scheduled stops" subtitle="Manage where customers can find you." />
      {canEdit && <MerchantButton label="Add stop" onPress={onCreate} />}
      <MerchantSearch value={query} onChange={setQuery} placeholder="Search stops or addresses" />
      <MerchantFilters
        value={filter}
        onChange={setFilter}
        options={(['upcoming', 'draft', 'past'] as const).map((value) => ({
          value,
          label: value === 'upcoming' ? 'Upcoming' : value === 'draft' ? 'Drafts' : 'Past',
          count: filterMobileStops(stops, value, '', now).length,
        }))}
      />
      {rows.length ? (
        <View
          style={{ borderWidth: 0, borderColor: c.border, borderRadius: 18, overflow: 'hidden' }}
        >
          {rows.map((stop) => (
            <MerchantRow
              key={stop.id}
              leading={
                <View
                  style={{
                    width: 48,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor: c.background,
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <ThemedText type="caption">
                    {new Date(stop.starts_at).toLocaleDateString(undefined, {
                      month: 'short',
                      timeZone: stop.timezone,
                    })}
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {new Date(stop.starts_at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      timeZone: stop.timezone,
                    })}
                  </ThemedText>
                </View>
              }
              title={stop.title}
              subtitle={mobileStopTime(stop)}
              detail={stop.address_text || 'Map pin set'}
              label={`Open ${stop.title}`}
              status={
                <MerchantStatus
                  label={mobileStopLabel(stop, now)}
                  tone={stop.is_published ? 'success' : 'quiet'}
                />
              }
              onPress={() => onSelect(stop.id)}
            />
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {query.trim()
            ? 'No stops match your search.'
            : filter === 'draft'
              ? 'No draft stops. Add a stop to prepare its details.'
              : filter === 'past'
                ? 'No past published stops.'
                : 'No upcoming published stops. Open Drafts to publish a prepared stop.'}
        </ThemedText>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        New stops are saved as drafts. Review the pin and hours before publishing.
      </ThemedText>
    </View>
  );
}
