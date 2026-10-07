import { describe, expect, it } from 'vitest';

import { canReviewAttendedEvent } from './event-review.ts';

describe('canReviewAttendedEvent', () => {
  const now = Date.parse('2026-09-27T18:00:00.000Z');

  it('allows a checked-in attendee after the event ends', () => {
    expect(
      canReviewAttendedEvent(
        'going',
        '2026-09-27T16:00:00.000Z',
        '2026-09-27T15:00:00.000Z',
        '2026-09-27T17:00:00.000Z',
        now,
      ),
    ).toBe(true);
  });

  it('does not allow reviews before the event ends', () => {
    expect(
      canReviewAttendedEvent(
        'going',
        '2026-09-27T16:00:00.000Z',
        '2026-09-27T17:00:00.000Z',
        '2026-09-27T19:00:00.000Z',
        now,
      ),
    ).toBe(false);
  });

  it('requires check-in and an active RSVP', () => {
    expect(canReviewAttendedEvent('going', null, '2026-09-27T15:00:00.000Z', null, now)).toBe(
      false,
    );
    expect(
      canReviewAttendedEvent(
        'cancelled',
        '2026-09-27T16:00:00.000Z',
        '2026-09-27T15:00:00.000Z',
        null,
        now,
      ),
    ).toBe(false);
  });

  it('rejects malformed event timestamps', () => {
    expect(canReviewAttendedEvent('going', 'checked-in', 'not-a-date', null, now)).toBe(false);
  });
});
