import { afterEach, describe, expect, it, vi } from 'vitest';
import { commerceProvider } from './commerce-routing';
import { SquareService } from './square-service';
import { StripeService } from './stripe-service';
import { StripeClient, stripeWebhookSignature } from './stripe-client';
import {
  stripeChargePatch,
  stripePaymentIntentPatch,
  stripeRefundPatch,
  stripeSessionPatch,
} from './stripe-order-state';
import { parseRecipient, refundPatch } from './square-domain';
import { hash } from './square-security';

const businessId = '88888888-8888-4888-8888-888888888888';
const orderId = '88888888-8888-4888-8888-888888888889';
const config: any = { secretKey: 'sk_test_fixture', enabled: true };
function database(rows: Record<string, any> = {}) {
  const writes: any[] = [];
  const filters: any[] = [];
  const db: any = {
    from: vi.fn((table: string) => {
      const query: any = {};
      for (const method of [
        'select',
        'neq',
        'not',
        'limit',
        'order',
        'range',
        'single',
        'maybeSingle',
      ])
        query[method] = () => query;
      query.eq = (...args: any[]) => {
        filters.push([table, ...args]);
        return query;
      };
      query.update = (patch: any) => {
        writes.push([table, patch]);
        return query;
      };
      query.insert = () => query;
      query.then = (resolve: any) =>
        Promise.resolve({ data: rows[table] ?? null, error: null }).then(resolve);
      return query;
    }),
  };
  return { db, writes, filters };
}
const order = () => ({
  id: orderId,
  business_id: businessId,
  provider: 'stripe',
  merchant_id: 'acct_fixture',
  total_minor: 350,
  currency: 'USD',
  status: 'checkout_pending',
  square_payment_id: 'pi_fixture',
  provider_request: { checkoutMode: 'payment_sheet' },
  expires_at: new Date(Date.now() + 60000).toISOString(),
  version: 1,
});
function leased(service: StripeService | SquareService, row: any) {
  vi.spyOn(service, 'withOrderLease').mockImplementation(async (_id, _version, action) =>
    action(row, 'lease'),
  );
  const patch = vi.spyOn(service, 'patchOrder').mockImplementation(async (_id, _lease, changes) => {
    Object.assign(row, changes);
    return { ...row };
  });
  vi.spyOn(service, 'orderProjection').mockImplementation(async (value) => value);
  return patch;
}
afterEach(() => vi.restoreAllMocks());

