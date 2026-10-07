import { PageHeader } from '@/components/page-header';
import { AppIcon } from '@/components/app-icon';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { signOutAction } from '@/app/auth/actions';
import { createClient } from '@/lib/supabase/server';

import {
  getAdminEnvironments,
  getCurrentEnvironmentId,
  getStagingQuota,
} from '@/lib/admin/environment';

interface AdminOverview {
  generated_at: string;
  counts: {
    users: number;
    businesses: number;
    active_businesses: number;
    pending_businesses: number;
    suspended_businesses: number;
    active_memberships: number;
    upcoming_events: number;
    active_loyalty_memberships: number;
    loyalty_transactions_30d: number;
    scan_attempts_24h: number;
  };
  moderation: {
    open_reports: number;
    pending_businesses: number;
  };
  operations: {
    queued_notifications: number;
    failed_notifications: number;
    media_processing: number;
    media_pending_delete: number;
    analytics_events_24h: number;
    database_bytes: number;
    media_bytes: number;
  };
}

interface AuditEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  actor_name: string;
  created_at: string;
}

const emptyOverview: AdminOverview = {
  generated_at: new Date(0).toISOString(),
  counts: {
    users: 0,
    businesses: 0,
    active_businesses: 0,
    pending_businesses: 0,
    suspended_businesses: 0,
    active_memberships: 0,
    upcoming_events: 0,
    active_loyalty_memberships: 0,
    loyalty_transactions_30d: 0,
    scan_attempts_24h: 0,
  },
  moderation: { open_reports: 0, pending_businesses: 0 },
  operations: {
    queued_notifications: 0,
    failed_notifications: 0,
    media_processing: 0,
    media_pending_delete: 0,
    analytics_events_24h: 0,
    database_bytes: 0,
    media_bytes: 0,
  },
};

