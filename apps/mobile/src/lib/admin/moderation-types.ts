export const QUEUES = [
  {
    kind: 'business',
    label: 'Business submissions',
    short: 'Businesses',
    description: 'Profiles awaiting publication',
  },
  {
    kind: 'content_report',
    label: 'Content reports',
    short: 'Content reports',
    description: 'Business, event and offering safety',
  },
  {
    kind: 'pickup_review',
    label: 'Pickup review reports',
    short: 'Pickup reviews',
    description: 'Reviews from completed orders',
  },
  {
    kind: 'event_review',
    label: 'Event review reports',
    short: 'Event reviews',
    description: 'Reviews from verified attendance',
  },
] as const;
export type QueueKind = (typeof QUEUES)[number]['kind'];
export interface AuditEntry {
  id: number;
  action: string;
  created_at: string;
  actor: string;
  details: {
    reason?: string;
    private_note?: string | null;
    notification_state?: NotificationState;
    before?: Partial<ModerationRecord>;
    after?: Partial<ModerationRecord>;
    synthetic?: boolean;
    automation?: {version: string; rule: string; evidence: Record<string, number | string[]>};
  };
}
export interface ModerationRecord {
  kind: QueueKind;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  content_status: string | null;
  created_at: string;
  text: string;
  reason: string | null;
  details: string | null;
  resolution_note: string | null;
  revision: string;
  readiness: {
    ready: boolean;
    checks: { key: string; label: string; complete: boolean | null }[];
  } | null;
  duplicates: number;
  activity_count: number;
  context: {
    slug?: string;
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
    target_type?: string;
    target_id?: string;
    rating?: number;
    merchant_response?: string;
    reporter?: string;
    submitted_at?: string;
    reviewed_at?: string;
    updated_at?: string;
    outcome_recipient?: 'account' | 'no_account';
  };
  history?: AuditEntry[];
}
export interface QueueFilters {
  kind: QueueKind | null;
  state: 'open' | 'all';
  search: string;
  offset: number;
}
export interface QueueSnapshot {
  records: ModerationRecord[];
  total: number;
  offset: number;
  page_size: number;
  counts: Partial<Record<QueueKind, number>>;
  generated_at: string;
  operations: { service_requests: number; order_requests: number; appointments: number };
}
export type Decision =
  | 'approve'
  | 'reject'
  | 'request_info'
  | 'reopen'
  | 'resolve'
  | 'dismiss'
  | 'start_review'
  | 'hide'
  | 'restore';
export type NotificationState = 'inbox_available' | 'no_account' | 'not_an_outcome';
export interface DecisionResult {
  replayed: boolean;
  record: ModerationRecord;
  audit_id: number;
  notification_count?: number;
  notification_state: NotificationState;
}
export const DECISION_LABELS: Record<Decision, string> = {
  approve: 'Approve business',
  reject: 'Return with rejection',
  request_info: 'Request information',
  reopen: 'Reopen case',
  resolve: 'Resolve report',
  dismiss: 'Dismiss report',
  start_review: 'Start review',
  hide: 'Hide review',
  restore: 'Restore review',
};
export function availableDecisions(record: ModerationRecord): Decision[] {
  if (record.kind === 'business')
    return record.status === 'pending_review'
      ? ['approve', 'request_info', 'reject']
      : ['draft', 'active'].includes(record.status)
        ? ['reopen']
        : [];
  if (record.kind === 'content_report')
    return record.status === 'open'
      ? ['start_review', 'resolve', 'dismiss']
      : record.status === 'reviewing'
        ? ['resolve', 'dismiss', 'reopen']
        : ['reopen'];
  const result: Decision[] = record.status === 'open' ? ['hide', 'dismiss'] : ['reopen'];
  if (record.content_status === 'hidden' || record.content_status === 'removed')
    result.push('restore');
  return result;
}