describe('subscription checks before provider side effects', () => {
  it.each(['square', 'stripe'] as const)(
    'blocks new %s checkout before saving or charging',
    async (provider) => {
      const { db, writes } = database();
      db.rpc = vi.fn().mockResolvedValue({ error: { details: 'BUSINESS_FEATURE_REQUIRED' } });
      const body = {
        businessId,
        quoteId: orderId,
        idempotencyKey: orderId,
        statusToken: 'a'.repeat(64),
        recipient: { name: 'Fixture', phone: '+15555550100' },
      };
      const service =
        provider === 'square' ? new SquareService(db, {} as never) : new StripeService(db, config);
      const request = vi
        .spyOn(globalThis, 'fetch')
        .mockRejectedValue(new Error('Unexpected provider call'));
      const result =
        service instanceof SquareService
          ? service.checkout(businessId, null, body)
          : service.checkout(body);
      await expect(result).rejects.toMatchObject({
        code: 'BUSINESS_FEATURE_REQUIRED',
        status: 403,
      });
      expect(writes).toEqual([]);
      expect(request).not.toHaveBeenCalled();
      expect(db.rpc).toHaveBeenCalledExactlyOnceWith('assert_business_feature', {
        p_business_id: businessId,
        p_feature: 'pickup_ordering',
      });
    },
  );

  it.each(['square', 'stripe'] as const)(
    'preserves an authenticated %s checkout retry after expiry',
    async (provider) => {
      const token = 'a'.repeat(64);
      const recipient = { name: 'Fixture', phone: '+15555550100' };
      const row = {
        ...order(),
        provider,
        guest_hash: await hash(token),
        request_hash: await hash(
          JSON.stringify({ businessId, quoteId: orderId, recipient: parseRecipient(recipient) }),
        ),
      };
      const { db } = database({ square_orders: row });
      db.rpc = vi.fn().mockResolvedValue({ error: { details: 'BUSINESS_FEATURE_REQUIRED' } });
      const service =
        provider === 'square' ? new SquareService(db, {} as never) : new StripeService(db, config);
      vi.spyOn(service, 'ensureCheckout').mockResolvedValue({ existing: true } as never);
      const body = {
        businessId,
        quoteId: orderId,
        idempotencyKey: orderId,
        statusToken: token,
        recipient,
      };
      const result =
        service instanceof SquareService
          ? service.checkout(businessId, null, body)
          : service.checkout(body);
      await expect(result).resolves.toEqual({ existing: true });
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );
});

describe('Stripe minimum after checkout rewards', () => {
  it.each(['quote', 'checkout'])(
    'rejects a one-cent %s before saving a quote or reserving/spending rewards',
    async (action) => {
      const token = 'a'.repeat(64);
      const pickup = { at: new Date(Date.now() + 3600000).toISOString(), stopId: null };
      const cart = [{ variationId: 'item', quantity: 1, modifierIds: [] }];
      const reward = { discountMinor: 349 };
      const { db } = database({
        square_quotes: {
          guest_hash: await hash(token),
          expires_at: new Date(Date.now() + 60000).toISOString(),
          payload: { cart, pickup, reward },
        },
        stripe_account_states: {
          account_id: 'acct_fixture',
          state: 'connected',
          charges_enabled: true,
          payouts_enabled: true,
        },
      });
      db.rpc = vi.fn().mockResolvedValue({ data: null, error: null });
      const service = new StripeService(db, config);
      vi.spyOn(service, 'availability').mockResolvedValue({
        available: true,
        products: [{ id: 'item', price: 350, currency: 'USD', groups: [] }],
        slots: [{ ...pickup, available: true }],
      } as never);
      vi.spyOn(service, 'checkoutReward').mockResolvedValue(reward);
      await expect(
        service[action]({
          businessId,
          pickup,
          cart,
          statusToken: token,
          quoteId: orderId,
          idempotencyKey: orderId,
          recipient: { name: 'Test customer', phone: '+15555550100' },
        }),
      ).rejects.toMatchObject({ code: 'MINIMUM_PAYMENT' });
      expect(db.rpc).toHaveBeenCalledExactlyOnceWith('assert_business_feature', {
        p_business_id: businessId,
        p_feature: 'pickup_ordering',
      });
      if (action === 'quote') expect(db.from).not.toHaveBeenCalled();
    },
  );
});

describe('Stripe onboarding callback authorization', () => {
  it.each([
    { account_id: 'acct_other', state: 'connected' },
    { account_id: 'acct_fixture', state: 'revoked' },
    null,
  ])('rejects a stale or disconnected onboarding account: %j', async (current) => {
    const { db } = database({ stripe_account_states: current });
    const service = new StripeService(db, config);
    vi.spyOn(service, 'owner').mockResolvedValue(undefined);
    vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
    await expect(
      service.authorizeOnboarding(businessId, 'owner', 'acct_fixture'),
    ).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
  it('checks active ownership and rollout before accepting the current account', async () => {
    const current = { account_id: 'acct_fixture', state: 'connected' };
    const { db } = database({ stripe_account_states: current });
    const service = new StripeService(db, config);
    const owner = vi.spyOn(service, 'owner').mockResolvedValue(undefined);
    const rollout = vi.spyOn(service, 'rollout').mockResolvedValue(undefined);
    await expect(service.authorizeOnboarding(businessId, 'owner', 'acct_fixture')).resolves.toEqual(
      current,
    );
    expect(owner).toHaveBeenCalledWith(businessId, 'owner');
    expect(rollout).toHaveBeenCalledWith(businessId);
  });
});

describe('Authoritative payment routing', () => {
  it.each(['square', 'stripe'] as const)(
    'routes saved %s orders before any client/provider hint',
    async (provider) => {
      const { db, filters } = database({ square_orders: { provider } });
      expect(
        await commerceProvider(db, {
          action: 'refund',
          orderId,
          businessId,
          provider: provider === 'stripe' ? 'square' : 'stripe',
        }),
      ).toBe(provider);
      expect(filters).toContainEqual(['square_orders', 'id', orderId]);
      expect(db.from).not.toHaveBeenCalledWith('ordering_provider_selections');
    },
  );
  it.each(['checkout', 'resume'])(
    'retains an existing Stripe rail for %s after business switches',
    async (action) => {
      const { db, filters } = database({ square_orders: { provider: 'stripe' } });
      expect(
        await commerceProvider(db, {
          action,
          idempotencyKey: orderId,
          businessId,
          provider: 'square',
        }),
      ).toBe('stripe');
      expect(filters).toContainEqual(['square_orders', 'idempotency_key', orderId]);
    },
  );
  it('fails closed when stored provider lookup fails', async () => {
    const db: any = {
      from: () => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ error: { message: 'private' } }) }),
        }),
      }),
    };
    await expect(
      commerceProvider(db, { action: 'refund', orderId, provider: 'square' }),
    ).rejects.toMatchObject({ code: 'STORAGE_ERROR' });
  });
  it('allows explicit setup for either rail and keeps appointments on Square', async () => {
    const { db } = database();
    expect(
      await commerceProvider(db, { action: 'connect_session', businessId, provider: 'stripe' }),
    ).toBe('stripe');
    expect(
      await commerceProvider(db, { action: 'appointment_book', businessId, provider: 'stripe' }),
    ).toBe('square');
  });
});

