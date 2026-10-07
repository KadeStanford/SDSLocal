# Business listing subscriptions

## Product decision

SDS Local keeps one universal user account. A customer becomes a business owner
through the business creation workflow; this does not create a second identity
and does not make customer features unavailable. When billing is enabled, an
owner sees the subscription page before the creation form and needs a verified
subscription with an available slot to create a draft. Creating a draft consumes
a slot atomically. Existing drafts remain editable. When the explicit server
rollout flag is disabled, the page offers free preview setup.

Staff never purchase plans for an owner and cannot mutate trusted billing records.
See [the store setup guide](business-subscription-store-setup.md) for exact product
configuration and the remaining release requirements.

Feature-based catalog (applied to staging; monthly products active for selected-account sandbox testing):

| Plan       | Live listing slots | Target USD monthly / annual | Owner tools                                                         |
| ---------- | -----------------: | --------------------------: | ------------------------------------------------------------------- |
| Essentials |                  3 |                  $19 / $190 | Business pages, discovery, events, service requests, basic insights |
| Growth     |                  3 |                  $39 / $390 | Essentials plus loyalty, follower updates, staff scanning           |
| Pro        |                  3 |                  $69 / $690 | Growth plus pickup ordering and appointments                        |

All plans support the same one-to-three-business audience. Upgrades buy tools,
not additional businesses. Read [the monetization proposal](business-monetization.md)
for the rationale, other revenue streams, and implementation sequence.

The shared catalog lives in `packages/business-logic/src/business-subscriptions.ts`.
Migration `20260929000200_feature_subscription_catalog.sql` prepares the new
catalog with both plans and products inactive. It also provides the owner-only
`get_my_business_subscription_features()` RPC. The RPC reads verified billing;
it does **not** enforce feature access in existing workflows yet. Complete those
gates before a broader paid rollout. The six configured monthly store products
are active on staging for one selected sandbox tester; annual and Test Store
products remain inactive. The mobile offering and purchase path
check that both the database product and its plan are active.

New Apple identifiers use `listing_<tier>_<period>_v1`, where tier is
`essentials`, `growth`, or `pro` and period is `monthly` or `yearly`.
Google identifiers use `listing_<tier>_v1:<period>` with the same values.
The three monthly Apple products are configured in one subscription group, with
Pro above Growth above Essentials. Annual products are proposals and have not
been created. The three Google products have active monthly base plans at
$19/$39/$69 USD, United States only, mapped to the same RevenueCat offering.
See the store setup guide for internal testing and native acceptance status.

Existing Single/Multi identifiers below are **legacy products**. Keep their
receipt mappings and restoration support; remove them from the sale offering
when the new catalog launches. Preserve their existing one/three listing limits
and full feature access. Do not rename or repurpose their store IDs.

Use these permanent Apple product identifiers and mirror them in RevenueCat:

- `listing_single_monthly_v1`
- `listing_single_yearly_v1`
- `listing_multi_monthly_v1`
- `listing_multi_yearly_v1`

Google Play uses one subscription product per tier with monthly and yearly base
plans. RevenueCat therefore receives these identifiers:

- `listing_single_v1:monthly`
- `listing_single_v1:yearly`
- `listing_multi_v1:monthly`
- `listing_multi_v1:yearly`

Prices are configured by storefront and displayed from the store response. The
app must never hardcode a price. Do not add a free trial until renewal terms,
eligibility and conversion messaging have been reviewed separately.

## Approval-safe payment boundary

Publishing a listing is a digital service consumed in SDS Local. iOS purchases
must use Apple In-App Purchase, and Android purchases must use Google Play
Billing. Stripe remains available for a future eligible web or physical-goods
flow, but it must not be linked or offered as an alternative checkout from this
mobile paywall.

Legacy Apple products remain in their existing subscription group. New tiers
must use the same group when migrating existing subscribers to prevent parallel
subscriptions. Verify replacement behavior on both stores, including moves
between legacy and new products. Monthly/yearly are durations for each level;
feature reductions apply at renewal rather than removing paid access early.

The paywall must show the localized store price, renewal period, auto-renewal
language, cancellation behavior, Restore Purchases, Manage Subscription, and
working public HTTPS Terms, Privacy and Support links. The full yearly charge
must appear beside the purchase action. Launch products have no trial or
installment offer; the Android purchase uses the displayed recurring base plan.

## Authority and lifecycle

RevenueCat handles StoreKit and Play Billing receipt validation and forwards
lifecycle webhooks authenticated with a dedicated bearer secret. The mobile SDK is never the authority for publishing.
Supabase mirrors the verified entitlement and enforces listing slots in database
functions.

- Active, grace-period and billing-retry states retain assigned listings until
  the verified paid/grace period ends.
- Cancelling turns off renewal but keeps access through the paid period.
- Expiration, pause or revocation unpublishes assigned listings without deleting
  their business data.
- A verified renewal restores a listing that was suspended specifically for
  billing. It never overrides a moderation suspension.
- Product changes update the account-level slot limit. Before launching
  downgrades, add an owner choice for which listings remain assigned when usage
  exceeds the lower limit; never choose or delete a business silently.

