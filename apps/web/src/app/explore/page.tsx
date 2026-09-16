import type { Metadata } from 'next';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

import { ExploreFilters } from './explore-filters';

interface DiscoveryBusiness {
  business_id: string;
  business_name: string;
  business_slug: string;
  description: string;
  city: string | null;
  region_code: string | null;
  primary_color: string;
  accent_color: string;
  distance_miles: number | null;
  image_path: string | null;
  image_alt: string | null;
  category_names: string[];
  is_open: boolean;
  has_loyalty: boolean;
  has_upcoming_events: boolean;
}

export const metadata: Metadata = {
  title: 'Explore local businesses',
  description: 'Search and discover independent businesses near you.',
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

export default async function ExplorePage({ searchParams }: PageProps<'/explore'>) {
  const params = await searchParams;
  const query = first(params.q).trim().slice(0, 120);
  const category = /^\d+$/.test(first(params.category)) ? first(params.category) : '';
  const city = first(params.city).trim().slice(0, 120);
  const radius = ['5', '10', '25', '50'].includes(first(params.radius)) ? first(params.radius) : '';
  const latitude = Number(first(params.lat));
  const longitude = Number(first(params.lng));
  const hasCoordinates =
    first(params.lat) !== '' &&
    first(params.lng) !== '' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;
  const openNow = first(params.open) === 'on';
  const loyalty = first(params.loyalty) === 'on';
  const events = first(params.events) === 'on';
  const page = Math.max(1, Number.parseInt(first(params.page) || '1', 10) || 1);
  const supabase = await createClient();
  const [{ data: categories }, { data: authData }, { data, error }] = await Promise.all([
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.auth.getUser(),
    supabase.rpc('discover_businesses', {
      p_query: query || null,
      p_category_id: category ? Number(category) : null,
      p_city: city || null,
      p_latitude: hasCoordinates ? latitude : null,
      p_longitude: hasCoordinates ? longitude : null,
      p_radius_miles: radius && hasCoordinates ? Number(radius) : null,
      p_open_now: openNow,
      p_has_loyalty: loyalty,
      p_has_events: events,
      p_limit: 24,
      p_offset: (page - 1) * 24,
    }),
  ]);
  const businesses = (data ?? []) as DiscoveryBusiness[];
  const followedIds = new Set<string>();
  if (authData.user && businesses.length) {
    const { data: follows } = await supabase
      .from('business_follows')
      .select('business_id')
      .eq('customer_id', authData.user.id)
      .in(
        'business_id',
        businesses.map((business) => business.business_id),
      );
    for (const follow of follows ?? []) followedIds.add(follow.business_id);
  }

  const pageQuery = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: query,
    category,
    city,
    radius,
    lat: hasCoordinates ? String(latitude) : '',
    lng: hasCoordinates ? String(longitude) : '',
    open: openNow ? 'on' : '',
    loyalty: loyalty ? 'on' : '',
    events: events ? 'on' : '',
  })) {
    if (value) pageQuery.set(key, value);
  }

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/events">Events</Link>
          {authData.user && <Link href="/following">Following</Link>}
          <Link href={authData.user ? '/account' : '/auth'}>
            {authData.user ? 'Your account' : 'Sign in'}
          </Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Explore local</p>
        <h1>Find the right business nearby.</h1>
        <p>Search offerings, browse categories, or narrow the results to what is open now.</p>
      </div>
      <section className="panel explore-filter-panel">
        <ExploreFilters
          categories={(categories ?? []) as { id: number; name: string }[]}
          initial={{
            query,
            category,
            city,
            radius,
            latitude: hasCoordinates ? String(latitude) : '',
            longitude: hasCoordinates ? String(longitude) : '',
            openNow,
            loyalty,
            events,
          }}
        />
      </section>
      {error && <p className="notice-error">Businesses could not be loaded: {error.message}</p>}
      <section className="business-card-grid" aria-label="Local businesses">
        {businesses.map((business) => {
          const imageUrl = business.image_path
            ? supabase.storage.from('business-media').getPublicUrl(business.image_path).data
                .publicUrl
            : null;
          return (
            <article className="discovery-business-card" key={business.business_id}>
              <div
                className="discovery-business-image"
                style={{ backgroundColor: business.primary_color }}
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={business.image_alt ?? ''} loading="lazy" />
                ) : (
                  <span>{business.business_name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="discovery-business-body">
                <p className="eyebrow">{business.category_names.join(' · ') || 'Local business'}</p>
                <h2>{business.business_name}</h2>
                <p>
                  {business.description.length > 150
                    ? `${business.description.slice(0, 147)}…`
                    : business.description}
                </p>
                <div className="event-card-meta">
                  {business.city && (
                    <span>
                      {business.city}, {business.region_code}
                    </span>
                  )}
                  {business.distance_miles !== null && (
                    <span>{business.distance_miles.toFixed(1)} miles</span>
                  )}
                  {business.is_open && <span>Open now</span>}
                  {business.has_loyalty && <span>Rewards</span>}
                  {business.has_upcoming_events && <span>Events</span>}
                  {followedIds.has(business.business_id) && <span>Following</span>}
                </div>
                <Link className="button button-small" href={`/b/${business.business_slug}`}>
                  View business
                </Link>
              </div>
            </article>
          );
        })}
      </section>
      {!error && businesses.length === 0 && (
        <div className="empty-state">
          <strong>No matching businesses yet</strong>
          <span>Try another search, a nearby city, or fewer filters.</span>
        </div>
      )}
      <div className="event-pagination">
        {page > 1 && (
          <Link
            className="button button-secondary button-small"
            href={`/explore?${new URLSearchParams([...pageQuery, ['page', String(page - 1)]])}`}
          >
            Previous
          </Link>
        )}
        {businesses.length === 24 && (
          <Link
            className="button button-secondary button-small"
            href={`/explore?${new URLSearchParams([...pageQuery, ['page', String(page + 1)]])}`}
          >
            Next
          </Link>
        )}
      </div>
    </main>
  );
}
