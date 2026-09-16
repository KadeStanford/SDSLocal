import type { Metadata } from 'next';
import Link from 'next/link';

import { formatEventTime } from '@/lib/event-time';
import { createClient } from '@/lib/supabase/server';

import { EventFilters } from './event-filters';

interface DiscoveryEvent {
  event_id: string;
  event_slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_mode: string;
  address_text: string | null;
  age_note: string | null;
  capacity_text: string | null;
  business_name: string;
  business_slug: string;
  business_city: string | null;
  business_region_code: string | null;
  distance_miles: number | null;
  image_path: string | null;
  image_alt: string | null;
  category_names: string[];
}

export const metadata: Metadata = {
  title: 'Local events',
  description: 'Discover upcoming events from independent local businesses.',
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function dateWindow(range: string) {
  const now = new Date();
  const start = new Date(now);
  let end: Date | null = null;
  if (range === 'today') {
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'weekend') {
    const day = now.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    start.setDate(now.getDate() + daysUntilSaturday);
    start.setHours(0, 0, 0, 0);
    end = new Date(start);
    end.setDate(start.getDate() + 1);
    end.setHours(23, 59, 59, 999);
  } else if (range === '30days') {
    end = new Date(now);
    end.setDate(now.getDate() + 30);
  }
  return { start, end };
}

export default async function EventDiscoveryPage({ searchParams }: PageProps<'/events'>) {
  const query = await searchParams;
  const range = ['today', 'weekend', '30days'].includes(first(query.range))
    ? first(query.range)
    : 'upcoming';
  const category = /^\d+$/.test(first(query.category)) ? first(query.category) : '';
  const city = first(query.city).trim().slice(0, 120);
  const radius = ['5', '10', '25', '50'].includes(first(query.radius)) ? first(query.radius) : '';
  const latitude = Number(first(query.lat));
  const longitude = Number(first(query.lng));
  const hasCoordinates =
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    first(query.lat) !== '' &&
    first(query.lng) !== '';
  const page = Math.max(1, Number.parseInt(first(query.page) || '1', 10) || 1);
  const { start, end } = dateWindow(range);
  const supabase = await createClient();
  const [{ data: categoryData }, { data: authData }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
  ]);
  const { data, error } = await supabase.rpc('discover_events', {
    p_starts_after: start.toISOString(),
    p_starts_before: end?.toISOString() ?? null,
    p_category_id: category ? Number(category) : null,
    p_city: city || null,
    p_latitude: hasCoordinates ? latitude : null,
    p_longitude: hasCoordinates ? longitude : null,
    p_radius_miles: radius && hasCoordinates ? Number(radius) : null,
    p_limit: 24,
    p_offset: (page - 1) * 24,
  });
  const events = (data ?? []) as DiscoveryEvent[];
  const savedIds = new Set<string>();
  if (authData.user && events.length) {
    const { data: saves } = await supabase
      .from('event_saves')
      .select('event_id')
      .eq('customer_id', authData.user.id)
      .in(
        'event_id',
        events.map((event) => event.event_id),
      );
    for (const save of saves ?? []) savedIds.add(save.event_id);
  }

  const nextQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({
    range,
    category,
    city,
    radius,
    lat: hasCoordinates ? String(latitude) : '',
    lng: hasCoordinates ? String(longitude) : '',
  })) {
    if (value) nextQuery.set(key, value);
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          {authData.user && <Link href="/following">Following</Link>}
          <Link href={authData.user ? '/account' : '/auth'}>
            {authData.user ? 'Your account' : 'Sign in'}
          </Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">What’s happening locally</p>
        <h1>Events worth showing up for.</h1>
        <p>
          Browse without an account. Sign in only when you want to save an event or set a reminder.
        </p>
      </div>

      <section className="panel event-filter-panel">
        <EventFilters
          categories={(categoryData ?? []) as { id: number; name: string }[]}
          initial={{
            range,
            category,
            city,
            radius,
            latitude: hasCoordinates ? String(latitude) : '',
            longitude: hasCoordinates ? String(longitude) : '',
          }}
        />
      </section>

      {error && <p className="notice-error">Events could not be loaded: {error.message}</p>}
      <section className="event-card-grid" aria-label="Upcoming events">
        {events.map((event) => {
          const imageUrl = event.image_path
            ? supabase.storage.from('business-media').getPublicUrl(event.image_path).data.publicUrl
            : null;
          return (
            <article className="event-card" key={event.event_id}>
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={event.image_alt ?? ''} loading="lazy" />
              ) : (
                <div className="event-card-placeholder" aria-hidden="true" />
              )}
              <div className="event-card-body">
                <p className="event-card-date">
                  {formatEventTime(event.starts_at, event.timezone)}
                </p>
                <h2>{event.title}</h2>
                <p className="event-card-business">{event.business_name}</p>
                <p>
                  {event.description.length > 150
                    ? `${event.description.slice(0, 147)}…`
                    : event.description}
                </p>
                <div className="event-card-meta">
                  {event.business_city && (
                    <span>
                      {event.business_city}, {event.business_region_code}
                    </span>
                  )}
                  {event.distance_miles !== null && (
                    <span>{event.distance_miles.toFixed(1)} miles away</span>
                  )}
                  {savedIds.has(event.event_id) && <span>Saved</span>}
                </div>
                <Link
                  className="button button-small"
                  href={`/events/${event.business_slug}/${event.event_slug}`}
                >
                  View event
                </Link>
              </div>
            </article>
          );
        })}
      </section>
      {!error && events.length === 0 && (
        <div className="empty-state">
          <strong>No matching events yet</strong>
          <span>Try a wider date range, another category, or remove the location filter.</span>
        </div>
      )}
      <div className="event-pagination">
        {page > 1 && (
          <Link
            className="button button-secondary button-small"
            href={`/events?${new URLSearchParams([...nextQuery, ['page', String(page - 1)]])}`}
          >
            Previous
          </Link>
        )}
        {events.length === 24 && (
          <Link
            className="button button-secondary button-small"
            href={`/events?${new URLSearchParams([...nextQuery, ['page', String(page + 1)]])}`}
          >
            Next
          </Link>
        )}
      </div>
    </main>
  );
}
