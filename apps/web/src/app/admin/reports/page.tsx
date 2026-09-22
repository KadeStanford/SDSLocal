import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

import { ActionNotice } from '@/app/admin/reviews/action-notice';

import { resolveReportAction } from './actions';

interface ReportRow {
  id: string;
  target_type: 'business' | 'event' | 'offering_item';
  target_id: string;
  target_label: string | null;
  reason: string;
  details: string | null;
  status: 'open' | 'reviewing' | 'resolved' | 'dismissed';
  resolution_note: string | null;
  reporter_name: string;
  created_at: string;
  updated_at: string;
}

export const metadata = { title: 'Reports & safety' };

export default async function ReportsPage({ searchParams }: PageProps<'/admin/reports'>) {
  const query = await searchParams;
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) notFound();

  const { data, error } = await supabase.rpc('list_platform_reports', { p_status: null });
  const reports = (data ?? []) as ReportRow[];

  return (
    <main className="page-shell narrow-shell admin-shell">
      <nav className="topbar">
        <Link className="brand" href="/admin">
          ← Admin console
        </Link>
        <Link href="/account">Account</Link>
      </nav>
      <div className="page-heading compact-heading admin-heading">
        <p className="eyebrow">Safety operations</p>
        <h1>Reports & safety</h1>
        <p>Review customer reports without exposing report data to ordinary business accounts.</p>
      </div>

      {typeof query.saved === 'string' && <ActionNotice kind="success" message={query.saved} />}
      {typeof query.error === 'string' && <ActionNotice kind="error" message={query.error} />}
      {error && (
        <p className="notice-error">The report queue could not be loaded: {error.message}</p>
      )}

      <div className="review-queue">
        {reports.map((report) => (
          <article className="panel review-card admin-report-card" key={report.id}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">{report.target_type.replace('_', ' ')}</p>
                <h2>{report.target_label ?? 'Unknown content'}</h2>
              </div>
              <span className={`admin-status-pill report-status-${report.status}`}>
                {report.status}
              </span>
            </div>
            <dl className="admin-details-list">
              <div>
                <dt>Reason</dt>
                <dd>{report.reason}</dd>
              </div>
              <div>
                <dt>Reported by</dt>
                <dd>{report.reporter_name}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(report.created_at).toLocaleString()}</dd>
              </div>
            </dl>
            {report.details && <p className="admin-report-details">{report.details}</p>}
            {report.resolution_note && (
              <p className="field-hint">Resolution: {report.resolution_note}</p>
            )}
            {(report.status === 'open' || report.status === 'reviewing') && (
              <form action={resolveReportAction} className="admin-report-form">
                <input name="reportId" type="hidden" value={report.id} />
                <label>
                  Resolution note
                  <input
                    name="resolutionNote"
                    maxLength={1000}
                    placeholder="Optional context for the audit log"
                  />
                </label>
                <div className="review-actions">
                  <button className="button" name="status" type="submit" value="resolved">
                    Resolve
                  </button>
                  <button
                    className="button button-secondary"
                    name="status"
                    type="submit"
                    value="dismissed"
                  >
                    Dismiss
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
        {!reports.length && !error && (
          <div className="empty-state">
            <strong>No reports in the queue</strong>
            <span>New customer safety reports will appear here.</span>
          </div>
        )}
      </div>
    </main>
  );
}
