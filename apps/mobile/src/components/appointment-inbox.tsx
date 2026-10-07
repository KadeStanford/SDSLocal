import { Platform } from 'react-native';
import { Fonts } from '@/constants/theme';
import { MenuSetupTabs } from './menu-workspace-ui';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { EmptyState } from './data-state';
import { ThemedText } from './themed-text';
import { MerchantSearch, MerchantStatus } from './merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';

const focusedFont = Platform.OS === 'web' ? 'system-ui' : Fonts.sans;

export type AppointmentSummary = {
  id: string;
  customerName: string;
  serviceName: string;
  resourceName: string;
  startAt: string;
  timezone: string;
  status: string;
  paymentStatus: string;
};

export function appointmentNeedsAttention(row: AppointmentSummary) {
  return (
    row.status === 'requested' ||
    ['review', 'dispute_lost', 'refund_failed', 'refund_pending'].includes(row.paymentStatus)
  );
}

export function appointmentIsActive(row: AppointmentSummary) {
  return !['cancelled', 'declined', 'completed', 'no_show', 'expired'].includes(row.status);
}

function dayKey(row: AppointmentSummary) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: row.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(row.startAt));
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join('-');
}

function timeLabel(row: AppointmentSummary) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: row.timezone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(row.startAt));
}

