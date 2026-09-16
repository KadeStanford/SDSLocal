import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <main className="home-shell">
      <nav className="topbar home-nav">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          <Link href="/events">Events</Link>
          {data.user && <Link href="/following">Following</Link>}
          {data.user && <Link href="/rewards">Rewards</Link>}
          <Link href="#for-businesses">For businesses</Link>
          <Link className="button button-small" href={data.user ? '/account' : '/auth'}>
            {data.user ? 'Your account' : 'Sign in'}
          </Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <p className="eyebrow">Built for local connection</p>
          <h1>Find what’s good nearby—and keep coming back.</h1>
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
        <div className="hero-card" aria-label="Example local business card">
          <span className="status-pill">Coming to your neighborhood</span>
          <div className="mock-photo" />
          <p className="eyebrow">Local favorite</p>
          <h2>A better front door for local business.</h2>
          <p>
            One clear page for hours, events, offerings, and rewards—easy to open from any QR code.
          </p>
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
