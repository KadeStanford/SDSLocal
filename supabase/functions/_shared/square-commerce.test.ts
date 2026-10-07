import { describe, expect, it, vi } from 'vitest';
import { SquareClient, type SquareObject } from './square-client';
import {
  catalogProducts,
  checkTransition,
  orderAmounts,
  parseCart,
  parseSettings,
  paymentPatch,
  pickupSlots,
  present,
  priceCart,
  publicOrder,
  refundPatch,
} from './square-domain';
import {
  hash,
  opaqueToken,
  openToken,
  parseOAuthCallback,
  randomToken,
  sealToken,
  squareConfig,
  stripeConfig,
  verifyWebhook,
} from './square-security';
import {
  StripeClient,
  stripeConnectAccountCreateParams,
  stripeOnboardingSessionIsReady,
} from './stripe-client';
import { SquareService } from './square-service';

const fixture = (): SquareObject[] => [
  {
    id: 'item',
    type: 'ITEM',
    version: 1,
    item_data: {
      name: 'Coffee',
      product_type: 'REGULAR',
      modifier_list_info: [
        { modifier_list_id: 'options', min_selected_modifiers: 1, max_selected_modifiers: 1 },
      ],
      variations: [
        {
          id: 'variation',
          type: 'ITEM_VARIATION',
          version: 2,
          item_variation_data: {
            item_id: 'item',
            name: 'Regular',
            pricing_type: 'FIXED_PRICING',
            price_money: { amount: 500, currency: 'USD' },
          },
        },
      ],
    },
  },
  {
    id: 'options',
    type: 'MODIFIER_LIST',
    modifier_list_data: {
      name: 'Milk',
      modifiers: [
        {
          id: 'oat',
          type: 'MODIFIER',
          version: 3,
          modifier_data: { name: 'Oat', price_money: { amount: 50, currency: 'USD' } },
        },
      ],
    },
  },
];
const cart = [{ variationId: 'variation', quantity: 2, modifierIds: ['oat'] }];
const settings = {
  enabled: true,
  is_open: true,
  preparation_minutes: 20,
  minimum_notice_minutes: 15,
  slot_minutes: 15,
  max_orders_per_slot: 2,
  timezone: 'America/Chicago',
  allow_upcoming_stops: true,
  pickup_windows: [{ day: 0, start: '09:00', end: '17:00' }],
};
const now = Date.parse('2026-09-20T15:00:00Z');
const order = {
  id: 'internal',
  square_order_id: 'square',
  location_id: 'location',
  total_minor: 1100,
  currency: 'USD',
  status: 'checkout_pending',
  paid_at: null,
};
const payment = {
  id: 'payment',
  order_id: 'square',
  location_id: 'location',
  total_money: { amount: 1100, currency: 'USD' },
  status: 'COMPLETED',
};