describe('Financial service isolation and private settings', () => {
  it('rejects anonymous and inactive/staff Stripe settings reads before touching settings', async () => {
    for (const member of [
      null,
      { role: 'staff', is_active: true },
      { role: 'owner', is_active: false },
    ]) {
      const { db } = database({ business_members: member });
      const service = new StripeService(db, config);
      await expect(service.settings({ businessId }, member ? 'user' : null)).rejects.toMatchObject({
        code: member ? 'OWNER_REQUIRED' : 'SIGN_IN',
      });
      expect(db.from).not.toHaveBeenCalledWith('stripe_ordering_settings');
    }
  });
  it.each(['square', 'stripe'])(
    'rejects wrong-rail %s financial operations before provider calls',
    async (provider) => {
      const { db } = database();
      const service =
        provider === 'square' ? new SquareService(db, config) : new StripeService(db, config);
      const row = { ...order(), provider: provider === 'square' ? 'stripe' : 'square' };
      vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
      const lease = vi.spyOn(service, 'withOrderLease');
      await expect(
        service.refund(orderId, 'owner', { confirmed: true, version: 1 }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(service.ensureCheckout(row)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(service.reconcile(row)).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(lease).not.toHaveBeenCalled();
    },
  );
  it('does not expose Stripe raw provider messages', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = new StripeClient(
      'sk_test_fixture',
      undefined,
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: 'private-business-email@secret.test', code: 'account_invalid' },
          }),
          { status: 400, headers: { 'Request-Id': 'req_fixture' } },
        ),
      ),
    );
    await expect(client.request('/v1/account_sessions', {})).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      providerCode: 'account_invalid',
      providerRequestId: 'req_fixture',
    });
    await expect(client.request('/v1/account_sessions', {})).rejects.not.toThrow(
      'private-business-email',
    );
  });
});

describe('Square checkout validation before exposing a payable link', () => {
  it.each(['square', 'stripe'])(
    'does not create a %s checkout if state changes before the lease',
    async (provider) => {
      const { db } = database();
      const service =
        provider === 'square' ? new SquareService(db, config) : new StripeService(db, config);
      const original = {
        ...order(),
        provider,
        square_payment_id: null,
        provider_request: { checkoutMode: 'hosted' },
      };
      leased(service, { ...original, status: 'refunded' });
      const squareCreate =
        service instanceof SquareService ? vi.spyOn(service, 'createProviderCheckout') : null;
      const stripeCreate =
        service instanceof StripeService ? vi.spyOn(service, 'createCheckout') : null;
      expect((await service.ensureCheckout(original)).order.status).toBe('refunded');
      if (squareCreate) expect(squareCreate).not.toHaveBeenCalled();
      if (stripeCreate) expect(stripeCreate).not.toHaveBeenCalled();
    },
  );
  it.each(['timeout', 'amount', 'location', 'reference'])(
    'retains no payable URL when validation has a %s failure',
    async (failure) => {
      const { db } = database();
      const service = new SquareService(db, config);
      const row = {
        ...order(),
        provider: 'square',
        location_id: 'location',
        payment_link_id: null,
      };
      const patch = leased(service, row);
      const actual = {
        location_id: 'location',
        reference_id: orderId,
        total_money: { amount: 350, currency: 'USD' },
      };
      if (failure === 'amount') actual.total_money.amount = 999;
      if (failure === 'location') actual.location_id = 'other';
      if (failure === 'reference') actual.reference_id = 'other';
      const request = vi.fn().mockResolvedValueOnce({
        payment_link: {
          id: 'link',
          order_id: 'remote',
          url: 'https://sandbox.square.link/fixture',
        },
      });
      if (failure === 'timeout') request.mockRejectedValueOnce(new Error('network timeout'));
      else request.mockResolvedValueOnce({ order: actual }).mockResolvedValueOnce({});
      await expect(
        service.createProviderCheckout(row, 'lease', { request } as never),
      ).rejects.toThrow();
      expect(patch.mock.calls.some(([, , change]) => change.checkout_url != null)).toBe(false);
    },
  );
});

