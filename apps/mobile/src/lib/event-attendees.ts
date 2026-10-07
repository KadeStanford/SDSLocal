export interface EventAttendee {
  readonly rsvp_id: string;
  readonly attendee_name: string;
  readonly party_size: number;
  readonly rsvp_status: 'going' | 'waitlisted';
  readonly checked_in_at: string | null;
  readonly created_at: string;
}
export type AttendeeFilter = 'all' | 'expected' | 'checked' | 'waitlisted';

export function attendeeStatus(attendee: EventAttendee): AttendeeFilter {
  return attendee.rsvp_status === 'waitlisted'
    ? 'waitlisted'
    : attendee.checked_in_at
      ? 'checked'
      : 'expected';
}
export function filterEventAttendees(
  attendees: readonly EventAttendee[],
  filter: AttendeeFilter,
  query: string,
) {
  const search = query.trim().toLocaleLowerCase();
  return attendees.filter(
    (attendee) =>
      (filter === 'all' || attendeeStatus(attendee) === filter) &&
      (!search || attendee.attendee_name.toLocaleLowerCase().includes(search)),
  );
}
export function eventAttendeeCounts(attendees: readonly EventAttendee[]) {
  return {
    all: attendees.length,
    expected: attendees.filter((a) => attendeeStatus(a) === 'expected').length,
    checked: attendees.filter((a) => attendeeStatus(a) === 'checked').length,
    waitlisted: attendees.filter((a) => attendeeStatus(a) === 'waitlisted').length,
    confirmedPeople: attendees.reduce(
      (total, a) => total + (a.rsvp_status === 'going' ? a.party_size : 0),
      0,
    ),
  };
}

/** Quoting alone does not stop spreadsheet formula execution in exported names. */
export function attendeeCsvCell(value: string | number) {
  const raw = String(value);
  const safe = /^[\s]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function attendeeCsv(attendees: readonly EventAttendee[]) {
  return [
    ['Attendee', 'Group size', 'RSVP status', 'Checked in'].map(attendeeCsvCell).join(','),
    ...attendees.map((a) =>
      [a.attendee_name, a.party_size, a.rsvp_status, a.checked_in_at ? 'Yes' : 'No']
        .map(attendeeCsvCell)
        .join(','),
    ),
  ].join('\n');
}
