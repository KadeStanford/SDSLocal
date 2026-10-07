import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ActionNotice } from '@/app/admin/reviews/action-notice';
import { moderatePickupReviewAction } from './actions';

interface ReviewReport {
  report_id: string;
  review_id: string;
  business_name: string;
  rating: number;
  review_text: string;
  merchant_response: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  created_at: string;
  resolution_note: string | null;
}

export const metadata = { title: 'Verified customer review reports' };

export default async function CustomerReviewsModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) notFound();

  const { data, error } = await supabase.rpc('list_pickup_review_reports');
  const reports = (data ?? []) as ReviewReport[];

  return (
    <main className="page-shell narrow-shell admin-shell">
      <nav className="topbar">
        <Link className="brand" href="/admin">
          ← Admin console
        </Link>
        <Link href="/admin/reports">Reports &amp; safety</Link>
      </nav>
      <div className="page-heading compact-heading admin-heading">
        <p className="eyebrow">Safety operations</p>
        <h1>Verified review reports</h1>
        <p>Review reports about ratings from completed pickup orders.</p>
      </div>
      {typeof query.saved === 'string' && <ActionNotice kind="success" message={query.saved} />}
      {typeof query.error === 'string' && <ActionNotice kind="error" message={query.error} />}
      {error && <p className="notice-error">The review report queue could not load.</p>}
      <div className="review-queue">
        {reports.map((report) => (
          <article className="panel review-card" key={report.report_id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{report.business_name}</p>
                <h2>
                  {'★'.repeat(report.rating)}
                  {'☆'.repeat(5 - report.rating)}
                </h2>
              </div>
              <span className={`admin-status-pill report-status-${report.status}`}>
                {report.status}
              </span>
            </div>
            <p>{report.review_text || 'Star rating only'}</p>
            {report.merchant_response && (
              <p className="field-hint">Business response: {report.merchant_response}</p>
            )}
            <dl className="admin-details-list">
              <div>
                <dt>Reason</dt>
                <dd>{report.reason.replaceAll('_', ' ')}</dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd>{new Date(report.created_at).toLocaleString()}</dd>
              </div>
            </dl>
            {report.details && <p className="admin-report-details">{report.details}</p>}
            {report.resolution_note && (
              <p className="field-hint">Resolution: {report.resolution_note}</p>
            )}
            {report.status === 'open' && (
              <form action={moderatePickupReviewAction} className="admin-report-form">
                <input name="reportId" type="hidden" value={report.report_id} />
                <label>
                  Resolution note
                  <input
                    name="resolutionNote"
                    maxLength={1000}
                    placeholder="Optional moderation note"
                  />
                </label>
                <div className="review-actions">
                  <button className="button" name="action" type="submit" value="hide">
                    Hide review
                  </button>
                  <button
                    className="button button-secondary"
                    name="action"
                    type="submit"
                    value="remove"
                  >
                    Remove review
                  </button>
                  <button
                    className="button button-secondary"
                    name="action"
                    type="submit"
                    value="dismiss"
                  >
                    Dismiss report
                  </button>
                </div>
              </form>
            )}
            {report.status === 'resolved' && (
              <form action={moderatePickupReviewAction} className="review-actions">
                <input name="reportId" type="hidden" value={report.report_id} />
                <button
                  className="button button-secondary"
                  name="action"
                  type="submit"
                  value="restore"
                >
                  Restore review
                </button>
              </form>
            )}
          </article>
        ))}
        {!reports.length && !error && (
          <div className="empty-state">
            <strong>No review reports</strong>
            <span>Customer reports will appear here.</span>
          </div>
        )}
      </div>
    </main>
  );
}