describe('Refund ambiguity and stale failed attempts', () => {
  it.each(['ensureCheckout', 'reconcile', 'refund'])(
    'rejects a replacement Square seller during %s before provider mutations',
    async (action) => {
      const { db } = database();
      const service = new SquareService(db, config);
      const row = {
        ...order(),
        provider: 'square',
        status: action === 'refund' ? 'placed' : 'checkout_pending',
        checkout_url: null,
      };
      leased(service, row);
      vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
      const request = vi.fn();
      vi.spyOn(service, 'provider').mockResolvedValue({
        client: { request },
        connection: { merchant_id: 'different-seller' },
      } as never);
      const result =
        action === 'refund'
          ? service.refund(orderId, 'owner', { confirmed: true, version: 1 })
          : service[action](row);
      await expect(result).rejects.toMatchObject({ code: 'CONNECTION_CHANGED' });
      expect(request).not.toHaveBeenCalled();
    },
  );
  it.each(['square', 'stripe'])(
    'blocks a disputed %s refund without requesting more money',
    async (provider) => {
      const { db } = database();
      const service =
        provider === 'square' ? new SquareService(db, config) : new StripeService(db, config);
      const row = {
        ...order(),
        provider,
        status: 'payment_review',
        provider_status: 'PARTIAL_REFUND',
        dispute_state: 'NEEDS_RESPONSE',
      };
      vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
      const patch = leased(service, row);
      await expect(
        service.refund(orderId, 'owner', { confirmed: true, version: 1 }),
      ).rejects.toMatchObject({ code: 'DISPUTE_OPEN' });
      expect(patch).not.toHaveBeenCalled();
    },
  );
  it('retrieves an existing external Square refund instead of creating another', async () => {
    const { db } = database();
    const service = new SquareService(db, config);
    const row = {
      ...order(),
      provider: 'square',
      status: 'refund_pending',
      square_refund_id: 'external-refund',
      refund_key: null,
    };
    vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
    leased(service, row);
    const request = vi.fn().mockResolvedValue({
      refund: {
        id: 'external-refund',
        payment_id: row.square_payment_id,
        amount_money: { amount: 350, currency: 'USD' },
        status: 'COMPLETED',
      },
    });
    vi.spyOn(service, 'provider').mockResolvedValue({
      client: { request },
      connection: { merchant_id: row.merchant_id },
    } as never);
    await service.refund(orderId, 'owner', { confirmed: true, version: 1 });
    expect(request).toHaveBeenCalledExactlyOnceWith('/v2/refunds/external-refund');
  });
  it.each(['square', 'stripe'])(
    'clears the failed %s refund ID before retrying a new stable key',
    async (provider) => {
      const { db } = database();
      const service =
        provider === 'square' ? new SquareService(db, config) : new StripeService(db, config);
      const row: any = {
        ...order(),
        provider,
        status: 'refund_failed',
        square_refund_id: 'old-failed-refund',
        refund_key: 'old-key',
      };
      vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
      const patch = leased(service, row);
      if (service instanceof SquareService)
        vi.spyOn(service, 'provider').mockResolvedValue({
          client: { request: vi.fn().mockRejectedValue(new Error('timeout')) },
          connection: { merchant_id: row.merchant_id },
        } as never);
      else vi.spyOn(StripeClient.prototype, 'request').mockRejectedValue(new Error('timeout'));
      await expect(
        service.refund(orderId, 'owner', { confirmed: true, version: 1 }),
      ).rejects.toThrow('timeout');
      expect(patch.mock.calls[0][2]).toMatchObject({
        status: 'refund_pending',
        square_refund_id: null,
      });
      expect(row.refund_key).not.toBe('old-key');
    },
  );
  it('replays an accepted-but-unsaved Square refund with the original key', async () => {
    const { db } = database();
    const service = new SquareService(db, config);
    const row: any = {
      ...order(),
      provider: 'square',
      status: 'refund_pending',
      square_order_id: 'remote',
      location_id: 'location',
      refund_key: 'stable-key',
      square_refund_id: null,
    };
    leased(service, row);
    const request = vi
      .fn()
      .mockResolvedValueOnce({
        order: { location_id: 'location', reference_id: orderId, tenders: [] },
      })
      .mockResolvedValueOnce({
        refund: {
          id: 'refund',
          payment_id: row.square_payment_id,
          amount_money: { amount: 350, currency: 'USD' },
          status: 'COMPLETED',
        },
      });
    vi.spyOn(service, 'provider').mockResolvedValue({
      client: { request },
      connection: { merchant_id: row.merchant_id },
    } as never);
    expect((await service.reconcile(row)).status).toBe('refunded');
    expect(request).toHaveBeenCalledWith(
      '/v2/refunds',
      expect.objectContaining({ idempotency_key: 'stable-key' }),
    );
  });
  it('does not replace a newer pending Square refund with an older failure', () => {
    expect(
      refundPatch(
        { ...order(), status: 'refund_pending', square_refund_id: 'new' },
        {
          id: 'old',
          payment_id: 'pi_fixture',
          amount_money: { amount: 350, currency: 'USD' },
          status: 'FAILED',
        },
      ),
    ).toBeNull();
  });
});

