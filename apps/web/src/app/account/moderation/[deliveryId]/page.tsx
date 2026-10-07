import { SurfacePanel } from '@/components/shared-ui';
import { PageHeader } from '@/components/page-header';

import { AppIcon } from '@/components/app-icon';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isOutcomeId, parseModerationOutcome } from '@sds/business-logic';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Account outcome' };
export default async function OutcomePage({ params }: { params: Promise<{ deliveryId: string }> }) {
  const { deliveryId } = await params,
    client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect('/auth?next=' + encodeURIComponent('/account/moderation/' + deliveryId));
  const response = isOutcomeId(deliveryId)
    ? await client.rpc('get_my_moderation_outcome', { p_delivery_id: deliveryId })
    : { data: null, error: null };
  const item = parseModerationOutcome(response.data);
  // The fresh RPC checks current ownership. Never reveal the stored delivery payload on its own.
  return (
    <main className="page-shell narrow-shell">
      <PageHeader backHref="/account/moderation" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <Link href="/account/moderation">All account updates</Link>
      </nav>

      {response.error ? (
        <SurfacePanel className="outcome-panel" role="alert">
          <h1>Outcome unavailable</h1>
          <p>We could not check this alert. Please try again when your connection is available.</p>
          <Link className="button button-secondary" href={'/account/moderation/' + deliveryId}>
            Try again
          </Link>
        </SurfacePanel>
      ) : !item ? (
        <SurfacePanel className="outcome-panel">
          <h1>This outcome is no longer available</h1>
          <p className="muted">The item may have been removed or your access may have changed.</p>
          <Link className="button button-secondary" href="/account/moderation">
            View your updates
          </Link>
        </SurfacePanel>
      ) : (
        <>
          <div className="page-heading compact-heading">
            <p className="eyebrow">Account update</p>
            <h1>{item.title}</h1>
            <p>{item.outcome.summary}</p>
            <time className="muted" dateTime={item.created_at}>
              {new Date(item.created_at).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </time>
          </div>
          {!item.is_latest && (
            <p className="notice-info">
              This is an earlier outcome. The current status and available action below reflect the
              latest record.
            </p>
          )}
          <div className="outcome-sections">
            <SurfacePanel>
              <h2>Reason for this outcome</h2>
              <p className="outcome-text">{item.outcome.public_reason}</p>
            </SurfacePanel>
            <SurfacePanel>
              <h2>What happens next</h2>
              <p>{item.outcome.next_step}</p>
              <p className="muted">Current status: {item.current_state.replaceAll('_', ' ')}</p>
            </SurfacePanel>
            {item.current_review_text !== null && (
              <SurfacePanel>
                <h2>Your current review</h2>
                <p className="outcome-text">
                  {item.current_review_text || 'Star rating only. No written review.'}
                </p>
              </SurfacePanel>
            )}
          </div>
          {item.quick_action &&
            item.quick_action.web_path !== '/account/moderation/' + deliveryId && (
              <Link className="button outcome-cta" href={item.quick_action.web_path}>
                {item.quick_action.label} <AppIcon name="chevron-right" size={18} />
              </Link>
            )}
          <p className="muted outcome-help">
            Opening the item does not change it. Review any edits before using its save or submit
            control.
          </p>
        </>
      )}
    </main>
  );
}
