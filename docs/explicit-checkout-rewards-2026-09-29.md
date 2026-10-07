# Explicit menu rewards and pickup checkout — staging release

Status: published to staging after user approval. The migration, eight Edge Functions, and preview OTA were verified; see the release record below. Database regressions ran in rolled-back transactions.

## Customer flow

A reward panel appears in the business ordering menu and cart when the signed-in customer has an earned, enabled checkout reward. Customers choose an eligible item; the normal item sheet supports required options and paid extras. Nothing is auto-selected. Save for later removes the claim while retaining any item at its regular price. The cart, review and receipt show the discount separately.

Claims persist with the cart and are tied to the customer, program, offer revision and payment provider. They follow their cart line when other lines are removed. Changed offers, retired items, a different account/provider, or insufficient BOGO quantity require review or explicit removal before checkout. Definitive reward failures release an uncreated checkout only after an empty status recovery; uncertain payment attempts retain their idempotency key.

Free item: one base unit is covered; extras and additional quantities cost extra. Item discount: a percentage of one base unit. BOGO: two units of the chosen eligible variation are required, with one base unit covered and extras charged on both. Order discount: a percentage of base-item subtotal, excluding paid modifiers. One reward per order; prices, balances and selection eligibility are checked again on the server.

## Business setup

Rewards at checkout replaces the free-text Square variation ID with an enable switch, four reward types, percentage field where applicable, and a searchable multi-select of actual ordering menu items/variations. Unavailable or previous-provider selections can be removed. Changes version the offer. Existing explicit item configurations and percentage offers migrate; historical blank automatic-item configurations remain available in person but require the owner to choose items and enable checkout redemption.

## Payment and accounting

Both providers use the same selection/eligibility rules. Square attaches fixed item discounts only to the chosen line and verifies the current provider price before calculation. Stripe hosted checkout shows the discounted reward unit separately from remaining full-price quantities. PaymentSheet uses the same authoritative total. Net line amounts support refunds, while customer receipts show gross items and a separate reward deduction. Stripe stored subtotal now subtracts the reward, matching the payable total and database invariant. Percentage rounding is distributed without negative line totals.

Fully covered orders reserve the pickup slot and redeem the reward atomically, then become placed without a provider payment. They support normal staff pickup QR confirmation and do not earn another reward. Cancelling a covered order restores the reward without a card refund. Existing idempotent settlement restores reserved rewards after failed/expired checkout or a full refund. Stripe's existing nonzero minimum-payment rule remains; the customer receives a specific recovery message for amounts below the minimum.

## Validation

- 379 backend tests passed (33 files), including 13 explicit-reward tests.
- 130 relevant mobile tests passed (9 files); mobile TypeScript passed.
- ESLint: no errors; two existing unused declarations in business-workspace.tsx remain warnings.
- SQL regression exercises Square and Stripe reservation, idempotency, zero-total placement, QR pickup, no reward farming, cancellation restoration, expiry restoration, stale revisions, ineligible items, points exhaustion and restoration. Every fixture and candidate schema change was rolled back. No hosted emails or provider charges were sent.
- Light/dark component render previews, with native symbols approximated. Layout checks cover 320/390/430 widths and 135% text. This is not a native device payment test.

## Review files

`.codex-tmp/reward-order-review/`: available-review.png, choices-review.png, customize-review.png, cart-review.png, free-review-review.png, business-review.png. Verification JSON records layout checks. UI fixtures include a menu photo and missing-photo cases.

## Release after approval

Apply `20260929001100_explicit_checkout_rewards.sql`, deploy the commerce Edge Function with the shared backend changes, then publish the approved mobile code to the existing Expo staging channel. Select eligible items in a staging business's reward program before testing the customer panel on a phone. In-flight older automatic reward quotes must refresh their totals; normal ordering without selecting a reward remains available.

Provider behavior checked against the official Square order-discount documentation (https://developer.squareup.com/docs/orders-api/discounts) and Stripe price/discount APIs (https://docs.stripe.com/api/prices/object and https://docs.stripe.com/api/coupons/create). These references support item-scoped discounts and zero-priced hosted line items; no live charge was used as verification.


## Approved OTA published

Published 2026-09-29T23:07:29.553Z after user approval. Expo preview channel and environment; staging backend; runtime 0.1.0.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/0814024c-563f-4e00-baa3-1d53f95bb221)

- android: 01a0ef6c-5591-7876-8fc8-ce6983c0865c
- ios: 01a0ef6c-5591-7d32-a8ea-497262d0cab7

Fresh iOS/Android exports verified unchanged native configuration, staging backend and test payment settings. Source hashes stayed stable during export and were rechecked before publication. Active channel readback verified both published IDs. Exact source and bundle hashes are stored in .codex-tmp/explicit-rewards-source.json and explicit-rewards-bundle-verification.json.
