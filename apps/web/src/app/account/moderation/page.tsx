import { SurfacePanel } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';

import { AppIcon } from '@/components/app-icon';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { parseModerationOutcome } from '@sds/business-logic';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Account updates' };
export default async function ModerationInboxPage() {
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect('/auth?next=/account/moderation');
  const { data, error } = await client.rpc('get_my_moderation_outcomes', { p_limit: 50 });
  const outcomes = Array.isArray(data)
    ? data.map(parseModerationOutcome).filter((item) => item !== null)
    : [];
  return (
    <main className="page-shell narrow-shell">
      <PageHeader backHref="/account" backLabel="Back" alertsCurrent />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          <Link href="/account">
            <AppIcon name="circle-user-round" size={18} />
            Account
          </Link>
          <Link href="/account/notifications">
            <AppIcon name="bell" size={18} />
            Notification preferences
          </Link>
        </div>
      </nav>
      <div className="page-heading compact-heading">
        <p className="eyebrow">Account / updates</p>
        <h1>Your account updates</h1>
        <p>
          Review listing and review outcomes, their public reason, and the next step available to
          you.
        </p>
      </div>
      {error ? (
        <SurfacePanel role="alert">
          <h2>Updates are unavailable</h2>
          <p className="muted">
            We could not check your account updates. Reload this page to try again.
          </p>
          <Link className="button button-secondary" href="/account/moderation">
            Try again
          </Link>
        </SurfacePanel>
      ) : outcomes.length ? (
        <ul className="outcome-list">
          {outcomes.map((item) => (
            <li key={item.id}>
              <Link href={'/account/moderation/' + item.id}>
                <span className="outcome-list-copy">
                  <strong>{item.title}</strong>
                  <span>{item.outcome.summary}</span>
                  <small>
                    {new Date(item.created_at).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </small>
                </span>
                <span className="outcome-read">
                  {item.read_at ? 'View outcome' : 'Unread · view outcome'}{' '}
                  <AppIcon name="chevron-right" size={18} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <SurfacePanel>
          <h2>You are all caught up</h2>
          <p className="muted">
            New listing and review outcomes will appear here when they are available to your
            account.
          </p>
          <Link className="button button-secondary" href="/account">
            Return to account
          </Link>
        </SurfacePanel>
      )}
    </main>
  );
}
