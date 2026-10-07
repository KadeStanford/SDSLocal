import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { demoConfigured, fixtureRpc, hasDemoSession } from './demo';
import {
  QUEUES,
  type Decision,
  type DecisionResult,
  type ModerationRecord,
  type QueueFilters,
  type QueueSnapshot,
} from './moderation-types';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function adminClient() {
  const client = await createClient();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error('Sign in to an administrator account.');
  const admin = await client.rpc('is_platform_admin');
  if (admin.error || admin.data !== true) throw new Error('Administrator access required.');
  return client;
}
export async function requireAdminPage() {
  if (demoConfigured()) {
    if (!(await hasDemoSession())) redirect('/admin/demo');
    return;
  }
  const client = await createClient();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) redirect('/admin/login');
  const admin = await client.rpc('is_platform_admin');
  if (admin.error || admin.data !== true) redirect('/admin/login');
}
function kindValid(kind: unknown) {
  return QUEUES.some((q) => q.kind === kind);
}
export async function queueSnapshot(filters: QueueFilters): Promise<QueueSnapshot> {
  if (
    (filters.kind !== null && !kindValid(filters.kind)) ||
    !['open', 'all'].includes(filters.state) ||
    typeof filters.search !== 'string' ||
    filters.search.length > 120 ||
    !Number.isInteger(filters.offset) ||
    filters.offset < 0
  )
    throw new Error('Invalid queue filters.');
  if (demoConfigured())
    return fixtureRpc('snapshot', [filters.kind, filters.state, filters.search, filters.offset]);
  const client = await adminClient();
  const result = await client.rpc('get_admin_moderation_snapshot', {
    p_kind: filters.kind,
    p_state: filters.state,
    p_search: filters.search,
    p_offset: filters.offset,
  });
  if (result.error)
    throw new Error(
      'The moderation queues are unavailable. Verify the admin migration is applied to this environment.',
    );
  return result.data as QueueSnapshot;
}
export async function moderationRecord(kind: string, id: string): Promise<ModerationRecord> {
  if (!kindValid(kind) || !UUID.test(id)) throw new Error('Invalid record.');
  if (demoConfigured()) return fixtureRpc('record', [kind, id]);
  const client = await adminClient();
  const result = await client.rpc('get_admin_moderation_record', { p_kind: kind, p_id: id });
  if (result.error) throw new Error('This record could not load. Refresh the queue and try again.');
  return result.data as ModerationRecord;
}
export async function makeDecision(input: {
  kind: string;
  id: string;
  action: Decision;
  reason: string;
  revision: string;
  requestId: string;
  privateNote?: string;
}) {
  if (process.env.PARISH_ADMIN_LOGIN_ONLY === '1') throw new Error('Moderation is awaiting staging activation.');
  if (
    !kindValid(input.kind) ||
    !UUID.test(input.id) ||
    !UUID.test(input.requestId) ||
    !/^[a-f0-9]{32}$/.test(input.revision) ||
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 10 ||
    input.reason.length > 1000 ||
    (input.privateNote !== undefined &&
      (typeof input.privateNote !== 'string' || input.privateNote.length > 2000))
  )
    throw new Error(
      'A public reason of 10-1000 characters and private notes of at most 2000 characters are required.',
    );
  if (demoConfigured())
    return fixtureRpc<DecisionResult>('action', [
      input.kind,
      input.id,
      input.action,
      input.reason,
      input.revision,
      input.requestId,
      input.privateNote ?? null,
    ]);
  const client = await adminClient();
  const result = await client.rpc('admin_moderation_action', {
    p_kind: input.kind,
    p_id: input.id,
    p_action: input.action,
    p_reason: input.reason,
    p_expected_revision: input.revision,
    p_request_id: input.requestId,
    p_private_note: input.privateNote ?? null,
  });
  if (result.error) {
    if (result.error.code === '40001')
      throw new Error('This record changed. Refresh it before deciding.');
    if (result.error.code === '22023')
      throw new Error(
        'This decision is not available. Check readiness, refresh the record, and try again.',
      );
    throw new Error(
      'The decision could not be saved. Retry the same decision or refresh to inspect its history.',
    );
  }
  return result.data as DecisionResult;
}