describe('Square security boundaries', () => {
  it('classifies rejected refresh grants without revealing provider messages', async () => {
    const client = new SquareClient('fixture', async () =>
      Response.json(
        { error: 'invalid_grant', error_description: 'private-provider-details' },
        { status: 400 },
      ),
    );
    const invalid = vi.fn().mockResolvedValue(undefined);
    client.onAuthorizationFailure = invalid;
    await expect(
      client.request('/oauth2/token', { grant_type: 'refresh_token' }),
    ).rejects.toMatchObject({ code: 'RECONNECT' });
    expect(invalid).toHaveBeenCalledOnce();
  });
  it('encrypts with unique nonces and authenticates business/context/version', async () => {
    const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const first = await sealToken('fixture-secret', key, 'v1', 'business:access');
    const second = await sealToken('fixture-secret', key, 'v1', 'business:access');
    expect(JSON.stringify(first)).not.toContain('fixture-secret');
    expect(first.nonce).not.toBe(second.nonce);
    expect(await openToken(first, { v1: key }, 'business:access')).toBe('fixture-secret');
    await expect(openToken(first, { v1: key }, 'another-business:access')).rejects.toThrow();
    await expect(openToken(first, {}, 'business:access')).rejects.toThrow();
  });
  it('requires opaque capabilities and rejects malformed/repeated callbacks', () => {
    expect(randomToken()).toMatch(/^[a-f0-9]{64}$/);
    expect(() => opaqueToken('guess')).toThrow();
    expect(() => parseOAuthCallback(new URL('https://callback.test/?code=fixture'))).toThrow();
    expect(() =>
      parseOAuthCallback(
        new URL(
          `https://callback.test/?state=${'a'.repeat(64)}&state=${'b'.repeat(64)}&code=fixture`,
        ),
      ),
    ).toThrow();
    expect(
      parseOAuthCallback(
        new URL(`https://callback.test/?state=${'a'.repeat(64)}&error=access_denied`),
      ).code,
    ).toBeNull();
  });
  it('always disables production and never infers environment from URL', () => {
    expect(() =>
      squareConfig((name) => ({ APP_ENV: 'production', SQUARE_ENVIRONMENT: 'sandbox' })[name]),
    ).toThrow();
    expect(() => squareConfig(() => undefined)).toThrow();
    expect(() =>
      squareConfig((name) => ({ APP_ENV: 'staging', SQUARE_ENVIRONMENT: 'production' })[name]),
    ).toThrow();
  });
  it('verifies the exact raw body and configured notification URL', async () => {
    const url = 'https://callback.test/webhook';
    const raw = '{"event_id":"fixture"}';
    const secret = 'isolated-fixture-key';
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(url + raw)),
        ),
      ),
    );
    expect(await verifyWebhook(raw, signature, url, secret)).toBe(true);
    expect(await verifyWebhook(raw + ' ', signature, url, secret)).toBe(false);
    expect(await verifyWebhook(raw, signature, url + '/', secret)).toBe(false);
    expect(await verifyWebhook(raw, 'malformed', url, secret)).toBe(false);
  });
  it('returns an explicit public whitelist without recipient or credentials', () => {
    const result = publicOrder({
      ...order,
      recipient: { name: 'Private' },
      access_cipher: { ciphertext: 'secret' },
      guest_hash: 'private',
      provider_request: { private: true },
      refresh_token: 'private',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /Private|secret|guest_hash|access_cipher|provider_request|refresh_token/,
    );
  });
});

