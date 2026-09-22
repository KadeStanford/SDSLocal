# Business listing subscriptions

## Product decision

SDS Local keeps one universal user account. A customer becomes a business owner
by creating a draft business; this does not create a second identity and does not
make customer features unavailable. Draft creation and editing are free.

An owner needs a store subscription only when submitting a business for public
review. Staff never purchase plans and cannot view or mutate trusted billing
records.

Initial catalog:

| Plan   | Live listing slots | Periods         |
| ------ | -----------------: | --------------- |
| Single |                  1 | Monthly, yearly |
| Multi  |                  3 | Monthly, yearly |

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

All four Apple products belong to one subscription group. Single and Multi are
different service levels; monthly and yearly are durations for their matching
level. On Google Play, `listing_single_v1` and `listing_multi_v1` are the two
subscription products and `monthly`/`yearly` are their base-plan IDs. Map those
base plans exactly in RevenueCat before enabling the offering.

The paywall must show the localized store price, renewal period, auto-renewal
language, cancellation behavior, Restore Purchases, Manage Subscription, and
working HTTPS Terms and Privacy links.

## Authority and lifecycle

RevenueCat handles StoreKit and Play Billing receipt validation and forwards
signed lifecycle webhooks. The mobile SDK is never the authority for publishing.
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
4. Add the four store products above and attach matching packages to the
   offering.
5. Set the Preview EAS environment variables:
   `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`,
   `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`,
   `EXPO_PUBLIC_REVENUECAT_OFFERING_ID`, `EXPO_PUBLIC_TERMS_URL`, and
   `EXPO_PUBLIC_PRIVACY_URL`.
6. Set staging Supabase secrets `REVENUECAT_WEBHOOK_SECRET` and
   `BILLING_ENVIRONMENT=sandbox`.
7. Configure the RevenueCat webhook endpoint as
   `https://lgddhdexvwclfrnzjtly.supabase.co/functions/v1/revenuecat-webhook`
   with `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>` and select the
   `business_listing` entitlement.
8. Apply the billing migration and deploy `revenuecat-webhook` to staging.
9. Keep `platform_settings.business_listing_billing.enabled` false until the
   products, webhook, legal URLs and Preview build are verified. Then enable it
   in staging only to test the publishing gate.
10. Build and install a new EAS Preview binary. `react-native-purchases` is native
    code, so the currently installed binary cannot receive it through OTA.
11. After the new binary is installed, later JavaScript/UI fixes may use Preview
    OTA while runtime compatibility remains unchanged.

Never use a RevenueCat Test Store key in a production build. Staging webhooks
must ignore production events, and production webhooks must ignore sandbox
events.

## Store sandbox verification

Use a disposable SDS staging account whose Supabase UUID is the RevenueCat App
User ID. Never purchase anonymously.

Verify on iOS sandbox/TestFlight and the Google Play closed test track:

1. A signed-out user cannot open or purchase a listing plan.
2. A signed-in owner can create and fully edit a draft without subscribing.
3. Store prices and periods match the products configured in that storefront.
4. Cancelling the native purchase sheet makes no charge and shows no failure
   alarm.
5. Single monthly activates exactly one listing slot after server confirmation.
6. A second business can remain a draft but cannot be submitted on Single.
7. Upgrade to Multi allows three assigned listings without a second concurrent
   subscription.
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

- Final pricing and storefront availability must be chosen in App Store Connect
  and Play Console.
- Public Terms, Privacy, Support and Google external account-deletion pages need
  a real HTTPS domain.
- A downgrade-over-capacity selection flow is required before selling Multi in
  production.
- The account-deletion impact screen must include active store subscription
  guidance.
- App Review needs an owner demo account, review notes describing the listing
  subscription, and products visible and functional in the submitted build.
- Production must use separate RevenueCat keys, webhook secret, Supabase project,
  products/environment checks and a production native build. Never promote the
  staging webhook or keys.
