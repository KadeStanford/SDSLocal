import { SurfacePanel } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';

import type { OwnedBusinessSummary } from '@sds/types';
import { getBusinessStatusLabel, getOfferingTerminology } from '@sds/business-logic';
import type { BusinessType } from '@sds/types';
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
        business_type: BusinessType;
        status: OwnedBusinessSummary['status'];
      }
    | {
        id: string;
        name: string;
        slug: string;
        business_type: BusinessType;
        status: OwnedBusinessSummary['status'];
      }[]
    | null;
}

export const metadata = { title: 'Your account' };

export default async function AccountPage({ searchParams }: PageProps<'/account'>) {
  const query = await searchParams;
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
      .select('role, businesses(id, name, slug, business_type, status)')
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
    <main className="page-shell account-page">
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
          <Link href="/following">
            <AppIcon name="heart" size={18} />
            Following
          </Link>
          <Link href="/rewards">
            <AppIcon name="gift" size={18} />
            Rewards
          </Link>
          <Link href="/account/moderation">
            <AppIcon name="bell" size={18} />
            Account updates
          </Link>
          {isAdmin === true && (
            <Link href="/admin">
              <AppIcon name="shield-check" size={18} />
              Admin console
            </Link>
          )}
          <form action={signOutAction}>
            <button className="text-button">Sign out</button>
          </form>
        </div>
      </nav>

      <div className="page-heading compact-heading">
        <p className="eyebrow">Account</p>
        <h1>Your account</h1>
        <p>Manage your local activity and business workspaces.</p>
      </div>

      {typeof query.staffInviteAccepted === 'string' && (
        <p className="notice-success">
          Staff access added for {query.staffInviteAccepted}. Open the business workspace to get
          started.
        </p>
      )}

      <SurfacePanel className="account-identity panel" aria-label="Account identity">
        <div className="account-avatar" aria-hidden="true">
          {(profile.display_name || authData.user.email || 'A').slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h2>{profile.display_name || 'Your profile'}</h2>
          <p className="muted">{authData.user.email}</p>
          <p className="muted">
            {[profile.city, profile.region_code].filter(Boolean).join(', ') || 'Location not added'}
          </p>
        </div>
        <Link href="#profile" className="button button-secondary">
          Edit profile <AppIcon name="chevron-right" size={18} />
        </Link>
      </SurfacePanel>
      <section className="account-activity" aria-label="Your local activity">
        {(
          [
            {
              href: '/explore',
              icon: 'compass',
              label: 'Explore businesses',
              detail: 'Find your next local place',
            },
            {
              href: '/events',
              icon: 'calendar-days',
              label: 'Discover events',
              detail: 'See what is happening nearby',
            },
            {
              href: '/following',
              icon: 'heart',
              label: 'Following',
              detail: 'Return to the businesses you follow',
            },
            {
              href: '/rewards',
              icon: 'gift',
              label: 'Rewards wallet',
              detail: 'Your progress and available rewards',
            },
          ] as const
        ).map((item) => (
          <Link href={item.href} key={item.href} className="account-activity-card">
            <AppIcon name={item.icon} size={24} />
            <strong>{item.label}</strong>
            <span>{item.detail}</span>
          </Link>
        ))}
      </section>
      <div className="account-grid">
        <div className="account-business-stack">
          <SurfacePanel>
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
              <ul className="account-workspaces">
                {businesses.map((business) => (
                  <li key={business.id}>
                    <div className="account-workspace-identity">
                      <div className="workspace-initial" aria-hidden="true">
                        {business.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <h3>{business.name}</h3>
                        <div className="event-card-meta">
                          <span>{getBusinessStatusLabel(business.status)}</span>
                          <span>{business.role}</span>
                        </div>
                      </div>
                    </div>
                    <Link
                      className="button"
                      href={`/account/businesses/${business.id}/settings#readiness`}
                    >
                      Review &amp; submit <AppIcon name="chevron-right" size={18} />
                    </Link>
                    <nav
                      aria-label={business.name + ' workspace'}
                      className="account-workspace-tools"
                    >
                      <Link href={`/account/businesses/${business.id}/settings`}>
                        Business details
                      </Link>
                      <Link href={`/account/businesses/${business.id}/offerings`}>
                        {getOfferingTerminology(business.business_type).items}
                      </Link>
                      <Link href={`/account/businesses/${business.id}/events`}>Events</Link>
                      <Link href={`/account/businesses/${business.id}/updates`}>
                        Follower updates
                      </Link>
                      <Link href={`/account/businesses/${business.id}/loyalty`}>Rewards</Link>
                      <Link href={`/account/businesses/${business.id}/media`}>Photos</Link>
                      <Link href={`/b/${business.slug}`}>View public page</Link>
                    </nav>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <strong>No business profile yet</strong>
                <span>Start with the basics; you can add photos and polish the page next.</span>
              </div>
            )}
          </SurfacePanel>
          <SurfacePanel>
            <AppIcon name="bell" size={24} />
            <h2>Your account updates</h2>
            <p className="muted">
              Review listing and review outcomes, their public reason, and the next step available
              to you.
            </p>
            <Link className="button button-secondary" href="/account/moderation">
              View account updates <AppIcon name="chevron-right" size={18} />
            </Link>
          </SurfacePanel>
        </div>
        <SurfacePanel className="account-profile-editor" id="profile">
          <h2>Your profile</h2>
          <p className="muted">Used for your customer account and business memberships.</p>
          <ProfileForm profile={profile} />
          <Link
            className="button button-secondary account-notification-link"
            href="/account/notifications"
          >
            Notification preferences
          </Link>
        </SurfacePanel>
      </div>
    </main>
  );
}
