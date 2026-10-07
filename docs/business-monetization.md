# Business subscriptions and revenue proposal

Prepared September 28, 2026. Feature-based pricing direction selected by the
owner: **$19 / $39 / $69 monthly**. These are target USD prices to configure in
the stores, not live charges or hardcoded checkout amounts.

## Positioning and tiers

Sell a business presence, customer retention, and tools that generate business.
Keep the customer app free: discovery, following businesses, rewards, reviews,
RSVPs, and browsing create the audience owners are paying to reach.

Every paid tier covers **up to three businesses under one owner account**.
Business count is a capacity ceiling, not the reason to upgrade. Hosted business
pages, media delivery, and normal app operation are included; there is no separate
mandatory hosting charge or setup fee.

| Tier       | Monthly | Annual | What the owner gets                                                                                                                                                                                               |
| ---------- | ------: | -----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Essentials |     $19 |   $190 | Hosted business pages, branding/photos, menus or services, QR sharing, local discovery, customer follows and reviews, events and RSVPs, mobile business locations, service requests, basic page activity insights |
| Growth     |     $39 |   $390 | Everything in Essentials, plus loyalty programs, rewards, staff reward scanning, follower announcements and offers                                                                                                |
| Pro        |     $69 |   $690 | Everything in Growth, plus pickup ordering and appointment tools with supported Square/Stripe setup and availability                                                                                              |

Annual billing costs ten monthly payments, saving approximately 16.7%. Show the
full annual charge clearly and calculate the actual savings from localized store
prices. Do not assume every region has the same price or tax treatment.

The feature separation follows the customer outcome: **get found → bring people
back → take orders and bookings**. Growth should be the natural choice for a
cafe, retailer, or food truck building repeat business. Pro fits owners who need
to complete transactions through the app. A service business that only needs
inquiries can stay on Essentials.

The repository has these feature families, but availability varies. Service
requests are inquiries, not an accepted quote-to-booking contract. Basic analytics
measure interest; do not advertise full sales attribution. Pickup ordering and
appointments currently have staging-only payment integrations. Pro must remain
unavailable for sale until those flows are production-ready. Scheduled campaigns,
advanced sales reporting, custom domains, group event check-in, and paid tickets
are potential future perks, not benefits promised by today's plans.

### Pricing evidence and economics

