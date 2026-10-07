import { View } from 'react-native';
import { MerchantFilters, MerchantSearch, MerchantStatus } from './merchant-ui';
import { ThemedText } from './themed-text';
import {
  eventAttendeeCounts,
  attendeeStatus,
  type EventAttendee,
  type AttendeeFilter,
} from '@/lib/event-attendees';

export function EventAttendeeInboxHeader({
  attendees,
  query,
  filter,
  onQuery,
  onFilter,
}: {
  attendees: readonly EventAttendee[];
  query: string;
  filter: AttendeeFilter;
  onQuery: (value: string) => void;
  onFilter: (value: AttendeeFilter) => void;
}) {
  const counts = eventAttendeeCounts(attendees);
  return (
    <View style={{ gap: 12 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {counts.confirmedPeople} confirmed {counts.confirmedPeople === 1 ? 'person' : 'people'} ·{' '}
        {counts.all} {counts.all === 1 ? 'group' : 'groups'}
      </ThemedText>
      <MerchantSearch value={query} onChange={onQuery} placeholder="Search attendee names" />
      <MerchantFilters
        value={filter}
        onChange={onFilter}
        options={[
          { value: 'expected', label: 'Expected', count: counts.expected },
          { value: 'checked', label: 'Checked in', count: counts.checked },
          { value: 'waitlisted', label: 'Waitlisted', count: counts.waitlisted },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />
    </View>
  );
}

export function EventAttendeeStatus({ attendee }: { attendee: EventAttendee }) {
  const state = attendeeStatus(attendee);
  return (
    <MerchantStatus
      label={
        state === 'checked' ? 'Checked in' : state === 'waitlisted' ? 'Waitlisted' : 'Expected'
      }
      tone={state === 'checked' ? 'success' : state === 'waitlisted' ? 'warning' : 'quiet'}
    />
  );
}
