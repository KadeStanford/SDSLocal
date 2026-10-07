import { OpenInApp } from '@/components/open-in-app';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';

import { formatEventTime } from '@/lib/event-time';
import { createClient } from '@/lib/supabase/server';

import { saveEventAction, setEventReminderAction } from './actions';
import { EventShareButton } from './event-share-button';

interface EventDetailRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_mode: 'business' | 'custom' | 'online';
  address_text: string | null;
  external_url: string | null;
  age_note: string | null;
  capacity_text: string | null;
  is_published: boolean;
  publish_at: string | null;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
  event_photos:
    | {
        id: string;
        caption: string | null;
        display_order: number;
        media_assets:
          | { alt_text: string | null; storage_path: string }
          | { alt_text: string | null; storage_path: string }[]
          | null;
      }[]
    | null;
  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        region_code: string | null;
        postal_code: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        address_line_1: string | null;
        address_line_2: string | null;
        city: string | null;
        region_code: string | null;
        postal_code: string | null;
      }[];
}

const getEvent = cache(async (businessSlug: string, eventSlug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('events')
    .select(
      'id, title, slug, description, starts_at, ends_at, timezone, location_mode, address_text, external_url, age_note, capacity_text, is_published, publish_at, media_assets(alt_text, storage_path), event_photos(id, caption, display_order, media_assets(alt_text, storage_path)), businesses!inner(id, name, slug, address_line_1, address_line_2, city, region_code, postal_code)',
    )
    .eq('slug', eventSlug)
    .eq('businesses.slug', businessSlug)
    .is('archived_at', null)
    .maybeSingle();
  return { supabase, event: data as EventDetailRow | null };
});

