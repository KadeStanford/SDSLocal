import { getBusinessStatusLabel, getOfferingTerminology } from '@sds/business-logic';
import type { BusinessType, ServiceAreaType } from '@sds/types';
import { usRegionOptions } from '@sds/validation';
import type { CSSProperties } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { formatEventTime } from '@/lib/event-time';

import { followBusinessAction, joinRewardsAction, unfollowBusinessAction } from './actions';

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  status: 'draft' | 'pending_review' | 'active' | 'suspended';
  description: string;
  category_summary: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  region_code: string | null;
  postal_code: string | null;
  service_area: string | null;
  service_area_type: ServiceAreaType;
  service_area_regions: string[];
  service_radius_miles: number | null;
  primary_color: string;
  accent_color: string;
  business_type: BusinessType;
  page_theme: 'light' | 'dark';
  font_pair: 'friendly_sans' | 'modern_sans' | 'classic_serif';
  button_style: 'rounded' | 'soft' | 'square';
}

interface CategoryJoinRow {
  categories: { name: string } | { name: string }[] | null;
}

interface HourRow {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

interface PhotoRow {
  id: string;
  role: 'logo' | 'cover' | 'gallery';
  caption: string | null;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

interface OfferingSectionRow {
  id: string;
  name: string;
  description: string | null;
}

interface OfferingItemRow {
  id: string;
  section_id: string;
  name: string;
  description: string;
  price_minor: number | null;
  price_text: string | null;
  currency: string;
  is_available: boolean;
  is_featured: boolean;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

interface EventRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  starts_at: string;
  timezone: string;
  location_mode: 'business' | 'custom' | 'online';
  address_text: string | null;
  media_assets:
    | { alt_text: string | null; storage_path: string }
    | { alt_text: string | null; storage_path: string }[]
    | null;
}

interface LoyaltyProgramRow {
  id: string;
  name: string;
  reward_description: string;
  stamps_required: number;
  program_type: 'visits' | 'points';
  points_per_dollar: number | null;
  points_required: number | null;
  terms: string;
}

interface LocationStopRow {
  id: string;
  title: string;
  address_text: string | null;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string;
  timezone: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(value: string | null) {
  if (!value) return '';
  const [hours = '0', minutes = '00'] = value.split(':');
  const hour = Number(hours);
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function formatServiceArea(business: BusinessRow) {
  switch (business.service_area_type) {
    case 'radius':
      return business.service_radius_miles
        ? `Serving customers within ${business.service_radius_miles} miles of this location.`
        : null;
    case 'cities':
      return business.service_area_regions.length
        ? `Serving ${business.service_area_regions.join(', ')}.`
        : null;
    case 'statewide': {
      const regionName = usRegionOptions.find(([code]) => code === business.region_code)?.[1];
      return regionName ? `Serving the entire state of ${regionName}.` : null;
    }
    case 'custom':
      return business.service_area;
    default:
      return null;
  }
}

export default async function BusinessPage({ params, searchParams }: PageProps<'/b/[slug]'>) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data }, { data: authData }] = await Promise.all([
    supabase
      .from('businesses')
      .select(
        'id, name, slug, status, description, category_summary, phone, email, website_url, address_line_1, address_line_2, city, region_code, postal_code, service_area, service_area_type, service_area_regions, service_radius_miles, primary_color, accent_color, business_type, page_theme, font_pair, button_style',
      )
      .eq('slug', slug)
      .maybeSingle(),
    supabase.auth.getUser(),
  ]);

