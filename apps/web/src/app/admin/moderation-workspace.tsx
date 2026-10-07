'use client';
import { PageHeader } from '@/components/page-header';
import { adminSignOutAction } from './admin-auth-actions';
import { AppIcon } from '@/components/app-icon';
const queueIcons = {
  business: 'store',
  content_report: 'flag',
  pickup_review: 'shopping-bag',
  event_review: 'calendar-days',
} as const;
import Link from 'next/link';
import { useRef, useState } from 'react';
import {
  DEFAULT_RULES,
  normalizeRules,
  recommend,
  decisionGuidance,
  type RuleConfig,
} from '@/lib/admin/moderation-rules';
import {
  QUEUES,
  DECISION_LABELS,
  availableDecisions,
  type Decision,
  type ModerationRecord,
  type QueueFilters,
  type QueueSnapshot,
} from '@/lib/admin/moderation-types';
import { decideAction, loadQueueAction, loadRecordAction } from './moderation-actions';

const words = (value: string) => value.replaceAll('_', ' ');
const date = (value: string) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }) + ' UTC';

export function ModerationWorkspace({
  initial,
  initialFilters,
  initialError,
  demo,
  environment,
}: {
  initial: QueueSnapshot | null;
  initialFilters: QueueFilters;
  initialError: string | null;
  demo: boolean;
  environment?: string;
}) {
  const [snapshot, setSnapshot] = useState(initial);
  const [filters, setFilters] = useState(initialFilters);
  const [search, setSearch] = useState('');
  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState<string | null>(null);
  const [queueBusy, setQueueBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [rules, setRules] = useState<RuleConfig>(DEFAULT_RULES);
  const [showRules, setShowRules] = useState(false);
  const queueSequence = useRef(0);
  const detailSequence = useRef(0);
  const detailAnchor = useRef<HTMLElement>(null);
  const openCount = snapshot
    ? Object.values(snapshot.counts).reduce((sum, count) => sum + (count ?? 0), 0)
    : null;
  const flagged = snapshot?.records.filter((r) => recommend(r, rules).signals.length).length ?? 0;
  async function refreshQueue(next: QueueFilters) {
    const sequence = ++queueSequence.current;
    setQueueBusy(true);
    setError(null);
    let result: Awaited<ReturnType<typeof loadQueueAction>>;
    try {
      result = await loadQueueAction(next);
    } catch {
      result = { data: null, error: 'The queue request failed. Check the connection and retry.' };
    }
    if (sequence !== queueSequence.current) return;
    setQueueBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSnapshot(result.data);
    setFilters(next);
  }
  async function selectRecord(item: ModerationRecord, focus = true) {
    const sequence = ++detailSequence.current;
    setDetailBusy(true);
    setRecord(null);
    setError(null);
    let result: Awaited<ReturnType<typeof loadRecordAction>>;
    try {
      result = await loadRecordAction(item.kind, item.id);
    } catch {
      result = { data: null, error: 'The record request failed. Check the connection and retry.' };
    }
    if (sequence !== detailSequence.current) return;
    setDetailBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setRecord(result.data);
    if (focus) requestAnimationFrame(() => detailAnchor.current?.focus({ preventScroll: false }));
  }
  async function saveDecision(
    item: ModerationRecord,
    action: Decision,
    reason: string,
    requestId: string,
    privateNote: string,
  ) {
    setError(null);
    setNotice(null);
    let result: Awaited<ReturnType<typeof decideAction>>;
    try {
      result = await decideAction({
        kind: item.kind,
        id: item.id,
        action,
        reason,
        privateNote,
        revision: item.revision,
        requestId,
      });
    } catch {
      result = {
        data: null,
        error:
          'The decision response was interrupted. Retry the same decision or refresh its history before deciding again.',
      };
    }
    if (result.error) {
      setError(result.error);
      return false;
    }
    setNotice(
      result.data?.replayed
        ? 'This decision was already saved; no duplicate audit entry was created.'
        : 'Decision saved with its reason and before/after history.',
    );
    await refreshQueue(filters);
    await selectRecord(item, false);
    return true;
  }
  return (
    <>
      <div className="moderation-shared-header">
        <PageHeader />
      </div>
      {
        <div className="moderation-app">
          <a className="moderation-skip" href="#moderation-main">
            Skip to moderation queues
          </a>
          <aside className="moderation-sidebar">
            <div className="moderation-workspace-label">ADMINISTRATION</div>
            <nav aria-label="Moderation navigation">
              <button
                className={filters.kind === null ? 'is-current' : ''}
                aria-pressed={filters.kind === null}
                onClick={() => void refreshQueue({ ...filters, kind: null, offset: 0 })}
              >
                <span className="moderation-nav-icon">
                  <AppIcon name="shield-check" size={19} />
                </span>
                All moderation<span>{openCount ?? '—'}</span>
              </button>
              {QUEUES.map((queue, index) => (
                <button
                  key={queue.kind}
                  className={filters.kind === queue.kind ? 'is-current' : ''}
                  aria-pressed={filters.kind === queue.kind}
                  onClick={() => void refreshQueue({ ...filters, kind: queue.kind, offset: 0 })}
                >
                  <span className="moderation-nav-icon" aria-hidden="true">
                    <AppIcon name={queueIcons[queue.kind]} size={19} />
                  </span>
                  {queue.short}
                  <span>{snapshot ? (snapshot.counts[queue.kind] ?? 0) : '—'}</span>
                </button>
              ))}
            </nav>
            <div className="moderation-sidebar-bottom">
              <span className="moderation-environment">
                ● {demo ? 'Synthetic local' : (environment ?? 'Connected environment')}
              </span>
              <p>
                Human decisions.
                <br />A clear history of every change.
              </p>
              {!demo && (
                <>
                  <form action={adminSignOutAction}>
                    <button className="moderation-secondary" type="submit">
                      Sign out
                    </button>
                  </form>
                  <Link href="/admin/operations">
                    Platform health &amp; operations <AppIcon name="arrow-up-right" size={16} />
                  </Link>
                  <Link href="/account">
                    Return to account <AppIcon name="arrow-up-right" size={16} />
                  </Link>
                </>
              )}
            </div>
          </aside>
          <main id="moderation-main" className="moderation-main">
            {demo && (
              <div className="moderation-demo-banner">
                <strong>LOCAL SYNTHETIC FIXTURES</strong>
                <span>
                  No hosted records, email, push, or payments. Fixture evidence only; staging parity
                  is pending.
                </span>
              </div>
            )}
            <header className="moderation-heading">
              <div>
                <p className="eyebrow">Parish Pass / moderation</p>
                <h1>Moderation desk</h1>
                <p>Give every submission a careful, traceable decision.</p>
              </div>
              <button
                className="moderation-secondary"
                disabled={queueBusy}
                onClick={() => void refreshQueue(filters)}
              >
                <AppIcon name="refresh-cw" size={18} /> Refresh queues
              </button>
            </header>
            <section className="moderation-metrics" aria-label="Open queue counts">
              {QUEUES.map((queue, index) => (
                <button
                  key={queue.kind}
                  onClick={() =>
                    void refreshQueue({ ...filters, kind: queue.kind, state: 'open', offset: 0 })
                  }
                  aria-label={`${queue.label}: ${snapshot ? (snapshot.counts[queue.kind] ?? 0) : 'unavailable'} open`}
                >
                  <span className="moderation-metric-top">
                    <span className="moderation-metric-icon" aria-hidden="true">
                      <AppIcon name={queueIcons[queue.kind]} size={20} />
                    </span>
                    <span>OPEN</span>
                  </span>
                  <strong>{snapshot ? (snapshot.counts[queue.kind] ?? 0) : '—'}</strong>
                  <span>{queue.label}</span>
                </button>
              ))}
            </section>
            <div className="moderation-status-row">
              <span>
                <span className="moderation-safe-dot" />
                Recommendations only · automatic actions off
              </span>
              <button
                className="moderation-text-button"
                aria-expanded={showRules}
                aria-controls="rule-settings"
                onClick={() => setShowRules(!showRules)}
              >
                Rule settings <AppIcon name={showRules ? 'minus' : 'plus'} size={16} />
              </button>
            </div>
            {showRules && (
              <section
                id="rule-settings"
                className="moderation-rules"
                aria-label="Recommendation rule settings"
              >
                <div>
                  <h2>Recommendation rules</h2>
                  <p>
                    Deterministic checks flag cases for a human. Settings apply to this browser
                    session. They never approve, hide, ban, or delete.
                  </p>
                </div>
                <div className="moderation-rule-fields">
                  {(
                    [
                      ['missingData', 'Missing required data'],
                      ['duplicates', 'Structured duplicates / multiple reports'],
                      ['spam', 'Promotional patterns'],
                      ['bursts', 'Submission bursts'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={rules[key]}
                        onChange={(event) => setRules({ ...rules, [key]: event.target.checked })}
                      />
                      {label}
                    </label>
                  ))}
                  <label>
                    Link threshold
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={rules.maxLinks}
                      onChange={(event) =>
                        setRules(normalizeRules({ ...rules, maxLinks: Number(event.target.value) }))
                      }
                    />
                  </label>
                  <label>
                    Activity threshold
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={rules.burstThreshold}
                      onChange={(event) =>
                        setRules(
                          normalizeRules({ ...rules, burstThreshold: Number(event.target.value) }),
                        )
                      }
                    />
                  </label>
                </div>
                <button className="moderation-text-button" onClick={() => setRules(DEFAULT_RULES)}>
                  Reset rules to defaults
                </button>
              </section>
            )}
            {error && (
              <div role="alert" className="moderation-error">
                <strong>{error}</strong>
                <span>Loaded records and counts may be out of date. Refresh before deciding.</span>
                <button
                  onClick={() => (record ? void selectRecord(record) : void refreshQueue(filters))}
                >
                  Retry / refresh
                </button>
              </div>
            )}
            {notice && (
              <div role="status" className="moderation-success">
                {notice}
              </div>
            )}
            <div className="moderation-work-grid">
              <section
                className="moderation-queue"
                aria-label="Moderation queue"
                aria-busy={queueBusy}
              >
                <div className="moderation-section-heading">
                  <div>
                    <h2>
                      {QUEUES.find((q) => q.kind === filters.kind)?.label ?? 'All moderation'}
                    </h2>
                    <p>
                      {snapshot?.total ?? '—'} matching cases · {flagged} flagged on this page
                    </p>
                  </div>
                  <span>Oldest first</span>
                </div>
                <form
                  className="moderation-filters"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void refreshQueue({ ...filters, search, offset: 0 });
                  }}
                >
                  <label className="moderation-search">
                    <span className="moderation-sr-only">Search submissions and reports</span>
                    <input
                      type="search"
                      maxLength={120}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, content or reason…"
                    />
                  </label>
                  <button className="moderation-secondary" type="submit" disabled={queueBusy}>
                    Search
                  </button>
                  <label>
                    <span className="moderation-sr-only">Case status</span>
                    <select
                      value={filters.state}
                      onChange={(event) =>
                        void refreshQueue({
                          ...filters,
                          state: event.target.value as 'open' | 'all',
                          offset: 0,
                        })
                      }
                    >
                      <option value="open">Open cases</option>
                      <option value="all">All statuses</option>
                    </select>
                  </label>
                </form>
                <div className="moderation-table-heading" aria-hidden="true">
                  <span>RECORD / QUEUE</span>
                  <span>STATE</span>
                  <span>SUBMITTED</span>
                </div>
                <ul className="moderation-record-list">
                  {snapshot?.records.map((item) => {
                    const recommendation = recommend(item, rules);
                    const selected = record?.id === item.id && record.kind === item.kind;
                    return (
                      <li key={`${item.kind}:${item.id}`}>
                        <button
                          className={`moderation-record ${selected ? 'is-selected' : ''}`}
                          aria-pressed={selected}
                          aria-label={`Review ${item.title}, ${words(item.status)}`}
                          onClick={() => void selectRecord(item)}
                        >
                          <span className="moderation-record-name">
                            <strong>{item.title}</strong>
                            <span>{item.subtitle}</span>
                            {recommendation.signals.length > 0 && (
                              <span className="moderation-flag">
                                <AppIcon name="flag" size={14} /> {recommendation.signals.length}{' '}
                                recommendation flag{recommendation.signals.length === 1 ? '' : 's'}
                              </span>
                            )}
                          </span>
                          <span className={`moderation-pill state-${item.status}`}>
                            {words(item.status)}
                          </span>
                          <time dateTime={item.created_at}>{date(item.created_at)}</time>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {snapshot && !snapshot.records.length && !queueBusy && (
                  <div className="moderation-empty">
                    <strong>No cases match these filters.</strong>
                    <p>Try all statuses or a different search.</p>
                    <button
                      className="moderation-secondary"
                      onClick={() => {
                        setSearch('');
                        void refreshQueue({ kind: null, state: 'open', search: '', offset: 0 });
                      }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
                {!snapshot && !queueBusy && (
                  <div className="moderation-empty">
                    <strong>Queue data is unavailable.</strong>
                    <p>Refresh after checking the connected environment and migration.</p>
                  </div>
                )}
                <footer className="moderation-pagination">
                  <span>
                    {snapshot
                      ? `${snapshot.total === 0 ? 0 : snapshot.offset + 1}–${Math.min(snapshot.offset + snapshot.page_size, snapshot.total)} of ${snapshot.total}`
                      : 'No snapshot loaded'}
                  </span>
                  <div>
                    <button
                      disabled={queueBusy || !snapshot || filters.offset === 0}
                      onClick={() =>
                        void refreshQueue({ ...filters, offset: Math.max(0, filters.offset - 50) })
                      }
                    >
                      Previous
                    </button>
                    <button
                      disabled={queueBusy || !snapshot || filters.offset + 50 >= snapshot.total}
                      onClick={() => void refreshQueue({ ...filters, offset: filters.offset + 50 })}
                    >
                      Next
                    </button>
                  </div>
                </footer>
                {queueBusy && (
                  <p className="moderation-loading" role="status">
                    Loading moderation queues…
                  </p>
                )}
              </section>
              <section
                ref={detailAnchor}
                tabIndex={-1}
                className="moderation-detail"
                aria-label="Selected record detail"
                aria-busy={detailBusy}
              >
                {detailBusy ? (
                  <div className="moderation-empty" role="status">
                    Loading record and history…
                  </div>
                ) : record ? (
                  <>
                    <div className="moderation-detail-top">
                      <span className="eyebrow">{record.subtitle}</span>
                      <button
                        className="moderation-text-button"
                        onClick={() => {
                          ++detailSequence.current;
                          setRecord(null);
                        }}
                      >
                        Close
                      </button>
                    </div>
                    <h2>{record.title}</h2>
                    <div className="moderation-detail-badges">
                      <span className={`moderation-pill state-${record.status}`}>
                        {words(record.status)}
                      </span>
                      {record.content_status && record.kind !== 'business' && (
                        <span className="moderation-pill">Review {record.content_status}</span>
                      )}
                    </div>
                    <dl className="moderation-context">
                      <div>
                        <dt>Submitted</dt>
                        <dd>{date(record.created_at)}</dd>
                      </div>
                      {record.context.reporter && (
                        <div>
                          <dt>Reporter</dt>
                          <dd>{record.context.reporter}</dd>
                        </div>
                      )}
                      {record.context.rating && (
                        <div>
                          <dt>Rating</dt>
                          <dd>{record.context.rating} / 5 · verified review</dd>
                        </div>
                      )}
                      {record.context.address && (
                        <div>
                          <dt>Location</dt>
                          <dd>{record.context.address}</dd>
                        </div>
                      )}
                      {record.context.phone && (
                        <div>
                          <dt>Public phone</dt>
                          <dd>{record.context.phone}</dd>
                        </div>
                      )}
                      {record.context.email && (
                        <div>
                          <dt>Public email</dt>
                          <dd>{record.context.email}</dd>
                        </div>
                      )}
                      {record.context.target_type && (
                        <div>
                          <dt>Content type</dt>
                          <dd>{words(record.context.target_type)}</dd>
                        </div>
                      )}
                    </dl>
                    <div className="moderation-detail-section">
                      <h3>
                        {record.kind === 'business' ? 'Submitted description' : 'Reported content'}
                      </h3>
                      <blockquote>
                        {record.text || 'Star rating only. Review text is optional.'}
                      </blockquote>
                      {record.context.merchant_response && (
                        <p>
                          <strong>Business response:</strong> {record.context.merchant_response}
                        </p>
                      )}
                      {record.reason && (
                        <p>
                          <strong>Report reason:</strong> {words(record.reason)}
                        </p>
                      )}
                      {record.details && <p>{record.details}</p>}
                      {record.context.slug &&
                        /^[a-z0-9-]+$/.test(record.context.slug) &&
                        record.context.target_type !== 'event' &&
                        record.context.target_type !== 'offering_item' &&
                        !demo && (
                          <Link href={`/b/${record.context.slug}`} target="_blank" rel="noreferrer">
                            Open public business <AppIcon name="arrow-up-right" size={16} />
                          </Link>
                        )}
                    </div>
                    {record.readiness && (
                      <div className="moderation-detail-section">
                        <h3>Publication readiness</h3>
                        <ul className="moderation-readiness">
                          {record.readiness.checks.map((check) => (
                            <li
                              key={check.key}
                              className={check.complete === true ? 'complete' : 'incomplete'}
                            >
                              <AppIcon
                                name={check.complete === true ? 'circle-check' : 'circle'}
                                size={18}
                              />
                              <span>{check.label}</span>
                              <span className="moderation-sr-only">
                                {check.complete === true ? 'Complete' : 'Missing'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <RecommendationPanel record={record} rules={rules} />
                    {record.resolution_note && (
                      <div className="moderation-previous-note">
                        <strong>Latest feedback</strong>
                        <p>{record.resolution_note}</p>
                      </div>
                    )}
                    <DecisionForm
                      rules={rules}
                      key={`${record.kind}:${record.id}:${record.revision}`}
                      record={record}
                      onSave={saveDecision}
                    />
                    <div className="moderation-detail-section">
                      <div className="moderation-section-heading">
                        <h3>Decision history</h3>
                        <button
                          className="moderation-text-button"
                          onClick={() => void selectRecord(record, false)}
                        >
                          Refresh record
                        </button>
                      </div>
                      {record.history?.length ? (
                        <ol className="moderation-history">
                          {record.history.map((entry) => (
                            <li key={entry.id}>
                              <strong>{words(entry.action.replace(/^moderation_/, ''))}</strong>
                              <span>
                                {entry.actor} · {date(entry.created_at)}
                              </span>
                              <p>
                                {entry.details.reason ?? 'Legacy action without a recorded reason.'}
                              </p>
                              <small>
                                {entry.details.before?.status ?? 'Unknown'} →{' '}
                                {entry.details.after?.status ?? 'Unknown'}
                                {entry.details.after?.content_status
                                  ? ` / ${entry.details.after.content_status}`
                                  : ''}
                              </small>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="moderation-muted">
                          No central decisions recorded yet. Legacy per-review events may predate
                          this workspace.
                        </p>
                      )}
                    </div>
                    <small className="moderation-record-id">Case {record.id}</small>
                  </>
                ) : (
                  <div className="moderation-empty moderation-detail-empty">
                    <span aria-hidden="true">
                      <AppIcon name="file-text" size={26} />
                    </span>
                    <h2>A closer look, then a decision.</h2>
                    <p>
                      Select a case to inspect the submission, recommendation evidence, readiness
                      and decision history.
                    </p>
                    <small>
                      Every action is checked on the server and recorded in the audit log.
                    </small>
                  </div>
                )}
              </section>
            </div>
            <section className="moderation-operations">
              <h2>Merchant workflows</h2>
              <p>
                Operational visibility. Merchant teams handle these approvals and requests in their
                existing workspaces.
              </p>
              <div>
                <span>
                  <strong>{snapshot?.operations.service_requests ?? '—'}</strong> Service enquiries
                </span>
                <span>
                  <strong>{snapshot?.operations.order_requests ?? '—'}</strong> Order support
                  requests
                </span>
                <span>
                  <strong>{snapshot?.operations.appointments ?? '—'}</strong> Appointment review
                  cases
                </span>
              </div>
            </section>
            <footer className="moderation-footer">
              {snapshot ? `Last loaded ${date(snapshot.generated_at)} · ` : ''}Admin membership is
              verified on every read and decision.
            </footer>
          </main>
        </div>
      }
    </>
  );
}

function RecommendationPanel({ record, rules }: { record: ModerationRecord; rules: RuleConfig }) {
  const result = recommend(record, rules);
  return (
    <section className="moderation-recommendations" aria-label="Decision guidance">
      <div className="moderation-guidance-heading">
        <span className="eyebrow">Suggested next step</span>
        <span className="moderation-pill">
          {result.priority === 'prompt'
            ? 'Review promptly'
            : result.priority === 'attention'
              ? 'Needs attention'
              : 'Routine review'}
        </span>
      </div>
      <h3>{result.recommendation}</h3>
      <p className="moderation-next-step">{result.nextStep}</p>
      <ul className="moderation-why">
        {result.why.map((why, i) => (
          <li key={i}>{why}</li>
        ))}
      </ul>
      {result.missingInformation.length > 0 && (
        <div className="moderation-guidance-block">
          <h4>Information still needed</h4>
          <ul>
            {result.missingInformation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="moderation-evidence-summary">
        <div>
          <h4>{result.severity.label}</h4>
          <p>{result.severity.explanation}</p>
        </div>
        <div>
          <h4>{result.confidence.label}</h4>
          <p>{result.confidence.explanation}</p>
        </div>
      </div>
      {result.signals.length > 0 && (
        <details className="moderation-evidence">
          <summary>
            Inspect evidence · {result.signals.length} indicator
            {result.signals.length === 1 ? '' : 's'}
          </summary>
          <ul>
            {result.signals.map((signal) => (
              <li key={signal.rule}>
                <strong>{signal.label}</strong>
                <span className="moderation-source">
                  {words(signal.source)} · {signal.certainty}
                </span>
                <p>{signal.evidence}</p>
                <p>{signal.significance}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
      {result.uncertainty.length > 0 && (
        <div className="moderation-guidance-block">
          <h4>What we do not know yet</h4>
          <ul>
            {result.uncertainty.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="moderation-effect">
        <h4>If you save the suggestion</h4>
        <p>{result.change}</p>
        <h4>How to reverse it</h4>
        <p>{result.undo}</p>
      </div>
      {result.alternatives.length > 0 && (
        <details className="moderation-alternatives">
          <summary>Other available decisions</summary>
          {result.alternatives.map((item) => (
            <div key={item.action}>
              <h4>{item.label}</h4>
              <p>{item.when}</p>
              <p>
                <strong>Changes:</strong> {item.change}
              </p>
              <p>
                <strong>Reversal:</strong> {item.undo}
              </p>
            </div>
          ))}
        </details>
      )}
      <small>
        Guidance v{result.version}. A person must inspect the evidence and explicitly save every
        decision.
      </small>
    </section>
  );
}
function DecisionForm({
  record,
  rules,
  onSave,
}: {
  record: ModerationRecord;
  rules: RuleConfig;
  onSave: (
    record: ModerationRecord,
    action: Decision,
    reason: string,
    id: string,
    privateNote: string,
  ) => Promise<boolean>;
}) {
  const actions = availableDecisions(record),
    suggestion = recommend(record, rules);
  const [action, setAction] = useState<Decision | ''>(() =>
    suggestion.suggestedAction && actions.includes(suggestion.suggestedAction)
      ? suggestion.suggestedAction
      : '',
  );
  const [reason, setReason] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ key: string; id: string } | null>(null);
  if (!actions.length) return <p>No moderation action is available for this state.</p>;
  const guidance = action ? decisionGuidance(record, action) : null;
  const valid =
    !!action &&
    actions.includes(action) &&
    !(action === 'approve' && record.readiness?.ready !== true) &&
    reason.trim().length >= 10 &&
    reason.length <= 1000 &&
    privateNote.length <= 2000;
  return (
    <form
      className="moderation-decision"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || busy || !action) return;
        setBusy(true);
        const key = JSON.stringify([
          record.kind,
          record.id,
          record.revision,
          action,
          reason.trim(),
          privateNote.trim(),
        ]);
        if (pending.current?.key !== key) pending.current = { key, id: crypto.randomUUID() };
        try {
          if (await onSave(record, action, reason.trim(), pending.current.id, privateNote.trim())) {
            pending.current = null;
            setReason('');
            setPrivateNote('');
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="moderation-decision-heading">
        <h3>Your decision</h3>
        <span>Manual save required</span>
      </div>
      <label>
        Choose an action
        <select
          value={action}
          disabled={busy}
          required
          onChange={(event) => setAction(event.target.value as Decision | '')}
        >
          <option value="">Choose a decision</option>
          {actions.map((option) => (
            <option
              key={option}
              value={option}
              disabled={option === 'approve' && record.readiness?.ready !== true}
            >
              {DECISION_LABELS[option]}
            </option>
          ))}
        </select>
      </label>
      {guidance && (
        <div className="moderation-consequence" aria-live="polite">
          <strong>What this changes</strong>
          <p>{guidance.change}</p>
          <strong>Reversal</strong>
          <p>{guidance.undo}</p>
        </div>
      )}
      <label>
        Reason shown to the affected user
        <textarea
          minLength={10}
          maxLength={1000}
          required
          rows={4}
          value={reason}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain the outcome and the specific next step in plain language."
          aria-describedby="decision-reason-help"
        />
      </label>
      <small id="decision-reason-help">
        10–1000 characters · {reason.length}/1000. Keep private evidence and reporter details out of
        this message.
      </small>
      <label>
        Private admin note (never sent)
        <textarea
          maxLength={2000}
          rows={3}
          value={privateNote}
          disabled={busy}
          onChange={(event) => setPrivateNote(event.target.value)}
          placeholder="Optional context for the internal audit history."
          aria-describedby="private-note-help"
        />
      </label>
      <small id="private-note-help">
        Optional · {privateNote.length}/2000 characters. Only the public reason appears in the
        outcome alert.
      </small>
      <button className="moderation-primary" type="submit" disabled={!valid || busy}>
        {busy
          ? 'Saving decision…'
          : action
            ? 'Save ' + DECISION_LABELS[action].toLowerCase()
            : 'Save decision'}
      </button>
    </form>
  );
}
