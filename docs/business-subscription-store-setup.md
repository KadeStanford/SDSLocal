# Business subscription store setup

Updated September 29, 2026. The subscription screen and public policy links are
published on the EAS **preview** channel for iOS and Android, runtime `0.1.0`.
Latest update group: `9a461728-2552-4cab-a821-68e07209a70d`, including both
platform-specific RevenueCat public SDK keys and public policy links. Supersedes
`e7f12f2a-dce1-4623-a24b-f4dc100ad8ae`.

Apple's three monthly products are configured in App Store Connect and mapped
to RevenueCat. The staging webhook and subscription migrations are deployed.
Google's service account, APIs and app-scoped permissions are configured. The
user downloaded a usable JSON key in Brave and saved it in RevenueCat. RevenueCat
now shows valid credentials after the first internal release was published.
All three Google monthly products are active and mapped to RevenueCat. Native store
purchases have not been accepted on-device. The six monthly store mappings are
active on staging, and checkout is enabled only for the confirmed app account
`kade20413@gmail.com`. **The global rollout remains disabled**. Tier feature
enforcement and native purchase acceptance remain production release blockers.

## Completed configuration

- App Store Connect app `6817169302`; subscription group `22422995`.
  Monthly Essentials/Growth/Pro: $19/$39/$69 USD, United States availability,
  English (U.S.) metadata, Family Sharing off and one purchase per account.
  Products remain Prepare for Submission; no production submission was made.
- RevenueCat project `d0f8ce86`, Apple app `app74df029387`, verified Apple IAP
  credentials, entitlement `business_listing` (`entl3b514242ec`).
  Default offering `business_listing` (`ofrng2db4e9fde0`) contains
  `essentials_monthly`, `growth_monthly`, and `pro_monthly`, each mapped to the
  corresponding Apple and Google product. Restore behavior: **Keep with original App User ID**.
- Apple sandbox server notification URL saved to the RevenueCat endpoint.
  Production notification URL is unset.
- Google Cloud project `sds-local-508919`: Play Developer, Play Developer
  Reporting, and Pub/Sub APIs enabled. Dedicated RevenueCat service account has
  Pub/Sub Editor and Monitoring Viewer. Its Play access is limited to Parish Pass:
  app information/read-only (includes app quality), financial/purchase data,
  and managing orders/subscriptions. No publishing or store-editing permission.
- RevenueCat Android app `app51faff6d9f` uses the approved Google service-account
  key. It now shows **Valid credentials**. The Android public SDK key is saved
  in the EAS Preview environment. Google monthly products are imported and each
  is attached to `business_listing`: Essentials `prod459ea25cf7`, Growth
  `prod3a9879ee1a`, Pro `proddd59acdf22`. All three monthly packages include their
  corresponding Google base plan.
- Google Play subscriptions `listing_essentials_v1`, `listing_growth_v1` and
  `listing_pro_v1` each have an active `monthly` base plan: USD $19.00/$39.00/$69.00,
  United States only, auto-renewing, seven-day grace period, automatically
  calculated 53-day account hold, resubscribe allowed, no trial or introductory
  offer. Each tier includes three businesses; features determine the tier.
- Google internal test release `0.1.0 (3) subscription sandbox` is published and
  **Available to internal testers**. The `Parish Pass subscription sandbox`
  email list contains `kade20413@gmail.com` and is selected for both the internal
  track and license testing (`RESPOND_NORMALLY`). Test opt-in link:
  https://play.google.com/apps/internaltest/4700766737730296217.
- RevenueCat is connected to Google topic
  `projects/sds-local-508919/topics/Play-Store-Notifications` and subscription
  `RevenueCat-Subscriber-app51faff6d9f`. Play real-time notifications are enabled
  for subscriptions and voided purchases. After approval, Google's notification
  service was granted Pub/Sub Publisher on this topic only. A Play test event
  reached RevenueCat: **Last received September 29, 2026, 04:27 UTC**.
  Tracking new purchases from server notifications remains off so SDK purchases
  retain the signed-in Supabase account UUID.
