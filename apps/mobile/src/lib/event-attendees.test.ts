import { expect, it } from 'vitest';
import {
  attendeeCsv,
  attendeeCsvCell,
  eventAttendeeCounts,
  filterEventAttendees,
  type EventAttendee,
} from './event-attendees';
const rows: EventAttendee[] = [
  {
    rsvp_id: 'arriving',
    attendee_name: 'Jane Doe',
    party_size: 3,
    rsvp_status: 'going',
    checked_in_at: null,
    created_at: '2026-09-28T00:00:00Z',
  },
  {
    rsvp_id: 'arrived',
    attendee_name: 'John Doe',
    party_size: 2,
    rsvp_status: 'going',
    checked_in_at: '2026-09-28T02:00:00Z',
    created_at: '2026-09-28T00:00:00Z',
  },
  {
    rsvp_id: 'waiting',
    attendee_name: 'Waitlist group',
    party_size: 4,
    rsvp_status: 'waitlisted',
    checked_in_at: null,
    created_at: '2026-09-28T00:00:00Z',
  },
];
it('keeps waitlisted groups out of expected/checked lists and counts people separately from groups', () => {
  expect(eventAttendeeCounts(rows)).toEqual({
    all: 3,
    expected: 1,
    checked: 1,
    waitlisted: 1,
    confirmedPeople: 5,
  });
  expect(filterEventAttendees(rows, 'expected', ' DOE ').map((a) => a.rsvp_id)).toEqual([
    'arriving',
  ]);
  expect(filterEventAttendees(rows, 'checked', '').map((a) => a.rsvp_id)).toEqual(['arrived']);
  expect(filterEventAttendees(rows, 'waitlisted', '').map((a) => a.rsvp_id)).toEqual(['waiting']);
  expect(filterEventAttendees(rows, 'all', 'missing')).toEqual([]);
  expect(filterEventAttendees(rows, 'all', 'doe')).toHaveLength(2);
});
it('exports the full supplied roster and protects formula-like names without corrupting quotes or group counts', () => {
  for (const value of [
    '=HYPERLINK("https://example.test")',
    ' +SUM(1,2)',
    '-1+2',
    '@formula',
    '\t=1+1',
  ])
    expect(attendeeCsvCell(value)).toBe('"\'' + value.replaceAll('"', '""') + '"');
  expect(attendeeCsvCell('Jane, "J"')).toBe('"Jane, ""J"""');
  const csv = attendeeCsv(rows);
  expect(csv).toContain('"Jane Doe","3","going","No"');
  expect(csv).toContain('"John Doe","2","going","Yes"');
  expect(csv).toContain('"Waitlist group","4","waitlisted","No"');
});