/** Financial actions are available only after opening the canonical appointment detail. */
export function AppointmentInbox({
  appointments,
  loading,
  blocked,
  failed = false,
  onRefresh,
  onSelect,
}: {
  appointments: AppointmentSummary[];
  loading: boolean;
  blocked: boolean;
  failed?: boolean;
  onRefresh: () => void;
  onSelect: (id: string) => void;
}) {
  const c = useMerchantTheme();
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [clockNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<'active' | 'attention' | 'all'>('active');
  const [date, setDate] = useState('all');
  const dates = useMemo(() => [...new Set(appointments.map(dayKey))].sort(), [appointments]);
  const visible = appointments
    .filter(
      (row) =>
        (filter === 'all' ||
          (filter === 'attention' ? appointmentNeedsAttention(row) : appointmentIsActive(row))) &&
        (date === 'all' || dayKey(row) === date) &&
        [row.customerName, row.serviceName, row.resourceName]
          .join(' ')
          .toLocaleLowerCase()
          .includes(search.trim().toLocaleLowerCase()),
    )
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          padding: 16,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface,
          gap: 12,
        }}
      >
        <ThemedText
          style={{ fontFamily: focusedFont, fontSize: 20, lineHeight: 26, fontWeight: '700' }}
        >
          {new Intl.DateTimeFormat(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: appointments[0]?.timezone ?? 'America/Chicago',
          }).format(new Date(clockNow))}
        </ThemedText>
        {loading && !appointments.length ? (
          <ThemedText type="small">Loading your schedule…</ThemedText>
        ) : failed && !appointments.length ? (
          <ThemedText type="small">Schedule unavailable</ThemedText>
        ) : (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              { count: appointments.filter(appointmentIsActive).length, label: 'Active bookings' },
              {
                count: appointments.filter(appointmentNeedsAttention).length,
                label: 'Need attention',
              },
            ].map((stat) => (
              <View
                key={stat.label}
                style={{
                  flex: 1,
                  paddingVertical: 6,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <ThemedText type="title" style={{ fontSize: 24, lineHeight: 30 }}>
                  {stat.count}
                </ThemedText>
                <ThemedText type="small" style={{ color: c.secondary, flex: 1 }}>
                  {stat.label}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
      <MenuSetupTabs
        underline
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: 'Upcoming' },
          { value: 'attention', label: 'Needs attention' },
          { value: 'all', label: 'All bookings' },
        ]}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {[
          { key: 'all', top: 'VIEW', bottom: 'All' },
          ...dates.map((value) => ({
            key: value,
            top: new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' }).format(
              new Date(value + 'T12:00:00Z'),
            ),
            bottom: new Intl.DateTimeFormat(undefined, {
              month: 'short',
              day: 'numeric',
              timeZone: 'UTC',
            }).format(new Date(value + 'T12:00:00Z')),
          })),
        ].map((d) => (
          <Pressable
            key={d.key}
            accessibilityRole="button"
            accessibilityLabel={d.key === 'all' ? 'All dates' : d.bottom}
            accessibilityState={{ selected: date === d.key }}
            onPress={() => setDate(d.key)}
            style={{
              minWidth: 58,
              minHeight: 64,
              padding: 10,
              gap: 6,
              borderRadius: 13,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: date === d.key ? '#176b52' : c.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText
              style={{
                fontSize: 10,
                lineHeight: 13,
                color: date === d.key ? '#d9f0e6' : c.secondary,
              }}
            >
              {d.top.toUpperCase()}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: date === d.key ? 'white' : c.text }}>
              {d.bottom}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <ThemedText type="card">
            {filter === 'attention' ? 'Waiting for you' : 'Your schedule'}
          </ThemedText>
          <ThemedText type="small" style={{ color: c.secondary }}>
            {loading && !appointments.length
              ? 'Loading…'
              : failed && !appointments.length
                ? 'Unavailable'
                : `${visible.length} bookings`}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search appointments"
          onPress={() => setSearchOpen(!searchOpen)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView name="magnifyingglass" tintColor={c.text} style={{ width: 20, height: 20 }} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh schedule"
          disabled={loading || blocked}
          onPress={onRefresh}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <SymbolView name="arrow.clockwise" tintColor={c.text} style={{ width: 20, height: 20 }} />
        </Pressable>
      </View>
      {(searchOpen || search.length > 0) && (
        <MerchantSearch
          value={search}
          onChange={setSearch}
          placeholder="Search customer or service"
        />
      )}
      {!visible.length && !loading && !failed && (
        <EmptyState
          title="No appointments here"
          message="Try another date, filter or search. New bookings appear here."
        />
      )}
      {!!visible.length && (
        <View>
          {visible.map((row, index) => (
            <View key={row.id}>
              {(index === 0 || dayKey(visible[index - 1]!) !== dayKey(row)) && (
                <ThemedText type="smallBold" style={{ paddingVertical: 14 }}>
                  {new Intl.DateTimeFormat(undefined, {
                    timeZone: row.timezone,
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  }).format(new Date(row.startAt))}
                </ThemedText>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${row.customerName}, ${row.serviceName}, ${timeLabel(row)}, ${row.status}`}
                disabled={blocked}
                onPress={() => onSelect(row.id)}
                style={({ pressed }) => ({
                  gap: 14,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderRadius: 20,
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <SymbolView name="clock" size={20} tintColor={c.text} />
                    <ThemedText
                      style={{
                        fontFamily: focusedFont,
                        fontSize: 20,
                        lineHeight: 26,
                        fontWeight: '700',
                      }}
                    >
                      {timeLabel(row)}
                    </ThemedText>
                  </View>
                  <MerchantStatus
                    label={
                      row.status === 'requested'
                        ? 'Needs approval'
                        : row.status.replaceAll('_', ' ')
                    }
                    tone={
                      appointmentNeedsAttention(row)
                        ? 'warning'
                        : ['confirmed', 'checked_in', 'in_service', 'completed'].includes(
                              row.status,
                            )
                          ? 'success'
                          : 'quiet'
                    }
                  />
                </View>
                <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 52,
                      minHeight: 52,
                      padding: 9,
                      borderRadius: 12,
                      backgroundColor: c.background,
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <SymbolView name="calendar" size={22} tintColor={c.text} />
                  </View>
                  <View style={{ flex: 1, gap: 7 }}>
                    <ThemedText type="card">{row.customerName}</ThemedText>
                    <ThemedText type="small" style={{ color: c.secondary }}>
                      {row.serviceName}
                      {row.resourceName ? ' · ' + row.resourceName : ''}
                    </ThemedText>
                    {row.status === 'requested' && (
                      <ThemedText type="smallBold" themeColor="accent">
                        Review request
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
                    backgroundColor: blocked ? c.background : c.success,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: blocked ? c.secondary : c.onAction }}
                  >
                    View appointment
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