- Staging Supabase `lgddhdexvwclfrnzjtly`: migrations
  `20260929000200_feature_subscription_catalog`,
  `20260929000300_business_creation_subscription_gate`, and
  `20260929000600_listing_subscription_event_ordering` applied, plus
  `20260929000700_sandbox_subscription_rollout`.
  `revenuecat-webhook` deployed with dedicated Bearer authentication and
  `BILLING_ENVIRONMENT=sandbox`. RevenueCat webhook `whintgr6e6864d5f6` sends
  eight supported subscription lifecycle event types, sandbox only.
- Unauthorized webhook test returned 401; authenticated sandbox TEST returned
  200 without creating an entitlement. RevenueCat's own Send Test Event also
  reached staging and returned HTTP 200 with `processed: true, test: true`.
  Rollback SQL tests passed for feature
  catalog, creation gating, duplicate/stale events, renewals, and revocation.
- Account-specific staging rollout: `business_listing_billing.enabled=false`,
  `sandboxCheckout=true`, and one enabled entry in the private
  `business_subscription_sandbox_testers` table. The confirmed tester receives
  `billingEnabled=true` but `canPublish=false` until a verified purchase.
  Other app accounts retain free preview setup. Only the six configured Apple/
  Google monthly mappings are active; new yearly and Test Store products remain
  inactive. No entitlement was fabricated for the actual tester.
  Rollback tests verify isolation, disabled/anonymous users, creation before
  purchase, assignment after a trusted fixture event, and existing capacity/
  idempotency behavior. No emails were sent.
