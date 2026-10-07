export function canReviewAttendedEvent(
  rsvpStatus: string,
  checkedInAt: string | null,
  startsAt: string,
  endsAt: string | null,
  now = Date.now(),
) {
  const reviewAfter = Date.parse(endsAt ?? startsAt);
  return (
    rsvpStatus === 'going' &&
    Boolean(checkedInAt) &&
    Number.isFinite(reviewAfter) &&
    reviewAfter <= now
  );
}
