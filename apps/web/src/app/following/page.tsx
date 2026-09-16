import type { EventTimezone } from '@sds/validation';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { formatEventTime } from '@/lib/event-time';
import { createClient } from '@/lib/supabase/server';

interface FollowedBusiness {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string | null;
  region_code: string | null;
  primary_color: string;
}

interface FeedEvent {
  id: string;
  business_id: string;
  slug: string;
  title: string;
  starts_at: string;
  timezone: EventTimezone;
}

interface FeedOffering {
  id: string;
  business_id: string;
  name: string;
  description: string;
  updated_at: string;
}

export const metadata = { title: 'Businesses you follow' };

export default async function FollowingPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=/following');

  const { data: followData } = await supabase
    .from('business_follows')
    .select('business_id')
    .eq('customer_id', authData.user.id)
    .order('created_at', { ascending: false });
  const ids = (followData ?? []).map((follow) => follow.business_id);

  let businesses: FollowedBusiness[] = [];
  let events: FeedEvent[] = [];
  let offerings: FeedOffering[] = [];
  if (ids.length) {
    const now = new Date().toISOString();
    const [businessResult, eventResult, offeringResult] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, slug, description, city, region_code, primary_color')
        .in('id', ids)
        .eq('status', 'active'),
      supabase
        .from('events')
        .select('id, business_id, slug, title, starts_at, timezone')
        .in('business_id', ids)
        .or(`is_published.eq.true,publish_at.lte.${now}`)
        .is('archived_at', null)
        .gte('starts_at', now)
        .order('starts_at')
        .limit(12),
      supabase
        .from('offering_items')
        .select('id, business_id, name, description, updated_at')
        .in('business_id', ids)
        .eq('is_visible', true)
        .eq('is_available', true)
        .is('archived_at', null)
        .order('updated_at', { ascending: false })
        .limit(12),
    ]);
    businesses = (businessResult.data ?? []) as FollowedBusiness[];
    events = (eventResult.data ?? []) as FeedEvent[];
    offerings = (offeringResult.data ?? []) as FeedOffering[];
  }
  const businessById = new Map(businesses.map((business) => [business.id, business]));

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          <Link href="/events">Events</Link>
          <Link href="/account">Your account</Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Your local feed</p>
        <h1>Businesses you follow.</h1>
        <p>Upcoming events and recently updated offerings, gathered in one place.</p>
      </div>

      {!businesses.length ? (
        <div className="empty-state">
          <strong>Your following list is empty</strong>
          <span>Explore local businesses and follow the ones you want to hear from.</span>
          <Link className="button button-small" href="/explore">
            Explore businesses
          </Link>
        </div>
      ) : (
        <>
          <section className="followed-business-strip" aria-label="Followed businesses">
            {businesses.map((business) => (
              <Link href={`/b/${business.slug}`} key={business.id}>
                <span style={{ backgroundColor: business.primary_color }}>
                  {business.name.slice(0, 1).toUpperCase()}
                </span>
                <strong>{business.name}</strong>
                <small>{[business.city, business.region_code].filter(Boolean).join(', ')}</small>
              </Link>
            ))}
          </section>

          <div className="following-feed-grid">
            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Coming up</p>
                  <h2>Events</h2>
                </div>
                <Link href="/events">All events</Link>
              </div>
              <div className="feed-list">
                {events.map((event) => {
                  const business = businessById.get(event.business_id);
                  if (!business) return null;
                  return (
                    <Link href={`/events/${business.slug}/${event.slug}`} key={event.id}>
                      <span>{formatEventTime(event.starts_at, event.timezone)}</span>
                      <strong>{event.title}</strong>
                      <small>{business.name}</small>
                    </Link>
                  );
                })}
                {!events.length && (
                  <p className="muted">No upcoming events from these businesses.</p>
                )}
              </div>
            </section>

            <section className="panel">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Recently updated</p>
                  <h2>Offerings</h2>
                </div>
              </div>
              <div className="feed-list">
                {offerings.map((offering) => {
                  const business = businessById.get(offering.business_id);
                  if (!business) return null;
                  return (
                    <Link href={`/b/${business.slug}`} key={offering.id}>
                      <strong>{offering.name}</strong>
                      <span>{offering.description}</span>
                      <small>{business.name}</small>
                    </Link>
                  );
                })}
                {!offerings.length && <p className="muted">No current offerings to show yet.</p>}
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