function number(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function parseOverview(value: unknown): AdminOverview {
  if (!value || typeof value !== 'object') return emptyOverview;
  const raw = value as Partial<AdminOverview>;
  return {
    generated_at:
      typeof raw.generated_at === 'string' ? raw.generated_at : emptyOverview.generated_at,
    counts: { ...emptyOverview.counts, ...(raw.counts ?? {}) },
    moderation: { ...emptyOverview.moderation, ...(raw.moderation ?? {}) },
    operations: { ...emptyOverview.operations, ...(raw.operations ?? {}) },
  };
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

export const metadata = { title: 'Admin console' };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=/admin');

  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) notFound();

  const [overviewResult, auditResult] = await Promise.all([
    supabase.rpc('get_platform_admin_overview'),
    supabase.rpc('list_platform_admin_audit', { p_limit: 20 }),
  ]);
  const overviewData = overviewResult.data;
  const auditData = auditResult.data;
  const overview = parseOverview(overviewData);
  const audit = (auditData ?? []) as AuditEntry[];
  const environments = getAdminEnvironments();
  const currentEnvironment = getCurrentEnvironmentId();
  const quota = getStagingQuota();
  const stagingConnected = currentEnvironment === 'staging';
  const databasePercent = stagingConnected
    ? Math.min(
        (number(overview.operations.database_bytes) / (quota.databaseMb * 1024 * 1024)) * 100,
        100,
      )
    : null;
  const storagePercent = stagingConnected
    ? Math.min(
        (number(overview.operations.media_bytes) / (quota.storageGb * 1024 * 1024 * 1024)) * 100,
        100,
      )
    : null;

  return (
    <main className="page-shell admin-shell">
      <PageHeader backHref="/admin" backLabel="Back" />
      <nav className="parish-page-links" aria-label="Page links">
        <div className="nav-actions">
          <Link href="/admin/reviews">Review queue</Link>
          <Link href="/admin/reports">Reports & safety</Link>
          <Link href="/admin/customer-reviews">Review reports</Link>
          <form action={signOutAction}>
            <button className="text-button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <header className="page-heading compact-heading admin-heading">
        <p className="eyebrow">Parish Pass administration</p>
        <h1>Admin console</h1>
        <p>
          One read-only view of platform health, moderation, and environment guardrails. Destructive
          actions stay behind explicit tools and server-side admin checks.
        </p>
      </header>

      {(overviewResult.error || auditResult.error) && (
        <p className="notice-error">
          The admin schema is not fully available in this environment yet. Apply the latest Supabase
          migrations before treating these metrics as live.
          {overviewResult.error?.message ? ` Snapshot: ${overviewResult.error.message}` : ''}
        </p>
      )}

      <section className="admin-environment-grid" aria-label="Environments">
        {environments.map((environment) => (
          <article
            className={`admin-environment-card state-${environment.state}`}
            key={environment.id}
          >
            <div className="admin-card-heading">
              <div>
                <p className="eyebrow">{environment.id}</p>
                <h2>{environment.label}</h2>
              </div>
              <span className="admin-status-pill">
                {environment.state === 'current'
                  ? 'Connected'
                  : environment.state === 'configured'
                    ? 'Configured'
                    : 'Not connected'}
              </span>
            </div>
            <p>{environment.description}</p>
            <dl className="admin-details-list">
              <div>
                <dt>Web URL</dt>
                <dd>{environment.url ?? 'Add a deployment URL'}</dd>
              </div>
              <div>
                <dt>Supabase project</dt>
                <dd>
                  {environment.projectRef ??
                    (environment.id === 'local' ? 'Docker / CLI' : 'Not configured')}
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </section>

      <section className="admin-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Connected environment · {currentEnvironment}</p>
            <h2>Platform snapshot</h2>
          </div>
          <span className="muted">Updated {formatDate(overview.generated_at)}</span>
        </div>
        <div className="admin-metric-grid">
          <Metric label="Users" value={overview.counts.users} />
          <Metric label="Businesses" value={overview.counts.businesses} />
          <Metric label="Active businesses" value={overview.counts.active_businesses} />
          <Metric
            label="Pending review"
            value={overview.moderation.pending_businesses}
            tone="warning"
          />
          <Metric label="Open reports" value={overview.moderation.open_reports} tone="warning" />
          <Metric label="Scans · 24h" value={overview.counts.scan_attempts_24h} />
          <Metric label="Queued notifications" value={overview.operations.queued_notifications} />
          <Metric
            label="Failed notifications"
            value={overview.operations.failed_notifications}
            tone="danger"
          />
        </div>
      </section>

      <section className="admin-section admin-two-column">
        <article className="panel admin-panel" id="staging-usage">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Staging only</p>
              <h2>Free-tier protection</h2>
            </div>
            <span className="admin-status-pill admin-status-safe">
              {quota.billingLocked ? 'Billing lock on' : 'Guard disabled'}
            </span>
          </div>
          <p className="muted">
            The guard warns at {quota.warnPercent}% and is designed to hold optional staging usage
            at {quota.holdPercent}%. It never upgrades a plan or adds a payment method.
          </p>
          {!stagingConnected && (
            <p className="notice-error">
              Provider usage is not connected from this environment. Open the staging deployment to
              see live database and storage observations; egress and monthly active users still need
              a trusted provider usage feed.
            </p>
          )}
          <div className="admin-quota-list">
            <QuotaRow
              label="Database"
              detail={`${quota.databaseMb} MB free-tier reference`}
              percent={databasePercent}
              value={
                stagingConnected
                  ? formatBytes(number(overview.operations.database_bytes))
                  : 'Not connected'
              }
            />
            <QuotaRow
              label="Storage"
              detail={`${quota.storageGb} GB free-tier reference`}
              percent={storagePercent}
              value={
                stagingConnected
                  ? formatBytes(number(overview.operations.media_bytes))
                  : 'Not connected'
              }
            />
            <QuotaRow
              label="Egress"
              detail={`${quota.egressGb} GB free-tier reference`}
              percent={null}
              value="Provider metric pending"
            />
            <QuotaRow
              label="Monthly active users"
              detail={`${quota.monthlyActiveUsers.toLocaleString()} free-tier reference`}
              percent={null}
              value="Provider metric pending"
            />
          </div>
        </article>

        <article className="panel admin-panel" id="operations">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operations</p>
              <h2>Things that need attention</h2>
            </div>
          </div>
          <ul className="admin-checklist">
            <AdminCheck
              label="Business submissions"
              value={overview.moderation.pending_businesses}
              href="/admin/reviews"
            />
            <AdminCheck
              label="Open safety reports"
              value={overview.moderation.open_reports}
              href="/admin/reports"
            />
            <AdminCheck
              label="Failed notifications"
              value={overview.operations.failed_notifications}
            />
            <AdminCheck
              label="Media awaiting cleanup"
              value={overview.operations.media_pending_delete}
            />
            <AdminCheck
              label="Media still processing"
              value={overview.operations.media_processing}
            />
          </ul>
        </article>
      </section>

      <section className="admin-section" id="tools">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Admin tools</p>
            <h2>Control room</h2>
          </div>
        </div>
        <div className="admin-tool-grid">
          <AdminTool
            href="/admin/reviews"
            title="Business review queue"
            detail="Approve complete pages or return them with a correction request."
          />
          <AdminTool
            href="/admin/reports"
            title="Reports & safety"
            detail="Review customer reports and record a resolution or dismissal."
          />
          <AdminTool
            href="#operations"
            title="Notification operations"
            detail="Watch queued, failed, and expired delivery work."
          />
          <AdminTool
            href="#staging-usage"
            title="Environment & quotas"
            detail="Keep staging in the free tier with visible guardrails."
          />
          <AdminTool
            href="#audit-log"
            title="Admin audit log"
            detail="See the recent administrative actions taken by platform admins."
          />
          <AdminTool
            href="#access"
            title="Access & roles"
            detail="Review platform-admin access and plan least-privilege role controls next."
          />
        </div>
      </section>

      <section className="admin-section panel admin-panel" id="audit-log">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Traceability</p>
            <h2>Recent admin actions</h2>
          </div>
        </div>
        {audit.length ? (
          <ul className="admin-audit-list">
            {audit.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.action.replaceAll('_', ' ')}</strong>
                  <span>
                    {entry.actor_name} · {entry.target_type ?? 'platform'}
                  </span>
                </div>
                <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">
            <strong>No admin actions yet</strong>
            <span>Moderation decisions and future operational actions will appear here.</span>
          </div>
        )}
      </section>

      <section className="admin-section admin-access-note" id="access">
        <strong>Access is server-validated.</strong>
        <span>
          This console is available only to users in <code>platform_admins</code>. Provider secrets,
          service-role keys, and billing credentials never enter the browser.
        </span>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className={`admin-metric tone-${tone}`}>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </div>
  );
}

function QuotaRow({
  label,
  detail,
  percent,
  value,
}: {
  label: string;
  detail: string;
  percent: number | null;
  value: string;
}) {
  return (
    <div className="admin-quota-row">
      <div className="admin-quota-heading">
        <div>
          <strong>{label}</strong>
          <span>{detail}</span>
        </div>
        <strong>{value}</strong>
      </div>
      <div className="admin-progress-track" aria-label={`${label} usage`}>
        <span style={{ width: `${percent ?? 0}%` }} />
      </div>
      <small>
        {percent === null
          ? 'Waiting for a trusted provider usage snapshot.'
          : `${percent.toFixed(1)}% observed`}
      </small>
    </div>
  );
}

function AdminCheck({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <>
      <span>{label}</span>
      <strong>{value.toLocaleString()}</strong>
    </>
  );
  return href ? (
    <Link className="admin-check" href={href}>
      {content}
    </Link>
  ) : (
    <div className="admin-check">{content}</div>
  );
}

function AdminTool({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link className="admin-tool" href={href}>
      <strong>{title}</strong>
      <span>{detail}</span>
      <small>
        Open <AppIcon name="chevron-right" size={16} />
      </small>
    </Link>
  );
}
