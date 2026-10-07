import { FlowAvatar, FlowSection, FlowIdentity } from '@/components/flow-layout';
import { BusinessScreenHeader } from '@/components/business-screen-header';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppButton } from '@/components/app-button';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { EventAttendeeInboxHeader, EventAttendeeStatus } from '@/components/event-attendee-inbox';
import { MerchantRow, MerchantSheet } from '@/components/merchant-ui';
import { ThemedText } from '@/components/themed-text';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  attendeeCsv,
  filterEventAttendees,
  type EventAttendee,
  type AttendeeFilter,
} from '@/lib/event-attendees';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

export default function EventAttendeesScreen() {
  const { eventId } = useLocalSearchParams<{ eventId?: string }>();
  const { session } = useAuth();
  return (
    <EventAttendeeWorkspace
      key={`${eventId}:${session?.user.id}`}
      eventId={eventId}
      ownerId={session?.user.id ?? null}
    />
  );
}

function EventAttendeeWorkspace({
  eventId,
  ownerId,
}: {
  eventId: string | undefined;
  ownerId: string | null;
}) {
  const colors = useTheme(),
    bottom = useScreenBottomPadding();
  const [eventTitle, setEventTitle] = useState('Event attendees');
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AttendeeFilter>('expected');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mounted = useRef(true),
    readVersion = useRef(0),
    writeBusy = useRef(false),
    exportBusy = useRef(false);
  useEffect(() => {
    // Capture the request-version ref object used to invalidate pending reads.
    const readVersionForCleanup = readVersion;

    mounted.current = true;
    return () => {
      mounted.current = false;
      readVersionForCleanup.current++;
    };
  }, []);
  const selected = attendees.find((a) => a.rsvp_id === selectedId);
  const visible = filterEventAttendees(attendees, filter, query);

  const load = useCallback(async () => {
    const version = ++readVersion.current;
    if (!ownerId || !eventId) {
      setError('Sign in as the business owner to view attendees.');
      setAttendees([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [eventResult, attendeeResult] = await Promise.all([
        supabase.from('events').select('title,starts_at').eq('id', eventId).maybeSingle(),
        supabase.rpc('get_business_event_rsvp_attendees', { p_event_id: eventId }),
      ]);
      if (!mounted.current || version !== readVersion.current) return;
      const firstError = eventResult.error ?? attendeeResult.error;
      if (firstError || !eventResult.data) {
        if (firstError?.code === '42501' || (!firstError && !eventResult.data)) {
          setAttendees([]);
          setLoadedOnce(false);
          setSelectedId(null);
        }
        throw firstError ?? new Error('This event is unavailable.');
      }
      setEventTitle(eventResult.data.title);
      setAttendees((attendeeResult.data ?? []) as EventAttendee[]);
      setLoadedOnce(true);
    } catch (e) {
      if (mounted.current && version === readVersion.current)
        setError(userMessageFromError(e, 'Attendees could not load. Please retry.'));
    } finally {
      if (mounted.current && version === readVersion.current) setLoading(false);
    }
  }, [eventId, ownerId]);
  const pullRefresh = usePullRefresh(load);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function setCheckIn(attendee: EventAttendee, checkedIn: boolean) {
    if (writeBusy.current || loading || error || attendee.rsvp_status !== 'going') return;
    writeBusy.current = true;
    setSavingId(attendee.rsvp_id);
    setError(null);
    setNotice(null);
    readVersion.current++;
    try {
      const result = await supabase.rpc('set_event_rsvp_check_in', {
        p_rsvp_id: attendee.rsvp_id,
        p_checked_in: checkedIn,
      });
      if (!mounted.current) return;
      if (result.error) throw result.error;
      const confirmed = Array.isArray(result.data) ? result.data[0] : result.data;
      if (
        !confirmed ||
        confirmed.rsvp_id !== attendee.rsvp_id ||
        (checkedIn ? typeof confirmed.checked_in_at !== 'string' : confirmed.checked_in_at !== null)
      )
        throw new Error(
          'Check-in result could not be confirmed. Refresh the list before trying again.',
        );
      setAttendees((current) =>
        current.map((a) =>
          a.rsvp_id === attendee.rsvp_id ? { ...a, checked_in_at: confirmed.checked_in_at } : a,
        ),
      );
      setNotice(checkedIn ? `${attendee.attendee_name} checked in.` : 'Check-in removed.');
      setSelectedId(null);
      await load();
    } catch (e) {
      if (mounted.current)
        setError(
          userMessageFromError(e, 'Check-in could not be confirmed. Refresh before trying again.'),
        );
    } finally {
      writeBusy.current = false;
      if (mounted.current) setSavingId(null);
    }
  }

  async function exportList() {
    if (exportBusy.current || !attendees.length || loading || savingId || error) return;
    exportBusy.current = true;
    setSharing(true);
    try {
      const safeTitle = eventTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const file = new File(Paths.cache, `${safeTitle || 'event'}-attendees-${Date.now()}.csv`);
      file.create();
      file.write(attendeeCsv(attendees));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'text/csv',
        dialogTitle: `${eventTitle} attendee list`,
        UTI: 'public.comma-separated-values-text',
      });
    } catch {
      if (mounted.current) setError('The attendee export could not be shared. Please try again.');
    } finally {
      exportBusy.current = false;
      if (mounted.current) setSharing(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(a) => a.rsvp_id}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottom,
          gap: 0,
          flexGrow: 1,
          width: '100%',
          maxWidth: 720,
          alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 12, paddingBottom: 16 }}>
            <BusinessScreenHeader
              title="Attendees"
              subtitle={eventTitle}
              onBack={() => router.back()}
              backDisabled={!!savingId || sharing}
            />
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <AppButton
                  label="Retry attendees"
                  variant="secondary"
                  disabled={loading || !!savingId}
                  onPress={() => void load()}
                />
              </>
            )}
            {!!notice && <StateNotice kind="success" message={notice} />}
            {loadedOnce && (
              <EventAttendeeInboxHeader
                attendees={attendees}
                query={query}
                filter={filter}
                onQuery={setQuery}
                onFilter={setFilter}
              />
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: colors.backgroundElement,
              borderColor: colors.divider,
              borderWidth: 1,
              borderRadius: 18,
              overflow: 'hidden',
            }}
          >
            <MerchantRow
              title={item.attendee_name}
              leading={<FlowAvatar name={item.attendee_name} />}
              subtitle={`${item.party_size} ${item.party_size === 1 ? 'person' : 'people'}`}
              status={<EventAttendeeStatus attendee={item} />}
              disabled={loading || !!savingId || !!error}
              label={`Open ${item.attendee_name}, group of ${item.party_size}`}
              onPress={() => setSelectedId(item.rsvp_id)}
            />
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <ListLoading label="Loading attendees" rows={3} />
          ) : !error ? (
            <EmptyState
              title={attendees.length ? 'No matching groups' : 'No attendees yet'}
              message={
                attendees.length
                  ? 'Try another name or check-in filter.'
                  : 'Confirmed and waitlisted groups will appear here.'
              }
            />
          ) : null
        }
        ListFooterComponent={
          attendees.length > 0 ? (
            <View style={{ paddingTop: 20, gap: 4 }}>
              <AppButton
                label="Export all attendees"
                variant="tertiary"
                loading={sharing}
                disabled={loading || !!savingId || !!error}
                onPress={() => void exportList()}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Includes every group, regardless of the current filter.
              </ThemedText>
            </View>
          ) : null
        }
      />
      <MerchantSheet
        visible={!!selected}
        title="Attendee group"
        blocked={!!savingId}
        onClose={() => setSelectedId(null)}
        footer={
          selected?.rsvp_status === 'going' ? (
            <AppButton
              label={selected.checked_in_at ? 'Undo group check-in' : 'Check in this group'}
              loading={savingId === selected.rsvp_id}
              disabled={loading || !!error}
              onPress={() => void setCheckIn(selected, !selected.checked_in_at)}
            />
          ) : undefined
        }
      >
        {selected && (
          <View style={{ gap: 12 }}>
            <FlowIdentity name={selected.attendee_name} detail={eventTitle} />
            <FlowSection title="Arrival details">
              <ThemedText>
                {selected.party_size} {selected.party_size === 1 ? 'person' : 'people'} in this
                group
              </ThemedText>
              <EventAttendeeStatus attendee={selected} />
              <ThemedText themeColor="textSecondary">
                {selected.rsvp_status === 'waitlisted'
                  ? 'Waitlisted groups cannot be checked in until their RSVP is confirmed.'
                  : selected.checked_in_at
                    ? 'This group has been checked in. Only undo if the check-in was a mistake.'
                    : 'Confirm everyone in this group is present before checking them in.'}
              </ThemedText>
            </FlowSection>
            {error && <StateNotice kind="error" message={error} />}
          </View>
        )}
      </MerchantSheet>
    </SafeAreaView>
  );
}