- Public pages are hosted at
  [Parish Pass policies](https://parish-pass--policies.expo.app/):
  [terms](https://parish-pass--policies.expo.app/terms.html),
  [privacy](https://parish-pass--policies.expo.app/privacy.html),
  [support](https://parish-pass--policies.expo.app/support.html), and
  [account deletion](https://parish-pass--policies.expo.app/delete-account.html).
  All four return HTTP 200 without sign-in. Source: `apps/public-info`.
  Preview EAS variables point to these pages and the offering. Public SDK keys
  for both platforms are configured.

## Remaining sandbox work

1. Verify native Google purchase, renewal, cancellation and restore behavior.
   The topic-only publisher grant and test delivery are verified. No broader
   Pub/Sub administrative grant was needed.
2. Install the published Android internal build and verify sandbox purchases.
   EAS build `a25a9563-166c-498d-a1d3-752ab822fdcd` (version code 3) was manually
   uploaded from `F:/BusinessApp/.codex-tmp/parish-pass-play-sandbox.aab` in Brave.
   The original failed key ending `cb25c085` was deleted after the valid
   replacement was saved. Two other failed download keys remain; removing those
   requires a separate cleanup approval. Do not create more keys.
   In-app browser file transfers failed and Windows Chrome automation could not
   verify its URL. Brave works for navigation and the user downloaded the key
   there. Its ChatGPT extension currently blocks automated local uploads until
   the user enables "Allow access to file URLs". Manual uploads are an alternative.
   Do not create further service-account keys; the downloaded key is usable.
3. Complete feature enforcement and native acceptance before enabling the
   global rollout. The Google products, RevenueCat mappings, licensed testers
   and internal release are configured. Monthly checkout is available to the
   selected staging tester for this acceptance process.
4. Run native sandbox acceptance on the existing EAS iOS build. Apple's
   account setup is complete: the Paid Apps Agreement, bank account, and U.S.
   Form W-9 were each verified **Active** on September 29, 2026 after the
   Account Holder completed the required information.
   Never enter a new tester password for the user or accept agreements or
   certify tax/banking information on their behalf.
   The user confirmed they currently test on iOS via a direct EAS install link.
   The user created one United States Sandbox Apple Account, verified in
   App Store Connect as `kadestanford1@gmail.com`. Keep the Parish Pass app
   signed in as `kade20413@gmail.com`; the sandbox store login is separate.
   The Free Apps Agreement also remains Active. The Business page displays an EU
   trader compliance notice; EU distribution is separate from the US-only
   subscription sandbox setup.
   TestFlight currently shows No Builds; testing the existing EAS internal build
   needs the sandbox tester account rather than a TestFlight installation.
   On September 29, the tester reported unavailable iOS prices. RevenueCat's
   SDK offering endpoint returns the three correct Apple monthly identifiers
   for the designated app UUID, the Apple IAP credentials are valid, and the
   staging catalog/read permissions are enabled. Native product retrieval is
   still unverified; keep the rollout limited to sandbox acceptance.
   Preview OTA group `2681bd7a-71f5-4095-9d9b-debc1c8816af`, published at
   `2026-09-29T05:32:46.976Z`, adds a real store-product retry, hides annual
   billing when no annual store package exists, brings compact plan choices
   before common benefits, and fixes checkout at the bottom of the screen.
   Staging-only **Testing details** identifies `store`, `catalog`, or `products`
   failures without exposing credentials. Await the device result and that line
   if prices still fail. Do not substitute a local price or fabricated access.
   The attached review-reply error could not be reproduced in the deployed
   staging RPC: authenticated order/event reply, idempotency, scope, and access
   checks passed in a rolled-back transaction. The exported OTA contains the
   current `reply_to_business_review` client; a device retry remains necessary.
5. Enforce and verify feature access before broader paid onboarding. The selected
   sandbox account already exercises the staging creation gate and monthly
   product rows. Complete the native acceptance list below.
   Annual products are proposals only and are not configured in either store.

## Customer flow

Sign up/sign in → Business plans → native store confirmation → server entitlement
confirmation → Continue to business setup → create draft → business review.

Account, Businesses, and the direct creation route share the page. Existing
subscribers continue without buying again. Customer features remain free, with
a visible exit. Supabase must confirm access; an SDK purchase result cannot
unlock creation. A disabled global rollout flag permits free preview setup for
accounts outside the explicit sandbox tester list.

With billing enabled, creation consumes one available slot atomically. The
prepared database migration also protects older RPCs and removes direct client
INSERT privileges. Every tier includes three businesses; upgrades buy tools.
Existing drafts remain editable. Web creation checks the same server summary and
directs unsubscribed owners to the mobile app. It has no separate checkout.

## 1. Configure the stores

Use app name Parish Pass and the existing iOS bundle ID / Android package
`com.stanforddevelopmentsolutions.sdslocal`. Confirm paid-app agreements,
banking, tax details and account ownership. Configure real support information.

These are target USD prices; the app displays localized store-returned prices
only, with no hardcoded checkout fallback. Annual amounts are proposed ten-month
pricing.

| Tier       | Monthly | Annual | Apple monthly / annual IDs                                       | Google subscription ID  |
| ---------- | ------: | -----: | ---------------------------------------------------------------- | ----------------------- |
| Essentials |     $19 |   $190 | `listing_essentials_monthly_v1` / `listing_essentials_yearly_v1` | `listing_essentials_v1` |
| Growth     |     $39 |   $390 | `listing_growth_monthly_v1` / `listing_growth_yearly_v1`         | `listing_growth_v1`     |
| Pro        |     $69 |   $690 | `listing_pro_monthly_v1` / `listing_pro_yearly_v1`               | `listing_pro_v1`        |

The three monthly Apple subscriptions already exist. If annual pricing is
approved later, add one-year products in the same subscription group. Reuse the legacy group if
Single/Multi products exist. Rank Pro highest, Growth next, Essentials lowest;
both durations of each tier share its service level. Verify legacy replacement
behavior separately. Disable Family Sharing for this account-bound purchase.
Configure no trials, introductory/promotional offers or offer codes for launch.
Add localized names, accurate benefit descriptions, prices, regions, review
screenshots, notes and legal information. Submit products with the required app
submission and metadata.

In Google Play Console, create the three subscription IDs above. Begin with
**auto-renewing** `monthly` base plans. Add `yearly` only when annual pricing is approved.
Configure test-track availability, regions and prices. Use ordinary recurring
plans without prepaid plans, installments, trials or introductory offers. The
app purchases the exact displayed base plan even if the default option differs.
RevenueCat/database IDs include both parts, e.g. `listing_growth_v1:monthly`.

## 2. Connect RevenueCat

1. Create a project with iOS and Android apps using the identities above. Follow
   [React Native setup](https://www.revenuecat.com/docs/getting-started/installation/reactnative)
   and connect store credentials and server notifications using its console.
2. Import the intended monthly Apple products and Google base-plan products. Attach them all
   to entitlement `business_listing`.
3. Use offering `business_listing` and its three existing custom monthly packages.
   Map each to its matching product on both stores. Annual packages are not yet configured.
   Custom packages allow several products with the same duration in one offering.
4. Preserve legacy products and entitlement mappings for restoration, but remove
   legacy products from the sale offering. Never rename their permanent IDs.
5. Set restore behavior to **Keep with original App User ID** for this account-
   bound implementation. Purchases require sign-in and use the Supabase UUID as
   RevenueCat App User ID. Prepare account recovery for owners signing into a
   different account. Review [restore behavior limitations](https://www.revenuecat.com/docs/projects/restore-behavior).
   The webhook does not process account transfers: do not enable the default
   transfer behavior until a safe transfer/reconciliation flow exists.
6. Copy only platform-specific public SDK keys into the mobile build environment.
   Store credentials, secret API keys and webhook secrets stay in service secret
   settings, never EXPO_PUBLIC variables.

## 3. Configure app and server

Set these public values in the EAS environment for the native build:

```text
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=<iOS public SDK key>
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=<Android public SDK key>
EXPO_PUBLIC_REVENUECAT_OFFERING_ID=business_listing
EXPO_PUBLIC_TERMS_URL=<real public HTTPS terms/EULA page>
EXPO_PUBLIC_PRIVACY_URL=<real public HTTPS privacy page>
EXPO_PUBLIC_SUPPORT_URL=<real public HTTPS support page>
```

Checkout stays disabled for missing or obvious placeholder/local legal links.
This validates syntax, not availability or legal completeness. Check each page
without sign-in, on a phone and in the review environment. Explain recurring
prices, durations, cancellation, billable setup/moderation time, refunds/support
and business rejection handling. Google also requires an external account-
deletion request link in the store listing. Verify existing in-app deletion and
its warning that store billing must be cancelled separately.

For a new environment, apply the existing billing migrations plus
`20260929000200_feature_subscription_catalog.sql` and
`20260929000300_business_creation_subscription_gate.sql` and
`20260929000600_listing_subscription_event_ordering.sql`. These are already on staging.
Apply `20260929000700_sandbox_subscription_rollout.sql` for selected-account
testing. It seeds no testers or active products and is already applied to staging.

Set Supabase server secrets:

```text
REVENUECAT_WEBHOOK_SECRET=<dedicated random bearer secret, at least 24 characters>
BILLING_ENVIRONMENT=sandbox
```

Deploy `revenuecat-webhook` to the intended staging project. Configure RevenueCat
endpoint `https://<staging-project-ref>.supabase.co/functions/v1/revenuecat-webhook`
with authorization `Bearer <REVENUECAT_WEBHOOK_SECRET>`. Send the relevant
business_listing lifecycle events. JWT verification is intentionally disabled
for this endpoint; its bearer secret authenticates requests. Cross-environment
events are ignored. Test actual sandbox purchases: generic TEST payloads do not
grant access through this parser.

Both `billing_plans.is_active` and `billing_products.is_active` must be true for
a purchasable product. Staging now activates the three plans and six configured
monthly store rows for the designated sandbox tester. To grant sandbox checkout,
set `sandboxCheckout=true` and add the tester's existing, confirmed auth UUID to
the private `business_subscription_sandbox_testers` table. Use the same signed-in
Play license tester account and verify the payment sheet says Test card. Do not
fabricate an entitlement for the real tester.

Keep `platform_settings.business_listing_billing.enabled=false` until native
acceptance and tier restrictions pass. Sandbox activation is not production
acceptance of Pro commerce or appointment flows. Production activation requires
those checks before selling.

Build/install a native EAS binary containing react-native-purchases. Expo Go
cannot perform these purchases; OTA cannot add the native SDK to an old binary.
Use TestFlight/iOS sandbox and a Play test track with licensed testers.

## 4. Acceptance before paid onboarding

The page includes localized full prices, durations, automatic renewal, no trial,
cancellation, restoration, free customer access and legal links. It addresses
published [Apple subscription guidance](https://developer.apple.com/app-store/subscriptions/)
and [Google subscription policy](https://support.google.com/googleplay/android-developer/answer/9900533).
Review approval depends on the final app, metadata and working configuration.

Verify on both stores:

- Signup and every creation entry show plans first. Existing subscribers continue
  without repurchase. Unknown server status cannot unlock creation.
- All configured monthly products display correct localized prices/durations.
  If annual products are introduced, the annual total must be prominent.
  Trial/offer/installment products are not sold.
- Cancellation, failure, pending approval and slow/offline confirmation keep
  creation locked until server verification. Check store purchase history before
  repeating an uncertain payment.
- Restore on the original account works after reinstall. Another app account
  cannot take its purchase. Returning from the store refreshes account status.
- Duration changes, upgrades, deferred downgrades and legacy replacements avoid
  concurrent subscriptions and preserve paid benefits. Purchases from another
  platform remain usable; changes use the original store. Cancellation links
  work even when offering retrieval fails.
- Paid cancellation and scheduled Play pauses preserve the paid period. Test
  expiry, refund/revocation, retry/grace and renewal. Test out-of-order delivery
  and verify delayed/duplicate delivery on-device. Server event timestamp
  ordering is deployed and covered by rollback SQL tests; production also needs
  an operational reconciliation/recovery procedure for missed deliveries.
- Draft creation consumes one slot; retry consumes no extra slot. Concurrent
  requests and older RPCs cannot create a fourth business.
- Disclose billable setup/moderation time before purchase; publish a rejection
  support/refund policy.
- Enforce Growth/Pro capabilities in database/Edge Function mutations and customer
  entry points. Preserve historical order/booking/reward recovery after expiry
  or downgrade. Current commerce integrations remain staging-only.
- Public legal/support/deletion pages work. Account deletion does not imply store
  cancellation. Supply a working owner review account, screenshots and review
  notes describing subscription access before creation.

The feature catalog, business creation gate and subscription event ordering SQL
tests passed against staging in rollback transactions. No test email was sent.
The webhook parser and 65 relevant mobile subscription tests also passed.
Code and SQL tests do not replace native sandbox purchase acceptance.

On September 29, 2026 the user confirmed that iOS sandbox test subscriptions
work after the plan-loading retry OTA and Apple Paid Apps setup. This confirms
the reported checkout result; Android on-device purchase acceptance and the
remaining lifecycle, restoration, feature-gating and commerce checks above
remain separate requirements. Store listing draft copy and branding are
recorded in `docs/store-listing/README.md`.

Production needs separate environment configuration/secrets, the correct backend,
`BILLING_ENVIRONMENT=production`, verified product mappings and a native build.
Never promote staging endpoints, sandbox entitlements or a RevenueCat Test Store
key as a production purchase flow.
