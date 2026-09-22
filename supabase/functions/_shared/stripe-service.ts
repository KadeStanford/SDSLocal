import { stripeSessionPatch, stripeRefundPatch } from './stripe-order-state.ts';
import { PickupOperations } from './pickup-operations.ts';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { StripeClient, stripeAccountId, stripeCheckoutUrl } from './stripe-client.ts';
import {
  CommerceError,
  canonicalJson,
  fail,
  hash,
  integer,
  opaqueToken,
  randomToken,
  record,
  string,
  uuid,
  type StripeConfig,
} from './square-security.ts';
import {
  canRefund,
  checkTransition,
  parseCart,
  parsePickup,
  parseRecipient,
  parseSettings,
  pickupSlots,
  priceCart,
  publicOrder,
  terminalStates,
  type Product,
  type OrderingSettings,
} from './square-domain.ts';

type Row = Record<string, any>;

export class StripeService extends PickupOperations {
  constructor(
    db: SupabaseClient,
    readonly config: StripeConfig,
  ) {
    super(db);
  }

  async rollout(businessId: string) {
    if (!this.config.enabled) fail('DISABLED', 'Stripe ordering has not been enabled.', 503);
    const flag = await this.checked(
      this.db.from('platform_settings').select('value').eq('key', 'stripe_commerce').single(),
    );
    if (!flag?.value?.enabled || !flag.value.business_ids?.includes(businessId))
      fail('DISABLED', 'This business is not in the Stripe ordering pilot.', 503);
  }
  async accountState(businessId: string) {
    return (await this.checked(
      this.db.from('stripe_account_states').select('*').eq('business_id', businessId).maybeSingle(),
    )) as Row | null;
  }
  async connection(businessId: string) {
    const account = await this.accountState(businessId);
    return account
      ? {
          provider: 'stripe',
          state: account.state,
          merchant_id: account.account_id,
          location_id: null,
          last_error: account.last_error,
        }
      : null;
  }
  async ownerStatus(input: { businessId: string }, userId: string | null) {
    const businessId = uuid(input.businessId, 'businessId');
    await this.owner(businessId, userId);
    const accountState = await this.accountState(businessId);
    let account: Row | null = null;
    if (accountState?.account_id) {
      const client = new StripeClient(this.config.secretKey);
      try {
        account = await client.request(
          '/v2/core/accounts/' + encodeURIComponent(accountState.account_id),
          { include: ['configuration.merchant', 'identity', 'requirements'] },
          'GET',
        );

        // Accounts v2 uses include-dependent response values. A successful
        // response can therefore omit both the legacy readiness booleans and
        // the merchant capability objects. Missing fields are not evidence
        // that an already-enabled account became disabled, so retrieve the v1
        // compatibility view before updating the cached readiness state.
        const merchant = account.configuration?.merchant;
        if (
          typeof account.charges_enabled !== 'boolean' &&
          merchant?.capabilities?.card_payments?.status == null
        ) {
          try {
            account = await client.request(
              '/v1/accounts/' + encodeURIComponent(accountState.account_id),
              undefined,
              'GET',
            );
          } catch (legacyError) {
            if (!(legacyError instanceof CommerceError)) throw legacyError;
          }
        }
      } catch (error) {
        if (!(error instanceof CommerceError)) throw error;
        // Keep existing v1-connected accounts readable while new onboarding
        // uses Accounts v2. This can be removed after all legacy accounts have
        // completed migration.
        try {
          account = await client.request(
            '/v1/accounts/' + encodeURIComponent(accountState.account_id),
            undefined,
            'GET',
          );
        } catch (legacyError) {
          if (!(legacyError instanceof CommerceError)) throw legacyError;
        }
      }
    }
    if (account && accountState && accountState.state !== 'revoked') {
      const merchant = account.configuration?.merchant;
      const cardPaymentsStatus = merchant?.capabilities?.card_payments?.status;
      const payoutsStatus = merchant?.capabilities?.stripe_balance?.payouts?.status;
      const chargesEnabled =
        typeof account.charges_enabled === 'boolean'
          ? account.charges_enabled
          : cardPaymentsStatus == null
            ? Boolean(accountState.charges_enabled)
            : cardPaymentsStatus === 'active';
      const payoutsEnabled =
        typeof account.payouts_enabled === 'boolean'
          ? account.payouts_enabled
          : payoutsStatus == null
            ? Boolean(accountState.payouts_enabled)
            : payoutsStatus === 'active';
      const detailsSubmitted =
        typeof account.details_submitted === 'boolean'
          ? account.details_submitted
          : account.requirements
            ? (account.requirements.currently_due?.length ?? 0) === 0 &&
              (account.requirements.past_due?.length ?? 0) === 0
            : Boolean(accountState.details_submitted);
      Object.assign(accountState, {
        state: chargesEnabled ? 'connected' : 'pending',
        details_submitted: detailsSubmitted,
        charges_enabled: chargesEnabled,
        payouts_enabled: payoutsEnabled,
      });
      await this.checked(
        this.db
          .from('stripe_account_states')
          .update({
            state: chargesEnabled ? 'connected' : 'pending',
            details_submitted: detailsSubmitted,
            charges_enabled: chargesEnabled,
            payouts_enabled: payoutsEnabled,
            last_checked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId),
      );
    }
    const settings = await this.checked(
      this.db
        .from('stripe_ordering_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle(),
    );
    const connection = await this.connection(businessId);
    const connectionState =
      accountState?.state === 'revoked'
        ? 'revoked'
        : account?.charges_enabled ||
            account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active'
          ? 'connected'
          : (accountState?.state ?? connection?.state);
    return {
      provider: 'stripe',
      activeProvider: await this.selectedProvider(businessId),
      business: await this.businessIdentity(businessId),
      connection: connection
        ? {
            provider: 'stripe',
            state: connectionState,
            merchantName: account?.display_name ?? account?.business_profile?.name ?? null,
            locationId: null,
            lastError: accountState?.last_error ?? null,
          }
        : null,
      account: accountState
        ? {
            accountId: accountState.account_id,
            detailsSubmitted: accountState.details_submitted,
            chargesEnabled: accountState.charges_enabled,
            payoutsEnabled: accountState.payouts_enabled,
          }
        : null,
      settings,
      products: await this.products(businessId),
    };
  }
  async beginConnect(input: { businessId: string }, userId: string | null) {
    const businessId = uuid(input.businessId, 'businessId');
    await this.owner(businessId, userId);
    await this.rollout(businessId);
    const platform = new StripeClient(this.config.secretKey);
    const previous = await this.accountState(businessId);
    // A new account needs onboarding. Once Stripe has accepted the business
    // details, retries must reopen the update flow for that same account so
    // verification can continue without creating another account or showing
    // a misleading fresh-connect state.
    const resumeSetup = Boolean(previous?.account_id && previous.details_submitted);
    const business = await this.businessIdentity(businessId);
    let contactEmail: string | undefined;
    if (userId) {
      try {
        const user = await this.db.auth.admin.getUserById(userId);
        contactEmail = user.data.user?.email ?? undefined;
      } catch {
        // A missing auth-admin client should not prevent onboarding; Stripe
        // will collect the contact email in its hosted flow.
      }
    }
    const account = previous?.account_id
      ? { id: previous.account_id }
      : await platform.request(
          '/v2/core/accounts',
          {
            ...(contactEmail ? { contact_email: contactEmail } : {}),
            display_name: business?.name ?? 'Business',
            identity: {
              country: 'us',
              entity_type: 'company',
              business_details: { registered_name: business?.name ?? 'Business' },
            },
            configuration: {
              merchant: { capabilities: { card_payments: { requested: true } } },
            },
            defaults: {
              responsibilities: { fees_collector: 'stripe', losses_collector: 'stripe' },
            },
            dashboard: 'full',
            include: ['configuration.merchant', 'identity', 'defaults'],
            metadata: { sds_business_id: businessId },
          },
          'POST',
          `sds-connect-${businessId}`,
        );
    const accountId = stripeAccountId(account.id);
    const preserved = previous?.account_id === accountId ? previous : null;
    await this.checked(
      this.db.from('stripe_account_states').upsert({
        business_id: businessId,
        account_id: accountId,
        state: preserved?.state ?? 'pending',
        details_submitted: Boolean(preserved?.details_submitted),
        charges_enabled: Boolean(preserved?.charges_enabled),
        payouts_enabled: Boolean(preserved?.payouts_enabled),
        last_checked_at: new Date().toISOString(),
      }),
    );
    await this.checked(
      this.db
        .from('stripe_ordering_settings')
        .upsert({ business_id: businessId }, { onConflict: 'business_id' }),
    );
    if (!(await this.selectedProvider(businessId)))
      await this.selectProvider(businessId, userId, 'stripe');
    const state = randomToken();
    await this.checked(
      this.db.from('stripe_onboarding_states').insert({
        state_hash: await hash(state),
        user_id: userId,
        business_id: businessId,
        account_id: accountId,
        expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
      }),
    );
    const linkType = resumeSetup ? 'account_update' : 'account_onboarding';
    const linkDetails = {
      configurations: ['merchant'],
      refresh_url:
        this.config.connectCallbackUrl +
        '?businessId=' +
        businessId +
        '&refresh=1&state=' +
        encodeURIComponent(state),
      return_url:
        this.config.connectCallbackUrl +
        '?businessId=' +
        businessId +
        '&state=' +
        encodeURIComponent(state),
    };
    const links = await platform.request('/v2/core/account_links', {
      account: accountId,
      use_case: {
        type: linkType,
        [linkType]: linkDetails,
      },
    });
    return {
      provider: 'stripe',
      accountId,
      url: stripeCheckoutUrl(links.url),
      resumed: Boolean(previous?.account_id),
      status: resumeSetup ? 'verification' : 'onboarding',
    };
  }
  async products(businessId: string): Promise<Product[]> {
    const result = await this.checked(
      this.db
        .from('offering_items')
        .select(
          'id,name,description,price_minor,currency,is_available,is_visible,display_order,section_id,media_asset_id,offering_sections(name,is_visible),media_assets(storage_path,bucket,status)',
        )
        .eq('business_id', businessId)
        .eq('is_available', true)
        .eq('is_visible', true)
        .order('display_order'),
    );
    return (result ?? [])
      .filter(
        (item: Row) =>
          item.price_minor !== null &&
          item.price_minor > 0 &&
          item.currency === 'USD' &&
          (Array.isArray(item.offering_sections)
            ? item.offering_sections[0]
            : item.offering_sections
          )?.is_visible === true,
      )
      .map((item: Row) => {
        const section = Array.isArray(item.offering_sections)
          ? item.offering_sections[0]
          : item.offering_sections;
        const media = Array.isArray(item.media_assets) ? item.media_assets[0] : item.media_assets;
        const image =
          media?.storage_path && media.status === 'ready'
            ? this.db.storage
                .from(media.bucket ?? 'business-media')
                .getPublicUrl(media.storage_path).data.publicUrl
            : null;
        return {
          id: item.id,
          itemId: item.id,
          name: item.name,
          variation: 'Regular',
          description: item.description ?? '',
          category: section?.name ?? 'Menu',
          image,
          price: Number(item.price_minor),
          currency: item.currency ?? 'USD',
          version: 1,
          groups: [],
        } as Product;
      });
  }
  async sync(input: { businessId: string }, userId: string | null) {
    const businessId = uuid(input.businessId, 'businessId');
    await this.owner(businessId, userId);
    await this.rollout(businessId);
    const products = await this.products(businessId);
    await this.checked(
      this.db
        .from('stripe_ordering_settings')
        .update({
          synced_at: new Date().toISOString(),
          sync_summary: { provider: 'stripe', variations: products.length, excluded: 0 },
        })
        .eq('business_id', businessId),
    );
    return { provider: 'stripe', products, synced: products.length };
  }
  async settings(
    input: { businessId: string; provider?: string; settings?: unknown },
    userId: string | null,
  ) {
    const businessId = uuid(input.businessId, 'businessId');
    if (input.settings !== undefined) {
      await this.owner(businessId, userId);
      const parsed = parseSettings(input.settings);
      await this.rollout(businessId);
      return {
        saved: true,
        provider: 'stripe',
        settings: await this.checked(
          this.db
            .from('stripe_ordering_settings')
            .upsert(
              {
                business_id: businessId,
                ...parsed,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'business_id' },
            )
            .select('*')
            .single(),
        ),
      };
    }
    return {
      settings: await this.checked(
        this.db
          .from('stripe_ordering_settings')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle(),
      ),
    };
  }
  async disconnect(input: { businessId: string; confirmed?: unknown }, userId: string | null) {
    const businessId = uuid(input.businessId, 'businessId');
    await this.owner(businessId, userId);
    if (input.confirmed !== true) fail('CONFIRM_REQUIRED', 'Confirm disconnecting Stripe.');
    const active = await this.checked(
      this.db
        .from('square_orders')
        .select('id')
        .eq('business_id', businessId)
        .eq('provider', 'stripe')
        .not('status', 'in', `(${terminalStates.join(',')})`)
        .limit(1),
    );
    if (active?.length)
      fail(
        'ACTIVE_ORDERS',
        'Complete or refund active Stripe orders and let unpaid checkouts expire before disconnecting.',
        409,
      );
    await this.checked(
      this.db
        .from('stripe_ordering_settings')
        .update({ enabled: false, is_open: false })
        .eq('business_id', businessId),
    );
    await this.checked(
      this.db
        .from('stripe_account_states')
        .update({ state: 'revoked' })
        .eq('business_id', businessId),
    );
    return { disconnected: true };
  }
  async availability(input: { businessId: string; pickup?: unknown; cart?: unknown }) {
    const businessId = uuid(input.businessId, 'businessId');
    await this.rollout(businessId);
    if ((await this.selectedProvider(businessId)) !== 'stripe')
      return { available: false, status: 'unsupported', slots: [], products: [] };
    const [settingsRow, business, connection, account] = await Promise.all([
      this.checked(
        this.db
          .from('stripe_ordering_settings')
          .select('*')
          .eq('business_id', businessId)
          .maybeSingle(),
      ),
      this.checked(
        this.db
          .from('businesses')
          .select(
            'id,name,status,business_type,address_line_1,address_line_2,city,region_code,postal_code',
          )
          .eq('id', businessId)
          .maybeSingle(),
      ),
      this.connection(businessId),
      this.accountState(businessId),
    ]);
    if (
      !settingsRow?.enabled ||
      !settingsRow.synced_at ||
      business?.status !== 'active' ||
      connection?.state !== 'connected' ||
      account?.state !== 'connected' ||
      !account.charges_enabled
    )
      return { available: false, status: 'unsupported', slots: [], products: [] };
    const settings = parseSettings(settingsRow);
    if (!settings.is_open) return { available: false, status: 'paused', slots: [], products: [] };
    const address = [
      business.address_line_1,
      business.address_line_2,
      business.city,
      business.region_code,
      business.postal_code,
    ]
      .filter(Boolean)
      .join(', ');
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
    const candidates = pickupSlots(
      settings,
      business.business_type === 'mobile',
      stops ?? [],
      address,
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
      if (offset === 99500) fail('UNAVAILABLE', 'Pickup availability could not be checked.', 503);
    }
    const slots = candidates
      .filter((slot) => (counts.get(slot.at) ?? 0) < settings.max_orders_per_slot)
      .map((slot) => ({ ...slot, available: true }));
    const products = await this.products(businessId);
    return {
      available: slots.length > 0 && products.length > 0,
      status: !products.length ? 'unavailable' : slots.length ? 'open' : 'no_slots',
      businessName: business.name,
      settings,
      slots,
      products,
    };
  }
  async quote(input: {
    businessId: string;
    pickup: unknown;
    cart: unknown;
    statusToken?: unknown;
    userId?: string | null;
  }) {
    const businessId = uuid(input.businessId, 'businessId');
    const pickup = parsePickup(input.pickup);
    const cart = parseCart(input.cart);
    const available = await this.availability({ businessId, pickup, cart });
    if (!available.available) fail('ORDERING_CLOSED', 'Pickup ordering is currently closed.', 409);
    const products = available.products as Product[];
    priceCart(cart, products);
    const subtotal = cart.reduce(
      (sum, line) =>
        sum + (products.find((p) => p.id === line.variationId)?.price ?? 0) * line.quantity,
      0,
    );
    const selected = (available.slots as Row[]).find(
      (slot) => slot.at === pickup.at && slot.stopId === pickup.stopId,
    );
    if (!selected?.available) fail('INVALID_SLOT', 'Choose an available pickup time.', 409);
    const quoteId = crypto.randomUUID();
    const guestHash = await hash(opaqueToken(input.statusToken));
    const reward = await this.checkoutReward(businessId, input.userId ?? null, cart, products);
    const total = subtotal - (reward?.discountMinor ?? 0);
    const account = await this.accountState(businessId);
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();
    await this.checked(
      this.db.from('square_quotes').insert({
        id: quoteId,
        business_id: businessId,
        guest_hash: guestHash,
        payload: {
          provider: 'stripe',
          cart,
          pickup,
          subtotal,
          tax: 0,
          total,
          reward,
          accountId: account?.account_id,
          currency: products[0]?.currency ?? 'USD',
          slot: selected,
          preparationMinutes: (available.settings as OrderingSettings).preparation_minutes,
        },
        expires_at: expiresAt,
      }),
    );
    return {
      provider: 'stripe',
      quoteId,
      expiresAt,
      subtotal,
      tax: 0,
      tip: 0,
      total,
      currency: products[0]?.currency ?? 'USD',
      slot: selected,
      reward,
    };
  }
  async checkout(input: Row) {
    const businessId = uuid(input.businessId, 'businessId');
    const userId = (input.userId as string | null) ?? null;
    const quoteId = uuid(input.quoteId, 'quoteId');
    const guestHash = await hash(opaqueToken(input.statusToken));
    const idempotencyKey = uuid(input.idempotencyKey, 'idempotencyKey');
    const recipient = parseRecipient(input.recipient);
    const requestHash = await hash(JSON.stringify({ businessId, quoteId, recipient }));
    const existing = await this.checked(
      this.db.from('square_orders').select('*').eq('idempotency_key', idempotencyKey).maybeSingle(),
    );
    if (existing) {
      if (
        existing.provider !== 'stripe' ||
        existing.guest_hash !== guestHash ||
        existing.request_hash !== requestHash
      )
        fail('IDEMPOTENCY_CONFLICT', 'This checkout request does not match.', 409);
      return this.ensureCheckout(existing);
    }
    const quoteRow = quoteId
      ? ((await this.checked(
          this.db
            .from('square_quotes')
            .select('guest_hash,payload,expires_at')
            .eq('id', quoteId)
            .eq('business_id', businessId)
            .maybeSingle(),
        )) as Row | null)
      : null;
    if (quoteRow && Date.parse(quoteRow.expires_at) <= Date.now())
      fail('QUOTE_EXPIRED', 'Your total expired. Refresh it before continuing.', 409);
    if (!quoteRow) fail('QUOTE_EXPIRED', 'Review a fresh total before paying.', 409);
    if (quoteRow.guest_hash !== (await hash(opaqueToken(input.statusToken))))
      fail('NOT_FOUND', 'Checkout could not be verified.', 404);
    const quotePayload = record(quoteRow.payload);
    const pickup = parsePickup(quotePayload.pickup);
    const cart = parseCart(quotePayload.cart);
    const available = await this.availability({ businessId, pickup, cart });
    const products = available.products as Product[];
    if (!available.available) fail('ORDERING_CLOSED', 'Pickup ordering is currently closed.', 409);
    priceCart(cart, products);
    const subtotal = cart.reduce(
      (sum, line) =>
        sum + (products.find((p) => p.id === line.variationId)?.price ?? 0) * line.quantity,
      0,
    );
    const account = await this.accountState(businessId);
    if (!account?.account_id || account.state !== 'connected' || !account.charges_enabled)
      fail('STRIPE_NOT_READY', 'This business is still finishing Stripe setup.', 409);
    const reward = await this.checkoutReward(businessId, userId, cart, products);
    if (canonicalJson(reward) !== canonicalJson(quotePayload.reward ?? null))
      fail('REWARD_CHANGED', 'Your rewards changed. Review a fresh total.', 409);
    const total = subtotal - (reward?.discountMinor ?? 0);
    if (
      subtotal !== quotePayload.subtotal ||
      total !== quotePayload.total ||
      account.account_id !== quotePayload.accountId
    )
      fail('PRICE_CHANGED', 'The menu or payment account changed. Review a fresh total.', 409);
    const id = crypto.randomUUID();
    const business = await this.businessIdentity(businessId);
    const slot = (available.slots as Row[]).find(
      (candidate) => candidate.at === pickup.at && candidate.stopId === pickup.stopId,
    );
    if (!slot?.available) fail('INVALID_SLOT', 'That pickup time is no longer available.', 409);
    const itemSnapshots = cart.map((line) => {
      const product = products.find((p) => p.id === line.variationId)!;
      return {
        name: product.name,
        variation_name: product.variation,
        quantity: String(line.quantity),
        total_money: { amount: product.price * line.quantity, currency: product.currency },
        modifiers: [],
      };
    });
    const providerRequest = {
      provider: 'stripe',
      lineItems: cart.map((line) => {
        const product = products.find((p) => p.id === line.variationId)!;
        return {
          name: product.name,
          description: product.description,
          image: product.image,
          currency: product.currency,
          unitAmount: product.price,
          quantity: line.quantity,
        };
      }),
      accountId: account.account_id,
      discountMinor: reward?.discountMinor ?? 0,
      rewardLabel: reward?.label,
    };
    const reserve = await this.checked(
      this.db.rpc('square_reserve_order', {
        p_order: {
          id,
          business_id: businessId,
          business_name: business?.name ?? 'Business',
          customer_id: userId,
          guest_hash: guestHash,
          merchant_id: account.account_id,
          location_id: 'stripe',
          pickup_at: pickup.at,
          pickup_timezone: (available.settings as OrderingSettings).timezone,
          pickup_address: slot.address,
          recipient,
          subtotal_minor: subtotal,
          tax_minor: 0,
          total_minor: total,
          stop_id: pickup.stopId,
          loyalty_membership_id: reward?.membershipId ?? null,
          loyalty_reward: reward,
          currency: products[0]?.currency ?? 'USD',
          provider: 'stripe',
          provider_request: providerRequest,
          idempotency_key: idempotencyKey,
          request_hash: requestHash,
        },
        p_items: itemSnapshots,
      }),
    );
    const orderId = uuid((reserve as Row).orderId ?? (reserve as Row).id, 'orderId');
    const order = (await this.checked(
      this.db.from('square_orders').select('*').eq('id', orderId).single(),
    )) as Row;
    return this.ensureCheckout(order);
  }
  async ensureCheckout(order: Row) {
    if (order.status !== 'checkout_pending' || order.checkout_url)
      return { order: await this.orderProjection(order) };
    if (Date.parse(order.expires_at) <= Date.now())
      fail('CHECKOUT_EXPIRED', 'This checkout expired. Refresh your order.', 409);
    return this.withOrderLease(order.id, null, async (locked, lease) => ({
      order: await this.orderProjection(
        locked.checkout_url ? locked : await this.createCheckout(locked, lease),
      ),
    }));
  }
  async createCheckout(order: Row, lease: string) {
    const client = new StripeClient(this.config.secretKey, stripeAccountId(order.merchant_id));
    const request = record(order.provider_request);
    const items = Array.isArray(request.lineItems) ? (request.lineItems as Row[]) : [];
    const params: Row = {
      mode: 'payment',
      success_url: this.config.checkoutReturnUrl + '?orderId=' + order.id,
      cancel_url: this.config.checkoutReturnUrl + '?orderId=' + order.id + '&cancelled=1',
      payment_method_types: ['card'],
      client_reference_id: order.id,
      'metadata[sds_order_id]': order.id,
      'payment_intent_data[metadata][sds_order_id]': order.id,
    };
    items.forEach((item, index) => {
      params['line_items[' + index + '][price_data][currency]'] = String(
        item.currency ?? order.currency,
      ).toLowerCase();
      params['line_items[' + index + '][price_data][product_data][name]'] = String(
        item.name ?? 'Pickup item',
      );
      params['line_items[' + index + '][price_data][unit_amount]'] = Number(item.unitAmount);
      params['line_items[' + index + '][quantity]'] = Number(item.quantity);
      if (item.description)
        params['line_items[' + index + '][price_data][product_data][description]'] = String(
          item.description,
        );
      if (item.image && /^https:/.test(String(item.image)))
        params['line_items[' + index + '][price_data][product_data][images][0]'] = String(
          item.image,
        );
    });
    if (Number(request.discountMinor) > 0) {
      const coupon = await client.request(
        '/v1/coupons',
        {
          amount_off: request.discountMinor,
          currency: String(order.currency).toLowerCase(),
          duration: 'once',
          name: request.rewardLabel ?? 'SDS reward',
          max_redemptions: 1,
        },
        'POST',
        `sds-reward-${order.id}`,
      );
      params.discounts = [{ coupon: coupon.id }];
    }
    if (this.config.applicationFeeMinor > 0)
      params['payment_intent_data[application_fee_amount]'] = Math.min(
        this.config.applicationFeeMinor,
        Number(order.total_minor),
      );
    const session = await client.request(
      '/v1/checkout/sessions',
      params,
      'POST',
      `sds-checkout-${order.id}`,
    );
    const url = stripeCheckoutUrl(session.url);
    return (await this.checked(
      this.db
        .from('square_orders')
        .update({
          payment_link_id: session.id,
          square_order_id: session.id,
          checkout_url: url,
          provider_status: 'CHECKOUT_CREATED',
        })
        .eq('id', order.id)
        .eq('lease_id', lease)
        .select('*')
        .single(),
    )) as Row;
  }

  async reconcile(order: Row) {
    if (!['checkout_pending', 'refund_pending'].includes(order.status)) return order;
    return this.withOrderLease(order.id, null, async (locked, lease) => {
      const client = new StripeClient(this.config.secretKey, stripeAccountId(locked.merchant_id));
      let patch: Row = {};
      if (locked.status === 'checkout_pending') {
        if (!locked.square_order_id) {
          if (Date.parse(locked.expires_at) <= Date.now())
            patch = { status: 'checkout_expired', checkout_url: null };
          else return locked;
        } else {
          const path = '/v1/checkout/sessions/' + encodeURIComponent(locked.square_order_id);
          let session = await client.request(path, { expand: ['payment_intent'] }, 'GET');
          if (
            session.status === 'open' &&
            session.payment_status !== 'paid' &&
            Date.parse(locked.expires_at) <= Date.now()
          ) {
            await client.request(path + '/expire', {}, 'POST', 'sds-expire-' + locked.id);
            session = await client.request(path, { expand: ['payment_intent'] }, 'GET');
          }
          patch = stripeSessionPatch(locked, session);
        }
      } else if (locked.status === 'refund_pending' && locked.refund_key) {
        const refund = locked.square_refund_id
          ? await client.request(
              '/v1/refunds/' + encodeURIComponent(locked.square_refund_id),
              undefined,
              'GET',
            )
          : await client.request(
              '/v1/refunds',
              {
                payment_intent: locked.square_payment_id,
                amount: Number(locked.total_minor),
                reason: 'requested_by_customer',
              },
              'POST',
              locked.refund_key,
            );
        patch = stripeRefundPatch(locked, refund);
      }
      const updated = await this.patchOrder(locked.id, lease, {
        ...patch,
        last_reconciled_at: new Date().toISOString(),
      });
      if (patch.status && patch.status !== locked.status)
        await this.checked(
          this.db.from('square_order_events').insert({
            order_id: locked.id,
            actor_type: 'provider',
            from_state: locked.status,
            to_state: patch.status,
          }),
        );
      return updated;
    });
  }
  async status(input: Row, userId: string | null) {
    const order = await this.authorizeOrder(uuid(input.orderId), userId, input.statusToken);
    if (order.provider !== 'stripe') fail('NOT_FOUND', 'Order not found.', 404);
    return { order: await this.orderProjection(await this.reconcile(order)) };
  }
  async refund(id: string, userId: string | null, body: Row) {
    await this.authorizeOrder(id, userId, null, true);
    if (body.confirmed !== true) fail('CONFIRM_REQUIRED', 'Confirm the full refund.');
    return this.withOrderLease(id, integer(body.version, 1, 10000000), async (order, lease) => {
      if (order.status === 'refunded') return { order: await this.orderProjection(order, true) };
      if (!canRefund(order.status) && order.status !== 'refund_pending')
        fail('INVALID_TRANSITION', 'This order cannot be refunded here.', 409);
      if (!order.square_payment_id) fail('PAYMENT_PENDING', 'Payment is not confirmed.', 409);
      const key =
        order.status === 'refund_failed'
          ? crypto.randomUUID()
          : (order.refund_key ?? crypto.randomUUID());
      order = await this.patchOrder(id, lease, { status: 'refund_pending', refund_key: key });
      const client = new StripeClient(this.config.secretKey, stripeAccountId(order.merchant_id));
      const refund = await client.request(
        '/v1/refunds',
        {
          payment_intent: order.square_payment_id,
          amount: Number(order.total_minor),
          reason: 'requested_by_customer',
        },
        'POST',
        key,
      );
      const updated = await this.patchOrder(id, lease, stripeRefundPatch(order, refund));
      await this.checked(
        this.db.from('square_order_events').insert({
          order_id: id,
          actor_type: 'owner',
          actor_id: userId,
          to_state: updated.status,
        }),
      );
      return { order: await this.orderProjection(updated, true) };
    });
  }
  async maintenance() {
    const orders = await this.checked(
      this.db
        .from('square_orders')
        .select('*')
        .eq('provider', 'stripe')
        .in('status', ['checkout_pending', 'refund_pending'])
        .order('last_reconciled_at', { nullsFirst: true })
        .limit(50),
    );
    let reconciled = 0,
      failures = 0;
    for (const order of orders ?? []) {
      try {
        await this.reconcile(order);
        reconciled++;
      } catch {
        failures++;
      }
    }
    return { reconciled, failures };
  }
  async route(body: Row, userId: string | null) {
    const action = string(body.action, 40);
    if (action === 'pickup_code')
      return this.pickupCode(uuid(body.orderId), userId, body.statusToken);
    if (action === 'pickup_scan') return this.pickupScan(uuid(body.businessId), userId, body);
    if (action === 'customer_orders') return this.customerOrders(userId, body);
    if (action === 'resume') {
      const order = await this.checked(
        this.db
          .from('square_orders')
          .select('*')
          .eq('provider', 'stripe')
          .eq('idempotency_key', uuid(body.idempotencyKey))
          .eq('guest_hash', await hash(opaqueToken(body.statusToken)))
          .maybeSingle(),
      );
      return order
        ? this.status({ orderId: order.id, statusToken: body.statusToken }, userId)
        : { order: null };
    }
    if (action === 'operator_businesses')
      return {
        businesses:
          (await this.checked(this.db.rpc('square_operator_businesses', { p_user_id: userId }))) ??
          [],
      };
    if (['status', 'operator_detail', 'order_action', 'refund'].includes(action)) {
      const id = uuid(body.orderId);
      if (action === 'status')
        return this.status({ orderId: id, statusToken: body.statusToken }, userId);
      if (action === 'operator_detail') return this.operatorDetail(id, userId);
      if (action === 'refund') return this.refund(id, userId, body);
      return this.orderAction(id, userId, body);
    }
    const businessId = uuid(body.businessId);
    switch (action) {
      case 'availability':
        return this.availability({ businessId, pickup: body.pickup, cart: body.cart });
      case 'connect':
        return this.beginConnect({ businessId }, userId);
      case 'owner_status':
        return this.ownerStatus({ businessId }, userId);
      case 'select_provider':
        return this.selectProvider(businessId, userId, 'stripe');
      case 'sync':
        return this.sync({ businessId }, userId);
      case 'settings':
        return this.settings({ businessId, provider: 'stripe', settings: body.settings }, userId);
      case 'disconnect':
        return this.disconnect({ businessId, confirmed: body.confirmed }, userId);
      case 'quote':
        return this.quote({
          businessId,
          pickup: body.pickup,
          cart: body.cart,
          statusToken: body.statusToken,
          userId,
        });
      case 'checkout':
        return this.checkout({ ...body, businessId, userId });
      case 'queue':
        return this.queue(businessId, userId, body);
      default:
        fail('INVALID_ACTION', 'Unknown ordering action.');
    }
  }
}
