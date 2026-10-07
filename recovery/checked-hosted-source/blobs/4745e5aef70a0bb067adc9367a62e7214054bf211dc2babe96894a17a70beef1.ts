import {
  eligibleRewardProducts,
  parseRewardSelection,
  selectedReward,
  type RewardProvider,
} from './checkout-rewards.ts';
import { refundOptions } from './item-refunds.ts';
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
import {
  canRequestOrderSupport,
  parseOrderSupportReply,
  parseOrderSupportRequest,
  parseOrderSupportResolution,
} from './order-support.ts';
import { parseMerchantReviewReply, parsePickupReview, parseReviewReport } from './order-review.ts';
import { canReviewAttendedEvent } from './event-review.ts';

// Provider-neutral authorization, order history, rewards, and atomic pickup handoff.
export abstract class PickupOperations {
  constructor(readonly db: SupabaseClient) {}
  abstract rollout(businessId: string): Promise<void>;
  abstract reconcile(order: SquareObject): Promise<SquareObject>;
  async checked<T>(query: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await query;
    if (error) {
      for (const [code, message] of Object.entries({
        INVALID_PICKUP_CODE: 'This pickup code expired or changed. Ask the customer to refresh it.',
        PICKUP_NOT_READY: 'Only a paid order marked ready can be picked up.',
        ORDER_BUSY: 'This order is being updated. Wait a moment and retry.',
        OPERATOR_REQUIRED: 'Active staff access to this business is required.',
        APPOINTMENT_CHANGED: 'This appointment changed. Refresh it and try again.',
        APPOINTMENT_TRANSITION_INVALID: 'That appointment action is no longer available.',
        CANCELLATION_CUTOFF: 'The business cancellation window has passed. Contact the business.',
        BUSINESS_CLOSED: 'The business is closed during that time. Choose another slot.',
        BOOKING_CLOSED: 'This business is not accepting appointments right now.',
        NO_AVAILABILITY: 'That time is no longer available. Choose another slot.',
        OUTSIDE_BOOKING_WINDOW: 'Choose a time within the business booking window.',
        RESOURCE_UNAVAILABLE: 'That staff member or resource is no longer available.',
        REFUND_REQUIRED: 'This appointment needs a refund decision before it can be cancelled.',
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
        'APPOINTMENT_CHANGED',
        'APPOINTMENT_TRANSITION_INVALID',
        'CANCELLATION_CUTOFF',
        'BUSINESS_CLOSED',
        'BOOKING_CLOSED',
        'NO_AVAILABILITY',
        'OUTSIDE_BOOKING_WINDOW',
        'RESOURCE_UNAVAILABLE',
        'REFUND_REQUIRED',
      ].find((c) => error.message.includes(c));
      if (code)
        fail(
          code,
          code === 'SLOT_FULL'
            ? 'This time is full. Choose another time.'
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
      this.checked(
        this.db.from('square_order_items').select('id,snapshot').eq('order_id', order.id),
      ),
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
      ...(operator ? { refundItems: refundOptions(order, items ?? []) } : {}),
      business,
      events: (events ?? []).map((e) => ({ status: e.to_state, at: e.created_at })),
    };
  }

  async operatorDetail(id: string, userId: string | null) {
    const order = await this.authorizeOrder(id, userId, null, 'operator');
    const permissions = await this.operator(order.business_id, userId);
    const supportRequests = await this.checked(
      this.db
        .from('square_order_support_requests')
        .select('id,request_type,message,response,status,created_at,resolved_at')
        .eq('order_id', id)
        .order('created_at', { ascending: false })
        .limit(10),
    );
    return {
      order: await this.orderProjection(order, true),
      permissions,
      supportRequests: (supportRequests ?? []).map((request) => this.supportProjection(request)),
    };
  }

  private supportProjection(request: SquareObject | null) {
    return request
      ? {
          id: request.id,
          type: request.request_type,
          message: request.message,
          response: request.response,
          status: request.status,
          createdAt: request.created_at,
          resolvedAt: request.resolved_at,
        }
      : null;
  }

  private async latestOrderSupportRequest(orderId: string) {
    const request = await this.checked(
      this.db
        .from('square_order_support_requests')
        .select('id,request_type,message,response,status,created_at,resolved_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    return this.supportProjection(request);
  }

  async submitOrderSupportRequest(id: string, userId: string | null, body: SquareObject) {
    const order = await this.authorizeOrder(id, userId, body.statusToken);
    if (!order.business_id)
      fail('ORDER_COMPLETE', 'This business is no longer available for order support.', 409);
    const parsed = parseOrderSupportRequest(body.requestType, body.message);
    if (!canRequestOrderSupport(order.status, parsed.type))
      fail(
        'ORDER_COMPLETE',
        'This order is complete. Contact the business directly for help.',
        409,
      );
    const latest = await this.latestOrderSupportRequest(id);
    if (latest?.status === 'open') return { supportRequest: latest };
    const { data, error } = await this.db
      .from('square_order_support_requests')
      .insert({
        order_id: id,
        business_id: order.business_id,
        customer_id: order.customer_id,
        requested_by: userId,
        request_type: parsed.type,
        message: parsed.message,
      })
      .select('id,request_type,message,response,status,created_at,resolved_at')
      .single();
    if (error) {
      if (error.message.includes('ORDER_COMPLETE'))
        fail('ORDER_COMPLETE', 'This order has ended and cannot accept a request.', 409);
      if (error.message.includes('square_order_support_one_open_request')) {
        const current = await this.latestOrderSupportRequest(id);
        if (current?.status === 'open') return { supportRequest: current };
      }
      fail('STORAGE_ERROR', 'Your request could not be sent. Refresh and retry.', 503);
    }
    return { supportRequest: this.supportProjection(data) };
  }

  async customerOrderReorder(id: string, userId: string | null, body: SquareObject) {
    const order = await this.authorizeOrder(id, userId, body.statusToken);
    if (order.status !== 'completed' || !order.business_id)
      fail('ORDER_REORDER_UNAVAILABLE', 'This completed order can no longer be reordered.', 409);
    const rows = await this.checked(
      this.db.from('square_order_items').select('snapshot').eq('order_id', id),
    );
    const cart: { variationId: string; quantity: number; modifierIds: string[] }[] = [];
    const unavailableItems: string[] = [];
    for (const row of rows ?? []) {
      const snapshot = record(row.snapshot);
      const variationId =
        typeof snapshot.variation_id === 'string'
          ? snapshot.variation_id
          : typeof snapshot.catalog_object_id === 'string'
            ? snapshot.catalog_object_id
            : null;
      const modifierIds = Array.isArray(snapshot.modifier_ids)
        ? snapshot.modifier_ids.filter(
            (value: unknown): value is string => typeof value === 'string',
          )
        : Array.isArray(snapshot.modifiers)
          ? snapshot.modifiers
              .map((modifier: unknown) => record(modifier).catalog_object_id)
              .filter((value: unknown): value is string => typeof value === 'string')
          : [];
      const quantity = Number(snapshot.quantity);
      if (!variationId || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        unavailableItems.push(
          typeof snapshot.name === 'string' ? snapshot.name : 'An earlier item',
        );
        continue;
      }
      cart.push({ variationId, quantity, modifierIds });
    }
    if (!cart.length)
      fail(
        'ORDER_REORDER_UNAVAILABLE',
        'These items cannot be matched to the current menu. Open the business page to build a fresh cart.',
        409,
      );
    return { businessId: order.business_id, cart, unavailableItems };
  }

  async resolveOrderSupportRequest(id: string, userId: string | null, body: SquareObject) {
    const order = await this.authorizeOrder(id, userId, null, 'operator');
    const status = parseOrderSupportResolution(body.resolution);
    const response = parseOrderSupportReply(body.response);
    const requestId = uuid(body.requestId);
    const { data, error } = await this.db
      .from('square_order_support_requests')
      .update({ status, response, resolved_by: userId, resolved_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('order_id', id)
      .eq('status', 'open')
      .select('id,request_type,message,response,status,created_at,resolved_at')
      .maybeSingle();
    if (error) fail('STORAGE_ERROR', 'This request could not be updated. Refresh and retry.', 503);
    if (!data)
      fail('REQUEST_UPDATED', 'This request has already been answered. Refresh the order.', 409);
    if (order.customer_id) {
      await this.checked(
        this.db.from('notification_deliveries').insert({
          user_id: order.customer_id,
          business_id: order.business_id,
          notification_type: 'orders',
          entity_type: 'pickup_order',
          entity_id: order.id,
          dedupe_key: `order-support-reply:${requestId}`,
          title: 'The business replied to your order request',
          body: `${order.business_name} replied about order #${order.order_number}.`,
          url: `/order?orderId=${order.id}`,
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          order_audience: 'customer',
          order_status: order.status,
          ...(await this.notificationStatus(order.customer_id, order.business_id)),
        }),
      );
    }
    return { supportRequest: this.supportProjection(data) };
  }

  private async notificationStatus(userId: string, businessId: string | null) {
    const enabled = await this.checked(
      this.db.rpc('notification_enabled', {
        p_user_id: userId,
        p_business_id: businessId,
        p_notification_type: 'orders',
      }),
    );
    return { status: enabled ? 'queued' : 'skipped' };
  }

  async customerOrderProjection(order: SquareObject) {
    const [supportRequest, review] = await Promise.all([
      this.latestOrderSupportRequest(order.id),
      this.pickupReviewForOrder(order.id),
    ]);
    return {
      order: { ...(await this.orderProjection(order)), supportRequest, review },
    };
  }

  private pickupReviewProjection(review: SquareObject | null) {
    return review
      ? {
          id: review.id,
          rating: review.rating,
          text: review.review_text,
          merchantResponse: review.merchant_response,
          moderationStatus: review.moderation_status,
          createdAt: review.created_at,
        }
      : null;
  }

  private async pickupReviewForOrder(orderId: string) {
    const review = await this.checked(
      this.db
        .from('pickup_order_reviews')
        .select('id,rating,review_text,merchant_response,moderation_status,created_at')
        .eq('order_id', orderId)
        .maybeSingle(),
    );
    return this.pickupReviewProjection(review);
  }

  async submitPickupReview(id: string, userId: string | null, body: SquareObject) {
    const order = await this.authorizeOrder(id, userId, body.statusToken);
    if (order.status !== 'completed')
      fail('ORDER_NOT_COMPLETE', 'You can review this order after pickup is complete.', 409);
    if (!order.business_id)
      fail('BUSINESS_UNAVAILABLE', 'This business is no longer available for reviews.', 409);
    if (userId) {
      const member = await this.checked(
        this.db
          .from('business_members')
          .select('id')
          .eq('business_id', order.business_id)
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
      );
      if (member)
        fail(
          'BUSINESS_REVIEW_NOT_ALLOWED',
          'Business team members cannot review their own business.',
          403,
        );
    }
    const parsed = parsePickupReview(body.rating, body.text ?? '');
    const existing = await this.pickupReviewForOrder(id);
    if (existing) return { review: existing };
    const { data, error } = await this.db
      .from('pickup_order_reviews')
      .insert({
        order_id: id,
        business_id: order.business_id,
        customer_id: userId,
        rating: parsed.rating,
        review_text: parsed.text,
      })
      .select('id,rating,review_text,merchant_response,moderation_status,created_at')
      .single();
    if (error) {
      if (error.message.includes('pickup_order_reviews_order_id_key')) {
        const submitted = await this.pickupReviewForOrder(id);
        if (submitted) return { review: submitted };
      }
      fail('REVIEW_SAVE_FAILED', 'Your review could not be saved. Refresh and retry.', 503);
    }
    await this.checked(
      this.db.from('pickup_order_review_events').insert({
        review_id: data.id,
        order_id: id,
        actor_id: userId,
        event_type: 'created',
        event_data: { rating: parsed.rating },
      }),
    );
    return { review: this.pickupReviewProjection(data) };
  }

  async customerEventReviewCandidates(userId: string | null) {
    if (!userId) fail('SIGN_IN', 'Sign in to review events you attended.', 401);
    const rows = await this.checked(
      this.db
        .from('event_rsvps')
        .select(
          'event_id,status,checked_in_at,events!inner(id,business_id,title,starts_at,ends_at,businesses!inner(name,status))',
        )
        .eq('customer_id', userId)
        .eq('status', 'going')
        .not('checked_in_at', 'is', null)
        .limit(100),
    );
    const eligible = (rows ?? []).flatMap((row: SquareObject) => {
      const event = Array.isArray(row.events) ? row.events[0] : row.events;
      const business = Array.isArray(event?.businesses) ? event.businesses[0] : event?.businesses;
      if (
        !event ||
        !business ||
        business.status !== 'active' ||
        !canReviewAttendedEvent(row.status, row.checked_in_at, event.starts_at, event.ends_at)
      )
        return [];
      return [{ ...event, business_name: business.name, checked_in_at: row.checked_in_at }];
    });
    if (!eligible.length) return { events: [] };
    const eventIds = eligible.map((event) => event.id);
    const reviews = await this.checked(
      this.db
        .from('verified_event_reviews')
        .select('id,event_id,rating,review_text,merchant_response,moderation_status,created_at')
        .eq('customer_id', userId)
        .in('event_id', eventIds),
    );
    const byEvent = new Map(
      (reviews ?? []).map((review: SquareObject) => [review.event_id, review]),
    );
    return {
      events: eligible
        .map((event) => ({
          eventId: event.id,
          businessId: event.business_id,
          businessName: event.business_name,
          title: event.title,
          startsAt: event.starts_at,
          checkedInAt: event.checked_in_at,
          review: this.verifiedEventReviewProjection(byEvent.get(event.id) ?? null),
        }))
        .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt)),
    };
  }

  private verifiedEventReviewProjection(review: SquareObject | null) {
    return review
      ? {
          id: review.id,
          rating: review.rating,
          text: review.review_text,
          merchantResponse: review.merchant_response,
          moderationStatus: review.moderation_status,
          createdAt: review.created_at,
        }
      : null;
  }

  async submitVerifiedEventReview(eventId: string, userId: string | null, body: SquareObject) {
    if (!userId) fail('SIGN_IN', 'Sign in to review an event you attended.', 401);
    const event = await this.checked(
      this.db
        .from('events')
        .select('id,business_id,starts_at,ends_at')
        .eq('id', eventId)
        .maybeSingle(),
    );
    if (!event) fail('EVENT_NOT_COMPLETE', 'You can review this event after it has ended.', 409);
    const attendance = await this.checked(
      this.db
        .from('event_rsvps')
        .select('id,status,checked_in_at')
        .eq('event_id', eventId)
        .eq('customer_id', userId)
        .eq('status', 'going')
        .not('checked_in_at', 'is', null)
        .maybeSingle(),
    );
    if (!attendance)
      fail('EVENT_ATTENDANCE_REQUIRED', 'Only checked-in attendees can review this event.', 403);
    if (
      !canReviewAttendedEvent(
        attendance.status,
        attendance.checked_in_at,
        event.starts_at,
        event.ends_at,
      )
    )
      fail('EVENT_NOT_COMPLETE', 'You can review this event after it has ended.', 409);
    const member = await this.checked(
      this.db
        .from('business_members')
        .select('id')
        .eq('business_id', event.business_id)
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(),
    );
    if (member)
      fail(
        'BUSINESS_REVIEW_NOT_ALLOWED',
        'Business team members cannot review their own event.',
        403,
      );
    const existing = await this.checked(
      this.db
        .from('verified_event_reviews')
        .select('id,rating,review_text,merchant_response,moderation_status,created_at')
        .eq('event_id', eventId)
        .eq('customer_id', userId)
        .maybeSingle(),
    );
    if (existing) return { review: this.verifiedEventReviewProjection(existing) };
    const parsed = parsePickupReview(body.rating, body.text ?? '');
    const { data, error } = await this.db
      .from('verified_event_reviews')
      .insert({
        event_id: eventId,
        rsvp_id: attendance.id,
        business_id: event.business_id,
        customer_id: userId,
        rating: parsed.rating,
        review_text: parsed.text,
      })
      .select('id,rating,review_text,merchant_response,moderation_status,created_at')
      .single();
    if (error) {
      if (error.message.includes('verified_event_reviews_event_id_customer_id_key')) {
        const submitted = await this.checked(
          this.db
            .from('verified_event_reviews')
            .select('id,rating,review_text,merchant_response,moderation_status,created_at')
            .eq('event_id', eventId)
            .eq('customer_id', userId)
            .maybeSingle(),
        );
        if (submitted) return { review: this.verifiedEventReviewProjection(submitted) };
      }
      fail('REVIEW_SAVE_FAILED', 'Your review could not be saved. Refresh and retry.', 503);
    }
    await this.checked(
      this.db.from('verified_event_review_events').insert({
        review_id: data.id,
        event_id: eventId,
        actor_id: userId,
        event_type: 'created',
        event_data: { rating: parsed.rating },
      }),
    );
    return { review: this.verifiedEventReviewProjection(data) };
  }

  async merchantPickupReviews(businessId: string, userId: string | null) {
    await this.owner(businessId, userId);
    const [reviews, eventReviews] = await Promise.all([
      this.checked(
        this.db
          .from('pickup_order_reviews')
          .select('id,order_id,rating,review_text,merchant_response,moderation_status,created_at')
          .eq('business_id', businessId)
          .eq('moderation_status', 'published')
          .order('created_at', { ascending: false })
          .limit(100),
      ),
      this.checked(
        this.db
          .from('verified_event_reviews')
          .select(
            'id,event_id,rating,review_text,merchant_response,moderation_status,created_at,events(title)',
          )
          .eq('business_id', businessId)
          .eq('moderation_status', 'published')
          .order('created_at', { ascending: false })
          .limit(100),
      ),
    ]);
    return {
      reviews: [
        ...(reviews ?? []).map((review) => ({
          ...this.pickupReviewProjection(review),
          source: 'order',
          orderId: review.order_id,
          eventId: null,
          eventTitle: null,
        })),
        ...(eventReviews ?? []).map((review) => {
          const event = Array.isArray(review.events) ? review.events[0] : review.events;
          return {
            ...this.verifiedEventReviewProjection(review),
            source: 'event',
            orderId: null,
            eventId: review.event_id,
            eventTitle: event?.title ?? 'Event',
          };
        }),
      ].sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '')),
    };
  }

  async replyToPickupReview(businessId: string, userId: string | null, body: SquareObject) {
    await this.owner(businessId, userId);
    const reviewId = uuid(body.reviewId);
    const response = parseMerchantReviewReply(body.response);
    if (body.source === 'event') {
      const { data: eventReview, error: eventError } = await this.db
        .from('verified_event_reviews')
        .update({
          merchant_response: response,
          responded_by: userId,
          responded_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .eq('business_id', businessId)
        .eq('moderation_status', 'published')
        .select('id,event_id,rating,review_text,merchant_response,moderation_status,created_at')
        .maybeSingle();
      if (eventError)
        fail('REVIEW_REPLY_FAILED', 'Your response could not be saved. Refresh and retry.', 503);
      if (!eventReview) fail('REVIEW_NOT_FOUND', 'This review is not available.', 404);
      await this.checked(
        this.db.from('verified_event_review_events').insert({
          review_id: reviewId,
          event_id: eventReview.event_id,
          actor_id: userId,
          event_type: 'merchant_reply',
          event_data: {},
        }),
      );
      return { review: this.verifiedEventReviewProjection(eventReview) };
    }
    const { data, error } = await this.db
      .from('pickup_order_reviews')
      .update({
        merchant_response: response,
        responded_by: userId,
        responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .eq('business_id', businessId)
      .eq('moderation_status', 'published')
      .select('id,order_id,rating,review_text,merchant_response,moderation_status,created_at')
      .maybeSingle();
    if (error)
      fail('REVIEW_REPLY_FAILED', 'Your reply could not be saved. Refresh and retry.', 503);
    if (!data) fail('REVIEW_NOT_FOUND', 'This review is not available.', 404);
    await this.checked(
      this.db.from('pickup_order_review_events').insert({
        review_id: reviewId,
        order_id: data.order_id,
        actor_id: userId,
        event_type: 'merchant_reply',
        event_data: {},
      }),
    );
    return { review: this.pickupReviewProjection(data) };
  }

  async reportPickupReview(userId: string | null, body: SquareObject) {
    if (!userId) fail('SIGN_IN', 'Sign in to report a review.', 401);
    const reviewId = uuid(body.reviewId);
    const parsed = parseReviewReport(body.reason, body.details);
    const eventReview = await this.checked(
      this.db
        .from('verified_event_reviews')
        .select('id,event_id,customer_id,moderation_status')
        .eq('id', reviewId)
        .maybeSingle(),
    );
    if (eventReview) {
      if (eventReview.moderation_status !== 'published')
        fail('REVIEW_NOT_FOUND', 'This review is not available.', 404);
      if (eventReview.customer_id === userId)
        fail('OWN_REVIEW', 'You cannot report your own review.', 409);
      const { data, error } = await this.db
        .from('verified_event_review_reports')
        .insert({ review_id: reviewId, reporter_id: userId, ...parsed })
        .select('id')
        .single();
      if (error) {
        if (error.message.includes('verified_event_review_reports_review_id_reporter_id_key'))
          return { reported: true };
        fail('REPORT_FAILED', 'Your report could not be sent. Refresh and retry.', 503);
      }
      await this.checked(
        this.db.from('verified_event_review_events').insert({
          review_id: reviewId,
          event_id: eventReview.event_id,
          actor_id: userId,
          event_type: 'reported',
          event_data: { reason: parsed.reason },
        }),
      );
      return { reported: Boolean(data?.id) };
    }
    const review = await this.checked(
      this.db
        .from('pickup_order_reviews')
        .select('id,order_id,customer_id,moderation_status')
        .eq('id', reviewId)
        .maybeSingle(),
    );
    if (!review || review.moderation_status !== 'published')
      fail('REVIEW_NOT_FOUND', 'This review is not available.', 404);
    if (review.customer_id === userId)
      fail('OWN_REVIEW', 'You cannot report your own review.', 409);
    const { data, error } = await this.db
      .from('pickup_order_review_reports')
      .insert({ review_id: reviewId, reporter_id: userId, ...parsed })
      .select('id')
      .single();
    if (error) {
      if (error.message.includes('pickup_order_review_reports_review_id_reporter_id_key'))
        return { reported: true };
      fail('REPORT_FAILED', 'Your report could not be sent. Refresh and retry.', 503);
    }
    await this.checked(
      this.db.from('pickup_order_review_events').insert({
        review_id: reviewId,
        order_id: review.order_id,
        actor_id: userId,
        event_type: 'reported',
        event_data: { reason: parsed.reason },
      }),
    );
    return { reported: Boolean(data?.id) };
  }

  async readyCheckoutReward(businessId: string, userId: string | null) {
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
          'id,name,reward_description,program_type,stamps_required,points_required,checkout_reward_type,checkout_reward_variation_id,checkout_reward_percent,checkout_reward_enabled,checkout_reward_items,checkout_reward_revision,is_active',
        )
        .eq('id', membership.program_id)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle(),
    )) as SquareObject | null;
    if (!program || !program.checkout_reward_enabled) return null;
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
    return { membership, program };
  }
  async checkoutRewardOptions(
    businessId: string,
    userId: string | null,
    products: ReturnType<typeof catalogProducts>['products'],
    provider: RewardProvider,
  ) {
    const ready = await this.readyCheckoutReward(businessId, userId);
    if (!ready) return { offer: null };
    const { program } = ready;
    const items = eligibleRewardProducts(program, products, provider);
    if (program.checkout_reward_type !== 'percent_discount' && !items.length)
      return { offer: null };
    return {
      offer: {
        programId: program.id,
        revision: Number(program.checkout_reward_revision),
        provider,
        type: program.checkout_reward_type,
        label: program.reward_description,
        percent: program.checkout_reward_percent,
        items,
      },
    };
  }
  async checkoutReward(
    businessId: string,
    userId: string | null,
    cart: ReturnType<typeof parseCart>,
    products: ReturnType<typeof catalogProducts>['products'],
    selectionValue?: unknown,
    provider: RewardProvider = 'square',
  ) {
    const selection = parseRewardSelection(selectionValue);
    if (!selection) return null;
    if (!userId) fail('REWARD_SIGN_IN', 'Sign in to claim your reward.', 401);
    const ready = await this.readyCheckoutReward(businessId, userId);
    if (!ready)
      fail(
        'REWARD_NOT_READY',
        'This reward is no longer available. Save it for later or refresh your rewards.',
        409,
      );
    return selectedReward(ready.program, ready.membership.id, cart, products, provider, selection);
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

  async resolvePaymentReview(id: string, userId: string | null, body: SquareObject) {
    const current = await this.authorizeOrder(id, userId, null, true);
    if (body.confirmed !== true)
      fail('CONFIRM_REQUIRED', 'Confirm continuing this partially refunded order.', 409);
    await this.reconcile(current);
    return this.withOrderLease(id, integer(body.version, 1, 10000000), async (order, lease) => {
      if (
        order.status !== 'payment_review' ||
        order.provider_status !== 'PARTIAL_REFUND' ||
        !order.paid_at ||
        Number(order.refunded_minor) <= 0 ||
        Number(order.refunded_minor) >= Number(order.total_minor) ||
        (order.dispute_state && !['WON', 'RESOLVED'].includes(order.dispute_state))
      )
        fail('REVIEW_NOT_READY', 'Resolve this payment with the provider before continuing.', 409);
      const status = ['placed', 'accepted', 'preparing', 'ready', 'completed'].includes(
        order.payment_resume_status,
      )
        ? order.payment_resume_status
        : order.completed_at
          ? 'completed'
          : 'placed';
      const updated = await this.patchOrder(id, lease, {
        status,
        reviewed_refunded_minor: order.refunded_minor,
        provider_status: 'PARTIAL_REFUND_ACKNOWLEDGED',
      });
      await this.checked(
        this.db.from('square_order_events').insert({
          order_id: id,
          actor_type: 'owner',
          actor_id: userId,
          to_state: status,
          from_state: 'payment_review',
        }),
      );
      return { order: await this.orderProjection(updated, true) };
    });
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
            .select('id,order_id,snapshot')
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
    const provider = (await this.selectedProvider(businessId)) ?? 'square';
    const offset = integer(body.offset ?? 0, 0, 100000);
    const history = body.history === true || body.view === 'history';
    const requests = body.view === 'requests';
    let query = this.db
      .from('square_orders')
      .select<string, SquareObject>(requests ? '*,square_order_support_requests!inner(id)' : '*')
      .eq('business_id', businessId);
    if (requests)
      query = query
        .eq('square_order_support_requests.status', 'open')
        .not('status', 'in', '(refunded,checkout_expired,checkout_failed,dispute_lost)');
    if (!requests)
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
            .select('id,order_id,snapshot')
            .in(
              'order_id',
              rows.map((o) => o.id),
            ),
        )
      : [];
    const openRequests = rows?.length
      ? await this.checked(
          this.db
            .from('square_order_support_requests')
            .select('id,order_id,request_type,message,response,status,created_at,resolved_at')
            .eq('status', 'open')
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
          .from(provider === 'stripe' ? 'stripe_ordering_settings' : 'square_ordering_settings')
          .select('enabled,is_open,timezone')
          .eq('business_id', businessId)
          .maybeSingle(),
      ),
      this.checked(
        this.db
          .from(provider === 'stripe' ? 'stripe_account_states' : 'square_connections')
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
      orders: (rows ?? []).map((o) => ({
        ...publicOrder(
          o,
          (items ?? []).filter((i) => i.order_id === o.id),
          true,
        ),
        supportRequest: this.supportProjection(
          (openRequests ?? []).find((r) => r.order_id === o.id) ?? null,
        ),
      })),
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

  async cancelCoveredOrder(order: SquareObject, lease: string, userId: string | null) {
    if (!['placed', 'accepted', 'preparing', 'ready', 'completed'].includes(order.status))
      fail('INVALID_TRANSITION', 'This order cannot be cancelled.', 409);
    const updated = await this.patchOrder(order.id, lease, {
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      refunded_minor: 0,
    });
    await this.checked(
      this.db.from('square_order_events').insert({
        order_id: order.id,
        actor_type: 'operator',
        actor_id: userId,
        from_state: order.status,
        to_state: 'refunded',
      }),
    );
    return { order: await this.orderProjection(updated, true) };
  }
  async pickupCode(id: string, userId: string | null, statusToken: unknown) {
    const order = await this.authorizeOrder(id, userId, statusToken);
    await this.rollout(order.business_id);
    if (
      order.status !== 'ready' ||
      !order.paid_at ||
      (!order.square_payment_id &&
        !(Number(order.total_minor) === 0 && order.provider_status === 'REWARD_COVERED'))
    )
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
    if (
      order.status !== 'ready' ||
      !order.paid_at ||
      (!order.square_payment_id &&
        !(Number(order.total_minor) === 0 && order.provider_status === 'REWARD_COVERED'))
    )
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
