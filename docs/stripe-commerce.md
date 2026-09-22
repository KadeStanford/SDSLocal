# Stripe Connect pickup ordering

Stripe is an optional online-ordering provider for businesses that do not use Square. During onboarding an owner can choose Stripe, finish a Stripe Express test account, sync the SDS-owned offering menu, and configure the same pickup windows, prep time, notifications, order queue, refunds, and pickup QR flow used by Square.

Checkout is hosted by Stripe Checkout in test mode. The connected business account is the destination account, so customer payments do not settle into SDS. `STRIPE_APPLICATION_FEE_MINOR` is optional and defaults to zero. Orders remain in the shared `square_orders` state machine for compatibility; the `provider` column identifies the payment rail.

Required server secrets are listed in `.env.example`: `STRIPE_SECRET_KEY` (`sk_test_`), `STRIPE_WEBHOOK_SECRET`, HTTPS callback URLs, and `STRIPE_COMMERCE_ENABLED=true` only for the staging rollout. Add the business id to the `stripe_commerce` platform setting before testing. Keep Stripe test keys in Supabase function secrets; never add them to an Expo env file.

The initial Connect callback is an HTTPS Edge Function and redirects back to `sdslocal://business?...` using `STRIPE_CONNECT_APP_RETURN_URL`. Checkout uses the separate `STRIPE_APP_RETURN_URL` setting so payment returns stay on the customer order route. The webhook verifies Stripe's HMAC signature and advances paid or expired sessions. A production launch should add Stripe's live secret, live webhook endpoint, terms/refunds copy, and a reviewed application-fee policy separately from the staging pilot.
