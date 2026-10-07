# Stripe Connect pickup ordering

## Merchant setup

Owners start setup from **Manage → Ordering & payments → Set up payments in SDS Local**. On iOS and Android, the app uses Stripe Connect's embedded onboarding component and creates a fresh, single-use Account Session each time setup opens. It does not automatically send mobile users to a browser when an in-app session fails; the app shows a retry action and a Stripe request reference for support. Web uses Stripe's secure hosted onboarding page.

Onboarding uses incremental collection: Stripe asks for the information currently required to enable the requested card payment capability and can collect later requirements if they become due. This reduces initial setup while Stripe remains responsible for verification.

New connected accounts are created for the United States without preselecting a legal entity type. Stripe asks each owner for the right profile and collects the identity and payout details it requires. The current Connect configuration gives the connected business a full Stripe Dashboard and makes Stripe responsible for its processing fees and payment losses on direct charges. Businesses must still have a Stripe connected account, complete Stripe verification, and provide payout details; SDS cannot remove those regulatory steps. Checkout currently supports USD and U.S. pickup businesses, not every Stripe country or payment method.

Owners can populate the SDS menu by importing a Square Dashboard item-library CSV. Item names, categories, descriptions, prices, and variations are mapped to SDS menu entries. Each import adds new entries; it does not update or deduplicate existing items. Square modifiers, images, and location-specific availability must be reviewed in SDS after import. Owners can also use the regular SDS menu builder or CSV/JSON import.

## Fees and Sandbox boundary

SDS's Stripe application/platform fee is fixed at **$0** in code. An old `STRIPE_APPLICATION_FEE_MINOR` server secret is ignored. Stripe's own processing fees still apply to successful live payments; the exact fee depends on the connected business, payment method, country, and Stripe agreement. Standard Stripe pricing currently has no setup or monthly fee, but card processing is not free. See [Stripe's pricing](https://stripe.com/pricing) and [Connect pricing](https://stripe.com/connect/pricing).

This integration is limited to development and staging and rejects live secret keys and live webhook events. Staging uses `sk_test_`, a test webhook secret, HTTPS callback URLs, and the business allowlist in the `stripe_commerce` platform setting. Sandbox checkout does not transfer real money. Keep all Stripe secret keys and webhook signing secrets in Supabase Function secrets; only the `pk_test_` publishable key belongs in the EAS Preview client configuration.

## Online-order payment lifecycle

- Mobile checkout uses Stripe PaymentSheet with a server-created PaymentIntent on the connected account. Web can use Stripe Checkout. Both are direct charges on the merchant's connected account; SDS does not receive or hold customer funds.
- The backend prices the cart, verifies account readiness, creates payment objects idempotently, and waits for a signed webhook or authoritative Stripe retrieval before marking an order paid.
- A merchant can request a full refund through the shared order workflow. The app shows refund completion only after Stripe confirms it.
- Pickup ordering remains unavailable until Stripe has enabled both charges and payouts, the SDS menu has synced, at least one item is purchasable, and pickup hours are configured.
- Orders continue to use the shared `square_orders` state machine for compatibility; `provider='stripe'` selects the Stripe reconciliation path.

Required server secrets are listed in `.env.example`: `STRIPE_SECRET_KEY` (`sk_test_`), `STRIPE_WEBHOOK_SECRET`, HTTPS callback URLs, and `STRIPE_COMMERCE_ENABLED=true` only for the staging rollout. The staging publishable test key is `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`; EAS Preview embeds `EXPO_PUBLIC_` values in the client bundle. Never place secret keys in EAS client variables.

This work supports the Stripe Connect and pickup-ordering tasks SDS needs today. It does not replicate every Stripe product (such as Billing, Terminal, Issuing, Treasury, or all local payment methods). Add other products only when the app has a defined customer or merchant use case and the associated account eligibility, fees, native configuration, and reconciliation are understood.
