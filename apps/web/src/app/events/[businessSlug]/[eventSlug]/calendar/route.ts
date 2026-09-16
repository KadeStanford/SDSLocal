import { createClient } from '@/lib/supabase/server';

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsDate(value: string) {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

export async function GET(
  _request: Request,
  { params }: RouteContext<'/events/[businessSlug]/[eventSlug]/calendar'>,
) {
  const { businessSlug, eventSlug } = await params;
  const supabase = await createClient();
  const { data: event } = await supabase
    .from('events')
    .select(
      'id, title, description, starts_at, ends_at, location_mode, address_text, external_url, businesses!inner(name, slug, address_line_1, address_line_2, city, region_code, postal_code)',
    )
    .eq('slug', eventSlug)
    .eq('businesses.slug', businessSlug)
    .or(`is_published.eq.true,publish_at.lte.${new Date().toISOString()}`)
    .is('archived_at', null)
    .maybeSingle();
  if (!event) return new Response('Event not found', { status: 404 });
  const joined = event.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  if (!business) return new Response('Event not found', { status: 404 });
  const businessAddress = [
    business.address_line_1,
    business.address_line_2,
    business.city,
    business.region_code,
    business.postal_code,
  ]
    .filter(Boolean)
    .join(', ');
  const location =
    event.location_mode === 'online'
      ? 'Online event'
      : event.location_mode === 'custom'
        ? (event.address_text ?? '')
        : businessAddress;
  const end =
    event.ends_at ?? new Date(new Date(event.starts_at).getTime() + 60 * 60 * 1000).toISOString();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SDS Local//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${event.id}@sdslocal`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(event.starts_at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(location)}`,
    event.external_url ? `URL:${event.external_url}` : null,
    `ORGANIZER;CN=${escapeIcs(business.name)}:MAILTO:noreply@sdslocal.invalid`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return new Response(`${lines.join('\r\n')}\r\n`, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${eventSlug}.ics"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
