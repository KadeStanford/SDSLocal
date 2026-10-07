# Automatic checkout reward validation repair — September 29, 2026

The customer's Bayou & Bloom checkout quoted an earned free-item reward, reducing $21.50 to $18.00. The program's optional item restriction was blank, which the business settings explicitly describe as automatic selection of an eligible cart item. The checkout service selected an item, but `square_redeem_checkout_reward` compared its ID to NULL and raised `REWARD_CHANGED`. Reservation rolled back; no customer order or redemption was committed. The mobile fallback showed a generic connectivity/recovery message.

Applied and registered staging migration `20260929001000_automatic_checkout_reward_item.sql`. Automatic free-item and BOGO selections are now accepted when the merchant has not restricted the offer to a specific item. A concrete selection remains required; explicit item restrictions, account ownership, balance checks, locking, private RPC access, and idempotent reservation are preserved. No OTA or Edge Function deployment was required.

Validation:

- Ordinary demo-customer Square Sandbox checkout reached an unpaid hosted payment link, isolating the failure to the earned-reward path. No payment was submitted. The diagnostic unpaid order is `39dd93c9-3c43-4b72-b668-1955e45a28fd`, with expiry `2026-09-29T22:15:00Z`; normal maintenance handles expiry.
- Regression reproduced `REWARD_CHANGED` before the fix.
- Candidate migration and regression passed together in a rolled-back transaction before deployment.
- Post-deployment regression passed: automatic free item, automatic BOGO, explicit item match/mismatch, missing selection rejection, insufficient balance rejection, one redemption across reservation retries, and private RPC grants.
- The actual failed quote/account/cart successfully reserved at $18.00 and retried idempotently inside a rollback-only transaction. No lasting order or redemption was created by that verification.
- Account readback confirms the original three stamps are intact, with no redemptions or new orders for the customer's account.

Evidence: `.codex-tmp/checkout-repair/candidate-verification.json`, `deployment-verification.json`, and `account-verification.json`. The original quote has expired; the customer should use Recover checkout status, then review the saved cart for a fresh quote and proceed to payment. End-to-end paid acceptance remains a user test; validation did not submit a charge.
