import { afterEach, describe, expect, it, vi } from 'vitest';
import { StripeClient } from './stripe-client';
import { StripeService } from './stripe-service';
import type { StripeConfig } from './square-security';

const businessId = '88888888-8888-4888-8888-888888888888';
const accountId = 'acct_fixture';
const config: StripeConfig = {
  appEnv: 'staging',
  secretKey: 'sk_test_fixture',
  webhookSecret: 'whsec_fixture',
  checkoutReturnUrl: 'https://staging.example.test/return',
  connectCallbackUrl: 'https://staging.example.test/connect',
  enabled: true,
  allowedOrigin: 'https://staging.example.test',
  applicationFeeMinor: 0,
};

function existingSeller() {
  const service = new StripeService({} as never, config);
  vi.spyOn(service, 'owner').mockResolvedValue({ role: 'owner' } as never);
  vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
  vi.spyOn(service, 'accountState').mockResolvedValue({ account_id: accountId });
  return service;
}

afterEach(() => vi.restoreAllMocks());

describe('Stripe embedded onboarding', () => {
  it('reopens a disconnected account without creating a replacement seller', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const service = new StripeService(
      {
        from: vi.fn(() => ({ upsert })),
        auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: {} } }) } },
      } as never,
      config,
    );
    vi.spyOn(service, 'owner').mockResolvedValue({ role: 'owner' } as never);
    vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
    vi.spyOn(service, 'accountState').mockResolvedValue({
      account_id: accountId,
      state: 'revoked',
    });
    vi.spyOn(service, 'businessIdentity').mockResolvedValue({ name: 'Test seller' } as never);
    vi.spyOn(service, 'selectedProvider').mockResolvedValue('stripe');
    const request = vi.spyOn(StripeClient.prototype, 'request');
    await service.beginConnect({ businessId }, 'owner', true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: accountId,
        state: 'pending',
      }),
    );
    expect(request).not.toHaveBeenCalled();
    const reconnect = vi.spyOn(service, 'beginConnect').mockResolvedValue({} as never);
    request.mockResolvedValue({
      account: accountId,
      livemode: false,
      client_secret: 'test-session',
      components: { account_onboarding: { enabled: true } },
    });
    await service.connectSession({ businessId }, 'owner');
    expect(reconnect).toHaveBeenCalledWith({ businessId }, 'owner', true);
  });

  it('creates a fresh session without disabling Stripe authentication for full Dashboard sellers', async () => {
    const service = existingSeller();
    const request = vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue({
      account: accountId,
      livemode: false,
      client_secret: 'test-session',
      expires_at: 1900000000,
      components: { account_onboarding: { enabled: true } },
    });
    await expect(service.connectSession({ businessId }, 'owner')).resolves.toEqual({
      provider: 'stripe',
      clientSecret: 'test-session',
      expiresAt: 1900000000,
    });
    await service.connectSession({ businessId }, 'owner');
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenCalledWith(
      '/v1/account_sessions',
      {
        account: accountId,
        components: {
          account_onboarding: {
            enabled: true,
            features: { external_account_collection: true },
          },
        },
      },
      'POST',
    );
  });

  it('rejects a live or mismatched account session before returning its secret', async () => {
    const service = existingSeller();
    const request = vi.spyOn(StripeClient.prototype, 'request');
    for (const session of [
      { account: accountId, livemode: true },
      { account: 'acct_other', livemode: false },
    ]) {
      request.mockResolvedValue({
        ...session,
        client_secret: 'must-not-return',
        components: { account_onboarding: { enabled: true } },
      });
      await expect(service.connectSession({ businessId }, 'owner')).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
      });
    }
  });
});

describe('Provider-aware owner queue', () => {
  it.each(['stripe', 'square'] as const)(
    'uses %s readiness and settings for the queue',
    async (provider) => {
      const settings = { enabled: true, is_open: true, timezone: 'America/Chicago' };
      const from = vi.fn((table: string) => {
        const query: any = {};
        for (const method of ['select', 'eq', 'in', 'not', 'order']) query[method] = () => query;
        query.range = async () => ({ data: [], error: null });
        query.maybeSingle = async () => ({
          data: table.endsWith('ordering_settings') ? settings : { state: 'connected' },
          error: null,
        });
        return query;
      });
      const service = new StripeService(
        { from, rpc: vi.fn().mockResolvedValue({ data: {}, error: null }) } as never,
        config,
      );
      vi.spyOn(service, 'operator').mockResolvedValue({ canManage: true } as never);
      vi.spyOn(service, 'selectedProvider').mockResolvedValue(provider);
      vi.spyOn(service, 'businessIdentity').mockResolvedValue({ name: 'Test seller' } as never);
      const queue = await service.queue(businessId, 'owner', {});
      expect(queue.connected).toBe(true);
      expect(queue.settings).toEqual(settings);
      expect(from).toHaveBeenCalledWith(`${provider}_ordering_settings`);
      expect(from).toHaveBeenCalledWith(
        provider === 'stripe' ? 'stripe_account_states' : 'square_connections',
      );
      expect(from).not.toHaveBeenCalledWith(
        provider === 'stripe' ? 'square_connections' : 'stripe_account_states',
      );
    },
  );
});
