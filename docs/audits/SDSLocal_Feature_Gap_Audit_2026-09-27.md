# SDSLocal feature gap audit

**Date:** 27 September 2026
**Scope:** Current mobile app flows, supporting Supabase schema/migrations, and the web surfaces where they overlap.
**Type:** Repository review; no production, staging, device, or customer-data verification.

This pass looks for product capabilities beyond the current design cleanup and the in-progress setup guide, analytics, discovery, service-request, and event RSVP work. The findings below are product gaps, not claims that the app is broken.

## Findings

### 1. Service requests stop before a quote or booking — high

The current request stores a message and preferred timing. The merchant marks it in review, contacted, or completed, then replies through email. There is no in-app conversation, structured quote, customer acceptance, appointment slot, or deposit/payment step. The customer is told that the request does not confirm a booking or price.

**Next step:** Give each request a private message thread and a quote card with price, scope, expiry, and proposed times. Let the customer accept, decline, or ask a follow-up; accepting should create a confirmed appointment and, if needed, a deposit checkout.

Evidence: [customer request form](../../apps/mobile/src/app/service-request.tsx#L185), [merchant request queue](../../apps/mobile/src/app/service-requests.tsx#L113), [request schema and status lifecycle](../../supabase/migrations/20260927000100_local_growth_features.sql#L183).

### 2. Customers have limited control after placing an order — high

Customers can view current and past orders and open an order detail. The customer order card exposes navigation to details; the refund/cancel action is on the merchant order screen and is owner-gated. The customer flow has no self-service cancellation window, correction request, or reorder action.

**Next step:** Add a clear order support action. Allow cancellation only before a merchant-defined preparation cutoff, and route later requests to the merchant. Add “Order again” from history after revalidating current prices, availability, and pickup times.

Evidence: [customer order history](<../../apps/mobile/src/app/(tabs)/orders.tsx#L34>), [customer order card](../../apps/mobile/src/components/pickup/customer-order-card.tsx#L12), [merchant-side refund action](../../apps/mobile/src/app/pickup-order.tsx#L188).

### 3. Public business pages lack buyer-verified reviews — medium

The public profile supports business information, offerings, events, follows, and contact actions, but the repository has no customer rating/review table or customer review flow. Existing “review” code refers to business approval and admin moderation. New customers therefore have little purchase-based social proof when choosing between unfamiliar local businesses.

**Next step:** Invite a customer to leave one rating and optional short review after a completed order or attended event. Mark it as verified, give the business a response, and route reports through existing moderation tools. Avoid open, unverified reviews in the first version.

Evidence: [public business page](../../apps/mobile/src/components/public-business-page.tsx), [base business and event schema](../../supabase/migrations/20260915000100_initial_schema.sql#L69), [admin review queue](../../apps/web/src/app/admin/reviews/page.tsx).

### 4. Merchant analytics measure interest, not sales — medium

The new insight card summarizes page views, visitors, offering/event views, and customer actions. Its event model does not include cart creation, checkout start, successful payment, order value, refunds, or repeat orders. A merchant can see attention but cannot answer “did this page generate orders?”

**Next step:** Add privacy-safe aggregate funnel metrics tied to server-confirmed order transitions: checkout starts, completed orders, gross/net sales, refunds, and repeat-customer count. Show sample size and date range, and keep all money totals sourced from verified provider/order records.

Evidence: [analytics event types](../../apps/mobile/src/lib/business-analytics.ts#L28), [analytics summary card](../../apps/mobile/src/components/business-analytics-card.tsx#L22), [analytics aggregation RPC](../../supabase/migrations/20260927000100_local_growth_features.sql#L75).

### 5. Event RSVPs do not represent groups or give merchants an attendee workflow — medium

The RSVP model stores one status per event and customer, and the business workspace displays “going” and “waitlisted” counts. It has no party size/guest list, attendee export, or check-in state. That is enough for a basic capacity count, but not for family RSVPs or door management.

**Next step:** Add a small party-size field first, then an owner-only attendee list with check-in status and a privacy-safe export. Keep waitlist promotion transactional and show customers their current position or a clear “position not available” explanation.

Evidence: [RSVP row model](../../supabase/migrations/20260927000100_local_growth_features.sql#L354), [RSVP summary RPCs](../../supabase/migrations/20260927000100_local_growth_features.sql#L383), [merchant RSVP count display](../../apps/mobile/src/components/business-workspace.tsx#L4012).

### 6. Ordering is pickup-only — later expansion

The commerce model requires `pickup_at`, `pickup_timezone`, and `pickup_address`; slot limits and availability are also based on pickup windows. This is a sensible first operating model, but it excludes customers who expect delivery and businesses that want local delivery without a marketplace courier.

**Next step:** Treat delivery as a separate fulfillment choice after pickup operations are reliable. Start with merchant delivery radius/fee/minimum and delivery windows, then decide whether to integrate a delivery partner. Keep pickup and delivery status, capacity, tax, and refund rules explicit rather than overloading pickup fields.

Evidence: [pickup order schema](../../supabase/migrations/20260920000600_square_commerce.sql#L72), [pickup slot reservation](../../supabase/migrations/20260920000600_square_commerce.sql#L200), [customer ordering entry point](../../apps/mobile/src/components/public-business-page.tsx#L1).

## Suggested order

I would build **service quote-to-booking** and **customer order recovery/reorder** first. Those close the two core transactions customers start in the app. Then add verified reviews and sales-linked merchant analytics. Expand event attendance tools for businesses that actively use RSVP capacity. Add delivery only after the pickup workflow and support burden are understood.

## Review boundary

This report is based on the current checkout, which contains uncommitted implementation work from the previously approved pass. It does not establish what is currently live in staging. No code or database changes were made for this audit.
