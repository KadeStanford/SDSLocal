import type { EventLocationMode, EventTimezone } from '@sds/validation';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { eventTimeInputValue, formatEventTime } from '@/lib/event-time';
import { createClient } from '@/lib/supabase/server';

import {
  archiveEventAction,
  createEventAction,
  restoreEventAction,
  updateEventAction,
} from './actions';
import { EventFields } from './event-fields';
import { EventImageManager } from './event-image-manager';

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: EventTimezone;
  location_mode: EventLocationMode;
  address_text: string | null;
  external_url: string | null;
  age_note: string | null;
  capacity_text: string | null;
  is_published: boolean;
  publish_at: string | null;
  archived_at: string | null;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

export const metadata = { title: 'Manage events' };

export default async function EventsManagerPage({
  params,
  searchParams,
}: PageProps<'/account/businesses/[id]/events'>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(id, name, slug)')
    .eq('business_id', id)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  if (!business) notFound();

  const { data } = await supabase
    .from('events')
    .select(
      'id, slug, title, description, starts_at, ends_at, timezone, location_mode, address_text, external_url, age_note, capacity_text, is_published, publish_at, archived_at, media_assets(alt_text, storage_path)',
    )
    .eq('business_id', id)
    .order('starts_at');
  const events = (data ?? []) as EventRow[];
  const activeEvents = events.filter((event) => !event.archived_at);
  const archivedEvents = events.filter((event) => event.archived_at);

  return (
    <main className="page-shell narrow-shell">
      <nav className="topbar">
        <Link className="brand" href="/account">
          ← Account
        </Link>
        <div className="nav-actions">
          <Link href="/events">Discover events</Link>
          <Link href={`/account/businesses/${id}/updates`}>Follower updates</Link>
          <Link href={`/b/${business.slug}`}>View page</Link>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">Events</p>
        <h1>{business.name}</h1>
        <p>
          Create structured event pages customers can discover, save, share, and add to a calendar.
        </p>
      </div>

      {typeof query.saved === 'string' && <p className="notice-success">{query.saved}</p>}
      {typeof query.error === 'string' && <p className="notice-error">{query.error}</p>}

      <details className="panel event-create-panel">
        <summary>Create an event</summary>
        <form action={createEventAction} className="form-stack">
          <input type="hidden" name="businessId" value={id} />
          <EventFields />
          <button className="button">Save event</button>
        </form>
      </details>

      <div className="event-editor-list">
        {activeEvents.map((event) => {
          const scheduled = Boolean(event.publish_at && new Date(event.publish_at) > new Date());
          const publiclyVisible = event.is_published || Boolean(event.publish_at && !scheduled);
          const asset = Array.isArray(event.media_assets)
            ? event.media_assets[0]
            : event.media_assets;
          const currentImage = asset
            ? {
                altText: asset.alt_text,
                url: supabase.storage.from('business-media').getPublicUrl(asset.storage_path).data
                  .publicUrl,
              }
            : null;
          return (
            <details className="panel event-editor" key={event.id}>
              <summary>
                <span>
                  <strong>{event.title}</strong>
                  <small>{formatEventTime(event.starts_at, event.timezone)}</small>
                </span>
                <span className={publiclyVisible ? 'event-status-published' : 'event-status-draft'}>
                  {publiclyVisible
                    ? 'Published'
                    : scheduled && event.publish_at
                      ? `Scheduled ${formatEventTime(event.publish_at, event.timezone)}`
                      : 'Draft'}
                </span>
              </summary>
              <form action={updateEventAction} className="form-stack compact-form">
                <input type="hidden" name="businessId" value={id} />
                <input type="hidden" name="eventId" value={event.id} />
                <EventFields
                  publication={{
                    mode: event.is_published ? 'publish' : scheduled ? 'schedule' : 'draft',
                    publishAt: eventTimeInputValue(event.publish_at, event.timezone),
                  }}
                  event={{
                    title: event.title,
                    slug: event.slug,
                    description: event.description,
                    startsAt: eventTimeInputValue(event.starts_at, event.timezone),
                    endsAt: eventTimeInputValue(event.ends_at, event.timezone),
                    timezone: event.timezone,
                    locationMode: event.location_mode,
                    addressText: event.address_text ?? '',
                    externalUrl: event.external_url ?? '',
                    ageNote: event.age_note ?? '',
                    capacityText: event.capacity_text ?? '',
                  }}
                />
                <EventImageManager
                  businessId={id}
                  businessName={business.name}
                  eventId={event.id}
                  eventTitle={event.title}
                  userId={authData.user.id}
                  currentImage={currentImage}
                />
                <div className="event-editor-actions">
                  <button className="button button-small">Save details</button>
                  <Link href={`/events/${business.slug}/${event.slug}`}>Preview event page</Link>
                  <button className="text-button" formAction={archiveEventAction}>
                    Archive
                  </button>
                </div>
              </form>
            </details>
          );
        })}
        {!activeEvents.length && (
          <div className="empty-state">
            <strong>No events yet</strong>
            <span>Create an event above and choose whether to draft, publish, or schedule it.</span>
          </div>
        )}
      </div>

      {archivedEvents.length > 0 && (
        <details className="panel archived-events">
          <summary>Archived events ({archivedEvents.length})</summary>
          {archivedEvents.map((event) => (
            <form action={restoreEventAction} key={event.id}>
              <input type="hidden" name="businessId" value={id} />
              <input type="hidden" name="eventId" value={event.id} />
              <span>{event.title}</span>
              <button className="text-button">Restore draft</button>
            </form>
          ))}
        </details>
      )}
    </main>
  );
}
