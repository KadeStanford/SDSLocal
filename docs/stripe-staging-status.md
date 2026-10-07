# Stripe staging verification (September 28, 2026)

## Ready for Preview testing

Juniper & Ember Kitchen (`88888888-8888-4888-8888-888888888888`) is the only
Stripe pilot business in staging project `lgddhdexvwclfrnzjtly`. The
`stripe_commerce` rollout is enabled with `environment=test`. Its selected
ordering provider is Stripe, with 15 available products and enabled/open pickup
settings in `America/Chicago`.

The existing Sandbox seller `acct_1UI82QLV9c8PsIxG` is connected, with
`details_submitted`, `charges_enabled`, and `payouts_enabled` all true. A live
owner status refresh corrected the stale pending cache. Final anonymous
availability returned HTTP 200, `available=true`, 94 slots, and 15 products.

## Fixes deployed

- Embedded Account Sessions no longer request
  `disable_stripe_user_authentication=true`, which Stripe rejects for this
  seller's Dashboard configuration. Stripe authentication stays enabled.
- The owner pickup queue reads the selected provider's settings and account
  state, including the Stripe tables.
- Reconnect resets a revoked cached state and reuses the existing seller.
- The EAS Preview publishable key now belongs to the correct Sandbox platform
  (`acct_1UI10WLV9cSPw2jb`). The previous key produced HTTP 403
  `platform_account_required`; the corrected key completed the test payment.
  Its SHA-256 prefix is `1c17b6fd32aeae18`.

Implementation commit: `97776a80770bc90038e3f50b062f47e829e9e65b`.

## Actual Sandbox payment and fulfillment

- Guest quote and checkout created order `68f11441-de1a-4adf-a400-ee5a97c906e8`,
  number `S-8461BC5CC242`, for USD 3.50 in PaymentSheet mode. It initially
  remained `checkout_pending`; an idempotent checkout retry returned the same
  order.
- Stripe PaymentIntent `pi_3UKj45LV9c8PsIxG1JV3wVMh` succeeded with `livemode=false`
  using the correct public test key and Stripe's `tok_visa` fixture.
- Before any customer status refresh, SQL showed the order placed at
  `2026-09-28T18:15:18.511Z`. The Stripe webhook invocation
  `99c3cc57-468a-4b96-a2ec-5fbd629439a3` returned HTTP 200 at 18:15:19 UTC.
  The handler verifies the signature, test environment, merchant account, and
  canonical provider state before reconciliation. An unsigned probe returned
  HTTP 401 (`c05a9bff-798f-4b26-9e41-f7f5f8804403`).
- The owner queue reported connected/enabled and included the order. Disconnect
  while it was active returned HTTP 409 `ACTIVE_ORDERS`.
- Owner transitions passed: accepted -> preparing -> ready. Guest pickup code,
  owner scan preview, and scan confirmation completed the order. Guest status
  agreed; guest fulfillment awarded no member reward points or visits.
- Full refund returned HTTP 200. Guest status became refunded with total 350
  minor units. Refund `re_3UKj45LV9c8PsIxG1dYVOwYS` completed at
  `2026-09-28T18:18:31.255Z`, with provider status `REFUND_SUCCEEDED`.
  Stripe Dashboard independently showed the USD 3.50 Visa 4242 transaction as
  Refunded with the same order number.
- After refund, disconnect succeeded and public availability became false.
  Embedded reconnect returned a usable session, reused the seller, and restored
  connected readiness. Original ordering settings were restored; availability
  became true and the refunded order remained in history.

## Verification and deployed functions

- Five focused Vitest files passed 95/95 tests, including embedded session
  security, environment/account validation, reconnect, and provider-aware queues.
- Workspace typecheck completed 8/8 tasks (Turbo cache hits).
- Prettier and `git diff --check` passed for the implementation changes.
- The transactional `supabase/tests/ordering_provider_separation.sql` suite
  passed against staging after reserved-column and JSONB-cast fixes; fixtures
  and setting changes rolled back (commit `2c9fa6a`).
- Active staging versions read back: `square-commerce` v43,
  `stripe-oauth-callback` v11, `stripe-webhook` v8,
  `stripe-checkout-return` v5, and `square-maintenance` v14.

The user authorized the existing staging server key for temporary owner test
sessions. It was used only in process/browser memory, never saved to files,
logs, commits, or client bundles. Admin generate-link did not send hosted email.

## Published Preview OTA

Both platform updates were published and read back on branch `preview`, runtime
`0.1.0`, from implementation commit `97776a8`:

- Group: `c94ff6b8-8aef-477e-8ebb-727461f7b441`
- Android: `01a0e943-b31d-75d1-ab4f-5882dbcfc836`
- iOS: `01a0e943-b31d-7c0c-bd99-ee9a2547c914`
- Message: Fix Stripe Sandbox payments and merchant setup
- Dashboard: https://expo.dev/accounts/kadestanford/projects/sds-local/updates/c94ff6b8-8aef-477e-8ebb-727461f7b441

Before publication, EAS Preview environment verification confirmed staging
project `lgddhdexvwclfrnzjtly` and the exact corrected public test key.

Fully close and reopen the Preview app twice, then order from Juniper & Ember
Kitchen. Use test card `4242 4242 4242 4242`, a future expiry, and any CVC.
Check native PaymentSheet, cancel/retry, confirmed status, owner queue, pickup
handoff, and refund. Owner secure payment setup may request Stripe sign-in.
Native phone interactions still need user testing; the API flow and actual
Sandbox provider transaction were verified above.

Square verification is recorded separately in `appointment-staging-status.md`;
its physical-device checks remain pending. This pass did not deploy production,
charge live cards, change RevenueCat, or modify native configuration.
