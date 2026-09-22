/** Local database + real orchestration, deterministic Square transport fixture.
 * Never contacts Square. Refuses any hosted Supabase URL. */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { SquareService } from '../functions/_shared/square-service.ts';
import { SquareClient, type SquareObject } from '../functions/_shared/square-client.ts';
import { randomToken, type SquareConfig } from '../functions/_shared/square-security.ts';

const url = Deno.env.get('LOCAL_SUPABASE_URL');
if (url !== 'http://host.docker.internal:54321')
  throw new Error('This fixture runs only against local Docker Supabase.');
const db = createClient(url, Deno.env.get('LOCAL_SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const key = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
const config: SquareConfig = {
  appEnv: 'development',
  applicationId: 'fixture',
  applicationSecret: 'fixture-secret',
  redirectUrl: 'https://callback.example.test/square-oauth-callback',
  webhookUrl: 'https://callback.example.test/square-webhook',
  webhookKey: 'fixture',
  encryptionKey: key,
  keyVersion: 'v1',
  keys: { v1: key },
  enabled: true,
  maintenanceSecret: 'fixture',
  allowedOrigin: '',
};
const catalog = [
  {
    id: 'item',
    type: 'ITEM',
    version: 1,
    item_data: {
      name: 'Fixture coffee',
      product_type: 'REGULAR',
      variations: [
        {
          id: 'variation',
          type: 'ITEM_VARIATION',
          version: 1,
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
];
const remoteOrders = new Map<string, SquareObject>();
const links = new Map<string, SquareObject>();
const paymentStatus = new Map<string, string>();
const refunds = new Map<string, SquareObject>();
let createdLinks = 0;
let refunded = false;
const fixtureFetch: typeof fetch = async (input, init) => {
  const path = new URL(String(input)).pathname;
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  let result: SquareObject;
  if (path === '/oauth2/token')
    result = {
      access_token: 'fixture-access-token',
      refresh_token: 'fixture-refresh-token',
      merchant_id: 'fixture-merchant',
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    };
  else if (path === '/oauth2/revoke') result = { success: true };
  else if (path.startsWith('/v2/merchants/'))
    result = { merchant: { id: 'fixture-merchant', business_name: 'Fixture seller' } };
  else if (path.startsWith('/v2/locations'))
    result = {
      location: {
        id: 'fixture-location',
        name: 'Fixture cafe',
        status: 'ACTIVE',
        currency: 'USD',
        timezone: 'UTC',
        capabilities: ['CREDIT_CARD_PROCESSING'],
        address: { address_line_1: 'Local test address' },
      },
      locations: [],
    };
  else if (path === '/v2/catalog/list') result = { objects: catalog };
  else if (path === '/v2/catalog/batch-retrieve') result = { objects: catalog };
  else if (path === '/v2/orders/calculate')
    result = {
      order: {
        ...body.order,
        line_items: body.order.line_items.map((line: SquareObject) => ({
          ...line,
          name: 'Fixture coffee',
          base_price_money: { amount: 500, currency: 'USD' },
          total_money: { amount: 500 * Number(line.quantity), currency: 'USD' },
        })),
        total_money: { amount: 550, currency: 'USD' },
        total_tax_money: { amount: 50, currency: 'USD' },
      },
    };
  else if (path === '/v2/online-checkout/payment-links') {
    if (!links.has(body.idempotency_key)) {
      createdLinks++;
      const id = `provider-${createdLinks}`;
      const order = {
        ...body.order,
        id,
        state: 'DRAFT',
        total_money: { amount: 550, currency: 'USD' },
        tenders: [],
      };
      remoteOrders.set(id, order);
      links.set(body.idempotency_key, {
        payment_link: { id: `link-${id}`, order_id: id, url: `https://sandbox.square.link/${id}` },
        related_resources: { orders: [order] },
      });
    }
    result = links.get(body.idempotency_key)!;
  } else if (path.startsWith('/v2/online-checkout/payment-links/') && init?.method === 'DELETE') {
    const id = path.split('/').pop()!.replace('link-', '');
    remoteOrders.get(id)!.state = 'CANCELED';
    result = { cancelled_order_id: id };
  } else if (path.startsWith('/v2/orders/'))
    result = { order: remoteOrders.get(path.split('/').pop()!) };
  else if (path.startsWith('/v2/payments/')) {
    const id = path.split('/').pop()!;
    const providerId = id.replace('payment-', '');
    result = {
      payment: {
        id,
        order_id: providerId,
        location_id: 'fixture-location',
        status: paymentStatus.get(providerId) ?? 'PENDING',
        total_money: { amount: 550, currency: 'USD' },
        refund_ids: refunded ? ['fixture-refund'] : [],
      },
    };
  } else if (path === '/v2/refunds') {
    const refund = {
      id: 'fixture-refund',
      payment_id: body.payment_id,
      amount_money: body.amount_money,
      status: 'PENDING',
    };
    refunds.set('fixture-refund', refund);
    result = { refund };
  } else if (path.startsWith('/v2/refunds/'))
    result = { refund: refunds.get(path.split('/').pop()!) };
  else throw new Error(`Unexpected fixture request ${path}`);
  return Response.json(result);
};
const service = new SquareService(
  db,
  config,
  (token) => new SquareClient(token, fixtureFetch, async () => {}),
);
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
const admin = await db.auth.admin.createUser({
  email: `square-local-${crypto.randomUUID()}@example.test`,
  password: randomToken(),
  email_confirm: true,
});
if (admin.error || !admin.data.user)
  throw new Error('Local confirmed fixture user creation failed.');
const userId = admin.data.user.id;
const businessId = crypto.randomUUID();
const eventId = `local-square-${crypto.randomUUID()}`;
const priorFlag = await service.checked(
  db.from('platform_settings').select('value').eq('key', 'square_commerce').single(),
);
try {
  await service.checked(
    db.from('businesses').insert({
      id: businessId,
      created_by: userId,
      name: 'Local Square integration fixture',
      slug: `square-fixture-${businessId}`,
      business_type: 'food_drink',
      status: 'active',
      approved_at: new Date().toISOString(),
    }),
  );
  await service.checked(
    db.from('business_members').insert({ business_id: businessId, user_id: userId, role: 'owner' }),
  );
  await service.checked(
    db
      .from('platform_settings')
      .update({ value: { enabled: true, business_ids: [businessId] } })
      .eq('key', 'square_commerce'),
  );
  const start = await service.beginOAuth(businessId, userId);
  const state = new URL(start.url).searchParams.get('state')!;
  await service.finishOAuth(state, 'fixture-code');
  let replayRejected = false;
  try {
    await service.finishOAuth(state, 'fixture-code');
  } catch {
    replayRejected = true;
  }
  check(replayRejected, 'OAuth replay accepted');
  const connection = await service.connection(businessId);
  check(!JSON.stringify(connection).includes('fixture-access-token'), 'Plaintext token stored');
  await service.selectLocation(businessId, userId, 'fixture-location');
  await service.checked(
    db
      .from('square_connections')
      .update({ expires_at: new Date(Date.now() + 3600000).toISOString() })
      .eq('business_id', businessId),
  );
  await service.provider(businessId);
  check(
    Date.parse((await service.connection(businessId))!.expires_at) > Date.now() + 86400000,
    'Expiring token was not refreshed',
  );
  await service.sync(businessId, userId);
  await service.settings(businessId, userId, {
    enabled: true,
    is_open: true,
    preparation_minutes: 5,
    minimum_notice_minutes: 5,
    slot_minutes: 15,
    max_orders_per_slot: 1,
    timezone: 'UTC',
    allow_upcoming_stops: false,
    pickup_windows: Array.from({ length: 7 }, (_, day) => ({ day, start: '00:00', end: '23:59' })),
  });
  const availability = await service.availability(businessId, true);
  check(availability.available, 'Menu unavailable');
  if (!availability.available) throw new Error('Missing menu');
  const token = randomToken();
  const slot = availability.slots[2];
  const cart = [{ variationId: 'variation', quantity: 1, modifierIds: [] }];
  const quote = await service.quote(businessId, {
    cart,
    pickup: { at: slot.at, stopId: null },
    statusToken: token,
    total: 1,
  });
  check(quote.total === 550, 'Client money was trusted');
  const checkoutBody = {
    quoteId: quote.quoteId,
    statusToken: token,
    idempotencyKey: crypto.randomUUID(),
    recipient: { name: 'Local fixture', phone: '+12025550123' },
  };
  const parallel = await Promise.allSettled([
    service.checkout(businessId, null, checkoutBody),
    service.checkout(businessId, null, checkoutBody),
  ]);
  check(
    parallel.some((r) => r.status === 'fulfilled'),
    'Both duplicate requests failed',
  );
  const checkout = await service.checkout(businessId, null, checkoutBody);
  check(createdLinks === 1, 'Duplicate Square checkout');
  const id = checkout.order.id;
  const stored = await service.authorizeOrder(id, null, token);
  check(stored.status === 'checkout_pending', 'Checkout incorrectly marked paid');
  let guestRejected = false;
  try {
    await service.status(id, null, randomToken());
  } catch {
    guestRejected = true;
  }
  check(guestRejected, 'Guest order isolation failed');
  remoteOrders.get(stored.square_order_id)!.tenders = [
    { payment_id: `payment-${stored.square_order_id}` },
  ];
  paymentStatus.set(stored.square_order_id, 'COMPLETED');
  const inbox = {
    event_id: eventId,
    event_type: 'payment.updated',
    merchant_id: 'fixture-merchant',
    object_id: `payment-${stored.square_order_id}`,
    signature_verified: true,
    occurred_at: new Date().toISOString(),
  };
  await service.checked(db.from('square_webhook_inbox').insert(inbox));
  await service.webhookEvent(inbox);
  await service.webhookEvent(inbox);
  let status = await service.status(id, null, token);
  check(status.order.status === 'placed', 'Verified payment did not place order');
  for (const next of ['accepted', 'preparing', 'ready', 'completed']) {
    await service.orderAction(id, userId, { version: status.order.version, next });
    status = await service.status(id, null, token);
    check(status.order.status === next, `Transition failed: ${next}`);
  }
  const pending = await service.refund(id, userId, {
    version: status.order.version,
    confirmed: true,
  });
  check(pending.order.status === 'refund_pending', 'Pending refund incorrectly completed');
  refunds.get('fixture-refund')!.status = 'COMPLETED';
  refunded = true;
  status = await service.status(id, null, token);
  check(status.order.status === 'refunded', 'Confirmed refund did not reconcile');
  // Two distinct checkouts compete for the last slot in actual PostgreSQL.
  const slot2 = availability.slots[3];
  const token2 = randomToken();
  const token3 = randomToken();
  const quote2 = await service.quote(businessId, {
    cart,
    pickup: { at: slot2.at, stopId: null },
    statusToken: token2,
  });
  const quote3 = await service.quote(businessId, {
    cart,
    pickup: { at: slot2.at, stopId: null },
    statusToken: token3,
  });
  const competing = await Promise.allSettled([
    service.checkout(businessId, null, {
      ...checkoutBody,
      quoteId: quote2.quoteId,
      statusToken: token2,
      idempotencyKey: crypto.randomUUID(),
    }),
    service.checkout(businessId, null, {
      ...checkoutBody,
      quoteId: quote3.quoteId,
      statusToken: token3,
      idempotencyKey: crypto.randomUUID(),
    }),
  ]);
  check(
    competing.filter((r) => r.status === 'fulfilled').length === 1,
    'Concurrent capacity oversold',
  );
  const active = await service.checked(
    db
      .from('square_orders')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'checkout_pending')
      .single(),
  );
  await service.checked(
    db
      .from('square_orders')
      .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
      .eq('id', active!.id),
  );
  const expired = await service.reconcile({
    ...active,
    expires_at: new Date(Date.now() - 1000).toISOString(),
  });
  check(
    expired.status === 'checkout_expired',
    'Unpaid link not expired after provider cancellation',
  );
  await service.disconnect(businessId, userId, true);
  const closed = await service.availability(businessId);
  check(!closed.available, 'Disconnected business stayed orderable');
  console.log(
    'PASS local DB orchestration: OAuth + replay, encryption, sync, quote, concurrent duplicate checkout, guest isolation, webhook replay, payment, all owner states, pending/completed refund, concurrent last-slot reservation, checkout expiration, disconnect. Square transport was a fixture; no provider transaction occurred.',
  );
} finally {
  const orders = await db.from('square_orders').select('id').eq('business_id', businessId);
  const ids = (orders.data ?? []).map((o) => o.id);
  if (ids.length) {
    await db.from('square_order_events').delete().in('order_id', ids);
    await db.from('square_order_items').delete().in('order_id', ids);
    await db.from('square_orders').delete().in('id', ids);
  }
  await db.from('square_connections').delete().eq('business_id', businessId);
  await db.from('businesses').delete().eq('id', businessId);
  await db.from('square_webhook_inbox').delete().eq('event_id', eventId);
  await db.auth.admin.deleteUser(userId);
  await db
    .from('platform_settings')
    .update({ value: priorFlag!.value })
    .eq('key', 'square_commerce');
}
