# Orders and merchant interface — staging release, 2026-09-28

## Deployed order and refund changes

Source: `133fc699dc1e66ebc5a77e36b38682b8a66cbe96`.
Expo Preview group: `c4a3324a-173e-47f1-8933-53aef33b1ca9`, runtime `0.1.0`, staging environment.

- Customer checkout waits for canonical server confirmation and polls pending payments. It does not claim confirmation based on checkout return alone or offer another payment after SDK success.
- Business replies immediately apply the returned request state. Open customer requests have an attention label, queue filter/count, and Orders badge.
- Item refunds select quantities; the backend calculates cents from the saved paid order, including allocated tax and discounts. A private durable ledger reserves quantities before either provider request. Pending retries retain their original amount and idempotency key; external unmatched refunds disable item selection for review.
- Migration `20260928000300_item_refunds_and_request_queue` and all eight affected functions were deployed to `lgddhdexvwclfrnzjtly`. ACTIVE readback: square-commerce 45, square-webhook 13, square-oauth-callback 12, stripe-webhook 10, stripe-oauth-callback 13, stripe-checkout-return 7, square-maintenance 16, delete-account 12.
- Verification: 137 relevant backend and 97 mobile tests, mobile typecheck, eight Deno entrypoints, rolled-back staging settlement SQL. Live readback confirmed migration, private ledger client access denial, anonymous private endpoints/unsigned webhook HTTP 401, existing public Stripe ordering HTTP 200, no retry inbox backlog, and successful recent maintenance responses.
- No new provider payment or refund was performed during these checks. Existing Sandbox evidence and remaining provider acceptance requirements are recorded in the earlier payment release document.

## Fresh Stripe Connect fixture

`Magnolia & Main Test Kitchen`, business `99999999-9999-4999-8999-999999999999`, slug `demo-magnolia-main-test-kitchen`, is published in staging and owned by the confirmed `kade20413@gmail.com` account. Readback confirmed active owner membership, 15 visible items, four menu sections, seven days of hours, Stripe pilot eligibility, and no linked Stripe or Square account. Fixture: `supabase/ops/seed-magnolia-stripe-test-business.sql`. No email was sent.

## Enterprise interface follow-up

The management list now uses neutral light/dark surfaces, compact merchant rows, search, published/setup filters, and a per-business action menu. Owner rows open management; staff rows open preview. Publishing plan settings appear below businesses. The swipe-back destination uses the same list and retained search/filter state.

The order footer has one primary fulfillment action and a compact actions menu. Item refunds, remaining-payment refunds, pending refund checks, and partial-refund continuation appear in a separate panel with confirmation steps. Existing server authorization, order version checks, provider settlement, and item amount calculation remain in force.

Follow-up verification: 54 tests across navigation, rendered order/business components, and confirmation logic; mobile TypeScript and diff whitespace checks passed. Rendering checks cover both themes and owner/staff destinations. A local browser fixture was blocked by browser protocol policy; actual phone visual and touch acceptance remains pending.

Published and read back at 2026-09-28 21:31 UTC:

- Source: `e399030074ba47118b1520391f4af7764656f6c9`.
- Preview group: `da105aa0-b50c-4561-8ec7-b41f06c15c5e`.
- iOS: `01a0e9ee-004f-7222-b870-7cba373785da`.
- Android: `01a0e9ee-004f-7ce0-8c03-f58c4cab4562`.
- Channel/branch/environment: Preview; manifest app environment: staging; runtime: `0.1.0`. Both native fingerprints match the previous compatible payment update, so a new binary is not required.
- [Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/da105aa0-b50c-4561-8ec7-b41f06c15c5e).

## Remaining acceptance

Close and reopen Preview twice to receive the update. Verify the new business list, large text/narrow screens, order footer/action panel, checkout return and delayed confirmation, customer reply updates, and both providers' refund paths on the phone. Square dispute subscription additions and seller reconnect with DISPUTES_READ remain unverified. Prior audit volume/outage controls and appointment pagination follow-ups remain outstanding. This release does not establish production readiness.

## Dark background correction

The merchant list and swipe-back destination now use `Colors.dark.background` (`#0E1411`), matching the shared app theme. The redesigned card surfaces and light theme are unchanged. Mobile TypeScript checking and diff checks passed.

Published 2026-09-28 21:46 UTC from `dc3879a69ac2cbc2f324c1129226ce6b60a4f809`, Preview group `955d09da-e266-4149-8769-9f426b0817a7`: Android `01a0e9fc-1792-7ef0-94c5-4e539614efd5`, iOS `01a0e9fc-1792-7e1f-ab76-153874aafa9c`. Channel readback verified staging, Preview, runtime `0.1.0`, the expected source revision, and unchanged compatible native fingerprints on both platforms.