This is a launch hypothesis to validate with real owners, not evidence of local
willingness to pay. As researched September 28, 2026, [Loopy Loyalty](https://loopyloyalty.com/pricing/)
lists $25/$69/$95 monthly loyalty plans. [Square](https://squareup.com/us/en/the-bottom-line/inside-square/pricing-plans)
lists Plus at $49 and Premium at $149 per location, with broader business tooling.
These are reference points, not like-for-like substitutes. They suggest there is
room for a $19 entry plan and a $39 retention package if owners see actual value.

Illustration, assuming everyone pays monthly and the mix is 60% Essentials,
30% Growth, and 10% Pro:

| Paying owners | Gross subscription revenue/month |
| ------------: | -------------------------------: |
|           100 |                           $3,000 |
|           300 |                           $9,000 |
|           500 |                          $15,000 |

These amounts are before commissions, taxes, refunds, hosting, and support. For
100 owners, a simple 15% store-commission plus 1% billing-service assumption
leaves about $2,520 before other expenses. A 30% store-commission stress case
leaves about $2,070. Actual fees depend on account/program/storefront eligibility:
[Apple's Small Business Program](https://developer.apple.com/app-store/small-business-program/)
offers eligible participants a reduced commission, and [Google's service fees](https://support.google.com/googleplay/android-developer/answer/112622)
describe subscription rates and applicable programs. [RevenueCat](https://www.revenuecat.com/pricing)
currently starts free up to $2,500 monthly tracked revenue, then charges 1% of
tracked revenue. Annual collections and revenue recognition differ from this
monthly example.

Track draft-to-publication conversion, plan choice, annual uptake, churn, weekly
owner activity, loyalty usage, verified orders/bookings, and support time per
owner. Revisit pricing after 20–30 owner interviews and 60–90 days of a paid pilot.
For one owner, compare the subscription to incremental gross profit from app-led
customers rather than promising that one sale necessarily covers the fee.

## Additional revenue, in recommended order

The prices below are test proposals, not configured products.

| Revenue stream                     |                        Suggested pilot pricing | Why it fits / implementation                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Optional assisted setup            |           $99 basic; $199 with catalog cleanup | Help create the page, import a menu, configure loyalty, and deliver QR print files. Sell it as optional human assistance, track a work request and deliverables, and keep self-service setup included in the subscription. Have a separate eligibility review before offering checkout inside mobile.                                       |
| Local sponsorships                 |         $150–$500/month per parish or category | A few clearly labeled sponsor placements fund the local community experience. Begin with direct sales after real traffic exists; store sponsor, creative, placement, dates, approval, and impression/click totals. Keep organic discovery and reviews independent. Sponsor contracts must state inventory and reporting, not promise leads. |
| Paid event ticketing               |    3% + $0.50 per paid ticket, plus processing | Monetize live events while retaining free RSVPs. Build ticket inventory, order records, server-confirmed payment, QR check-in, cancellation/refunds, and a saved fee policy. Require capacity and refund tests before selling.                                                                                                              |
| Featured business/event placements |                $10–$25 per seven-day placement | Add only after enough local shoppers use discovery. Start with one sponsored card per feed section, budget/date caps, moderation, and measurable reporting. Selling a same-app boost on iOS generally requires IAP; do not reuse the food-order Stripe checkout for it.                                                                     |
| Premium growth tools               | Included in Growth/Pro or $10–$20/month add-on | Later: scheduled follower campaigns, deeper conversion reporting, branded web addresses, and larger event tools. Prefer strengthening the existing tiers first. Add only working capabilities with server-side entitlements.                                                                                                                |
| Chamber/community partnerships     |                 $250–$750/month pilot contract | Sponsor onboarding for a business cohort and provide aggregate local activity reporting. Use invitations, explicit owner access, group sponsorship grants, and privacy-safe reporting. This is a partner distribution channel for small businesses, not a fourth large-business pricing tier.                                               |

Paid placements should never imply endorsement or manipulate customer reviews.
Follower marketing must respect opt-in, quiet hours, opt-out, and frequency limits.
Do not sell personal customer data. SMS/email campaign plans, if added, need
consent and metered allowances rather than unlimited sending.

**Start with subscriptions and optional setup.** Add sponsorships once audience
size is demonstrated. Event fees and paid placements follow after their workflows
and demand exist. Avoid launching all revenue streams at once.

### Transaction fees

Keep the app's own pickup/appointment transaction fee at **0% initially**.
Owners already pay a subscription and their payment processor; a second charge
can weaken adoption. The current Stripe integration fixes the platform fee at $0,
and Square's pilot does not charge a platform fee.

Later, consider a transparent 0.5%–1% platform fee only if merchant interviews and
unit economics justify it. Prefer a single clearly disclosed policy over surprise
customer fees. [Stripe direct charges](https://docs.stripe.com/connect/direct-charges)
and [Square application fees](https://developer.squareup.com/docs/payments-api/take-payments-and-collect-fees)
have fee mechanisms, but this app would still need an audited implementation:
server-computed fee on the eligible merchandise/service amount, immutable fee
snapshot per transaction, merchant acceptance/versioning, webhook confirmation,
partial/full refund handling, and reconciliation. Never change the fee on an
existing order or assume a percentage setting alone completes the integration.

## Subscription wiring and release sequence

### Prepared in this change

- Shared feature catalog for Essentials/Growth/Pro, each with three listing slots.
- Mobile comparison screen shows the feature differences and store-supplied prices.
- New store product mappings and server capability metadata, initially inactive.
- Owner-only capability RPC reads server-verified billing rather than client claims.
- Purchases require an active database product and plan, including a fresh check
  before opening the store sheet. Legacy Single/Multi remain restorable and keep
  their original capacity and full capability metadata.
- Same-tier monthly/annual switches work; feature downgrades use deferred Android
  replacement rather than treating equal listing counts as equal service levels.

The creation workflow now passes through the subscription page after sign-in.
The prepared database gate enforces verified access and atomically assigns each
new draft to an available slot. Web creation also checks the server summary.
See [store setup and acceptance](business-subscription-store-setup.md).

These are the foundation. **Existing tools are not yet gated by feature tier.**
The capability RPC is prepared for consumers; it does not itself restrict feature
mutations. No storefront products, live subscriptions, remote settings, or
production deployments were created or changed by this work.

### Required before a paid pilot

1. Wire capabilities into owner controls and authoritative database/Edge Function
   operations. Essentials must not create new loyalty programs or follower offers;
   Growth must not initiate Pro-only ordering/appointments. Resolve the billing
   owner for each assigned business so invited staff cannot supply their own plan.
2. Gate customer-facing entry points consistently. A downgrade must preserve
   existing orders, appointments, refunds, support requests, and earned reward
   recovery. Decide the treatment of historical loyalty balances before release.
   Editing drafts stays free; turning on paid customer-facing capabilities requires
   verified access.
3. The selected workflow now asks for a subscription before creating a new
   business. Disclose that billing starts on store confirmation, including setup
   and moderation time. Publish the rejection/support policy before a paid pilot.
   Existing drafts remain editable; free preview creation requires the explicit
   server rollout flag to be off.
4. Configure the selected prices and six products per platform in the stores and
   RevenueCat; use one subscription group and verify legacy replacement behavior.
   Configure renewal terms, HTTPS legal/support pages, keys, webhook, and a native
   build with RevenueCat. Do not add an automatic trial without reviewed terms.
5. Run sandbox purchases, restoration, upgrade, deferred downgrade, cancellation,
   grace period, expiry, refund/revocation, and duplicate-webhook tests. Verify all
   tier restrictions at the server, not only in the screen.
6. Activate only verified tiers in staging, then run the paid pilot through the
   appropriate release process. Hold Pro until its included commerce is accepted
   for production. Keep the new products inactive until all prerequisites pass.

Mobile digital subscriptions use the existing Apple/Google billing architecture.
Current [Apple guidelines](https://developer.apple.com/app-store/review/guidelines/)
also address same-app advertising purchases, while [Google's Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
covers digital business software and distinguishes physical goods/services.
Regional exceptions require an explicit eligible flow; a generic mobile link to
Stripe is not part of this implementation.

See [business subscription operations](business-listing-subscriptions.md) for
product IDs, lifecycle rules, and sandbox acceptance details.

## Validation of this local preparation

98 focused tests passed across the shared catalog, mobile billing, creation
gates, paywall and RevenueCat webhook parsing. Mobile and web typechecks, lint
for the changed mobile/web files, formatting, and whitespace checks passed. SQL
catalog and creation-gate tests are prepared but were not executed: the local
Docker database was unavailable. Migrations have not been applied remotely. No
device purchase, native paywall inspection, or store sandbox acceptance was
performed. Feature enforcement and lifecycle event ordering/reconciliation
remain release requirements; see the store setup guide.
