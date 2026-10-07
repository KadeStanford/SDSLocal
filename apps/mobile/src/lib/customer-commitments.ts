/** Database UUIDs only: never interpolate search text into a PostgREST filter. */
export function personalEventScope(businessIds: readonly string[], savedEventIds: readonly string[]) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const clean = (ids: readonly string[]) => [...new Set(ids.filter(id => uuid.test(id)))];
  const businesses = clean(businessIds), saved = clean(savedEventIds);
  return [businesses.length ? `business_id.in.(${businesses.join(',')})` : '', saved.length ? `id.in.(${saved.join(',')})` : ''].filter(Boolean).join(',');
}
export type AppointmentHistorySummary = { status: string; ends_at: string };
export function appointmentIsPast(row: AppointmentHistorySummary, now = Date.now()) {
  return ['cancelled', 'completed', 'no_show'].includes(row.status) || new Date(row.ends_at).getTime() < now;
}