export async function generateMetadata({
  params,
}: PageProps<'/events/[businessSlug]/[eventSlug]'>): Promise<Metadata> {
  const { businessSlug, eventSlug } = await params;
  const { supabase, event } = await getEvent(businessSlug, eventSlug);
  if (!event) return { title: 'Event not found' };
  const business = Array.isArray(event.businesses) ? event.businesses[0] : event.businesses;
  if (!business) return { title: 'Event not found' };
  const asset = Array.isArray(event.media_assets) ? event.media_assets[0] : event.media_assets;
  const image = asset
    ? supabase.storage.from('business-media').getPublicUrl(asset.storage_path).data.publicUrl
    : undefined;
  return {
    title: `${event.title} — ${business.name}`,
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.title,
      description: event.description.slice(0, 200),
      type: 'article',
      images: image ? [{ url: image, alt: asset?.alt_text ?? event.title }] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
  searchParams,
}: PageProps<'/events/[businessSlug]/[eventSlug]'>) {
  const [{ businessSlug, eventSlug }, query] = await Promise.all([params, searchParams]);
  const { supabase, event } = await getEvent(businessSlug, eventSlug);
  if (!event) notFound();
  const business = Array.isArray(event.businesses) ? event.businesses[0] : event.businesses;
  if (!business) notFound();
  const asset = Array.isArray(event.media_assets) ? event.media_assets[0] : event.media_assets;
  const image = asset
    ? supabase.storage.from('business-media').getPublicUrl(asset.storage_path).data.publicUrl
    : null;
  const gallery = (event.event_photos ?? [])
    .slice()
    .sort((a, b) => a.display_order - b.display_order)
    .flatMap((photo) => {
      const photoAsset = Array.isArray(photo.media_assets)
        ? photo.media_assets[0]
        : photo.media_assets;
      if (!photoAsset) return [];
      return [
        {
          url: supabase.storage.from('business-media').getPublicUrl(photoAsset.storage_path).data
            .publicUrl,
          alt: photoAsset.alt_text ?? photo.caption ?? event.title,
          caption: photo.caption,
        },
      ];
    });
  const { data: authData } = await supabase.auth.getUser();
  const { data: save } = authData.user
    ? await supabase
        .from('event_saves')
        .select('reminder_enabled, reminder_frequency, reminder_minutes_before')
        .eq('event_id', event.id)
        .eq('customer_id', authData.user.id)
        .maybeSingle()
    : { data: null };
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
        ? event.address_text
        : businessAddress;
  const saveAction = saveEventAction.bind(null, businessSlug, eventSlug);
  const reminderAction = setEventReminderAction.bind(null, businessSlug, eventSlug);
  const eventUrl = `/events/${businessSlug}/${eventSlug}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.starts_at,
    endDate: event.ends_at ?? undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode:
      event.location_mode === 'online'
        ? 'https://schema.org/OnlineEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode',
    image: image ?? undefined,
    organizer: { '@type': 'Organization', name: business.name, url: `/b/${business.slug}` },
    location:
      event.location_mode === 'online'
        ? { '@type': 'VirtualLocation', url: event.external_url ?? eventUrl }
        : { '@type': 'Place', name: business.name, address: location },
  };

  return (
    <main className="event-detail-page">
      <nav className="event-detail-nav">
        <Link className="brand" href="/">
          Parish Pass
        </Link>
        <div className="nav-actions">
          <Link href="/events">All events</Link>
          <Link href={`/b/${business.slug}`}>{business.name}</Link>
        </div>
      </nav>
      <OpenInApp path={`calendar?eventId=${encodeURIComponent(event.id)}&businessId=${encodeURIComponent(business!.id)}`} description="Open this event to RSVP, manage your group and set a reminder." />
      {!event.is_published && (!event.publish_at || new Date(event.publish_at) > new Date()) && (
        <div className="draft-banner">Private event preview</div>
      )}
      <article className="event-detail-card">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="event-detail-image" src={image} alt={asset?.alt_text ?? ''} />
        )}
        {gallery.length > 0 && (
          <div className="event-detail-gallery" aria-label="Event gallery">
            {gallery.map((photo) => (
              <figure key={photo.url}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.alt} />
                {photo.caption && <figcaption>{photo.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
        <div className="event-detail-content">
          <p className="eyebrow">{business.name}</p>
          <h1>{event.title}</h1>
          <p className="event-detail-time">{formatEventTime(event.starts_at, event.timezone)}</p>
          {event.ends_at && (
            <p className="muted">Ends {formatEventTime(event.ends_at, event.timezone)}</p>
          )}
          <p className="event-description">{event.description}</p>
          <dl className="event-facts">
            <div>
              <dt>Location</dt>
              <dd>{location || 'Location details coming soon'}</dd>
            </div>
            {event.age_note && (
              <div>
                <dt>Ages</dt>
                <dd>{event.age_note}</dd>
              </div>
            )}
            {event.capacity_text && (
              <div>
                <dt>Capacity</dt>
                <dd>{event.capacity_text}</dd>
              </div>
            )}
          </dl>
          {query.saved === '1' && <p className="notice-success">Event reminder enabled.</p>}
          {query.reminder === 'updated' && (
            <p className="notice-success">Reminder preference updated.</p>
          )}
          {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}
          <div className="event-detail-actions">
            {save ? (
              <>
                <form action={reminderAction} className="event-reminder-form">
                  <label>
                    <input
                      name="reminderEnabled"
                      type="checkbox"
                      defaultChecked={save.reminder_enabled}
                    />
                    Remind me before this event
                  </label>
                  <label>
                    Timing
                    <select
                      name="reminderMinutesBefore"
                      defaultValue={String(save.reminder_minutes_before ?? 1440)}
                    >
                      <option value="60">1 hour before</option>
                      <option value="180">3 hours before</option>
                      <option value="1440">1 day before</option>
                      <option value="2880">2 days before</option>
                      <option value="10080">1 week before</option>
                      <option value="43200">1 month before</option>
                      <option value="129600">3 months before</option>
                    </select>
                  </label>
                  <label>
                    Repeat
                    <select
                      name="reminderFrequency"
                      defaultValue={save.reminder_frequency ?? 'once'}
                    >
                      <option value="once">One reminder</option>
                      <option value="daily">Every day until the event</option>
                      <option value="weekly">Every week until the event</option>
                      <option value="monthly">Every month until the event</option>
                    </select>
                  </label>
                  <button className="text-button">
                    {save.reminder_enabled ? 'Update reminder' : 'Enable reminder'}
                  </button>
                </form>
              </>
            ) : authData.user ? (
              <form action={saveAction}>
                <div className="event-reminder-form">
                  <label>
                    Timing
                    <select name="reminderMinutesBefore" defaultValue="1440">
                      <option value="60">1 hour before</option>
                      <option value="180">3 hours before</option>
                      <option value="1440">1 day before</option>
                      <option value="2880">2 days before</option>
                      <option value="10080">1 week before</option>
                      <option value="43200">1 month before</option>
                      <option value="129600">3 months before</option>
                    </select>
                  </label>
                  <label>
                    Repeat
                    <select name="reminderFrequency" defaultValue="once">
                      <option value="once">One reminder</option>
                      <option value="daily">Every day until the event</option>
                      <option value="weekly">Every week until the event</option>
                      <option value="monthly">Every month until the event</option>
                    </select>
                  </label>
                  <button className="button">Remind me</button>
                </div>
              </form>
            ) : (
              <Link className="button" href={`/auth?next=${encodeURIComponent(eventUrl)}`}>
                Sign in to set a reminder
              </Link>
            )}
            <a className="button button-secondary" href={`${eventUrl}/calendar`}>
              Add to calendar
            </a>
            {event.external_url && (
              <a className="button button-secondary" href={event.external_url}>
                Tickets / information
              </a>
            )}
            <EventShareButton title={event.title} />
          </div>
        </div>
      </article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
    </main>
  );
}
