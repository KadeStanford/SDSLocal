import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  createMobileModerationClient,
  ModerationFailure,
  parseCaseRoute,
  prepareDecision,
  type ModerationTransport,
} from './mobile-moderation-client';
import { DecisionAttempt } from './decision-attempt';
import { DEFAULT_RULES, recommend } from './moderation-rules';
import type { ModerationRecord } from './moderation-types';
import { guestCanOpenPath } from '../navigation-policy';
const admin = 'a0000000-0000-4000-8000-000000000001',
  other = 'a0000000-0000-4000-8000-000000000002';
const id = 'b0000000-0000-4000-8000-000000000001',
  requestId = 'd0000000-0000-4000-8000-000000000001';
const base: ModerationRecord = {
  kind: 'business',
  id,
  title: 'SYNTHETIC — Cypress Corner Cafe',
  subtitle: 'Synthetic fixture',
  status: 'pending_review',
  content_status: 'pending_review',
  created_at: '2026-10-06T09:00:00Z',
  text: 'A clearly fictional neighborhood cafe.',
  reason: null,
  details: null,
  resolution_note: null,
  revision: 'a'.repeat(32),
  readiness: {
    ready: true,
    checks: [{ key: 'contact', label: 'Contact details', complete: true }],
  },
  duplicates: 0,
  activity_count: 1,
  context: {},
};
const filters = { kind: null, state: 'open' as const, search: '', offset: 0 };
const snapshot = {
  records: [base],
  total: 1,
  offset: 0,
  page_size: 40,
  counts: { business: 1 },
  generated_at: '2026-10-06T09:00:00Z',
  operations: { service_requests: 0, order_requests: 0, appointments: 0 },
};
const success = {
  record: { ...base, status: 'active', revision: 'b'.repeat(32) },
  audit_id: 42,
  replayed: false,
  notification_state: 'inbox_available' as const,
};
function fixture() {
  let current: string | null = admin;
  const getUser = vi.fn(async () => ({
    data: { user: current ? { id: current } : null },
    error: null,
  }));
  const rpc = vi.fn(
    async (
      name: string,
      _args?: Record<string, unknown>,
    ): Promise<{ data: unknown; error: null | { code: string } }> => ({
      data:
        name === 'is_platform_admin'
          ? true
          : name === 'get_admin_moderation_snapshot'
            ? snapshot
            : name === 'get_admin_moderation_record'
              ? base
              : success,
      error: null,
    }),
  );
  const transport: ModerationTransport = { auth: { getUser }, rpc };
  return {
    client: createMobileModerationClient(transport, () => current),
    getUser,
    rpc,
    setAccount: (id: string | null) => {
      current = id;
    },
  };
}
describe('caller-bound mobile moderation', () => {
  it('does not request a role or queue for a signed-out caller', async () => {
    const f = fixture();
    f.setAccount(null);
    await expect(f.client.snapshot(null, filters)).rejects.toMatchObject({ kind: 'signed_out' });
    expect(f.getUser).not.toHaveBeenCalled();
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('denies a server-verified non-admin before reading a queue', async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: false, error: null });
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({ kind: 'denied' });
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith('is_platform_admin');
  });
  it('does not trust forged client/user metadata for role membership', async () => {
    const f = fixture();
    f.getUser.mockResolvedValue({
      data: { user: { id: admin, admin: true } as { id: string } },
      error: null,
    });
    f.rpc.mockResolvedValue({ data: false, error: null });
    await expect(f.client.checkAccess(admin)).rejects.toMatchObject({ kind: 'denied' });
  });
  it('fails closed on a failed membership lookup', async () => {
    const f = fixture();
    f.rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202' } });
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({ kind: 'unavailable' });
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it('denies an expired/revoked user response before any role or action call', async () => {
    const f = fixture();
    f.getUser.mockImplementation(async () => ({
      data: { user: null },
      error: { code: 'expired' } as never,
    }));
    await expect(
      f.client.decide(
        admin,
        prepareDecision(base, 'approve', 'Checked the synthetic profile.', '', requestId),
      ),
    ).rejects.toMatchObject({ kind: 'signed_out' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('rechecks membership after a prior allowed read', async () => {
    const f = fixture();
    await f.client.snapshot(admin, filters);
    f.rpc.mockResolvedValue({ data: false, error: null });
    await expect(f.client.record(admin, 'business', id)).rejects.toMatchObject({ kind: 'denied' });
    expect(f.rpc.mock.calls.filter((call) => call[0] === 'is_platform_admin')).toHaveLength(2);
    expect(
      f.rpc.mock.calls.filter((call) => call[0] === 'get_admin_moderation_record'),
    ).toHaveLength(0);
  });
  it('honors server action denial when membership is revoked after the client check', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) =>
      name === 'is_platform_admin'
        ? { data: true, error: null }
        : { data: null, error: { code: '42501' } },
    );
    await expect(
      f.client.decide(
        admin,
        prepareDecision(base, 'approve', 'Checked the synthetic profile.', '', requestId),
      ),
    ).rejects.toMatchObject({ kind: 'denied' });
  });
  it('rejects an account switch during membership lookup', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async () => {
      f.setAccount(other);
      return { data: true, error: null };
    });
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({
      kind: 'session_changed',
    });
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it('suppresses private results arriving after an account switch', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) => {
      if (name === 'is_platform_admin') return { data: true, error: null };
      f.setAccount(other);
      return { data: snapshot, error: null };
    });
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({
      kind: 'session_changed',
    });
  });
  it('rejects a server user that differs from the app account', async () => {
    const f = fixture();
    f.getUser.mockResolvedValue({ data: { user: { id: other } }, error: null });
    await expect(f.client.checkAccess(admin)).rejects.toMatchObject({ kind: 'session_changed' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('validates direct route parameters before network calls', async () => {
    const f = fixture();
    expect(parseCaseRoute(['business'], id)).toBeNull();
    expect(parseCaseRoute('business', 'bad-id')).toBeNull();
    expect(parseCaseRoute('delete_account', id)).toBeNull();
    await expect(f.client.record(admin, 'business', 'bad-id')).rejects.toMatchObject({
      kind: 'invalid',
    });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('rejects invalid pagination/search inputs before network calls', async () => {
    const f = fixture();
    await expect(f.client.snapshot(admin, { ...filters, offset: -1 })).rejects.toMatchObject({
      kind: 'invalid',
    });
    await expect(
      f.client.snapshot(admin, { ...filters, search: 'x'.repeat(121) }),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('supports empty queues with verified admin access', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) => ({
      data:
        name === 'is_platform_admin' ? true : { ...snapshot, records: [], total: 0, counts: {} },
      error: null,
    }));
    const result = await f.client.snapshot(admin, filters);
    expect(result.total).toBe(0);
    expect(result.records).toEqual([]);
  });
  it('rejects malformed queue results instead of rendering unknown data', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) => ({
      data:
        name === 'is_platform_admin'
          ? true
          : { ...snapshot, records: [{ ...base, revision: 'invalid' }] },
      error: null,
    }));
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it('returns a readable unavailable state when new queue RPCs are absent', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) =>
      name === 'is_platform_admin'
        ? { data: true, error: null }
        : { data: null, error: { code: 'PGRST202' } },
    );
    await expect(f.client.snapshot(admin, filters)).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it('maps exact record and decision RPC argument names', async () => {
    const f = fixture();
    await f.client.record(admin, 'business', id);
    expect(f.rpc).toHaveBeenLastCalledWith('get_admin_moderation_record', {
      p_kind: 'business',
      p_id: id,
    });
    const input = prepareDecision(
      base,
      'approve',
      'Checked the synthetic profile.',
      'Private fixture note.',
      requestId,
    );
    await f.client.decide(admin, input);
    expect(f.rpc).toHaveBeenLastCalledWith('admin_moderation_action', {
      p_kind: 'business',
      p_id: id,
      p_action: 'approve',
      p_reason: input.reason,
      p_expected_revision: base.revision,
      p_request_id: requestId,
      p_private_note: input.privateNote,
    });
  });
  it('denies mobile admin routes under the existing guest navigation policy', () => {
    expect(guestCanOpenPath('/admin-moderation')).toBe(false);
    expect(guestCanOpenPath('/admin-moderation-case')).toBe(false);
  });
});
describe('manual decisions and uncertain retries', () => {
  it('requires a meaningful public reason and bounded private note', () => {
    expect(() => prepareDecision(base, 'approve', 'too short', '', requestId)).toThrow();
    expect(() =>
      prepareDecision(base, 'approve', 'Checked this profile.', 'x'.repeat(2001), requestId),
    ).toThrow();
  });
  it('blocks approval when mandatory readiness fails even if suggestion rules are off', () => {
    const record = {
      ...base,
      readiness: { ready: false, checks: [{ key: 'contact', label: 'Contact', complete: false }] },
    };
    expect(() =>
      prepareDecision(record, 'approve', 'Checked this profile.', '', requestId),
    ).toThrow();
    expect(recommend(record, { ...DEFAULT_RULES, missingData: false }).suggestedAction).toBe(
      'request_info',
    );
  });
  it('does not offer an unavailable transition as a manual action', () => {
    expect(() =>
      prepareDecision(
        { ...base, status: 'active' },
        'approve',
        'Checked this profile.',
        '',
        requestId,
      ),
    ).toThrow();
  });
  it('freezes the reason, private note, revision and request ID', () => {
    const input = prepareDecision(
      base,
      'approve',
      '  Checked the profile.  ',
      '  Private evidence.  ',
      requestId,
    );
    expect(Object.isFrozen(input)).toBe(true);
    expect(input.reason).toBe('Checked the profile.');
    expect(input.privateNote).toBe('Private evidence.');
    expect(input.revision).toBe(base.revision);
  });
  it('repeated taps share one in-flight send', async () => {
    let finish!: (value: typeof success) => void;
    const send = vi.fn(
      () =>
        new Promise<typeof success>((resolve) => {
          finish = resolve;
        }),
    );
    const attempt = new DecisionAttempt(send, () => admin);
    const input = prepareDecision(base, 'approve', 'Checked this profile.', '', requestId);
    const first = attempt.submit(input),
      second = attempt.submit(input);
    expect(first).toBe(second);
    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(1);
    finish(success);
    await first;
    expect(attempt.payload).toBeNull();
  });
  it('retries the exact payload after an uncertain network result and blocks edits', async () => {
    const input = prepareDecision(
      base,
      'approve',
      'Checked this profile.',
      'Private evidence.',
      requestId,
    );
    const send = vi
      .fn()
      .mockRejectedValueOnce(new ModerationFailure('uncertain', 'network'))
      .mockResolvedValueOnce({ ...success, replayed: true });
    const attempt = new DecisionAttempt(send, () => admin);
    await expect(attempt.submit(input)).rejects.toMatchObject({ kind: 'uncertain' });
    expect(attempt.payload).toBe(input);
    await expect(
      attempt.submit({ ...input, reason: 'A changed public reason.' }),
    ).rejects.toMatchObject({ kind: 'uncertain' });
    await attempt.retry();
    expect(send.mock.calls[0]?.[1]).toBe(input);
    expect(send.mock.calls[1]?.[1]).toBe(input);
    expect(attempt.payload).toBeNull();
  });
  it('requires refresh after stale revision conflict and clears the rejected attempt', async () => {
    const send = vi.fn().mockRejectedValue(new ModerationFailure('stale', 'changed'));
    const attempt = new DecisionAttempt(send, () => admin);
    await expect(
      attempt.submit(prepareDecision(base, 'approve', 'Checked this profile.', '', requestId)),
    ).rejects.toMatchObject({ kind: 'stale' });
    expect(attempt.payload).toBeNull();
    expect(attempt.awaitingConfirmation).toBe(false);
  });
  it('does not blindly replay a privacy-redacted/invalid historical request', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) =>
      name === 'is_platform_admin'
        ? { data: true, error: null }
        : { data: null, error: { code: '22023' } },
    );
    const attempt = new DecisionAttempt(f.client.decide, () => admin);
    await expect(
      attempt.submit(prepareDecision(base, 'approve', 'Checked this profile.', '', requestId)),
    ).rejects.toMatchObject({ kind: 'invalid' });
    expect(attempt.payload).toBeNull();
  });
  it('treats a malformed decision response as uncertain rather than claiming success', async () => {
    const f = fixture();
    f.rpc.mockImplementation(async (name) => ({
      data: name === 'is_platform_admin' ? true : { audit_id: 42 },
      error: null,
    }));
    await expect(
      f.client.decide(
        admin,
        prepareDecision(base, 'approve', 'Checked this profile.', '', requestId),
      ),
    ).rejects.toMatchObject({ kind: 'uncertain' });
  });
  it('keeps all recommendation rules in manual mode with no transport side effects', () => {
    const f = fixture();
    const result = recommend({
      ...base,
      duplicates: 1,
      text: 'crypto giveaway https://example.invalid/a',
    });
    expect(result.automaticAction).toBe(false);
    expect(result.suggestedAction).toBe('request_info');
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('uses byte-identical frozen web rule and type contracts without bundling the web portal', () => {
    const frozen = {
      'moderation-types.ts': 'f3acc8f186ba20ab9043bc9d46a7d4615e308fdfc1a76a871a2d48b5a1c171fe',
      'moderation-rules.ts': 'ade7c5bc7f737bcc64ab07135bd7ee1c3464321c07efa15df67d391bc4f348c1',
    };
    for (const [name, expected] of Object.entries(frozen)) {
      expect(createHash('sha256').update(readFileSync(path.resolve(import.meta.dirname, name))).digest('hex')).toBe(expected);
    }
  });
});