describe('Stripe Connect setup', () => {
  it('lets Stripe collect the legal business type during embedded onboarding', () => {
    const params = stripeConnectAccountCreateParams({
      businessId: '11111111-1111-4111-8111-111111111111',
      businessName: 'Juniper & Ember Kitchen',
      contactEmail: 'owner@example.test',
    });
    expect(params).toMatchObject({
      display_name: 'Juniper & Ember Kitchen',
      contact_email: 'owner@example.test',
      identity: { country: 'us' },
      dashboard: 'full',
      defaults: { responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' } },
    });
    expect(params.identity).not.toHaveProperty('entity_type');
  });

  it('keeps SDS application fees at zero even if a stale server secret sets one', () => {
    const configValues: Record<string, string> = {
      APP_ENV: 'staging',
      STRIPE_SECRET_KEY: 'sk_test_fixture',
      STRIPE_CHECKOUT_RETURN_URL: 'https://staging.example.test/order',
      STRIPE_CONNECT_CALLBACK_URL: 'https://staging.example.test/connect',
      STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
      STRIPE_COMMERCE_ENABLED: 'true',
      STRIPE_APPLICATION_FEE_MINOR: '250',
    };
    expect(stripeConfig((key) => configValues[key]).applicationFeeMinor).toBe(0);
    expect(() =>
      stripeConfig((key) => ({ ...configValues, STRIPE_SECRET_KEY: 'sk_live_fixture' })[key]),
    ).toThrow('Stripe test ordering requires a test-mode secret key.');
  });

  it('accepts only a test onboarding session for the connected account', () => {
    const session = {
      livemode: false,
      account: 'acct_fixture',
      client_secret: 'account_session_secret',
      components: { account_onboarding: { enabled: true } },
    };
    expect(stripeOnboardingSessionIsReady(session, 'acct_fixture')).toBe(true);
    expect(stripeOnboardingSessionIsReady({ ...session, livemode: true }, 'acct_fixture')).toBe(
      false,
    );
    expect(stripeOnboardingSessionIsReady(session, 'acct_other')).toBe(false);
    expect(stripeOnboardingSessionIsReady({ ...session, client_secret: '' }, 'acct_fixture')).toBe(
      false,
    );
  });

  it('preserves a safe Stripe request reference when Connect setup fails', async () => {
    const client = new StripeClient(
      'sk_test_fixture',
      undefined,
      async () =>
        new Response(
          JSON.stringify({ error: { type: 'invalid_request_error', code: 'account_invalid' } }),
          { status: 400, headers: { 'Request-Id': 'req_123abc' } },
        ),
    );
    await expect(client.request('/v1/account_sessions', {}, 'POST')).rejects.toMatchObject({
      code: 'PROVIDER_ERROR',
      providerCode: 'account_invalid',
      providerRequestId: 'req_123abc',
    });
  });
});

describe('Square catalog and authoritative cart', () => {
  it('maps nested variations and modifier groups without altering source objects', () => {
    const objects = fixture();
    const original = JSON.stringify(objects);
    const result = catalogProducts(objects, 'location', 'USD');
    expect(result.products).toHaveLength(1);
    expect(result.products[0]).toMatchObject({
      id: 'variation',
      price: 500,
      groups: [{ min: 1, max: 1 }],
    });
    expect(priceCart(cart, result.products)[0]).toMatchObject({
      catalog_object_id: 'variation',
      catalog_version: 2,
      quantity: '2',
      modifiers: [{ catalog_object_id: 'oat', catalog_version: 3 }],
    });
    expect(JSON.stringify(objects)).toBe(original);
  });
  it.each(['deleted', 'absent', 'currency', 'sold-out', 'variable', 'nested'])(
    'excludes %s products',
    (kind) => {
      const objects = fixture();
      const variation = objects[0].item_data.variations[0];
      if (kind === 'deleted') variation.is_deleted = true;
      if (kind === 'absent') variation.absent_at_location_ids = ['location'];
      if (kind === 'currency') variation.item_variation_data.price_money.currency = 'CAD';
      if (kind === 'sold-out')
        variation.item_variation_data.location_overrides = [
          { location_id: 'location', sold_out: true },
        ];
      if (kind === 'variable') variation.item_variation_data.pricing_type = 'VARIABLE_PRICING';
      if (kind === 'nested')
        objects[1].modifier_list_data.modifiers[0].modifier_data.child_modifier_list_ids = [
          'nested',
        ];
      expect(catalogProducts(objects, 'location', 'USD').products).toHaveLength(0);
    },
  );
  it('honors location mode and current provider versions', () => {
    expect(
      present(
        {
          present_at_all_locations: false,
          present_at_location_ids: ['location'],
          absent_at_location_ids: ['location'],
        },
        'location',
      ),
    ).toBe(true);
    const objects = fixture();
    objects[0].item_data.variations[0].version = 5;
    expect(catalogProducts(objects, 'location', 'USD').products[0].version).toBe(5);
  });
  it('ignores supplied money, bounds quantities and requires options', () => {
    const parsed = parseCart([{ ...cart[0], price: 1, total: 1 }]);
    expect(parsed).toEqual(cart);
    expect(() => parseCart([{ ...cart[0], quantity: 0 }])).toThrow();
    expect(() => parseCart([{ ...cart[0], quantity: 21 }])).toThrow();
    const products = catalogProducts(fixture(), 'location', 'USD').products;
    expect(() => priceCart([{ ...cart[0], modifierIds: [] }], products)).toThrow();
    expect(() => priceCart([{ ...cart[0], variationId: 'unknown' }], products)).toThrow();
    expect(() => priceCart([{ ...cart[0], modifierIds: ['invalid'] }], products)).toThrow();
    expect(() => parseCart([{ ...cart[0], modifierIds: ['oat', 'oat'] }])).toThrow();
  });
  it('paginates and retries rate limits with a fixed Sandbox host and API version', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response('{}', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ objects: [{ id: 'one' }], cursor: 'next' }))
      .mockResolvedValueOnce(Response.json({ objects: [{ id: 'two' }] }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const result = await new SquareClient('Bearer fixture', fetcher, sleep).pages(
      '/v2/catalog/list',
      'objects',
    );
    expect(result).toEqual([{ id: 'one' }, { id: 'two' }]);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[2][0]).toBe(
      'https://connect.squareupsandbox.com/v2/catalog/list?cursor=next',
    );
    expect(fetcher.mock.calls[0][1].headers['Square-Version']).toBe('2026-09-16');
  });
  it('does not retry endlessly or reveal provider error bodies', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response('{"secret":"private"}', { status: 500 }));
    await expect(
      new SquareClient('fixture', fetcher, async () => {}).request('/v2/locations'),
    ).rejects.toThrow('Square could not complete');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});

