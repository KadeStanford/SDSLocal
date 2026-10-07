import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';

import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="home-shell">
      <PageHeader />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          <Link href="/explore">
            <AppIcon name="compass" size={18} />
            Explore
          </Link>
          <Link href="/events">
            <AppIcon name="calendar-days" size={18} />
            Events
          </Link>
          {data.user && (
            <Link href="/following">
              <AppIcon name="heart" size={18} />
              Following
            </Link>
          )}
          {data.user && (
            <Link href="/rewards">
              <AppIcon name="gift" size={18} />
              Rewards
            </Link>
          )}
          <Link href="#for-businesses">For businesses</Link>
          <Link className="button button-small" href={data.user ? '/account' : '/auth'}>
            {data.user ? 'Your account' : 'Sign in'}
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">Built for local connection</p>
          <h1>Good things, close to home.</h1>
          <p className="hero-copy">
            Discover independent businesses, see what’s happening, and keep local rewards in one
            friendly place.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/explore">
              Explore local businesses
            </Link>
            <a className="button button-secondary" href="#for-businesses">
              Build a business page
            </a>
          </div>
        </div>
        <div className="hero-card local-life-card">
          <p className="eyebrow">Parish Pass</p>
          <h2>Your local life, together.</h2>
          <ul className="local-life-links">
            <li>
              <AppIcon name="store" size={24} />
              <div>
                <strong>Discover a new favorite</strong>
                <p>Browse independent businesses and their offerings.</p>
              </div>
            </li>
            <li>
              <AppIcon name="calendar-days" size={24} />
              <div>
                <strong>Make a local plan</strong>
                <p>See upcoming events and keep the details close.</p>
              </div>
            </li>
            <li>
              <AppIcon name="gift" size={24} />
              <div>
                <strong>Keep coming back</strong>
                <p>Your loyalty cards and followed businesses in one place.</p>
              </div>
            </li>
          </ul>
        </div>
      </section>
      <section className="business-cta" id="for-businesses">
        <div>
          <p className="eyebrow">For business owners</p>
          <h2>Start your public page in a few focused steps.</h2>
        </div>
        <Link className="button" href={data.user ? '/account/businesses/new' : '/auth'}>
          Start a business profile
        </Link>
      </section>
    </main>
  );
}