describe('Stripe canonical state and post-payment events', () => {
  const charge = {
    id: 'ch_fixture',
    livemode: false,
    payment_intent: 'pi_fixture',
    amount: 350,
    amount_refunded: 0,
    currency: 'usd',
    refunded: false,
    disputed: false,
  };
  it('preserves kitchen progress and blocks partial refunds/disputes from handoff', () => {
    const paid = { ...order(), status: 'ready', paid_at: '2026-09-28' };
    expect(stripeChargePatch(paid, charge)).toEqual({});
    expect(stripeChargePatch(paid, { ...charge, amount_refunded: 100 })).toMatchObject({
      status: 'payment_review',
      provider_status: 'PARTIAL_REFUND',
    });
    expect(stripeChargePatch(paid, { ...charge, disputed: true })).toMatchObject({
      status: 'payment_review',
      provider_status: 'PAYMENT_DISPUTED',
    });
    expect(
      stripeChargePatch(paid, { ...charge, amount_refunded: 350, refunded: true }),
    ).toMatchObject({ status: 'refunded' });
  });
  it('pauses full and partial pending Dashboard refunds', () => {
    const pending = {
      id: 're_fixture',
      payment_intent: 'pi_fixture',
      amount: 350,
      currency: 'usd',
      status: 'pending',
    };
    expect(stripeChargePatch(order(), { ...charge, refunds: { data: [pending] } })).toMatchObject({
      status: 'refund_pending',
      square_refund_id: 're_fixture',
    });
    expect(
      stripeChargePatch(order(), { ...charge, refunds: { data: [{ ...pending, amount: 100 }] } }),
    ).toMatchObject({ status: 'refund_pending' });
  });
  it('retrieves the canonical charge for an already-ready order and applies an external full refund', async () => {
    const { db } = database();
    const service = new StripeService(db, config);
    const row = { ...order(), status: 'ready', paid_at: '2026-09-28' };
    leased(service, row);
    const request = vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue({
      id: 'pi_fixture',
      livemode: false,
      metadata: { sds_order_id: orderId },
      latest_charge: { ...charge, refunded: true, amount_refunded: 350 },
    });
    expect((await service.reconcile(row)).status).toBe('refunded');
    expect(request).toHaveBeenCalledWith(
      '/v1/payment_intents/pi_fixture',
      { expand: ['latest_charge.refunds'] },
      'GET',
    );
  });
  it('rechecks a pending external refund without creating a second refund', async () => {
    const { db } = database();
    const service = new StripeService(db, config);
    const row: any = { ...order(), status: 'refund_pending', square_refund_id: 're_fixture' };
    vi.spyOn(service, 'authorizeOrder').mockResolvedValue(row);
    leased(service, row);
    const request = vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue({
      id: 're_fixture',
      payment_intent: 'pi_fixture',
      amount: 350,
      currency: 'usd',
      status: 'pending',
    });
    await service.refund(orderId, 'owner', { confirmed: true, version: 1 });
    expect(request).toHaveBeenCalledWith('/v1/refunds/re_fixture', undefined, 'GET');
    expect(request).not.toHaveBeenCalledWith(
      '/v1/refunds',
      expect.anything(),
      'POST',
      expect.anything(),
    );
  });
  it.each([
    { livemode: true },
    { payment_intent: 'pi_other' },
    { amount: 1 },
    { currency: 'eur' },
    { amount_refunded: 351 },
  ])('rejects mismatched charge evidence %j', (patch) => {
    expect(() => stripeChargePatch(order(), { ...charge, ...patch })).toThrow();
  });
  it('rejects mismatched or live initial payments and prevents replay from undoing fulfillment', () => {
    const intent = {
      id: 'pi_fixture',
      livemode: false,
      metadata: { sds_order_id: orderId },
      amount: 350,
      amount_received: 350,
      currency: 'usd',
      status: 'succeeded',
    };
    expect(stripePaymentIntentPatch(order(), intent)).toMatchObject({ status: 'placed' });
    expect(() => stripePaymentIntentPatch(order(), { ...intent, livemode: true })).toThrow();
    expect(() =>
      stripePaymentIntentPatch(order(), { ...intent, metadata: { sds_order_id: 'other' } }),
    ).toThrow();
    expect(stripePaymentIntentPatch({ ...order(), status: 'ready' }, intent)).toEqual({});
    expect(stripePaymentIntentPatch(order(), { ...intent, amount_received: 1 })).toMatchObject({
      status: 'payment_review',
    });
    expect(() => stripeSessionPatch(order(), { livemode: true })).toThrow();
    expect(() =>
      stripeRefundPatch(order(), {
        payment_intent: 'pi_fixture',
        amount: 350,
        currency: 'usd',
        status: 'unknown',
      }),
    ).toThrow();
  });
  it.each(['charge.refunded', 'refund.updated', 'charge.dispute.created'])(
    'reconciles %s by PaymentIntent without relying on refund metadata',
    async (type) => {
      const row = { ...order(), status: 'ready' };
      const { db, filters } = database({ square_orders: row });
      const service = new StripeService(db, config);
      const reconcile = vi.spyOn(service, 'reconcile').mockResolvedValue(row);
      if (type.startsWith('charge.dispute.')) {
        leased(service, row);
        vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue({
          id: 'du_fixture',
          livemode: false,
          payment_intent: 'pi_fixture',
        });
      }
      await service.webhookEvent({
        type,
        livemode: false,
        account: 'acct_fixture',
        data: { object: { id: 'du_fixture', payment_intent: 'pi_fixture' } },
      });
      expect(filters).toContainEqual(['square_orders', 'square_payment_id', 'pi_fixture']);
      expect(reconcile).toHaveBeenCalledWith(row);
      await expect(
        service.webhookEvent({
          type,
          livemode: false,
          account: 'acct_other',
          data: { object: { payment_intent: 'pi_fixture' } },
        }),
      ).rejects.toMatchObject({ code: 'ACCOUNT_MISMATCH' });
      expect(reconcile).toHaveBeenCalledTimes(1);
    },
  );
  it('never trusts live events or stale cached readiness when Stripe disables charges', async () => {
    const { db, writes } = database();
    const service = new StripeService(db, config);
    await expect(service.webhookEvent({ livemode: true })).rejects.toMatchObject({
      code: 'INVALID_ENVIRONMENT',
    });
    vi.spyOn(StripeClient.prototype, 'request').mockResolvedValue({
      id: 'acct_fixture',
      charges_enabled: false,
      payouts_enabled: true,
    });
    expect(
      await service.refreshAccountReadiness(businessId, {
        account_id: 'acct_fixture',
        charges_enabled: true,
      }),
    ).toMatchObject({ state: 'pending', charges_enabled: false });
    expect(writes[0][1]).toMatchObject({ state: 'pending' });
  });
  it('requires valid fresh webhook HMAC even when a body has a real-looking order ID', async () => {
    const raw = JSON.stringify({ livemode: false, metadata: { sds_order_id: orderId } });
    const timestamp = Math.floor(Date.now() / 1000);
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode('fixture'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const bytes = new Uint8Array(
      await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${raw}`)),
    );
    const signature = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    expect(await stripeWebhookSignature(raw, `t=${timestamp},v1=${signature}`, 'fixture')).toBe(
      true,
    );
    expect(
      await stripeWebhookSignature(raw + ' ', `t=${timestamp},v1=${signature}`, 'fixture'),
    ).toBe(false);
    expect(
      await stripeWebhookSignature(raw, `t=${timestamp - 600},v1=${signature}`, 'fixture'),
    ).toBe(false);
  });
});