describe('pickup slots and financial state', () => {
  it('rejects closed settings, expired/unpublished stops and respects notice', () => {
    expect(pickupSlots({ ...settings, is_open: false }, false, [], 'Store', now)).toEqual([]);
    expect(
      pickupSlots(
        settings,
        true,
        [
          {
            id: 'stop',
            title: 'Stop',
            address_text: 'Address',
            starts_at: '2026-09-20T12:00:00Z',
            ends_at: '2026-09-20T14:00:00Z',
            is_published: true,
          },
        ],
        '',
        now,
      ),
    ).toEqual([]);
    const slots = pickupSlots(settings, false, [], 'Store', now);
    expect(slots[0].at).toBe('2026-09-20T15:30:00.000Z');
    expect(pickupSlots(settings, true, [], '', now)).toEqual([]);
    expect(() => parseSettings({ ...settings, slot_minutes: 17 })).toThrow();
    expect(() => parseSettings({ ...settings, timezone: 'bad/zone' })).toThrow();
  });
  it('uses integer money and rejects unsupported tips', () => {
    expect(
      orderAmounts({
        total_money: { amount: 1100, currency: 'USD' },
        total_tax_money: { amount: 100 },
      }),
    ).toEqual({ total_minor: 1100, tax_minor: 100, subtotal_minor: 1000, currency: 'USD' });
    expect(() => orderAmounts({ total_money: { amount: 10.5, currency: 'USD' } })).toThrow();
    expect(() =>
      orderAmounts({
        total_money: { amount: 1100, currency: 'USD' },
        total_tip_money: { amount: 1 },
      }),
    ).toThrow();
  });
  it('only places orders on an authoritative completed payment and validates binding', () => {
    expect(paymentPatch(order, { ...payment, status: 'FAILED' })).toBeNull();
    expect(paymentPatch(order, { ...payment, status: 'APPROVED' })).toBeNull();
    expect(paymentPatch(order, payment)).toMatchObject({
      status: 'placed',
      square_payment_id: 'payment',
    });
    expect(() => paymentPatch(order, { ...payment, location_id: 'another' })).toThrow();
    expect(
      paymentPatch(order, { ...payment, total_money: { amount: 1, currency: 'USD' } }),
    ).toMatchObject({ status: 'payment_review' });
  });
  it('never regresses paid/refunded states on duplicate or out-of-order payments', () => {
    expect(
      paymentPatch({ ...order, status: 'completed', paid_at: '2026-09-20' }, payment),
    ).toBeNull();
    expect(
      paymentPatch({ ...order, status: 'refunded', paid_at: '2026-09-20' }, payment),
    ).toBeNull();
    expect(paymentPatch({ ...order, status: 'checkout_expired' }, payment)).toMatchObject({
      status: 'payment_review',
    });
  });
  it('requires a provider-confirmed full refund and preserves pending/failure', () => {
    const paid = { ...order, status: 'placed', square_payment_id: 'payment' };
    const refund = {
      id: 'refund',
      payment_id: 'payment',
      amount_money: { amount: 1100, currency: 'USD' },
      status: 'PENDING',
    };
    expect(refundPatch(paid, refund)).toMatchObject({ status: 'refund_pending' });
    expect(refundPatch(paid, { ...refund, status: 'REJECTED' })).toMatchObject({
      status: 'refund_failed',
    });
    expect(refundPatch(paid, { ...refund, status: 'COMPLETED' })).toMatchObject({
      status: 'refunded',
    });
    expect(
      refundPatch(paid, { ...refund, amount_money: { amount: 1, currency: 'USD' } }),
    ).toMatchObject({ status: 'refund_pending', provider_status: 'REFUND_PENDING' });
    expect(refundPatch({ ...paid, status: 'refunded' }, refund)).toBeNull();
  });
  it('allows only the formal operational transitions', () => {
    expect(() => checkTransition('placed', 'accepted')).not.toThrow();
    expect(() => checkTransition('checkout_pending', 'placed')).toThrow();
    expect(() => checkTransition('placed', 'completed')).toThrow();
    expect(() => checkTransition('refunded', 'accepted')).toThrow();
  });
});