  if (!data) notFound();
  const business = data as BusinessRow;
  const { data: followData } = authData.user
    ? await supabase
        .from('business_follows')
        .select('business_id')
        .eq('business_id', business.id)
        .eq('customer_id', authData.user.id)
        .maybeSingle()
    : { data: null };
  const now = new Date();
  const nowIso = now.toISOString();
  const ninetyDaysFromNowIso = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();
  const [
    { data: categoryData },
    { data: hourData },
    { data: photoData },
    { data: sectionData },
    { data: itemData },
    { data: eventData },
    { data: loyaltyData },
    { data: locationData },
  ] = await Promise.all([
    supabase
      .from('business_categories')
      .select('categories(name)')
      .eq('business_id', business.id)
      .order('is_primary', { ascending: false }),
    supabase
      .from('business_hours')
      .select('day_of_week, opens_at, closes_at, is_closed')
      .eq('business_id', business.id)
      .order('day_of_week'),
    supabase
      .from('business_photos')
      .select('id, role, caption, media_assets(alt_text, storage_path)')
      .eq('business_id', business.id)
      .order('display_order'),
    supabase
      .from('offering_sections')
      .select('id, name, description')
      .eq('business_id', business.id)
      .eq('is_visible', true)
      .is('archived_at', null)
      .order('display_order'),
    supabase
      .from('offering_items')
      .select(
        'id, section_id, name, description, price_minor, price_text, currency, is_available, is_featured, media_assets(alt_text, storage_path)',
      )
      .eq('business_id', business.id)
      .eq('is_visible', true)
      .is('archived_at', null)
      .order('display_order'),
    supabase
      .from('events')
      .select(
        'id, slug, title, description, starts_at, timezone, location_mode, address_text, media_assets(alt_text, storage_path)',
      )
      .eq('business_id', business.id)
      .or(`is_published.eq.true,publish_at.lte.${nowIso}`)
      .is('archived_at', null)
      .gte('starts_at', nowIso)
      .order('starts_at')
      .limit(6),
    supabase
      .from('loyalty_programs')
      .select(
        'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, terms',
      )
      .eq('business_id', business.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase.rpc('get_business_location_stops', {
      p_business_id: business.id,
      p_from: nowIso,
      p_to: ninetyDaysFromNowIso,
    }),
  ]);

  const categories = ((categoryData ?? []) as CategoryJoinRow[]).flatMap((row) => {
    if (!row.categories) return [];
    return Array.isArray(row.categories)
      ? row.categories.map((item) => item.name)
      : [row.categories.name];
  });
  const hours = (hourData ?? []) as HourRow[];
  const photos = ((photoData ?? []) as PhotoRow[]).flatMap((row) => {
    const asset = Array.isArray(row.media_assets) ? row.media_assets[0] : row.media_assets;
    if (!asset) return [];
    const { data: publicData } = supabase.storage
      .from('business-media')
      .getPublicUrl(asset.storage_path);
    return [{ ...row, altText: asset.alt_text, url: publicData.publicUrl }];
  });
  const logo = photos.find((photo) => photo.role === 'logo');
  const cover = photos.find((photo) => photo.role === 'cover');
  const gallery = photos.filter((photo) => photo.role === 'gallery');
  const offeringSections = (sectionData ?? []) as OfferingSectionRow[];
  const offeringItems = (itemData ?? []) as OfferingItemRow[];
  const events = (eventData ?? []) as EventRow[];
  const loyaltyProgram = loyaltyData as LoyaltyProgramRow | null;
  const locationStops = (locationData ?? []) as LocationStopRow[];
  const { data: rewardsMembership } =
    authData.user && loyaltyProgram
      ? await supabase
          .from('loyalty_memberships')
          .select('id')
          .eq('program_id', loyaltyProgram.id)
          .eq('customer_id', authData.user.id)
          .eq('is_active', true)
          .maybeSingle()
      : { data: null };
  const terminology = getOfferingTerminology(business.business_type);
  const address = [
    business.address_line_1,
    business.address_line_2,
    business.city,
    business.region_code,
    business.postal_code,
  ]
    .filter(Boolean)
    .join(', ');
  const serviceArea = formatServiceArea(business);
  const theme = {
    '--business-primary': business.primary_color,
    '--business-accent': business.accent_color,
  } as CSSProperties;

  return (
    <main
      className={`business-page business-theme-${business.page_theme} business-font-${business.font_pair} business-buttons-${business.button_style}`}
      style={theme}
    >
      {business.status !== 'active' && (
        <div className="draft-banner">
          Private preview · {getBusinessStatusLabel(business.status)}
        </div>
      )}
      <nav className="business-nav">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          <Link href="/events">Events</Link>
          <Link href={authData.user ? '/account' : '/auth'}>
            {authData.user ? 'Account' : 'Sign in'}
          </Link>
        </div>
      </nav>
      {query.followed === '1' && (
        <p className="business-page-notice">You are now following this business.</p>
      )}
      {typeof query.error === 'string' && <p className="business-page-notice">{query.error}</p>}
      <header className={`business-hero${cover ? ' business-hero-with-cover' : ''}`}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="business-cover" src={cover.url} alt={cover.altText ?? ''} />
        )}
        <div className="business-mark">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo.url} alt={logo.altText ?? `${business.name} logo`} />
          ) : (
            business.name.slice(0, 1).toUpperCase()
          )}
        </div>
        <div>
          <p className="business-kicker">
            {categories.join(' · ') || business.category_summary || 'Local business'}
          </p>
          <h1>{business.name}</h1>
          {business.description && <p>{business.description}</p>}
        </div>
      </header>
      <div className="business-content">
        <section className="business-main-card">
          <p className="eyebrow">Welcome</p>
          <h2>Everything you need before you visit.</h2>
          <p>
            Discover what {business.name} offers, see what is coming up, and plan your next visit.
          </p>
          <div className="contact-actions">
            {authData.user ? (
              followData ? (
                <form action={unfollowBusinessAction.bind(null, business.slug)}>
                  <button className="button button-secondary">Following · Unfollow</button>
                </form>
              ) : (
                <form action={followBusinessAction.bind(null, business.slug)}>
                  <button className="button">Follow business</button>
                </form>
              )
            ) : (
              <Link
                className="button"
                href={`/auth?next=${encodeURIComponent(`/b/${business.slug}`)}`}
              >
                Sign in to follow
              </Link>
            )}
            {business.phone && (
              <a className="button" href={`tel:${business.phone}`}>
                Call
              </a>
            )}
            {business.website_url && (
              <a className="button button-secondary" href={business.website_url}>
                Website
              </a>
            )}
            {business.email && (
              <a className="button button-secondary" href={`mailto:${business.email}`}>
                Email
              </a>
            )}
          </div>
        </section>
        <aside className="business-sidebar">
          <section>
            <h2>Location</h2>
            {address && <p>{address}</p>}
            {serviceArea && <p>{serviceArea}</p>}
            {!address && !serviceArea && <p>Location details coming soon.</p>}
          </section>
          {business.business_type === 'mobile' && (
            <section>
              <h2>Upcoming stops</h2>
              {locationStops.length ? (
                <ul className="hours-list">
                  {locationStops.map((stop) => (
                    <li key={stop.id}>
                      <strong>{stop.title}</strong>
                      <span>
                        {new Date(stop.starts_at).toLocaleString()} ·{' '}
                        {stop.address_text ??
                          `${stop.latitude.toFixed(4)}, ${stop.longitude.toFixed(4)}`}
                      </span>
                      <a
                        href={`https://maps.apple.com/?ll=${stop.latitude},${stop.longitude}&q=${encodeURIComponent(stop.title)}`}
                      >
                        Directions
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Upcoming locations will be posted here.</p>
              )}
            </section>
          )}
          <section>
            <h2>Hours</h2>
            {hours.length ? (
              <dl className="hours-list">
                {hours.map((hour) => (
                  <div key={hour.day_of_week}>
                    <dt>{dayNames[hour.day_of_week]}</dt>
                    <dd>
                      {hour.is_closed
                        ? 'Closed'
                        : `${formatTime(hour.opens_at)}–${formatTime(hour.closes_at)}`}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>Hours coming soon.</p>
            )}
          </section>
        </aside>
      </div>
      {offeringSections.length > 0 && (
        <section className="business-offerings">
          <p className="eyebrow">{terminology.items}</p>
          <h2>{terminology.items}</h2>
          <div className="offering-section-grid">
            {offeringSections.map((section) => (
              <article key={section.id}>
                <h3>{section.name}</h3>
                {section.description && <p>{section.description}</p>}
                <ul>
                  {offeringItems
                    .filter((item) => item.section_id === section.id)
                    .map((item) => {
                      const asset = Array.isArray(item.media_assets)
                        ? item.media_assets[0]
                        : item.media_assets;
                      const imageUrl = asset
                        ? supabase.storage.from('business-media').getPublicUrl(asset.storage_path)
                            .data.publicUrl
                        : null;
                      return (
                        <li
                          key={item.id}
                          className={item.is_available ? '' : 'offering-unavailable'}
                        >
                          {imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              className="offering-item-image"
                              src={imageUrl}
                              alt={asset?.alt_text ?? ''}
                              loading="lazy"
                            />
                          )}
                          <div>
                            <strong>
                              {item.name}
                              {item.is_featured ? ' ★' : ''}
                            </strong>
                            {item.description && <span>{item.description}</span>}
                          </div>
                          <span>
                            {item.is_available
                              ? (item.price_text ??
                                (item.price_minor === null
                                  ? ''
                                  : new Intl.NumberFormat('en-US', {
                                      style: 'currency',
                                      currency: item.currency,
                                    }).format(item.price_minor / 100)))
                              : 'Unavailable'}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      )}
      {events.length > 0 && (
        <section className="business-events">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Coming up</p>
              <h2>Events</h2>
            </div>
            <Link href="/events">Discover more events</Link>
          </div>
          <div className="business-event-grid">
            {events.map((event) => {
              const asset = Array.isArray(event.media_assets)
                ? event.media_assets[0]
                : event.media_assets;
              const imageUrl = asset
                ? supabase.storage.from('business-media').getPublicUrl(asset.storage_path).data
                    .publicUrl
                : null;
              return (
                <article key={event.id}>
                  {imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={asset?.alt_text ?? ''} loading="lazy" />
                  )}
                  <div>
                    <p className="event-card-date">
                      {formatEventTime(event.starts_at, event.timezone)}
                    </p>
                    <h3>{event.title}</h3>
                    <p>
                      {event.description.length > 120
                        ? `${event.description.slice(0, 117)}…`
                        : event.description}
                    </p>
                    <Link
                      className="button button-small"
                      href={`/events/${business.slug}/${event.slug}`}
                    >
                      Event details
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
      {loyaltyProgram && (
        <section className="business-loyalty">
          <div>
            <p className="eyebrow">Local rewards</p>
            <h2>{loyaltyProgram.name}</h2>
            <p>{loyaltyProgram.reward_description}</p>
            <strong>
              {loyaltyProgram.program_type === 'points'
                ? `Earn ${loyaltyProgram.points_per_dollar ?? 1} point${loyaltyProgram.points_per_dollar === 1 ? '' : 's'} per $1; redeem at ${loyaltyProgram.points_required ?? 0} points.`
                : `Earn a reward every ${loyaltyProgram.stamps_required} visits.`}
            </strong>
            {loyaltyProgram.terms && <small>{loyaltyProgram.terms}</small>}
          </div>
          {rewardsMembership ? (
            <Link className="button" href={`/rewards/${rewardsMembership.id}`}>
              Open rewards card
            </Link>
          ) : authData.user ? (
            <form action={joinRewardsAction.bind(null, business.slug)}>
              <button className="button">Join rewards</button>
            </form>
          ) : (
            <Link
              className="button"
              href={`/auth?next=${encodeURIComponent(`/b/${business.slug}`)}`}
            >
              Sign in to join rewards
            </Link>
          )}
        </section>
      )}
      {gallery.length > 0 && (
        <section className="business-gallery" aria-label={`${business.name} photo gallery`}>
          {gallery.map((photo) => (
            <figure key={photo.id}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.altText ?? ''} />
              {photo.caption && <figcaption>{photo.caption}</figcaption>}
            </figure>
          ))}
        </section>
      )}
    </main>
  );
}
