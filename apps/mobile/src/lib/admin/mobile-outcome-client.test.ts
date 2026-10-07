import { describe, expect, it, vi } from 'vitest';
import { createMobileOutcomeClient } from './mobile-outcome-client';
import { parseModerationOutcome } from './moderation-outcome-contract';
const owner = 'a0000000-0000-4000-8000-000000000002',
  delivery = 'd0000000-0000-4000-8000-000000000001',
  resource = 'b0000000-0000-4000-8000-000000000001';
const outcome = {
  id: delivery,
  title: 'Synthetic outcome',
  created_at: '2026-10-06T09:00:00Z',
  read_at: null,
  outcome: {
    schema_version: 1,
    kind: 'business',
    action: 'request_info',
    business_id: resource,
    resource_type: 'business',
    resource_id: resource,
    public_reason: 'Please complete the fictional business profile.',
    summary: 'Additional information requested',
    next_step: 'Edit and resubmit',
    decision_sequence: 1,
  },
  current_state: 'draft',
  current_review_text: null,
  is_latest: true,
  quick_action: {
    label: 'Edit business and resubmit',
    app_path: `/business?id=${resource}&section=review`,
    web_path: `/account/businesses/${resource}/settings#readiness`,
    mutates: false,
    requires_confirmation: false,
  },
};
function fixture() {
  let current: string | null = owner;
  const auth = vi.fn(async () => ({
    data: { user: current ? { id: current } : null },
    error: null,
  }));
  const rpc = vi.fn(async () => ({
    data: outcome as unknown,
    error: null as null | { code: string },
  }));
  return {
    client: createMobileOutcomeClient({ auth: { getUser: auth }, rpc }, () => current),
    auth,
    rpc,
    change: (id: string | null) => {
      current = id;
    },
  };
}
describe('Recipient outcome transport', () => {
  it('maps the server unavailable-resource response without retaining details', async () => {
    const f = fixture();
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002' } });
    expect(await f.client.detail(owner, delivery)).toBeNull();
  });
  it('verifies existing identity and uses the exact delivery RPC argument', async () => {
    const f = fixture();
    expect((await f.client.detail(owner, delivery))?.id).toBe(delivery);
    expect(f.rpc).toHaveBeenCalledWith('get_my_moderation_outcome', { p_delivery_id: delivery });
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it('denies signed-out requests before fetching private data', async () => {
    const f = fixture();
    f.change(null);
    await expect(f.client.detail(null, delivery)).rejects.toMatchObject({ kind: 'signed_out' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('rejects expired verified auth', async () => {
    const f = fixture();
    f.auth.mockResolvedValueOnce({ data: { user: null }, error: null });
    await expect(f.client.detail(owner, delivery)).rejects.toMatchObject({ kind: 'signed_out' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('suppresses an account switch during the server request', async () => {
    const f = fixture();
    f.rpc.mockImplementationOnce(async () => {
      f.change(resource);
      return { data: outcome, error: null };
    });
    await expect(f.client.detail(owner, delivery)).rejects.toMatchObject({
      kind: 'session_changed',
    });
  });
  it('honors revoked recipient or resource access', async () => {
    const f = fixture();
    f.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await f.client.detail(owner, delivery)).toBeNull();
  });
  it('rejects server authorization errors without a cached fallback', async () => {
    const f = fixture();
    f.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501' } });
    await expect(f.client.detail(owner, delivery)).rejects.toMatchObject({ kind: 'denied' });
  });
  it('rejects a result belonging to another delivery', async () => {
    const f = fixture();
    f.rpc.mockResolvedValueOnce({ data: { ...outcome, id: resource }, error: null });
    await expect(f.client.detail(owner, delivery)).rejects.toMatchObject({ kind: 'unavailable' });
  });
  it('rejects malformed route parameters without a server call', async () => {
    const f = fixture();
    await expect(f.client.detail(owner, 'invalid')).rejects.toMatchObject({ kind: 'invalid' });
    expect(f.rpc).not.toHaveBeenCalled();
  });
  it('strips private notes and unsafe mutation actions from public presentation', () => {
    const parsed = parseModerationOutcome({
      ...outcome,
      private_note: 'private',
      quick_action: { ...outcome.quick_action, mutates: true },
      outcome: { ...outcome.outcome, private_note: 'private' },
    });
    expect(parsed?.quick_action).toBeNull();
    expect(JSON.stringify(parsed)).not.toContain('private');
  });
  it('rejects external or ambiguous action URLs', () => {
    for (const path of [
      'https://example.invalid',
      '//example.invalid',
      '/business?id=' + resource + '&id=' + resource,
      '/business?id=' + resource + '&section=review#unsafe',
    ])
      expect(
        parseModerationOutcome({
          ...outcome,
          quick_action: { ...outcome.quick_action, app_path: path },
        })?.quick_action,
      ).toBeNull();
  });
});