function fakeDb(data: unknown) {
  const query: SquareObject = {};
  for (const key of [
    'select',
    'eq',
    'maybeSingle',
    'single',
    'update',
    'insert',
    'upsert',
    'is',
    'not',
    'limit',
    'order',
    'range',
  ])
    query[key] = vi.fn(() => query);
  query.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return {
    from: vi.fn(() => query),
    rpc: vi.fn(() => Promise.resolve({ data, error: null })),
    query,
  };
}
const service = (data: unknown) => {
  const db = fakeDb(data);
  return { db, service: new SquareService(db as never, {} as never) };
};
describe('Square server authorization and webhook dispatch', () => {
  it('allows appointment-only sellers to connect without opening pickup ordering', async () => {
    const flags: Record<string, unknown> = {
      square_commerce: { enabled: true, business_ids: ['pickup-business'] },
      appointment_booking: {
        enabled: true,
        environment: 'staging',
        business_ids: ['service-business'],
      },
    };
    const db = {
      from: vi.fn(() => ({
        select: () => ({
          eq: (_column: string, key: string) => ({
            single: async () => ({ data: { value: flags[key] }, error: null }),
            maybeSingle: async () => ({ data: { value: flags[key] }, error: null }),
          }),
        }),
      })),
    };
    const square = new SquareService(db as never, { enabled: true } as never);
    await expect(square.rollout('pickup-business')).resolves.toBeUndefined();
    await expect(square.rollout('service-business')).rejects.toMatchObject({ code: 'DISABLED' });
    await expect(square.rollout('service-business', true)).resolves.toBeUndefined();
    await expect(square.rollout('other-business', true)).rejects.toMatchObject({
      code: 'APPOINTMENTS_DISABLED',
    });
    flags.appointment_booking = {
      enabled: true,
      environment: 'production',
      business_ids: ['service-business'],
    };
    await expect(square.rollout('service-business', true)).rejects.toMatchObject({
      code: 'APPOINTMENTS_DISABLED',
    });
  });
  it.each([null, { role: 'staff', is_active: true }, { role: 'owner', is_active: false }])(
    'rejects non-owner connection/financial actions (%j)',
    async (membership) => {
      const { service: s } = service(membership);
      await expect(s.beginOAuth('business', 'user')).rejects.toThrow();
      await expect(s.disconnect('business', 'user', true)).rejects.toThrow();
    },
  );
  it('requires a signed-in identity even if membership data exists', async () => {
    await expect(
      service({ role: 'owner', is_active: true }).service.owner('business', null),
    ).rejects.toThrow();
  });
  it('isolates guest capabilities and authenticated customers', async () => {
    const token = 'a'.repeat(64);
    const { service: s } = service({
      id: 'order',
      customer_id: 'customer-a',
      guest_hash: await hash(token),
    });
    await expect(s.authorizeOrder('order', 'customer-b', undefined)).rejects.toThrow(
      'Order not found',
    );
    await expect(s.authorizeOrder('order', null, 'b'.repeat(64))).rejects.toThrow(
      'Order not found',
    );
    await expect(s.authorizeOrder('order', null, token)).resolves.toMatchObject({ id: 'order' });
    await expect(s.authorizeOrder('order', 'customer-a', undefined)).resolves.toMatchObject({
      id: 'order',
    });
  });
  it('ignores previously processed/in-flight events and accepts unknown event types safely', async () => {
    const { service: s, db } = service([]);
    await s.webhookEvent({ event_id: 'already-claimed' });
    expect(db.from).not.toHaveBeenCalled();
    db.rpc.mockResolvedValue({ data: [{}], error: null });
    await s.webhookEvent({
      event_id: 'new',
      merchant_id: 'merchant',
      event_type: 'unknown.future.event',
    });
    expect(db.from).toHaveBeenCalledWith('square_webhook_inbox');
  });
  it('disables ordering and clears token blobs on revocation', async () => {
    const { service: s, db } = service([]);
    await s.revokeLocal('business', 'authorization_revoked');
    expect(db.query.update).toHaveBeenCalledWith({ enabled: false, is_open: false });
    expect(db.query.update).toHaveBeenCalledWith(
      expect.objectContaining({ state: 'revoked', access_cipher: null, refresh_cipher: null }),
    );
  });
  it('leaves failed webhook processing retryable with a safe error classification', async () => {
    const { service: s, db } = service([{ business_id: 'business' }]);
    vi.spyOn(s, 'provider').mockRejectedValue(new Error('private-provider-secret'));
    await expect(
      s.webhookEvent({
        event_id: 'retry',
        event_type: 'payment.updated',
        merchant_id: 'merchant',
        object_id: 'payment',
      }),
    ).rejects.toThrow();
    expect(db.query.update).toHaveBeenCalledWith({
      lease_until: null,
      last_error: 'PROCESSING_ERROR',
    });
  });
});

