import { planItemRefund } from './item-refunds.ts';
import { AppointmentOperations } from './appointment-operations.ts';
import { moneyPatch, squareRefundTotal } from './payment-money.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { SquareClient, type SquareObject } from './square-client.ts';
import {
  catalogProducts,
  flattenCatalog,
  parseCart,
  parsePickup,
  parseRecipient,
  parseSettings,
  pickupSlots,
  priceCart,
  orderAmounts,
  publicOrder,
  paymentPatch,
  refundPatch,
  checkTransition,
  canRefund,
  terminalStates,
} from './square-domain.ts';
import {
  CommerceError,
  canonicalJson,
  fail,
  hash,
  integer,
  opaqueToken,
  openToken,
  randomToken,
  record,
  sealToken,
  SQUARE_SCOPES,
  string,
  uuid,
  type SquareConfig,
  type SealedToken,
} from './square-security.ts';

// Service-role client is created only by the function runtime. Every client
// operation is authorized here; no direct table grants exist for app users.
export class SquareService extends AppointmentOperations {
  constructor(
    db: SupabaseClient,
    readonly config: SquareConfig,
    readonly clientFactory = (token: string) => new SquareClient(token),
  ) {
    super(db);
  }
  async rollout(businessId: string, allowAppointmentPilot = false) {
    if (!this.config.enabled)
      fail('DISABLED', 'Square Sandbox ordering has not been enabled.', 503);
    const flag = await this.checked(
      this.db.from('platform_settings').select('value').eq('key', 'square_commerce').single(),
    );
    if (flag?.value?.enabled && flag?.value?.business_ids?.includes(businessId)) return;
    if (allowAppointmentPilot) return this.appointmentRollout(businessId);
    fail('DISABLED', 'This business is not in the Square Sandbox pilot.', 503);
  }
  async connection(businessId: string) {
    return (await this.checked(
      this.db
        .from('square_connections')
        .select('*')
        .eq('business_id', businessId)
        .eq('provider', 'square')
        .maybeSingle(),
    )) as SquareObject | null;
  }
  async provider(businessId: string): Promise<{ client: SquareClient; connection: SquareObject }> {
    let connection = await this.connection(businessId);
    if (!connection || connection.state !== 'connected')
      fail('RECONNECT', 'Connect Square to continue.', 409);
    const context = `${businessId}:sandbox`;
    if (
      Date.parse(connection.expires_at) < Date.now() + 86400000 ||
      Date.parse(connection.refreshed_at) < Date.now() - 6 * 86400000 ||
      connection.key_version !== this.config.keyVersion
    ) {
      const lease = crypto.randomUUID();
      const claimed = await this.checked(
        this.db.rpc('square_connection_lease', { p_id: businessId, p_lease: lease }),
      );
      if (!claimed?.length) fail('BUSY', 'Square connection is refreshing. Retry shortly.', 409);
      connection = claimed[0];
      try {
        const refreshToken = await openToken(
          connection!.refresh_cipher as SealedToken,
          this.config.keys,
          `${context}:refresh`,
        );
        const tokens = await this.clientFactory('').request('/oauth2/token', {
          client_id: this.config.applicationId,
          client_secret: this.config.applicationSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        });
        const credentials = await this.sealCredentials(tokens, businessId, refreshToken);
        await this.checked(
          this.db
            .from('square_connections')
            .update({ ...credentials, last_error: null, last_contact_at: new Date().toISOString() })
            .eq('business_id', businessId)
            .eq('lease_id', lease),
        );
        connection = { ...connection, ...credentials };
      } catch (error) {
        if (error instanceof CommerceError && error.code === 'RECONNECT')
          await this.revokeLocal(businessId, 'authorization_expired');
        throw error;
      } finally {
        await this.checked(
          this.db
            .from('square_connections')
            .update({ lease_id: null, lease_until: null })
            .eq('business_id', businessId)
            .eq('lease_id', lease),
        );
      }
    }
    const access = await openToken(
      connection!.access_cipher as SealedToken,
      this.config.keys,
      `${context}:access`,
    );
    const client = this.clientFactory(`Bearer ${access}`);
    client.onAuthorizationFailure = () => this.revokeLocal(businessId, 'authorization_expired');
    return { client, connection: connection! };
  }
  configRedirectUrl() {
    return this.config.redirectUrl;
  }
  async sealCredentials(tokens: SquareObject, businessId: string, priorRefresh?: string) {
    const access = string(tokens.access_token, 8192);
    const refresh = string(tokens.refresh_token ?? priorRefresh, 8192);
    if (!Number.isFinite(Date.parse(tokens.expires_at)))
      fail('PROVIDER_ERROR', 'Square authorization was incomplete.', 503);
    const context = `${businessId}:sandbox`;
    return {
      access_cipher: await sealToken(
        access,
        this.config.encryptionKey,
        this.config.keyVersion,
        `${context}:access`,
      ),
      refresh_cipher: await sealToken(
        refresh,
        this.config.encryptionKey,
        this.config.keyVersion,
        `${context}:refresh`,
      ),
      key_version: this.config.keyVersion,
      expires_at: tokens.expires_at,
      refreshed_at: new Date().toISOString(),
    };
  }
  async beginOAuth(businessId: string, userId: string | null) {
    await this.owner(businessId, userId);
    await this.rollout(businessId, true);
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', businessId),
    );
    await this.ensureSettled(businessId);
    const state = randomToken();
    await this.checked(
      this.db.from('square_oauth_states').insert({
        state_hash: await hash(state),
        user_id: userId,
        business_id: businessId,
        environment: 'sandbox',
        expires_at: new Date(Date.now() + 600000).toISOString(),
      }),
    );
    const url = new URL('https://connect.squareupsandbox.com/oauth2/authorize');
    url.search = new URLSearchParams({
      client_id: this.config.applicationId,
      scope: SQUARE_SCOPES.join(' '),
      state,
      session: 'false',
      redirect_uri: this.config.redirectUrl,
    }).toString();
    return { url: url.toString() };
  }
  async finishOAuth(state: string, code: string | null) {
    const states = await this.checked(
      this.db.rpc('square_consume_oauth_state', { p_hash: await hash(opaqueToken(state)) }),
    );
    if (states?.length !== 1)
      fail(
        'INVALID_STATE',
        'Authorization expired or was already used. Connect Square again.',
        403,
      );
    const pending = states[0];
    await this.owner(pending.business_id, pending.user_id);
    await this.rollout(pending.business_id, true);
    if (!code) return { businessId: pending.business_id, connected: false };
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', pending.business_id),
    );
    await this.ensureSettled(pending.business_id);
    const tokens = await this.clientFactory('').request('/oauth2/token', {
      client_id: this.config.applicationId,
      client_secret: this.config.applicationSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.config.redirectUrl,
    });
    const merchantId = string(tokens.merchant_id, 100);
    const merchantResult = await this.clientFactory(
      `Bearer ${string(tokens.access_token, 8192)}`,
    ).request(`/v2/merchants/${encodeURIComponent(merchantId)}`);
    const merchant = Array.isArray(merchantResult.merchant)
      ? merchantResult.merchant[0]
      : merchantResult.merchant;
    if (merchant?.id !== merchantId)
      fail('PROVIDER_ERROR', 'Square merchant could not be verified.', 503);
    const credentials = await this.sealCredentials(tokens, pending.business_id);
    await this.checked(
      this.db.from('square_connections').upsert({
        business_id: pending.business_id,
        merchant_id: merchantId,
        merchant_name: string(merchant.business_name ?? merchantId),
        ...credentials,
        state: 'connected',
        location_id: null,
        location_snapshot: null,
        last_contact_at: new Date().toISOString(),
        last_error: null,
        disconnected_at: null,
        lease_id: null,
        lease_until: null,
        connected_at: new Date().toISOString(),
      }),
    );
    await this.checked(
      this.db.from('square_ordering_settings').upsert({
        business_id: pending.business_id,
        enabled: false,
        is_open: false,
        synced_at: null,
        catalog_revision: null,
      }),
    );
    if (!(await this.selectedProvider(pending.business_id)))
      await this.selectProvider(pending.business_id, pending.user_id, 'square');
    return { businessId: pending.business_id, connected: true };
  }
  async revokeLocal(businessId: string, reason: string) {
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', businessId),
    );
    await this.checked(
      this.db
        .from('square_connections')
        .update({
          state: 'revoked',
          last_error: reason,
          access_cipher: null,
          refresh_cipher: null,
          disconnected_at: new Date().toISOString(),
        })
        .eq('business_id', businessId),
    );
  }
  async ensureSettled(businessId: string) {
    const [orders, appointmentPayments, paidAppointments] = await Promise.all([
      this.checked(
        this.db
          .from('square_orders')
          .select('id')
          .eq('business_id', businessId)
          .eq('provider', 'square')
          .not('status', 'in', `(${terminalStates.join(',')})`)
          .limit(1),
      ),
      this.checked(
        this.db
          .from('appointments')
          .select('id')
          .eq('business_id', businessId)
          .in('payment_status', ['pending', 'refund_pending', 'refund_failed', 'review'])
          .limit(1),
      ),
      this.checked(
        this.db
          .from('appointments')
          .select('id')
          .eq('business_id', businessId)
          .eq('payment_status', 'paid')
          .in('status', [
            'requested',
            'confirmed',
            'checked_in',
            'in_service',
            'cancellation_pending',
            'payment_review',
          ])
          .limit(1),
      ),
    ]);
    if (orders?.length || appointmentPayments?.length || paidAppointments?.length)
      fail(
        'ACTIVE_ORDERS',
        'Complete or refund active pickups and paid appointments, and resolve pending checkouts before changing the Square connection.',
        409,
      );
  }
  async disconnect(businessId: string, userId: string | null, confirmed: unknown) {
    await this.owner(businessId, userId);
    if (confirmed !== true) fail('CONFIRM_REQUIRED', 'Confirm disconnecting Square.');
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', businessId),
    );
    await this.ensureSettled(businessId);
    const connection = await this.connection(businessId);
    if (connection?.state === 'connected') {
      const access = await openToken(
        connection.access_cipher,
        this.config.keys,
        `${businessId}:sandbox:access`,
      );
      await this.clientFactory(`Client ${this.config.applicationSecret}`).request(
        '/oauth2/revoke',
        {
          client_id: this.config.applicationId,
          access_token: access,
          revoke_only_access_token: false,
        },
      );
    }
    await this.revokeLocal(businessId, 'owner_disconnected');
    await this.checked(
      this.db
        .from('square_connections')
        .update({ state: 'disconnected' })
        .eq('business_id', businessId),
    );
    return { disconnected: true };
  }
  async ownerStatus(businessId: string, userId: string | null) {
    await this.owner(businessId, userId);
    const connection = await this.connection(businessId);
    const settings = await this.checked(
      this.db
        .from('square_ordering_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle(),
    );
    let locations: SquareObject[] = [];
    let error: string | null = null;
    if (connection?.state === 'connected') {
      try {
        const { client } = await this.provider(businessId);
        locations = (await client.pages('/v2/locations', 'locations'))
          .filter((l) => l.status === 'ACTIVE')
          .map((l) => ({
            id: l.id,
            name: l.name,
            address: l.address,
            timezone: l.timezone,
            currency: l.currency,
          }));
        const selected = locations.find((l) => l.id === connection.location_id);
        if (selected?.timezone && selected.timezone !== connection.location_snapshot?.timezone) {
          // Refresh the authoritative location zone without depending on a device locale.
          new Intl.DateTimeFormat('en-US', { timeZone: selected.timezone }).format();
          const snapshot = { ...connection.location_snapshot, timezone: selected.timezone };
          await this.checked(
            this.db
              .from('square_connections')
              .update({ location_snapshot: snapshot })
              .eq('business_id', businessId)
              .eq('location_id', selected.id),
          );
          connection.location_snapshot = snapshot;
          if (settings) {
            const refreshed = await this.checked(
              this.db
                .from('square_ordering_settings')
                .select('timezone')
                .eq('business_id', businessId)
                .single(),
            );
            if (!refreshed) fail('STORAGE_ERROR', 'Ordering settings could not be refreshed.', 503);
            settings.timezone = refreshed.timezone;
          }
        }
      } catch (e) {
        error = e instanceof CommerceError ? e.message : 'Square connection needs attention.';
      }
    }
    return {
      provider: 'square',
      activeProvider: await this.selectedProvider(businessId),
      connection: connection
        ? {
            provider: 'square',
            state: connection.state,
            merchantName: connection.merchant_name,
            locationId: connection.location_id,
            location: connection.location_snapshot,
            lastError: error ?? connection.last_error,
            lastContactAt: connection.last_contact_at,
          }
        : null,
      settings,
      locations,
    };
  }
  async selectLocation(businessId: string, userId: string | null, value: unknown) {
    await this.owner(businessId, userId);
    await this.rollout(businessId, true);
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', businessId),
    );
    await this.ensureSettled(businessId);
    const locationId = string(value, 100);
    const { client } = await this.provider(businessId);
    const location = (await client.request(`/v2/locations/${encodeURIComponent(locationId)}`))
      .location;
    if (
      !location ||
      location.status !== 'ACTIVE' ||
      !location.capabilities?.includes('CREDIT_CARD_PROCESSING')
    )
      fail('INVALID_LOCATION', 'Choose an active Square location that can accept payments.');
    const address = [
      location.address?.address_line_1,
      location.address?.address_line_2,
      location.address?.locality,
      location.address?.administrative_district_level_1,
      location.address?.postal_code,
    ]
      .filter(Boolean)
      .join(', ');
    if (!address || !location.timezone || !location.currency)
      fail(
        'INVALID_LOCATION',
        'Complete this Square location’s address, timezone and currency first.',
      );
    if (location.currency !== 'USD')
      fail('UNSUPPORTED_CURRENCY', 'The initial Sandbox pilot supports USD locations.');
    const business = await this.checked(
      this.db.from('businesses').select('timezone').eq('id', businessId).single(),
    );
    const pickupTimezone = string(
      ['UTC', 'Etc/UTC', 'GMT', 'Etc/GMT'].includes(location.timezone)
        ? business?.timezone
        : location.timezone,
      80,
    );
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: pickupTimezone }).format();
    } catch {
      fail('INVALID_TIMEZONE', 'Check this location’s time zone in Square, then retry.');
    }
    await this.checked(
      this.db
        .from('square_connections')
        .update({
          location_id: locationId,
          location_snapshot: {
            id: locationId,
            name: location.name,
            address,
            timezone: location.timezone,
            currency: location.currency,
          },
        })
        .eq('business_id', businessId),
    );
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({
          enabled: false,
          is_open: false,
          synced_at: null,
          catalog_revision: null,
          timezone: pickupTimezone,
        })
        .eq('business_id', businessId),
    );
    return { selected: true };
  }
  async sync(businessId: string, userId: string | null) {
    await this.owner(businessId, userId);
    await this.rollout(businessId);
    return this.syncCatalog(businessId);
  }
  async syncCatalog(businessId: string) {
    const { client, connection } = await this.provider(businessId);
    if (!connection.location_id) fail('SELECT_LOCATION', 'Select a Square location first.');
    const objects = flattenCatalog(
      await client.pages(
        '/v2/catalog/list?types=ITEM,ITEM_VARIATION,MODIFIER_LIST,MODIFIER,CATEGORY,TAX,IMAGE',
        'objects',
      ),
    );
    const result = catalogProducts(
      objects,
      connection.location_id,
      connection.location_snapshot.currency,
    );
    const summary = {
      variations: result.products.length,
      excluded: result.excluded,
      objects: objects.length,
    };
    await this.checked(
      this.db.rpc('square_replace_catalog', {
        p_business: businessId,
        p_location: connection.location_id,
        p_objects: objects,
        p_summary: summary,
      }),
    );
    return { summary };
  }
  async settings(businessId: string, userId: string | null, value: unknown) {
    await this.owner(businessId, userId);
    await this.rollout(businessId);
    const connection = await this.connection(businessId);
    const old = await this.checked(
      this.db.from('square_ordering_settings').select('*').eq('business_id', businessId).single(),
    );
    const parsed = parseSettings({
      ...record(value),
      timezone: connection?.location_snapshot?.timezone ?? old.timezone,
    });
    if (
      parsed.enabled &&
      (connection?.state !== 'connected' ||
        !connection.location_id ||
        !old.synced_at ||
        !old.sync_summary?.variations)
    )
      fail('SETUP_REQUIRED', 'Connect a location and synchronize available items first.');
    await this.checked(
      this.db
        .from('square_ordering_settings')
        .update({ ...parsed, updated_at: new Date().toISOString() })
        .eq('business_id', businessId),
    );
    return { saved: true };
  }
  async availability(businessId: string, includeCatalog = false) {
    await this.rollout(businessId);
    if ((await this.selectedProvider(businessId)) !== 'square')
      return { available: false as const, status: 'unsupported' as const };
    const business = await this.checked(
      this.db
        .from('businesses')
        .select('id,name,status,business_type')
        .eq('id', businessId)
        .maybeSingle(),
    );
    const connection = await this.connection(businessId);
    const settings = await this.checked(
      this.db
        .from('square_ordering_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle(),
    );
    if (
      business?.status !== 'active' ||
      connection?.state !== 'connected' ||
      !connection.location_id ||
      !settings?.synced_at ||
      !settings.enabled
    )
      return { available: false as const, status: 'unsupported' as const };
    if (!settings.is_open) return { available: false as const, status: 'paused' as const };
    try {
      const { client } = await this.provider(businessId);
      const live = (
        await client.request(`/v2/locations/${encodeURIComponent(connection.location_id)}`)
      ).location;
      if (
        live?.status !== 'ACTIVE' ||
        live.currency !== connection.location_snapshot.currency ||
        !live.capabilities?.includes('CREDIT_CARD_PROCESSING')
      )
        return { available: false as const, status: 'unavailable' as const };
      await this.checked(
        this.db
          .from('square_connections')
          .update({ last_contact_at: new Date().toISOString(), last_error: null })
          .eq('business_id', businessId),
      );
    } catch {
      return { available: false as const, status: 'unavailable' as const };
    }
    const stops = await this.checked(
      this.db
        .from('business_location_stops')
        .select('id,title,address_text,starts_at,ends_at,is_published')
        .eq('business_id', businessId)
        .eq('is_published', true)
        .gt('ends_at', new Date().toISOString())
        .order('starts_at')
        .limit(100),
    );
    let slots = pickupSlots(
      settings,
      business.business_type === 'mobile',
      stops ?? [],
      connection.location_snapshot.address,
    );
    const counts = new Map<string, number>();
    for (let offset = 0; offset < 100000; offset += 500) {
      const occupied = await this.checked(
        this.db
          .from('square_orders')
          .select('pickup_at')
          .eq('business_id', businessId)
          .gte('pickup_at', new Date().toISOString())
          .lte('pickup_at', new Date(Date.now() + 7 * 86400000).toISOString())
          .not('status', 'in', '(checkout_expired,checkout_failed,refunded)')
          .order('id')
          .range(offset, offset + 499),
      );
      for (const order of occupied ?? []) {
        const at = new Date(order.pickup_at).toISOString();
        counts.set(at, (counts.get(at) ?? 0) + 1);
      }
      if ((occupied?.length ?? 0) < 500) break;
      if (offset === 99500) return { available: false as const, status: 'unavailable' as const };
    }
    slots = slots.filter((s) => (counts.get(s.at) ?? 0) < settings.max_orders_per_slot);
    if (!slots.length) return { available: false as const, status: 'no_slots' as const };
    const catalog = await this.catalog(businessId);
    const { products } = catalogProducts(
      catalog,
      connection.location_id,
      connection.location_snapshot.currency,
    );
    if (!products.length) return { available: false as const, status: 'unavailable' as const };
    return {
      available: true as const,
      status: 'open' as const,
      businessName: business.name,
      location: connection.location_snapshot,
      slots,
      ...(includeCatalog ? { products } : {}),
    };
  }
  async catalog(businessId: string) {
    const objects: SquareObject[] = [];
    for (let start = 0; start < 50000; start += 500) {
      const rows = await this.checked(
        this.db
          .from('square_catalog')
          .select('payload')
          .eq('business_id', businessId)
          .order('object_id')
          .range(start, start + 499),
      );
      objects.push(...(rows ?? []).map((r) => r.payload));
      if ((rows?.length ?? 0) < 500) return objects;
    }
    fail('CATALOG_LIMIT', 'This catalog needs support.', 503);
  }
  async calculate(
    businessId: string,
    cart: ReturnType<typeof parseCart>,
    reward: SquareObject | null = null,
  ) {
    const { client, connection } = await this.provider(businessId);
    const mirror = await this.catalog(businessId);
    // Reject unsynchronized IDs first, then retrieve current objects and related
    // modifiers/items from Square. Catalog versions freeze the accepted price.
    const mirrored = catalogProducts(
      mirror,
      connection.location_id,
      connection.location_snapshot.currency,
    ).products;
    priceCart(cart, mirrored);
    const ids = [
      ...new Set(
        cart.flatMap((line) => {
          const p = mirrored.find((i) => i.id === line.variationId)!;
          return [
            p.itemId,
            p.id,
            ...p.groups.map((g) => g.id),
            ...p.groups.flatMap((g) => g.modifiers.map((m) => m.id)),
          ];
        }),
      ),
    ];
    const fresh = await client.request('/v2/catalog/batch-retrieve', {
      object_ids: ids,
      include_related_objects: true,
    });
    const products = catalogProducts(
      [...(fresh.objects ?? []), ...(fresh.related_objects ?? [])],
      connection.location_id,
      connection.location_snapshot.currency,
    ).products;
    if (reward?.version === 2) {
      const base =
        reward.type === 'percent_discount'
          ? cart.reduce(
              (sum, line) =>
                sum + (products.find((p) => p.id === line.variationId)?.price ?? 0) * line.quantity,
              0,
            )
          : (products.find((p) => p.id === reward.variationId)?.price ?? 0);
      const freshDiscount = Math.floor(
        base *
          (['percent_discount', 'item_discount'].includes(reward.type) ? reward.percent / 100 : 1),
      );
      if (freshDiscount !== reward.discountMinor)
        fail(
          'PRICE_CHANGED',
          'The reward item price changed. Refresh the menu before choosing your reward.',
          409,
        );
    }
    const order = {
      location_id: connection.location_id,
      line_items: priceCart(cart, products).map((line, index) =>
        reward && reward.type !== 'percent_discount' && index === reward.lineIndex
          ? { ...line, applied_discounts: [{ discount_uid: 'sds-reward' }] }
          : line,
      ),
      pricing_options: { auto_apply_taxes: true, auto_apply_discounts: false },
      ...(reward
        ? {
            discounts: [
              {
                uid: 'sds-reward',
                name: string(reward.label ?? 'Rewards discount', 500),
                type: 'FIXED_AMOUNT',
                amount_money: {
                  amount: integer(reward.discountMinor, 1, 10000000),
                  currency: connection.location_snapshot.currency,
                },
                scope: reward.type === 'percent_discount' ? 'ORDER' : 'LINE_ITEM',
              },
            ],
          }
        : {}),
    };
    const calculated = (await client.request('/v2/orders/calculate', { order })).order;
    const amounts = orderAmounts(calculated);
    if (amounts.currency !== connection.location_snapshot.currency)
      fail('CURRENCY_MISMATCH', 'The catalog currency changed. Refresh the menu.');
    return { client, connection, order, calculated, amounts };
  }
  async quote(businessId: string, body: SquareObject, userId: string | null) {
    const guestHash = await hash(opaqueToken(body.statusToken));
    const cart = parseCart(body.cart);
    const pickup = parsePickup(body.pickup);
    const availability = await this.availability(businessId);
    if (!availability.available)
      fail('ORDERING_CLOSED', 'Pickup ordering is currently closed.', 409);
    const slot = availability.slots.find((s) => s.at === pickup.at && s.stopId === pickup.stopId);
    if (!slot) fail('INVALID_SLOT', 'Choose an available pickup time.', 409);
    const base = await this.calculate(businessId, cart);
    const products = catalogProducts(
      await this.catalog(businessId),
      base.connection.location_id,
      base.connection.location_snapshot.currency,
    ).products;
    const reward = await this.checkoutReward(
      businessId,
      userId,
      cart,
      products,
      body.rewardSelection,
      'square',
    );
    const { order, calculated, amounts, connection } = reward
      ? await this.calculate(businessId, cart, reward)
      : base;
    const payload = {
      cart,
      slot,
      order,
      calculated,
      amounts,
      merchantId: connection.merchant_id,
      locationId: connection.location_id,
      businessName: availability.businessName,
      reward,
    };
    const quote = await this.checked(
      this.db
        .from('square_quotes')
        .insert({ business_id: businessId, guest_hash: guestHash, payload })
        .select('id,expires_at')
        .single(),
    );
    return {
      quoteId: quote!.id,
      expiresAt: quote!.expires_at,
      subtotal: amounts.subtotal_minor + (reward?.discountMinor ?? 0),
      tax: amounts.tax_minor,
      tip: 0,
      total: amounts.total_minor,
      currency: amounts.currency,
      slot,
      reward: reward
        ? {
            type: reward.type,
            label: reward.label,
            discountMinor: reward.discountMinor,
            variationId: reward.variationId,
          }
        : null,
    };
  }
  async checkout(businessId: string, userId: string | null, body: SquareObject) {
    const guestHash = await hash(opaqueToken(body.statusToken));
    const key = uuid(body.idempotencyKey);
    const quoteId = uuid(body.quoteId);
    const recipient = parseRecipient(body.recipient);
    const requestHash = await hash(JSON.stringify({ businessId, quoteId, recipient }));
    const existing = await this.checked(
      this.db.from('square_orders').select('*').eq('idempotency_key', key).maybeSingle(),
    );
    if (existing) {
      if (
        existing.provider === 'stripe' ||
        existing.guest_hash !== guestHash ||
        existing.request_hash !== requestHash
      )
        fail('IDEMPOTENCY_CONFLICT', 'This checkout request does not match.', 409);
      return await this.ensureCheckout(existing);
    }
    const quote = await this.checked(
      this.db
        .from('square_quotes')
        .select('*')
        .eq('id', quoteId)
        .eq('business_id', businessId)
        .eq('guest_hash', guestHash)
        .maybeSingle(),
    );
    if (!quote || Date.parse(quote.expires_at) <= Date.now())
      fail('QUOTE_EXPIRED', 'Refresh the order total before checkout.', 409);
    const q = quote.payload;
    const live = await this.availability(businessId);
    if (
      !live.available ||
      !live.slots.some((s) => s.at === q.slot.at && s.stopId === q.slot.stopId)
    )
      fail('INVALID_SLOT', 'This pickup time is no longer available.', 409);
    const products = catalogProducts(
      await this.catalog(businessId),
      q.locationId,
      q.amounts.currency,
    ).products;
    const freshReward = await this.checkoutReward(
      businessId,
      userId,
      q.cart,
      products,
      q.reward?.selection,
      'square',
    );
    if (canonicalJson(freshReward) !== canonicalJson(q.reward ?? null))
      fail('REWARD_CHANGED', 'Your rewards balance or cart changed. Review the order again.', 409);
    const fresh = await this.calculate(businessId, q.cart, freshReward);
    if (
      canonicalJson(fresh.amounts) !== canonicalJson(q.amounts) ||
      fresh.connection.merchant_id !== q.merchantId ||
      fresh.connection.location_id !== q.locationId ||
      canonicalJson(fresh.order) !== canonicalJson(q.order)
    )
      fail('PRICE_CHANGED', 'The menu changed. Review a fresh total before paying.', 409);
    const id = crypto.randomUUID();
    const providerOrder = {
      ...fresh.order,
      reference_id: id,
      fulfillments: [
        {
          uid: 'pickup',
          type: 'PICKUP',
          state: 'PROPOSED',
          pickup_details: {
            recipient,
            schedule_type: 'SCHEDULED',
            pickup_at: q.slot.at,
            note: `Pickup: ${q.slot.address}`,
          },
        },
      ],
    };
    const providerRequest = {
      idempotency_key: key,
      order: providerOrder,
      checkout_options: {
        allow_tipping: false,
        ask_for_shipping_address: false,
        enable_coupon: false,
        enable_loyalty: false,
        redirect_url: `${this.config.redirectUrl}?checkout=${id}`,
      },
    };
    const order = await this.checked(
      this.db.rpc('square_reserve_order', {
        p_order: {
          id,
          business_id: businessId,
          business_name: q.businessName,
          customer_id: userId,
          guest_hash: guestHash,
          merchant_id: q.merchantId,
          location_id: q.locationId,
          stop_id: q.slot.stopId,
          pickup_at: q.slot.at,
          pickup_timezone: q.slot.timezone,
          pickup_address: q.slot.address,
          recipient,
          ...fresh.amounts,
          idempotency_key: key,
          request_hash: requestHash,
          provider_request: providerRequest,
          loyalty_membership_id: freshReward?.membershipId ?? null,
          loyalty_reward: freshReward,
        },
        p_items: fresh.calculated.line_items ?? [],
      }),
    );
    return await this.ensureCheckout(order);
  }
  async createProviderCheckout(order: SquareObject, lease: string, client: SquareClient) {
    if (order.payment_link_id) return order;
    const response = await client.request(
      '/v2/online-checkout/payment-links',
      order.provider_request,
    );
    const link = response.payment_link;
    if (!link?.id || !link.order_id || !/^https:\/\//.test(link.url))
      fail('PROVIDER_ERROR', 'Square checkout is not ready. Retry safely.', 503);
    const actual =
      response.related_resources?.orders?.find((o: SquareObject) => o.id === link.order_id) ??
      (await client.request(`/v2/orders/${encodeURIComponent(link.order_id)}`)).order;
    if (
      actual?.location_id !== order.location_id ||
      actual?.reference_id !== order.id ||
      actual.total_money?.amount !== Number(order.total_minor) ||
      actual.total_money?.currency !== order.currency
    ) {
      await client.request(
        `/v2/online-checkout/payment-links/${encodeURIComponent(link.id)}`,
        undefined,
        'DELETE',
      );
      const cancelled = (await client.request(`/v2/orders/${encodeURIComponent(link.order_id)}`))
        .order;
      await this.patchOrder(order.id, lease, {
        status:
          cancelled?.state === 'CANCELED' && !(cancelled.tenders ?? []).length
            ? 'checkout_failed'
            : 'payment_review',
        payment_link_id: link.id,
        square_order_id: link.order_id,
        checkout_url: null,
        provider_status: 'PRICE_CHANGED',
      });
      fail('PRICE_CHANGED', 'The price changed. Review a fresh total before paying.', 409);
    }
    return this.patchOrder(order.id, lease, {
      payment_link_id: link.id,
      square_order_id: link.order_id,
      checkout_url: link.url,
    });
  }
  async ensureCheckout(order: SquareObject) {
    if (order.provider === 'stripe') fail('NOT_FOUND', 'Order not found.', 404);
    if (order.status !== 'checkout_pending') return { order: await this.orderProjection(order) };
    if (Date.parse(order.expires_at) <= Date.now())
      fail(
        'CHECKOUT_EXPIRED',
        'This checkout expired. Refresh order status before starting again.',
        409,
      );
    if (order.checkout_url) return { order: await this.orderProjection(order) };
    return await this.withOrderLease(order.id, null, async (locked, lease) => {
      if (locked.status !== 'checkout_pending')
        return { order: await this.orderProjection(locked) };
      if (Date.parse(locked.expires_at) <= Date.now())
        fail(
          'CHECKOUT_EXPIRED',
          'This checkout expired. Refresh order status before starting again.',
          409,
        );
      const { client, connection } = await this.provider(locked.business_id);
      if (connection.merchant_id !== locked.merchant_id)
        fail(
          'CONNECTION_CHANGED',
          'This order belongs to the original Square seller. Resolve it in that seller’s Square Dashboard.',
          409,
        );
      return {
        order: await this.orderProjection(await this.createProviderCheckout(locked, lease, client)),
      };
    });
  }
  async reconcile(order: SquareObject, eventId?: string) {
    if (order.provider === 'stripe') fail('NOT_FOUND', 'Order not found.', 404);
    if (
      !order.business_id ||
      order.status === 'refunded' ||
      order.provider_status === 'REWARD_COVERED'
    )
      return order;
    return await this.withOrderLease(order.id, null, async (locked, lease) => {
      const { client, connection } = await this.provider(locked.business_id);
      if (connection.merchant_id !== locked.merchant_id)
        fail(
          'CONNECTION_CHANGED',
          'This order belongs to the original Square seller. Resolve it in that seller’s Square Dashboard.',
          409,
        );
      if (!locked.square_order_id)
        locked = await this.createProviderCheckout(locked, lease, client);
      const remote = (
        await client.request(`/v2/orders/${encodeURIComponent(locked.square_order_id)}`)
      ).order;
      if (remote.location_id !== locked.location_id || remote.reference_id !== locked.id)
        fail('ORDER_MISMATCH', 'Square order needs review.', 409);
      // The provider may have accepted a refund before the response or database
      // write failed. Replay its stable key rather than leaving refund_pending
      // dependent on a webhook that may already have been delivered.
      if (locked.status === 'refund_pending' && locked.refund_key && !locked.square_refund_id) {
        const refund = (
          await client.request('/v2/refunds', {
            idempotency_key: locked.refund_key,
            payment_id: locked.square_payment_id,
            amount_money: {
              amount: Number(locked.refund_amount_minor ?? locked.total_minor),
              currency: locked.currency,
            },
            reason: 'Pickup order cancelled by business',
          })
        ).refund;
        const patch = refundPatch(locked, refund);
        if (patch) locked = await this.patchOrder(locked.id, lease, patch);
      }
      for (const tender of remote.tenders ?? []) {
        if (!tender.payment_id) continue;
        const payment = (
          await client.request(`/v2/payments/${encodeURIComponent(tender.payment_id)}`)
        ).payment;
        const patch = paymentPatch(locked, payment);
        if (patch) locked = await this.patchOrder(locked.id, lease, patch);
        const refunds: SquareObject[] = [];
        for (const refundId of payment.refund_ids ?? []) {
          const refund = (await client.request(`/v2/refunds/${encodeURIComponent(refundId)}`))
            .refund;
          refunds.push(refund);
        }
        if (refunds.length)
          locked = await this.patchOrder(
            locked.id,
            lease,
            squareRefundTotal(locked, payment, refunds),
          );
      }
      if (locked.square_refund_id && locked.status !== 'refunded') {
        const refund = (
          await client.request(`/v2/refunds/${encodeURIComponent(locked.square_refund_id)}`)
        ).refund;
        const patch = refundPatch(locked, refund);
        if (patch) locked = await this.patchOrder(locked.id, lease, patch);
      }
      if (locked.status === 'checkout_pending' && Date.parse(locked.expires_at) <= Date.now()) {
        if (remote.state !== 'CANCELED')
          await client.request(
            `/v2/online-checkout/payment-links/${encodeURIComponent(locked.payment_link_id)}`,
            undefined,
            'DELETE',
          );
        const verified = (
          await client.request(`/v2/orders/${encodeURIComponent(locked.square_order_id)}`)
        ).order;
        // Never release a reservation until cancellation is authoritative.
        if (verified.state === 'CANCELED' && !(verified.tenders ?? []).length)
          locked = await this.patchOrder(locked.id, lease, {
            status: 'checkout_expired',
            checkout_url: null,
            provider_status: 'CANCELED',
          });
      }
      locked = await this.patchOrder(locked.id, lease, {
        last_reconciled_at: new Date().toISOString(),
      });
      if (eventId)
        await this.checked(
          this.db.from('square_order_events').insert({
            order_id: locked.id,
            actor_type: 'square',
            to_state: locked.status,
            provider_event_id: eventId,
          }),
        );
      return locked;
    });
  }
  async status(id: string, userId: string | null, token: unknown) {
    let order = await this.authorizeOrder(id, userId, token);
    if (order.provider === 'stripe') fail('NOT_FOUND', 'Order not found.', 404);
    if (['checkout_pending', 'refund_pending'].includes(order.status)) {
      try {
        order = await this.reconcile(order);
      } catch (e) {
        if (!(e instanceof CommerceError)) throw e;
      }
    }
    return await this.customerOrderProjection(order);
  }
  /** Customer history is a read-only projection, never payment reconciliation. */
  async refund(id: string, userId: string | null, body: SquareObject) {
    const authorized = await this.authorizeOrder(id, userId, null, true);
    if (authorized.provider === 'stripe') fail('NOT_FOUND', 'Order not found.', 404);
    if (body.confirmed !== true) fail('CONFIRM_REQUIRED', 'Confirm the full refund.');
    if (authorized.paid_at && !authorized.dispute_state) await this.reconcile(authorized);
    return await this.withOrderLease(
      id,
      integer(body.version, 1, 10000000),
      async (order, lease) => {
        if (order.status === 'refunded') return { order: await this.orderProjection(order, true) };
        if (Number(order.total_minor) === 0 && order.provider_status === 'REWARD_COVERED') {
          if (body.items !== undefined || body.amountMinor !== undefined)
            fail('INVALID_REFUND_ITEMS', 'Cancel the whole reward order to restore the reward.');
          return this.cancelCoveredOrder(order, lease, userId);
        }
        if (order.dispute_state && !['WON', 'RESOLVED'].includes(order.dispute_state))
          fail('DISPUTE_OPEN', 'Resolve this dispute in Square Dashboard before refunding.', 409);
        if (
          !canRefund(order.status) &&
          !['refund_pending', 'payment_review'].includes(order.status)
        )
          fail('INVALID_TRANSITION', 'This order cannot be refunded here.', 409);
        if (!order.square_payment_id) fail('PAYMENT_PENDING', 'Payment is not confirmed.', 409);
        const { client, connection } = await this.provider(order.business_id);
        if (connection.merchant_id !== order.merchant_id)
          fail(
            'CONNECTION_CHANGED',
            'Reconnect the original Square seller or refund through its Square Dashboard.',
            409,
          );
        const retryFailed = order.status !== 'refund_pending';
        const key = retryFailed ? crypto.randomUUID() : (order.refund_key ?? crypto.randomUUID());
        if (body.amountMinor !== undefined)
          fail('INVALID_REFUND_ITEMS', 'Choose items to refund instead of entering an amount.');
        const plan =
          order.status !== 'refund_pending' && body.items !== undefined
            ? planItemRefund(
                order,
                (await this.checked(
                  this.db.from('square_order_items').select('id,snapshot').eq('order_id', id),
                )) ?? [],
                body.items,
                key,
              )
            : null;
        const amount =
          order.status === 'refund_pending' && order.refund_amount_minor
            ? Number(order.refund_amount_minor)
            : (plan?.amount ??
              integer(
                Number(order.total_minor) - Number(order.refunded_minor ?? 0),
                1,
                Number(order.total_minor),
              ));
        order = await this.patchOrder(id, lease, {
          status: 'refund_pending',
          refund_key: key,
          refund_amount_minor: amount,
          ...(plan ? { item_refunds: plan.history } : {}),
          ...(retryFailed ? { square_refund_id: null } : {}),
        });
        const refund = (
          order.square_refund_id
            ? await client.request(`/v2/refunds/${encodeURIComponent(order.square_refund_id)}`)
            : await client.request('/v2/refunds', {
                idempotency_key: key,
                payment_id: order.square_payment_id,
                amount_money: { amount, currency: order.currency },
                reason: 'Pickup order cancelled by business',
              })
        ).refund;
        refundPatch(order, refund); // Validate payment, currency, amount and provider state before any partial settlement.
        if (refund.amount_money?.amount !== amount)
          fail('REFUND_MISMATCH', 'The refund amount changed. Refresh and retry.', 409);
        const patch =
          amount < Number(order.total_minor)
            ? refund.status === 'COMPLETED'
              ? moneyPatch(order, Number(order.refunded_minor ?? 0) + amount)
              : {
                  status: refund.status === 'PENDING' ? 'refund_pending' : 'refund_failed',
                  square_refund_id: refund.id,
                }
            : refundPatch(order, refund);
        if (patch)
          order = await this.patchOrder(id, lease, { ...patch, square_refund_id: refund.id });
        await this.checked(
          this.db.from('square_order_events').insert({
            order_id: id,
            actor_type: 'owner',
            actor_id: userId,
            to_state: order.status,
          }),
        );
        return { order: await this.orderProjection(order, true) };
      },
    );
  }

  async appointmentWebhookEvent(event: SquareObject, connections: SquareObject[]) {
    if (event.event_type.startsWith('refund.'))
      return this.appointmentRefundWebhookEvent(event, connections);
    if (
      !/^(payment\.(created|updated)|order\.(created|updated|fulfillment.updated))$/.test(
        event.event_type,
      )
    )
      return false;
    if (typeof event.object_id !== 'string' || !event.object_id)
      fail('WEBHOOK_INVALID', 'Square event needs review.', 400);
    for (const connection of connections) {
      const { client } = await this.provider(connection.business_id);
      let squareOrderId: string | null = null;
      if (event.event_type.startsWith('payment.')) {
        squareOrderId =
          (await client.request(`/v2/payments/${encodeURIComponent(event.object_id)}`)).payment
            ?.order_id ?? null;
      } else {
        squareOrderId = event.object_id;
      }
      if (!squareOrderId) continue;
      const order = (await client.request(`/v2/orders/${encodeURIComponent(squareOrderId)}`)).order;
      if (!/^[0-9a-f-]{36}$/i.test(order?.reference_id ?? '')) continue;
      const appointment = await this.checked(
        this.db
          .from('appointments')
          .select('*')
          .eq('business_id', connection.business_id)
          .eq('id', order.reference_id)
          .maybeSingle(),
      );
      if (!appointment) continue;
      if (!appointment.square_order_id)
        fail('CHECKOUT_PROCESSING', 'Appointment checkout is still being saved.', 409);
      if (
        appointment.square_order_id !== squareOrderId ||
        connection.merchant_id !== event.merchant_id ||
        order.location_id !== connection.location_id ||
        order.total_money?.amount !== Number(appointment.amount_due_minor) ||
        order.total_money?.currency !== appointment.currency
      )
        fail('PAYMENT_MISMATCH', 'Square appointment payment needs review.', 409);
      let completed: SquareObject | null = null;
      for (const tender of order.tenders ?? []) {
        if (!tender.payment_id) continue;
        const payment = (
          await client.request(`/v2/payments/${encodeURIComponent(tender.payment_id)}`)
        ).payment;
        if (payment?.status === 'COMPLETED') completed = payment;
      }
      if (completed) {
        if (
          completed.order_id !== squareOrderId ||
          completed.amount_money?.amount !== Number(appointment.amount_due_minor) ||
          completed.amount_money?.currency !== appointment.currency
        )
          fail('PAYMENT_MISMATCH', 'Square appointment payment needs review.', 409);
        await this.checked(
          this.db.rpc('apply_appointment_provider_payment', {
            p_appointment_id: appointment.id,
            p_square_order_id: squareOrderId,
            p_square_payment_id: completed.id,
            p_payment_state: 'COMPLETED',
          }),
        );
      } else if (order.state === 'CANCELED' && !(order.tenders ?? []).length) {
        await this.checked(
          this.db.rpc('apply_appointment_provider_payment', {
            p_appointment_id: appointment.id,
            p_square_order_id: squareOrderId,
            p_square_payment_id: null,
            p_payment_state: 'CANCELED',
          }),
        );
      }
      return true;
    }
    return false;
  }

  async appointmentRefundWebhookEvent(event: SquareObject, connections: SquareObject[]) {
    if (!/^refund\.(created|updated)$/.test(event.event_type)) return false;
    if (typeof event.object_id !== 'string' || !event.object_id)
      fail('WEBHOOK_INVALID', 'Square refund event needs review.', 400);
    for (const connection of connections) {
      const { client } = await this.provider(connection.business_id);
      const refund = (await client.request(`/v2/refunds/${encodeURIComponent(event.object_id)}`))
        .refund;
      if (!refund?.payment_id) continue;
      const payment = (
        await client.request(`/v2/payments/${encodeURIComponent(refund.payment_id)}`)
      ).payment;
      if (!payment?.order_id) continue;
      const order = (await client.request(`/v2/orders/${encodeURIComponent(payment.order_id)}`))
        .order;
      if (!/^[0-9a-f-]{36}$/i.test(order?.reference_id ?? '')) continue;
      const appointment = await this.checked(
        this.db
          .from('appointments')
          .select('*')
          .eq('business_id', connection.business_id)
          .eq('id', order.reference_id)
          .maybeSingle(),
      );
      if (!appointment) continue;
      if (
        connection.merchant_id !== event.merchant_id ||
        refund.location_id !== connection.location_id ||
        payment.location_id !== connection.location_id ||
        order.location_id !== connection.location_id ||
        order.reference_id !== appointment.id ||
        appointment.square_order_id !== order.id ||
        appointment.square_payment_id !== payment.id ||
        payment.order_id !== order.id ||
        payment.status !== 'COMPLETED'
      )
        fail('REFUND_MISMATCH', 'Square appointment refund needs review.', 409);

      const savedAttempt = await this.checked(
        this.db
          .from('appointment_refunds')
          .select('idempotency_key')
          .eq('square_refund_id', refund.id)
          .maybeSingle(),
      );
      const justStartedAttempt =
        appointment.payment_status === 'refund_pending' &&
        !appointment.square_refund_id &&
        appointment.square_refund_key &&
        Date.parse(refund.created_at) >= Date.parse(appointment.updated_at) - 5000;
      const idempotencyKey =
        savedAttempt?.idempotency_key ??
        (justStartedAttempt ? appointment.square_refund_key : null);
      if (
        payment.total_money?.amount !== Number(appointment.amount_due_minor) ||
        payment.total_money?.currency !== appointment.currency ||
        !Number.isSafeInteger(refund.amount_money?.amount) ||
        refund.amount_money.amount < 1 ||
        refund.amount_money.amount > Number(appointment.amount_due_minor) ||
        refund.amount_money?.currency !== appointment.currency ||
        !['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'].includes(refund.status)
      )
        fail('REFUND_MISMATCH', 'Square appointment refund needs review.', 409);
      await this.checked(
        this.db.rpc('apply_appointment_provider_refund', {
          p_appointment_id: appointment.id,
          p_square_payment_id: payment.id,
          p_square_refund_id: refund.id,
          p_idempotency_key: idempotencyKey,
          p_amount_minor: refund.amount_money.amount,
          p_currency: refund.amount_money.currency,
          p_refund_state: refund.status,
        }),
      );
      return true;
    }
    return false;
  }

  async webhookEvent(event: SquareObject) {
    const rows = await this.checked(this.db.rpc('square_webhook_claim', { p_id: event.event_id }));
    if (!rows?.length) return;
    try {
      const connections = await this.checked(
        this.db
          .from('square_connections')
          .select('business_id,connected_at,merchant_id,location_id')
          .eq('merchant_id', event.merchant_id),
      );
      if (event.event_type === 'oauth.authorization.revoked') {
        for (const c of connections ?? [])
          if (Date.parse(event.occurred_at) >= Date.parse(c.connected_at))
            await this.revokeLocal(c.business_id, 'authorization_revoked');
      } else if (event.event_type === 'catalog.version.updated') {
        for (const c of connections ?? []) await this.syncCatalog(c.business_id);
      } else if (event.event_type.startsWith('dispute.')) {
        for (const c of connections ?? []) {
          const { client } = await this.provider(c.business_id);
          const dispute = (
            await client.request('/v2/disputes/' + encodeURIComponent(string(event.object_id, 100)))
          ).dispute;
          const paymentId = dispute?.disputed_payment?.payment_id;
          if (!paymentId || dispute.location_id !== c.location_id)
            fail('DISPUTE_MISMATCH', 'The Square dispute needs review.', 409);
          const payment = (await client.request('/v2/payments/' + encodeURIComponent(paymentId)))
            .payment;
          const order = await this.checked(
            this.db
              .from('square_orders')
              .select('*')
              .eq('business_id', c.business_id)
              .eq('square_payment_id', paymentId)
              .maybeSingle(),
          );
          const state = ['LOST', 'ACCEPTED'].includes(dispute.state)
            ? 'LOST'
            : dispute.state === 'WON'
              ? 'WON'
              : dispute.state === 'INQUIRY_CLOSED'
                ? 'RESOLVED'
                : dispute.state;
          if (order) {
            if (
              order.merchant_id !== event.merchant_id ||
              order.location_id !== dispute.location_id ||
              payment.id !== order.square_payment_id ||
              payment.order_id !== order.square_order_id ||
              dispute.amount_money?.currency !== order.currency ||
              !Number.isSafeInteger(dispute.amount_money?.amount) ||
              dispute.amount_money.amount < 1 ||
              dispute.amount_money.amount > Number(order.total_minor)
            )
              fail('DISPUTE_MISMATCH', 'The Square dispute needs review.', 409);
            await this.withOrderLease(order.id, null, async (locked, lease) =>
              this.patchOrder(
                order.id,
                lease,
                moneyPatch(locked, Number(locked.refunded_minor ?? 0), false, {
                  id: dispute.id,
                  state,
                  amount: dispute.amount_money.amount,
                }),
              ),
            );
          } else {
            const appointment = await this.checked(
              this.db
                .from('appointments')
                .select('*')
                .eq('business_id', c.business_id)
                .eq('square_payment_id', paymentId)
                .maybeSingle(),
            );
            if (appointment) {
              if (
                appointment.square_order_id !== payment.order_id ||
                dispute.amount_money?.currency !== appointment.currency ||
                !Number.isSafeInteger(dispute.amount_money?.amount) ||
                dispute.amount_money.amount < 1 ||
                dispute.amount_money.amount > Number(appointment.amount_due_minor)
              )
                fail('DISPUTE_MISMATCH', 'The Square dispute needs review.', 409);
              await this.checked(
                this.db.rpc('apply_appointment_dispute', {
                  p_appointment: appointment.id,
                  p_payment: paymentId,
                  p_id: dispute.id,
                  p_state: state,
                }),
              );
            }
          }
        }
      } else if (
        /^(payment\.(created|updated)|refund\.(created|updated)|order\.(created|updated|fulfillment.updated))$/.test(
          event.event_type,
        )
      ) {
        const appointmentHandled = await this.appointmentWebhookEvent(event, connections ?? []);
        if (!appointmentHandled)
          for (const c of connections ?? []) {
            const { client } = await this.provider(c.business_id);
            let orderId: string | null = null;
            if (event.event_type.startsWith('payment.'))
              orderId = (
                await client.request(`/v2/payments/${encodeURIComponent(event.object_id)}`)
              ).payment?.order_id;
            else if (event.event_type.startsWith('refund.')) {
              const refund = (
                await client.request(`/v2/refunds/${encodeURIComponent(event.object_id)}`)
              ).refund;
              orderId = (
                await client.request(`/v2/payments/${encodeURIComponent(refund.payment_id)}`)
              ).payment?.order_id;
            } else orderId = event.object_id;
            if (!orderId) continue;
            const remote = (await client.request(`/v2/orders/${encodeURIComponent(orderId)}`))
              .order;
            if (!/^[0-9a-f-]{36}$/i.test(remote.reference_id ?? '')) continue;
            const order = await this.checked(
              this.db
                .from('square_orders')
                .select('*')
                .eq('business_id', c.business_id)
                .eq('id', remote.reference_id)
                .maybeSingle(),
            );
            if (
              order &&
              order.merchant_id === event.merchant_id &&
              order.location_id === remote.location_id
            ) {
              // A webhook may arrive before the checkout request saves its IDs.
              if (!order.square_order_id)
                fail('CHECKOUT_PROCESSING', 'Checkout is still being created.', 409);
              await this.reconcile(order, event.event_id);
            }
          }
      }
      await this.checked(
        this.db
          .from('square_webhook_inbox')
          .update({ processed_at: new Date().toISOString(), lease_until: null, last_error: null })
          .eq('event_id', event.event_id),
      );
    } catch (error) {
      await this.checked(
        this.db
          .from('square_webhook_inbox')
          .update({
            lease_until: null,
            last_error: error instanceof CommerceError ? error.code : 'PROCESSING_ERROR',
          })
          .eq('event_id', event.event_id),
      );
      throw error;
    }
  }
  async maintenance() {
    const pending = await this.checked(
      this.db
        .from('square_webhook_inbox')
        .select('*')
        .is('processed_at', null)
        .order('received_at')
        .limit(20),
    );
    let retried = 0;
    let reconciled = 0;
    let failures = 0;
    for (const event of pending ?? []) {
      try {
        await this.webhookEvent(event);
        retried++;
      } catch {
        failures++;
      }
    }
    const orders = await this.checked(
      this.db
        .from('square_orders')
        .select('*')
        .eq('provider', 'square')
        .in('status', [
          'checkout_pending',
          'refund_pending',
          'placed',
          'accepted',
          'preparing',
          'ready',
          'completed',
          'payment_review',
          'refund_failed',
        ])
        .or(`status.neq.completed,completed_at.gt.${new Date(Date.now() - 86400000).toISOString()}`)
        .order('last_reconciled_at', { nullsFirst: true })
        .limit(20),
    );
    for (const order of orders ?? []) {
      try {
        await this.reconcile(order);
        reconciled++;
      } catch {
        failures++;
      }
    }
    const connections = await this.checked(
      this.db
        .from('square_connections')
        .select('business_id')
        .eq('provider', 'square')
        .eq('state', 'connected')
        .order('refreshed_at')
        .limit(10),
    );
    for (const c of connections ?? []) {
      try {
        await this.provider(c.business_id);
      } catch {
        failures++;
      }
    }
    const pendingAppointments = await this.checked(
      this.db
        .from('appointments')
        .select('*')
        .eq('status', 'payment_pending')
        .order('hold_expires_at', { ascending: true })
        .limit(10),
    );
    for (const appointment of pendingAppointments ?? []) {
      try {
        await this.reconcileAppointmentPayment(appointment);
        reconciled++;
      } catch {
        failures++;
      }
    }
    const pendingAppointmentRefunds = await this.checked(
      this.db
        .from('appointments')
        .select('*')
        .eq('payment_status', 'refund_pending')
        .order('updated_at')
        .limit(10),
    );
    for (const appointment of pendingAppointmentRefunds ?? []) {
      try {
        if (appointment.status === 'cancellation_pending' && appointment.square_refund_key)
          await this.ensureAppointmentRefund(appointment);
        else await this.reconcileAppointmentRefunds(appointment);
        reconciled++;
      } catch {
        failures++;
      }
    }
    await this.checked(
      this.db
        .from('square_quotes')
        .delete()
        .lt('expires_at', new Date(Date.now() - 86400000).toISOString()),
    );
    await this.checked(
      this.db
        .from('square_oauth_states')
        .delete()
        .lt('expires_at', new Date(Date.now() - 86400000).toISOString()),
    );
    await this.checked(
      this.db
        .from('square_request_buckets')
        .delete()
        .lt('started_at', new Date(Date.now() - 86400000).toISOString()),
    );
    await this.checked(
      this.db
        .from('square_orders')
        .update({
          recipient: {},
          provider_request: {},
          guest_hash: null,
          checkout_url: null,
          anonymized_at: new Date().toISOString(),
        })
        .is('anonymized_at', null)
        .in('status', terminalStates)
        .lt('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    );
    return { retried, reconciled, failures };
  }
  async route(body: SquareObject, userId: string | null) {
    if (body.action === 'resolve_payment_review')
      return this.resolvePaymentReview(uuid(body.orderId), userId, body);
    const action = string(body.action, 40);
    if (action === 'my_event_review_candidates') return this.customerEventReviewCandidates(userId);
    if (action === 'submit_event_review')
      return this.submitVerifiedEventReview(uuid(body.eventId), userId, body);
    if (action === 'appointment_status')
      return this.customerAppointmentStatus(uuid(body.appointmentId), userId, body.statusToken);
    if (action === 'appointment_customer_action')
      return this.customerAppointmentAction(uuid(body.appointmentId), userId, body);
    if (action === 'appointment_customer_reschedule')
      return this.customerAppointmentReschedule(uuid(body.appointmentId), userId, body);
    if (action === 'appointment_public') return this.publicAppointments(uuid(body.businessId));
    if (action === 'appointment_slots') return this.appointmentSlots(uuid(body.businessId), body);
    if (action === 'appointment_book')
      return this.bookAppointment(uuid(body.businessId), userId, body);
    if (action === 'appointment_owner_setup')
      return this.appointmentOwnerSetup(uuid(body.businessId), userId);
    if (action === 'appointment_owner_setup_save')
      return this.saveAppointmentSetup(uuid(body.businessId), userId, body);
    if (action === 'appointment_queue')
      return this.appointmentQueue(uuid(body.businessId), userId, body);
    if (action === 'appointment_owner_action')
      return this.ownerAppointmentAction(uuid(body.appointmentId), userId, body);
    if (action === 'appointment_owner_refund')
      return this.ownerAppointmentRefund(uuid(body.appointmentId), userId);
    if (action === 'appointment_owner_reimbursement')
      return this.ownerAppointmentReimbursement(uuid(body.appointmentId), userId, body);
    if (action === 'merchant_reviews')
      return this.merchantPickupReviews(uuid(body.businessId), userId);
    if (action === 'merchant_review_reply')
      return this.replyToPickupReview(uuid(body.businessId), userId, body);
    if (action === 'report_customer_review') return this.reportPickupReview(userId, body);
    if (action === 'pickup_code')
      return this.pickupCode(uuid(body.orderId), userId, body.statusToken);
    if (action === 'pickup_scan') return this.pickupScan(uuid(body.businessId), userId, body);
    if (action === 'customer_orders') return this.customerOrders(userId, body);
    if (action === 'operator_businesses') {
      if (!userId) fail('SIGN_IN', 'Sign in with your business account.', 401);
      return {
        businesses: await this.checked(
          this.db.rpc('square_operator_businesses', { p_user_id: userId }),
        ),
      };
    }
    if (action === 'resume') {
      const guestHash = await hash(opaqueToken(body.statusToken));
      const order = await this.checked(
        this.db
          .from('square_orders')
          .select('*')
          .eq('idempotency_key', uuid(body.idempotencyKey))
          .eq('guest_hash', guestHash)
          .maybeSingle(),
      );
      return order ? this.status(order.id, userId, body.statusToken) : { order: null };
    }
    if (
      [
        'status',
        'operator_detail',
        'order_action',
        'refund',
        'customer_order_request',
        'customer_order_reorder',
        'resolve_order_request',
        'submit_pickup_review',
      ].includes(action)
    ) {
      const id = uuid(body.orderId);
      if (action === 'status') return this.status(id, userId, body.statusToken);
      if (action === 'operator_detail') return this.operatorDetail(id, userId);
      if (action === 'refund') return this.refund(id, userId, body);
      if (action === 'customer_order_request')
        return this.submitOrderSupportRequest(id, userId, body);
      if (action === 'customer_order_reorder') return this.customerOrderReorder(id, userId, body);
      if (action === 'resolve_order_request')
        return this.resolveOrderSupportRequest(id, userId, body);
      if (action === 'submit_pickup_review') return this.submitPickupReview(id, userId, body);
      return this.orderAction(id, userId, body);
    }
    const businessId = uuid(body.businessId);
    switch (action) {
      case 'reward_options':
      case 'reward_catalog': {
        await this.rollout(businessId);
        if (action === 'reward_catalog') await this.owner(businessId, userId);
        const connection = await this.connection(businessId);
        if (!connection?.location_id || connection.state !== 'connected')
          return action === 'reward_catalog'
            ? { provider: 'square', products: [] }
            : { offer: null };
        const products = catalogProducts(
          await this.catalog(businessId),
          connection.location_id,
          connection.location_snapshot.currency,
        ).products;
        return action === 'reward_catalog'
          ? { provider: 'square', products }
          : this.checkoutRewardOptions(businessId, userId, products, 'square');
      }
      case 'availability':
        return this.availability(businessId, body.catalog === true);
      case 'connect':
        return this.beginOAuth(businessId, userId);
      case 'owner_status':
        return this.ownerStatus(businessId, userId);
      case 'select_provider':
        return this.selectProvider(businessId, userId, 'square');
      case 'location':
        return this.selectLocation(businessId, userId, body.locationId);
      case 'sync':
        return this.sync(businessId, userId);
      case 'settings':
        return this.settings(businessId, userId, body.settings);
      case 'disconnect':
        return this.disconnect(businessId, userId, body.confirmed);
      case 'quote':
        return this.quote(businessId, body, userId);
      case 'checkout':
        return this.checkout(businessId, userId, body);
      case 'queue':
        return this.queue(businessId, userId, body);
      default:
        fail('INVALID_ACTION', 'Unknown ordering action.');
    }
  }
}
