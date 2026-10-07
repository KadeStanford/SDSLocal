import {
  QUEUES,
  availableDecisions,
  type Decision,
  type DecisionResult,
  type ModerationRecord,
  type QueueFilters,
  type QueueKind,
  type QueueSnapshot,
} from './moderation-types';
import type {BackupStatus,BackupRun,BackupSettings,BackupEntry} from './backup-types';

export interface RpcFailure {
  code?: string | undefined;
  message?: string | undefined;
  status?: number | undefined;
}
export interface ModerationTransport {
  auth: {
    getUser(): PromiseLike<{ data: { user: { id: string } | null }; error: RpcFailure | null }>;
  };
  rpc(
    name: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: RpcFailure | null }>;
}
export type FailureKind =
  'signed_out' | 'denied' | 'session_changed' | 'unavailable' | 'invalid' | 'stale' | 'uncertain';
export class ModerationFailure extends Error {
  constructor(
    public readonly kind: FailureKind,
    message: string,
  ) {
    super(message);
    this.name = 'ModerationFailure';
  }
}
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isQueueKind(value: unknown): value is QueueKind {
  return QUEUES.some((queue) => queue.kind === value);
}
export function parseCaseRoute(kind: unknown, id: unknown): { kind: QueueKind; id: string } | null {
  return isQueueKind(kind) && typeof id === 'string' && UUID.test(id) ? { kind, id } : null;
}
export interface DecisionPayload {
  readonly kind: QueueKind;
  readonly id: string;
  readonly action: Decision;
  readonly reason: string;
  readonly revision: string;
  readonly requestId: string;
  readonly privateNote: string | null;
}
export function prepareDecision(
  record: ModerationRecord,
  action: Decision,
  reason: string,
  privateNote: string,
  requestId: string,
): DecisionPayload {
  const publicReason = reason.trim(),
    note = privateNote.trim();
  if (
    !parseCaseRoute(record.kind, record.id) ||
    !UUID.test(requestId) ||
    !/^[a-f0-9]{32}$/.test(record.revision)
  )
    throw new ModerationFailure('invalid', 'Refresh this case before deciding.');
  if (!availableDecisions(record).includes(action))
    throw new ModerationFailure(
      'invalid',
      'This decision is no longer available. Refresh the case.',
    );
  if (publicReason.length < 10 || reason.length > 1000 || privateNote.length > 2000)
    throw new ModerationFailure(
      'invalid',
      'Enter a public reason of 10–1000 characters. Private notes can be up to 2000 characters.',
    );
  if (
    action === 'approve' &&
    (record.readiness?.ready !== true ||
      record.readiness.checks.some((check) => check.complete !== true))
  )
    throw new ModerationFailure(
      'invalid',
      'Complete the required publication checks before approving.',
    );
  return Object.freeze({
    kind: record.kind,
    id: record.id,
    action,
    reason: publicReason,
    revision: record.revision,
    requestId,
    privateNote: note || null,
  });
}
function recordValid(value: unknown): value is ModerationRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ModerationRecord>;
  return (
    !!parseCaseRoute(record.kind, record.id) &&
    typeof record.title === 'string' &&
    typeof record.status === 'string' &&
    typeof record.revision === 'string' &&
    /^[a-f0-9]{32}$/.test(record.revision) &&
    typeof record.text === 'string' &&
    typeof record.subtitle === 'string' &&
    typeof record.created_at === 'string' &&
    !!record.context &&
    typeof record.context === 'object' &&
    typeof record.duplicates === 'number' &&
    typeof record.activity_count === 'number' &&
    (record.history === undefined || Array.isArray(record.history))
  );
}
/** Never creates a client/key or trusts user metadata. The app's existing session supplies the caller. */
export function createMobileModerationClient(
  transport: ModerationTransport,
  currentAccountId: () => string | null,
) {
  function assertScope(expected: string) {
    if (currentAccountId() !== expected)
      throw new ModerationFailure(
        'session_changed',
        'Your account changed. Open Admin again from Account.',
      );
  }
  async function checkAccess(expected: string | null): Promise<string> {
    if (!expected)
      throw new ModerationFailure('signed_out', 'Sign in again in Account to continue.');
    assertScope(expected);
    let auth;
    try {
      auth = await transport.auth.getUser();
    } catch {
      throw new ModerationFailure(
        'unavailable',
        'Administrator access could not be checked. Try again.',
      );
    }
    assertScope(expected);
    if (auth.error || !auth.data.user)
      throw new ModerationFailure(
        'signed_out',
        'Your session could not be verified. Sign in again in Account.',
      );
    if (auth.data.user.id !== expected)
      throw new ModerationFailure(
        'session_changed',
        'Your account changed. Open Admin again from Account.',
      );
    let role;
    try {
      role = await transport.rpc('is_platform_admin');
    } catch {
      throw new ModerationFailure(
        'unavailable',
        'Administrator access could not be checked. Try again.',
      );
    }
    assertScope(expected);
    if (role.error)
      throw new ModerationFailure(
        role.error.code === '42501' ? 'denied' : 'unavailable',
        'Administrator access could not be verified. Try again from Account.',
      );
    if (role.data !== true)
      throw new ModerationFailure('denied', 'Administrator access is required.');
    return expected;
  }
  async function checkedRpc(
    expected: string | null,
    name: string,
    args: Record<string, unknown>,
    decision = false,
  ) {
    const verified = await checkAccess(expected);
    assertScope(verified);
    let response;
    try {
      response = await transport.rpc(name, args);
    } catch {
      throw new ModerationFailure(
        decision ? 'uncertain' : 'unavailable',
        decision
          ? 'The result could not be confirmed. Retry this same decision or refresh its history.'
          : 'This information could not load. Try again.',
      );
    }
    assertScope(verified);
    if (response.error) {
      if (response.error.code === '42501')
        throw new ModerationFailure(
          'denied',
          'Administrator access is required. Open Account to check your access.',
        );
      if (response.error.code === '40001')
        throw new ModerationFailure(
          'stale',
          'This case changed. Refresh it before making a new decision.',
        );
      if (['22023', 'P0002'].includes(response.error.code ?? ''))
        throw new ModerationFailure(
          'invalid',
          'This decision or case is unavailable. Refresh its history before continuing.',
        );
      throw new ModerationFailure(
        decision ? 'uncertain' : 'unavailable',
        decision
          ? 'The result could not be confirmed. Retry this same decision or refresh its history.'
          : 'The moderation workspace is unavailable. Try again shortly.',
      );
    }
    return response.data;
  }
  return {
    checkAccess,
    async backupStatus(expected:string|null):Promise<BackupStatus>{
      const value=await checkedRpc(expected,'get_moderation_backup_status',{});
      return validateBackupStatus(value);
    },
    async previewBackup(expected:string|null,requestId:string):Promise<BackupRun>{
      if(!UUID.test(requestId))throw new ModerationFailure('invalid','Invalid backup check.');
      const value=await checkedRpc(expected,'run_moderation_backup',{p_apply:false,p_request_id:requestId,p_limit:50});
      if(!backupRunValid(value))
        throw new ModerationFailure('unavailable','The backup check response could not be read.');
      return value as BackupRun;
    },
    async configureBackup(expected:string|null,input:BackupSettings):Promise<BackupStatus>{
      if(!['off','dry_run','enabled'].includes(input.mode)||typeof input.missing!=='boolean'||typeof input.spam!=='boolean'||typeof input.flags!=='boolean'
        ||!UUID.test(input.requestId)||!/^[a-f0-9]{32}$/.test(input.revision)||typeof input.reason!=='string'||input.reason.trim().length<10||input.reason.length>1000)
        throw new ModerationFailure('invalid','Check the backup settings and enter a reason of 10-1000 characters.');
      const value=await checkedRpc(expected,'configure_moderation_backup',{p_mode:input.mode,p_missing:input.missing,p_spam:input.spam,p_flags:input.flags,
        p_expected_revision:input.revision,p_request_id:input.requestId,p_reason:input.reason.trim()},true);
      try{return validateBackupStatus(value);}catch{throw new ModerationFailure('uncertain','The settings response was not confirmed. Retry the same settings or refresh status.');}
    },
    async snapshot(expected: string | null, filters: QueueFilters): Promise<QueueSnapshot> {
      if (
        (filters.kind !== null && !isQueueKind(filters.kind)) ||
        !['open', 'all'].includes(filters.state) ||
        typeof filters.search !== 'string' ||
        filters.search.length > 120 ||
        !Number.isInteger(filters.offset) ||
        filters.offset < 0
      )
        throw new ModerationFailure('invalid', 'Check the queue filters and try again.');
      const data = await checkedRpc(expected, 'get_admin_moderation_snapshot', {
        p_kind: filters.kind,
        p_state: filters.state,
        p_search: filters.search,
        p_offset: filters.offset,
      });
      const snapshot = data as QueueSnapshot | null;
      if (
        !snapshot ||
        !Array.isArray(snapshot.records) ||
        !snapshot.records.every(recordValid) ||
        !Number.isInteger(snapshot.total) ||
        snapshot.total < 0 ||
        !snapshot.counts ||
        typeof snapshot.counts !== 'object' ||
        !Number.isInteger(snapshot.page_size) ||
        snapshot.page_size < 1
      )
        throw new ModerationFailure(
          'unavailable',
          'The queue response could not be read. Refresh and try again.',
        );
      return snapshot;
    },
    async record(expected: string | null, kind: unknown, id: unknown): Promise<ModerationRecord> {
      const route = parseCaseRoute(kind, id);
      if (!route)
        throw new ModerationFailure('invalid', 'This case link is invalid. Return to the queues.');
      const data = await checkedRpc(expected, 'get_admin_moderation_record', {
        p_kind: route.kind,
        p_id: route.id,
      });
      if (!recordValid(data) || data.kind !== route.kind || data.id !== route.id)
        throw new ModerationFailure(
          'unavailable',
          'This case could not load. Refresh and try again.',
        );
      return data;
    },
    async decide(expected: string | null, input: DecisionPayload): Promise<DecisionResult> {
      if (
        !parseCaseRoute(input.kind, input.id) ||
        !UUID.test(input.requestId) ||
        !/^[a-f0-9]{32}$/.test(input.revision) ||
        !input.reason ||
        input.reason.trim().length < 10 ||
        input.reason.length > 1000 ||
        (input.privateNote !== null &&
          (typeof input.privateNote !== 'string' || input.privateNote.length > 2000))
      )
        throw new ModerationFailure(
          'invalid',
          'Check the decision and public reason before continuing.',
        );
      const data = await checkedRpc(
        expected,
        'admin_moderation_action',
        {
          p_kind: input.kind,
          p_id: input.id,
          p_action: input.action,
          p_reason: input.reason,
          p_expected_revision: input.revision,
          p_request_id: input.requestId,
          p_private_note: input.privateNote,
        },
        true,
      );
      const result = data as DecisionResult | null;
      if (
        !result ||
        !recordValid(result.record) ||
        result.record.kind !== input.kind ||
        result.record.id !== input.id ||
        typeof result.replayed !== 'boolean' ||
        !Number.isInteger(result.audit_id) ||
        !['inbox_available', 'no_account', 'not_an_outcome'].includes(result.notification_state)
      )
        throw new ModerationFailure(
          'uncertain',
          'The saved result could not be confirmed. Retry this same decision or refresh its history.',
        );
      return result;
    },
  };
}
export type MobileModerationClient = ReturnType<typeof createMobileModerationClient>;
function validateBackupStatus(value:unknown):BackupStatus {
  const data=value as BackupStatus|null,p=data?.policy;
  if(!data||!p||!['off','dry_run','enabled'].includes(p.mode)||typeof p.revision!=='string'||!/^[a-f0-9]{32}$/.test(p.revision)
    ||typeof p.missing_information!=='boolean'||typeof p.promotional_reviews!=='boolean'||typeof p.internal_flags!=='boolean'
    ||typeof p.version!=='string'||!p.version||typeof p.updated_at!=='string'||!Number.isFinite(Date.parse(p.updated_at))
    ||!Array.isArray(data.runs)||!data.runs.every(backupRunValid)||!Number.isInteger(data.handled)||data.handled<0
    ||(data.worker_status!==undefined&&!['not_seen','recent','stale'].includes(data.worker_status))
    ||(data.last_run_at!==undefined&&data.last_run_at!==null&&(typeof data.last_run_at!=='string'||!Number.isFinite(Date.parse(data.last_run_at)))))
    throw new ModerationFailure('unavailable','Backup settings could not load in this environment.');
  return data;
}
function backupEntryValid(value:unknown):value is BackupEntry {
  if(!value||typeof value!=='object')return false;
  const entry=value as Partial<BackupEntry>;
  return isQueueKind(entry.kind)&&typeof entry.id==='string'&&UUID.test(entry.id)
    &&typeof entry.rule==='string'&&entry.rule.length>0
    &&typeof entry.action==='string'&&['flag','hide','request_info'].includes(entry.action)
    &&typeof entry.reason==='string'&&typeof entry.applied==='boolean'
    &&!!entry.evidence&&typeof entry.evidence==='object'&&!Array.isArray(entry.evidence)
    &&Object.values(entry.evidence).every(item=>typeof item==='number'&&Number.isFinite(item)
      ||Array.isArray(item)&&item.every(text=>typeof text==='string'));
}
function backupRunValid(value:unknown):value is BackupRun {
  if(!value||typeof value!=='object')return false;
  const run=value as Partial<BackupRun>;
  return typeof run.request_id==='string'&&UUID.test(run.request_id)
    &&typeof run.mode==='string'&&['off','dry_run','enabled'].includes(run.mode)
    &&typeof run.version==='string'&&run.version.length>0&&typeof run.dry_run==='boolean'
    &&[run.scanned,run.applied,run.flagged,run.manual_overrides].every(n=>typeof n==='number'&&Number.isInteger(n)&&n>=0)
    &&Array.isArray(run.entries)&&run.entries.every(backupEntryValid)
    &&(run.replayed===undefined||typeof run.replayed==='boolean')
    &&(run.busy===undefined||typeof run.busy==='boolean');
}
