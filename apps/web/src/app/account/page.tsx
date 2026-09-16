import type { OwnedBusinessSummary } from '@sds/types';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { signOutAction } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';

import { ProfileForm } from './profile-form';

interface ProfileRow {
  display_name: string | null;
  city: string | null;
  region_code: string | null;
  postal_code: string | null;
}

interface MembershipRow {
  role: OwnedBusinessSummary['role'];
  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        status: OwnedBusinessSummary['status'];
      }
    | {
        id: string;
        name: string;
        slug: string;
        status: OwnedBusinessSummary['status'];
      }[]
    | null;
}

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const [{ data: profileData }, { data: membershipData }, { data: isAdmin }] = await Promise.all([
    supabase
      .from('profiles')
      .select('display_name, city, region_code, postal_code')
      .eq('id', authData.user.id)
      .single(),
    supabase
      .from('business_members')
      .select('role, businesses(id, name, slug, status)')
      .eq('user_id', authData.user.id)
      .eq('is_active', true),
    supabase.rpc('is_platform_admin'),
  ]);

  const profile = (profileData ?? {
    display_name: authData.user.user_metadata.display_name ?? null,
    city: null,
    region_code: null,
    postal_code: null,
  }) as ProfileRow;

  const businesses = ((membershipData ?? []) as MembershipRow[]).flatMap((membership) => {
    const rows = Array.isArray(membership.businesses)
      ? membership.businesses
      : membership.businesses
        ? [membership.businesses]
        : [];
    return rows.map((business) => ({ ...business, role: membership.role }));
  });

  return (
    <main className="page-shell">
      <nav className="topbar">
        <Link className="brand" href="/">
          SDS Local
        </Link>
        <div className="nav-actions">
          <Link href="/explore">Explore</Link>
          <Link href="/events">Events</Link>
          <Link href="/following">Following</Link>
          <Link href="/rewards">Rewards</Link>
          <Link href="/account/notifications">Notifications</Link>
          {isAdmin === true && <Link href="/admin/reviews">Review queue</Link>}
          <form action={signOutAction}>
            <button className="text-button">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">Account</p>
        <h1>Hi, {profile.display_name ?? authData.user.email}.</h1>
      </div>

      <div className="account-grid">
        <section className="panel">
          <h2>Your profile</h2>
          <p className="muted">Used for your customer account and business memberships.</p>
          <ProfileForm profile={profile} />
          <Link
            className="button button-secondary account-notification-link"
            href="/account/notifications"
          >
            Notification preferences
          </Link>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>Your businesses</h2>
              <p className="muted">Create and manage local business pages.</p>
            </div>
            <Link className="button" href="/account/businesses/new">
              Add business
            </Link>
          </div>
          {businesses.length ? (
            <ul className="business-list">
              {businesses.map((business) => (
                <li key={business.id}>
                  <div>
                    <strong>{business.name}</strong>
                    <span>
                      {business.role} · {business.status.replace('_', ' ')}
                    </span>
                  </div>
                  <details className="business-menu">
                    <summary>Manage</summary>
                    <div>
                      <Link href={`/account/businesses/${business.id}/settings`}>
                        Business details
                      </Link>
                      <Link href={`/account/businesses/${business.id}/offerings`}>Offerings</Link>
                      <Link href={`/account/businesses/${business.id}/events`}>Events</Link>
                      <Link href={`/account/businesses/${business.id}/loyalty`}>Rewards</Link>
                      <Link href={`/account/businesses/${business.id}/media`}>Photos</Link>
                      <Link href={`/b/${business.slug}`}>View public page</Link>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <strong>No business profile yet</strong>
              <span>Start with the basics; you can add photos and polish the page next.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