## Staging setup

1. Create a RevenueCat project and iOS/Android apps for bundle/package
   `com.stanforddevelopmentsolutions.sdslocal`.
2. Connect App Store Connect and Google Play service credentials in RevenueCat.
3. Create the `business_listing` entitlement and `business_listing` offering.
4. Add the three monthly products per platform and attach matching packages to
   the offering. Annual products require a separate pricing decision. Preserve
   legacy receipt/entitlement mappings for restoration.
5. Set the Preview EAS environment variables:
   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`,
   `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`,
   `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, `EXPO_PUBLIC_TERMS_URL`, and
   `EXPO_PUBLIC_PRIVACY_URL`, and `EXPO_PUBLIC_SUPPORT_URL`.
6. Set staging Supabase secrets `REVENUECAT_WEBHOOK_SECRET` and
   `BILLING_ENVIRONMENT=sandbox`.
7. Configure the RevenueCat webhook endpoint as
   `https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/revenuecat-webhook`
   with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` and select the
   `business_listing` entitlement.
8. Apply the billing migration and deploy `revenuecat-webhook` to staging.
9. Keep `platform_settings.business_listing_billing.enabled` false until feature
   gates and native acceptance pass. For sandbox acceptance, migration
   `20260929000700_sandbox_subscription_rollout` provides a private tester list
   and an independent `sandboxCheckout` switch. Staging enables these only for
   the confirmed `kade20413@gmail.com` app account and activates the six monthly
   Apple/Google mappings. No actual tester entitlement is fabricated. Other
   accounts retain free preview behavior. New annual and Test Store products
   remain inactive.
10. Install a native build containing `react-native-purchases`. Compatible iOS
    and Android Preview builds already exist, and the Android Play app bundle
    is prepared. OTA cannot add this SDK to an older binary or Expo Go.
11. The subscription page and public legal links are published on the Preview
    OTA channel for runtime `0.1.0`. Install the compatible native binary before
    testing purchases. Later JavaScript/UI updates must retain compatibility.

Never use a RevenueCat Test Store key in a production build. Staging webhooks
must ignore production events, and production webhooks must ignore sandbox
events.

## Store sandbox verification

Use a disposable SDS staging account whose Supabase UUID is the RevenueCat App
User ID. Never purchase anonymously.

Verify on iOS sandbox/TestFlight and the Google Play closed test track:

1. A signed-out user cannot open or purchase a listing plan.
2. The page appears after signup and before every new-business form. With billing
   enabled, missing/expired entitlements and unavailable status block creation.
   An existing subscriber continues without purchasing again; preview creation
   is allowed only when the server billing flag is explicitly disabled.
3. Store prices and periods match the products configured in that storefront.
4. Cancelling the native purchase sheet makes no charge and shows no failure
   alarm.
5. Each new tier activates exactly three listing slots after server confirmation.
6. Creating a draft atomically consumes a slot. A fourth business cannot be
   created on a new tier, including through old RPCs. Retrying a successful
   idempotent request returns the same business without consuming another slot.
7. Upgrades change feature access without a second concurrent subscription.
   Test every tier's server-side restrictions and mobile upgrade explanations.
   Legacy Single still allows one listing; legacy Multi still allows three.
8. Restore Purchases reconnects the same store purchase to the same signed-in SDS
   account and does not grant access from client state alone.
9. Cancellation keeps the listing public until the paid period end.
10. Billing retry/grace keeps access only for the store-confirmed period.
11. Expiration unpublishes assigned listings while preserving all editable data.
12. Renewal restores only billing-suspended listings.
13. Staff can work in authorized tools but cannot see purchase controls or change
    the owner's plan.
14. Webhook replay is idempotent and cross-environment events are ignored.
15. Account deletion warns an active subscriber to cancel through the store and
    does not claim the store subscription was automatically cancelled.

## Release blockers

- Monthly pricing is $19/$39/$69 USD. Apple is configured for the United States;
  Google has the same configured monthly prices and United States availability.
- Public Terms, Privacy, Support and external account-deletion pages are hosted
  at `https://parish-pass--policies.expo.app/`. Complete store metadata and verify
  the links on device and in the review environment.
- Enforce Growth/Pro capabilities in database mutations, Edge Functions, and
  public customer entry points; hiding mobile controls is insufficient.
- Feature downgrades must preserve existing orders, bookings, refunds, earned
  rewards, and access through the paid period. New tools and transactions can be
  blocked after expiry; customers must retain recovery paths.
- A downgrade-over-capacity selection flow is required for legacy capacity
  reductions. The mobile purchase guard cannot prevent changes made directly
  through Apple/Google subscription management.
- Pro cannot be sold until the included commerce and appointment flows have
  production acceptance. Current payment integrations remain staging-only.
- Verify the existing account-deletion warning and store-management button on
  device; deleting an app account must not imply cancellation of store billing.
- App Review needs an owner demo account, review notes describing the listing
  subscription, and products visible and functional in the submitted build.
- Production must use separate RevenueCat keys, webhook secret, Supabase project,
  products/environment checks and a production native build. Never promote the
  staging webhook or keys.
