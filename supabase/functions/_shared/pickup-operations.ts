import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import type { SquareObject } from './square-client.ts';
import {
  catalogProducts,
  parseCart,
  publicOrder,
  terminalStates,
  checkTransition,
} from './square-domain.ts';
import {
  fail,
  hash,
  integer,
  opaqueToken,
  randomToken,
  record,
  string,
  uuid,
} from './square-security.ts';

// Provider-neutral authorization, order history, rewards, and atomic pickup handoff.
export abstract class PickupOperations {
  constructor(readonly db: SupabaseClient) {}
  abstract rollout(businessId: string): Promise<void>;
  async checked<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) {
      for (const [code, message] of Object.entries({
        INVALID_PICKUP_CODE: 'This pickup code expired or changed. Ask the customer to refresh it.',
        PICKUP_NOT_READY: 'Only a paid order marked ready can be picked up.',
        ORDER_BUSY: 'This order is being updated. Wait a moment and retry.',
        OPERATOR_REQUIRED: 'Active staff access to this business is required.',
      })) {
        if (error.message.includes(code)) fail(code, message, 409);
      }
      const code = [
        'SLOT_FULL',
        'ORDERING_CLOSED',
        'INVALID_SLOT',
        'INVALID_STOP',
        'IDEMPOTENCY_CONFLICT',
        'CONNECTION_CHANGED',
        'REWARD_CHANGED',
        'REWARD_NOT_READY',
        'REWARD_UNAVAILABLE',
      ].find((c) => error.message.includes(c));
      if (code)
        fail(
          code,
          code === 'SLOT_FULL'
            ? 'This pickup time is full. Choose another time.'
            : 'Ordering changed. Refresh and try again.',
          409,
        );
      fail('STORAGE_ERROR', 'The order could not be updated. Refresh and retry.', 503);
    }
    return data;
  }

  async owner(businessId: string, userId: string | null) {
    if (!userId) fail('SIGN_IN', 'Sign in as the business owner.', 401);
    const member = await this.checked(
      this.db
        .from('business_members')
        .select('role,is_active')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .maybeSingle(),
    );
    if (!member?.is_active || member.role !== 'owner')
      fail('OWNER_REQUIRED', 'Only an active business owner can manage ordering.', 403);
  }

  async selectedProvider(businessId: string): Promise<'square' | 'stripe' | null> {
    const row = await this.checked(
      this.db
        .from('ordering_provider_selections')
        .select('provider')
        .eq('business_id', businessId)
        .maybeSingle(),
    );
    return row?.provider === 'square' || row?.provider === 'stripe' ? row.provider : null;
  }

  async selectProvider(businessId: string, userId: string | null, provider: 'square' | 'stripe') {
    await this.owner(businessId, userId);
    await this.checked(
      this.db.from('ordering_provider_selections').upsert(
        {
          business_id: businessId,
          provider,
          selected_at: new Date().toISOString(),
          selected_by: userId,
        },
        { onConflict: 'business_id' },
      ),
    );
    return { selected: true, provider };
  }

  async requireSelectedProvider(businessId: string, provider: 'square' | 'stripe') {
    if ((await this.selectedProvider(businessId)) !== provider)
      fail(
        'PROVIDER_INACTIVE',
        `${provider === 'stripe' ? 'Stripe' : 'Square'} is not the active ordering provider.`,
        409,
      );
  }
  /** Operational access only. Financial/configuration methods must still call owner(). */

  async operator(businessId: string, userId: string | null) {
    if (!userId) fail('SIGN_IN', 'Sign in with your business account.', 401);
    const member = await this.checked(
      this.db
        .from('business_members')
        .select('role,is_active')
        .eq('business_id', businessId)
        .eq('user_id', userId)
        .maybeSingle(),
    );
    if (!member?.is_active || !['owner', 'staff'].includes(member.role))
      fail(
        'OPERATOR_REQUIRED',
        'Active business staff access is required to manage pickup orders.',
        403,
      );
    return { canRefund: member.role === 'owner', canManage: member.role === 'owner' };
  }

  async businessIdentity(businessId: string) {
    const [business, photos] = await Promise.all([
      this.checked(
        this.db
          .from('businesses')
          .select('id,name,primary_color,phone,timezone')
          .eq('id', businessId)
          .maybeSingle(),
      ),
      this.checked(
        this.db
          .from('business_photos')
          .select('media_assets(storage_path,status)')
          .eq('business_id', businessId)
          .eq('role', 'logo')
          .limit(1),
      ),
    ]);
    const asset = photos?.[0]?.media_assets;
    const logo = Array.isArray(asset) ? asset[0] : asset;
    return business
      ? {
          id: business.id,
          name: business.name,
          primaryColor: business.primary_color,
          phone: business.phone,
          timezone: business.timezone,
          logoPath: logo?.status === 'ready' ? logo.storage_path : null,
        }
      : null;
  }

  async orderProjection(order: SquareObject, operator = false) {
    const [items, events, business, settings] = await Promise.all([
      this.checked(this.db.from('square_order_items').select('snapshot').eq('order_id', order.id)),
      this.checked(
        this.db
          .from('square_order_events')
          .select('to_state,created_at')
          .eq('order_id', order.id)
          .order('created_at')
          .limit(100),
      ),
      order.business_id ? this.businessIdentity(order.business_id) : Promise.resolve(null),
      order.business_id
        ? this.checked(
            this.db
              .from(
                order.provider === 'stripe'
                  ? 'stripe_ordering_settings'
                  : 'square_ordering_settings',
              )
              .select('preparation_minutes')
              .eq('business_id', order.business_id)
              .maybeSingle(),
          )
        : Promise.resolve(null),
    ]);
    return {
      ...publicOrder(order, items ?? [], operator, settings?.preparation_minutes),
      business,
      events: (events ?? []).map((e) => ({ status: e.to_state, at: e.created_at })),
    };
  }

  async operatorDetail(id: string, userId: string | null) {
    const order = await this.authorizeOrder(id, userId, null, 'operator');
    const permissions = await this.operator(order.business_id, userId);
    return { order: await this.orderProjection(order, true), permissions };
  }

  async checkoutReward(
    businessId: string,
    userId: string | null,
    cart: ReturnType<typeof parseCart>,
    products: ReturnType<typeof catalogProducts>['products'],
  ) {
    if (!userId) return null;
    const membership = (await this.checked(
      this.db
        .from('loyalty_memberships')
        .select('id,program_id,customer_id,business_id')
        .eq('business_id', businessId)
        .eq('customer_id', userId)
        .eq('is_active', true)
        .maybeSingle(),
    )) as SquareObject | null;
    if (!membership) return null;
    const program = (await this.checked(
      this.db
        .from('loyalty_programs')
        .select(
          'id,name,reward_description,program_type,stamps_required,points_required,checkout_reward_type,checkout_reward_variation_id,checkout_reward_percent,is_active',
        )
        .eq('id', membership.program_id)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle(),
    )) as SquareObject | null;
    if (!program) return null;
    const transactions = (await this.checked(
      this.db
        .from('loyalty_transactions')
        .select('transaction_type,amount,points_amount')
        .eq('membership_id', membership.id),
    )) as SquareObject[];
    const points = (transactions ?? []).reduce(
      (sum, row) =>
        sum +
        (row.transaction_type === 'points_earned' ? Number(row.points_amount ?? 0) : 0) -
        (row.transaction_type === 'redemption' ? Number(row.points_amount ?? 0) : 0),
      0,
    );
    const stamps = (transactions ?? []).reduce(
      (sum, row) =>
        sum +
        (row.transaction_type === 'stamp' ? Number(row.amount ?? 0) : 0) -
        (row.transaction_type === 'reversal' ? Number(row.amount ?? 0) : 0) -
        (row.transaction_type === 'redemption' ? Number(row.amount ?? 0) : 0) *
          Number(program.stamps_required ?? 0),
      0,
    );
    const required =
      program.program_type === 'points'
        ? Number(program.points_required ?? 0)
        : Number(program.stamps_required ?? 0);
    if (required < 1 || (program.program_type === 'points' ? points : stamps) < required)
      return null;
    const type = string(program.checkout_reward_type ?? 'free_item', 30);
    const configured =
      typeof program.checkout_reward_variation_id === 'string'
        ? program.checkout_reward_variation_id
        : null;
    const eligible = products.find(
      (product) =>
        product.id === configured &&
        cart.some(
          (line) => line.variationId === product.id && line.quantity >= (type === 'bogo' ? 2 : 1),
        ),
    );
    const fallback = products.find((product) =>
      cart.some(
        (line) => line.variationId === product.id && line.quantity >= (type === 'bogo' ? 2 : 1),
      ),
    );
    const target = eligible ?? fallback;
    const lineTotal = (
      product: (typeof products)[number],
      line: ReturnType<typeof parseCart>[number],
    ) =>
      (product.price +
        product.groups
          .flatMap((group) => group.modifiers)
          .filter((modifier) => line.modifierIds.includes(modifier.id))
          .reduce((sum, modifier) => sum + modifier.price, 0)) *
      line.quantity;
    const subtotal = cart.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.variationId);
      return product ? sum + lineTotal(product, line) : sum;
    }, 0);
    let discountMinor = 0;
    if (type === 'percent_discount') {
      const percent = Math.max(1, Math.min(100, Number(program.checkout_reward_percent ?? 0)));
      discountMinor = Math.floor((subtotal * percent) / 100);
    } else if (target) {
      const line = cart.find((item) => item.variationId === target.id)!;
      const unit = Math.floor(lineTotal(target, line) / line.quantity);
      discountMinor = unit * (type === 'bogo' ? Math.floor(line.quantity / 2) : 1);
    } else {
      return null;
    }
    discountMinor = Math.max(0, Math.min(Math.max(0, subtotal - 1), discountMinor));
    if (discountMinor < 1) return null;
    return {
      membershipId: membership.id,
      type,
      variationId: target?.id ?? configured ?? null,
      percent: type === 'percent_discount' ? Number(program.checkout_reward_percent ?? 0) : null,
      discountMinor,
      label: string(program.reward_description ?? 'Rewards discount', 500),
    };
  }

  async withOrderLease<T>(
    id: string,
    version: number | null,
    action: (order: SquareObject, lease: string) => Promise<T>,
  ): Promise<T> {
    const lease = crypto.randomUUID();
    const rows = await this.checked(
      this.db.rpc('square_order_lease', { p_id: id, p_lease: lease, p_version: version }),
    );
    if (!rows?.length) fail('BUSY', 'This order is updating. Refresh in a moment.', 409);
    try {
      return await action(rows[0], lease);
    } finally {
      await this.checked(
        this.db
          .from('square_orders')
          .update({ lease_id: null, lease_until: null })
          .eq('id', id)
          .eq('lease_id', lease),
      );
    }
  }

  async patchOrder(id: string, lease: string, patch: SquareObject) {
    return await this.checked(
      this.db
        .from('square_orders')
        .update(patch)
        .eq('id', id)
        .eq('lease_id', lease)
        .select('*')
        .single(),
    );
  }

  async authorizeOrder(
    id: string,
    userId: string | null,
    statusToken: unknown,
    owner: boolean | 'operator' = false,
  ) {
    const order = await this.checked(
      this.db.from('square_orders').select('*').eq('id', id).maybeSingle(),
    );
    if (!order) fail('NOT_FOUND', 'Order not found.', 404);
    if (owner === 'operator') await this.operator(order.business_id, userId);
    else if (owner) await this.owner(order.business_id, userId);
    else if (
      !(userId && order.customer_id === userId) &&
      !(
        order.guest_hash &&
        typeof statusToken === 'string' &&
        order.guest_hash === (await hash(opaqueToken(statusToken)))
      )
    )
      fail('NOT_FOUND', 'Order not found.', 404);
    return order;
  }

  async customerOrders(userId: string | null, body: SquareObject) {
    const offset = integer(body.offset ?? 0, 0, 100000);
    if (!['current', 'history'].includes(body.view))
      fail('INVALID_VIEW', 'Choose current orders or history.');
    if (!['account', 'device'].includes(body.source))
      fail('INVALID_SOURCE', 'Choose an order source.');
    let query = this.db.from('square_orders').select('*');
    let proofs: Map<string, string> | null = null;
    if (body.source === 'account') {
      if (!userId) fail('SIGN_IN', 'Sign in to see your account orders.', 401);
      query = query.eq('customer_id', userId);
    } else {
      if (!Array.isArray(body.access) || body.access.length > 100)
        fail('INVALID_ACCESS', 'Invalid saved orders.');
      proofs = new Map(
        await Promise.all(
          body.access.map(async (value: unknown) => {
            const entry = record(value);
            return [uuid(entry.orderId), await hash(opaqueToken(entry.statusToken))] as const;
          }),
        ),
      );
      if (!proofs.size) return { orders: [], nextOffset: null };
      query = query.in('id', [...proofs.keys()]);
    }
    query =
      body.view === 'history'
        ? query.in('status', terminalStates)
        : query.not('status', 'in', `(${terminalStates.join(',')})`);
    query = query.order('created_at', { ascending: false }).order('id', { ascending: false });
    // Device proofs are checked before pagination so invalid/revoked tokens reveal nothing.
    const selected = await this.checked(
      proofs ? query.limit(100) : query.range(offset, offset + 25),
    );
    const authorized = proofs
      ? (selected ?? [])
          .filter((o) => o.guest_hash && proofs!.get(o.id) === o.guest_hash)
          .slice(offset, offset + 26)
      : (selected ?? []);
    const rows = authorized.slice(0, 25);
    const items = rows.length
      ? await this.checked(
          this.db
            .from('square_order_items')
            .select('order_id,snapshot')
            .in(
              'order_id',
              rows.map((o) => o.id),
            ),
        )
      : [];
    const identities = new Map(
      await Promise.all(
        [...new Set(rows.map((o) => o.business_id).filter(Boolean))].map(
          async (id) => [id, await this.businessIdentity(id)] as const,
        ),
      ),
    );
    return {
      orders: rows.map((o) => ({
        ...publicOrder(
          o,
          (items ?? []).filter((item) => item.order_id === o.id),
        ),
        business: identities.get(o.business_id) ?? null,
      })),
      nextOffset: authorized.length > 25 ? offset + 25 : null,
    };
  }

  async queue(businessId: string, userId: string | null, body: SquareObject) {
    const permissions = await this.operator(businessId, userId);
    const offset = integer(body.offset ?? 0, 0, 100000);
    const history = body.history === true || body.view === 'history';
    let query = this.db.from('square_orders').select('*').eq('business_id', businessId);
    query = history
      ? query.in('status', terminalStates)
      : query.not('status', 'in', `(${[...terminalStates, 'checkout_pending'].join(',')})`);
    if (!history && body.view === 'ready') query = query.eq('status', 'ready');
    if (!history && body.view === 'active') query = query.neq('status', 'ready');
    const rows = await this.checked(
      query
        .order(history ? 'created_at' : 'pickup_at', { ascending: !history })
        .order('id')
        .range(offset, offset + 24),
    );
    const items = rows?.length
      ? await this.checked(
          this.db
            .from('square_order_items')
            .select('order_id,snapshot')
            .in(
              'order_id',
              rows.map((o) => o.id),
            ),
        )
      : [];
    const [business, settings, connection, counts] = await Promise.all([
      this.businessIdentity(businessId),
      this.checked(
        this.db
          .from('square_ordering_settings')
          .select('enabled,is_open,timezone')
          .eq('business_id', businessId)
          .maybeSingle(),
      ),
      this.checked(
        this.db
          .from('square_connections')
          .select('state')
          .eq('business_id', businessId)
          .maybeSingle(),
      ),
      this.checked(this.db.rpc('square_queue_counts', { p_business_id: businessId })),
    ]);
    return {
      business,
      permissions,
      settings,
      connected: connection?.state === 'connected',
      counts,
      updatedAt: new Date().toISOString(),
      orders: (rows ?? []).map((o) =>
        publicOrder(
          o,
          (items ?? []).filter((i) => i.order_id === o.id),
          true,
        ),
      ),
      nextOffset: rows?.length === 25 ? offset + 25 : null,
    };
  }

  async orderAction(id: string, userId: string | null, body: SquareObject) {
    const order = await this.authorizeOrder(id, userId, null, 'operator');
    const next = string(body.next, 30);
    if (next === 'completed')
      fail(
        'PICKUP_CODE_REQUIRED',
        'Scan the customer’s pickup QR to confirm handoff and rewards.',
        409,
      );
    return await this.withOrderLease(
      id,
      integer(body.version, 1, 10000000),
      async (locked, lease) => {
        checkTransition(locked.status, next);
        // SDS owns the pickup workflow. Square remains authoritative for money;
        // hosted-checkout fulfillment support differs across Square order types.
        const updated = await this.patchOrder(id, lease, {
          status: next,
          ...(next === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        });
        await this.checked(
          this.db.from('square_order_events').insert({
            order_id: order.id,
            actor_type: 'operator',
            actor_id: userId,
            from_state: locked.status,
            to_state: next,
          }),
        );
        return { order: publicOrder(updated, [], true) };
      },
    );
  }

  async pickupCode(id: string, userId: string | null, statusToken: unknown) {
    const order = await this.authorizeOrder(id, userId, statusToken);
    await this.rollout(order.business_id);
    if (order.status !== 'ready' || !order.paid_at || !order.square_payment_id)
      fail('PICKUP_NOT_READY', 'Your pickup code will be available when this order is ready.', 409);
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 5 * 60000).toISOString();
    await this.checked(
      this.db.from('square_pickup_codes').upsert({
        order_id: id,
        token_hash: await hash(token),
        expires_at: expiresAt,
      }),
    );
    return { code: `sds-pickup:${id}:${token}`, expiresAt };
  }

  async pickupScan(businessId: string, userId: string | null, body: SquareObject) {
    await this.operator(businessId, userId);
    await this.rollout(businessId);
    const parts = string(body.code, 160).split(':');
    if (parts.length !== 3 || parts[0] !== 'sds-pickup')
      fail('INVALID_PICKUP_CODE', 'Scan the pickup QR from the customer’s order screen.');
    const id = uuid(parts[1]);
    const tokenHash = await hash(opaqueToken(parts[2]));
    if (body.confirm === true) {
      return this.checked(
        this.db.rpc('square_confirm_pickup', {
          p_order: id,
          p_actor: userId,
          p_business: businessId,
          p_hash: tokenHash,
        }),
      );
    }
    const order = await this.authorizeOrder(id, userId, null, 'operator');
    if (order.business_id !== businessId)
      fail('WRONG_BUSINESS', 'This pickup belongs to another business.', 403);
    const code = await this.checked(
      this.db
        .from('square_pickup_codes')
        .select('token_hash,expires_at')
        .eq('order_id', id)
        .maybeSingle(),
    );
    if (!code || code.token_hash !== tokenHash || Date.parse(code.expires_at) <= Date.now())
      fail(
        'INVALID_PICKUP_CODE',
        'This code expired or changed. Ask the customer to refresh it.',
        409,
      );
    if (order.status !== 'ready' || !order.paid_at || !order.square_payment_id)
      fail(
        'PICKUP_NOT_READY',
        order.status === 'completed'
          ? 'This order has already been picked up.'
          : 'Mark this paid order ready before pickup.',
        409,
      );
    return { order: await this.orderProjection(order, true), expiresAt: code.expires_at };
  }
}