describe('Square live availability classification and quote guard', () => {
  it('reports configured closure without probing the provider', async () => {
    const { service: s } = service({
      status: 'active',
      business_type: 'food_drink',
      enabled: true,
      is_open: false,
      synced_at: '2026-09-20',
    });
    vi.spyOn(s, 'rollout').mockResolvedValue();
    vi.spyOn(s, 'selectedProvider').mockResolvedValue('square');
    vi.spyOn(s, 'connection').mockResolvedValue({ state: 'connected', location_id: 'location' });
    const provider = vi.spyOn(s, 'provider');
    expect(await s.availability('business')).toEqual({ available: false, status: 'paused' });
    expect(provider).not.toHaveBeenCalled();
  });
  it('returns a public unavailable status without leaking provider failure', async () => {
    const { service: s } = service({
      status: 'active',
      business_type: 'food_drink',
      enabled: true,
      is_open: true,
      synced_at: '2026-09-20',
    });
    vi.spyOn(s, 'rollout').mockResolvedValue();
    vi.spyOn(s, 'selectedProvider').mockResolvedValue('square');
    vi.spyOn(s, 'connection').mockResolvedValue({ state: 'connected', location_id: 'location' });
    vi.spyOn(s, 'provider').mockRejectedValue(Error('private provider token'));
    expect(await s.availability('business')).toEqual({ available: false, status: 'unavailable' });
  });
  it.each(['closed', 'unavailable'] as const)(
    'still rejects quoting when live availability is %s',
    async (status) => {
      const { service: s } = service(null);
      vi.spyOn(s, 'availability').mockResolvedValue({ available: false, status });
      const calculate = vi.spyOn(s, 'calculate');
      await expect(
        s.quote('business', {
          statusToken: 'a'.repeat(64),
          cart,
          pickup: { at: '2026-09-21T15:00:00Z', stopId: null },
        }),
      ).rejects.toMatchObject({ code: 'ORDERING_CLOSED' });
      expect(calculate).not.toHaveBeenCalled();
    },
  );
});
