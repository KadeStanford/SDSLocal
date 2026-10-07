# Cancellation requests and automatic page updates — staging release

Published 2026-09-28 to the existing Expo Preview channel, using EAS environment preview with EXPO_PUBLIC_APP_ENV=staging.

- Cancellation requests offer owners Cancel & refund directly, opening the remaining-payment confirmation. Existing backend ownership, version, dispute and payment checks still apply. A typed reply is not required to refund.
- Provider-confirmed full refunds close all open order requests atomically. A backfill cleared one stale staging request. Ended orders reject new requests, including issue requests, and requests are excluded from the queue and badge count. Partial refunds retain active requests; completed pickups can still receive issue requests.
- All 13 existing page/menu pull controls now track a manual pull gesture separately from ordinary loading. Existing polling, focus refreshes, foreground updates and menu updates continue without activating the native pull-down animation.

Migration: 20260928000400_close_cancelled_order_requests. Both lifecycle triggers are installed; staging readback found zero open requests on ended orders and no authenticated access to the private queue-count RPC.

Affected staging functions are ACTIVE: square-commerce 46, square-webhook 14, square-oauth-callback 13, stripe-webhook 11, stripe-oauth-callback 14, stripe-checkout-return 8, square-maintenance 17, delete-account 13.

Validation: 30 mobile regression/render tests and 32 backend refund/support tests passed; mobile TypeScript and diff whitespace checks passed. Rolled-back staging SQL fixtures verified full refund closure, partial refund retention, ended-order closure and rejection of new requests. No email, actual payment or provider refund was performed. Focused lint still reports existing React effect/ref errors and unused/dependency warnings in the touched screens; it is not a clean lint result. Phone acceptance remains to be verified.

OTA group: 13c63e70-66bd-4573-82b6-064dd6b461a4. Android: 01a0ea42-9d64-76e4-9ef0-cb16f992ec97. iOS: 01a0ea42-9d64-7867-91d3-b7f34699177f. Runtime: 0.1.0. Readback verified the active Preview branch, staging configuration, both platform bundles and unchanged native fingerprints. Built from the shared working tree with recorded HEAD 456062ffb30bda1882571c78773511b7e9b1f07a, including existing mobile workspace edits.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/13c63e70-66bd-4573-82b6-064dd6b461a4).

Close and reopen the Preview app twice to download and launch the update. Verify a customer cancellation request exposes the refund confirmation, a fully refunded order disappears from Requests, and automatic updates leave the pull-down indicator idle while a manual pull still animates.
