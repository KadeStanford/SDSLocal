# Parish Pass App Store and Google Play approval readiness audit

Audit date: **September 30, 2026, America/Chicago**. Console and public-page checks extended into October 1 UTC. Scope: the current working tree in `F:\BusinessApp`, available preview binaries, authorized read-only store access, and current official policies.

**Fix first for both stores.** Apple has an unfinished submission and substantial functional and policy risks. Google has an additional production-access gate: the console shows zero closed-test participants against its 12-testers-for-14-days requirement. Neither app is currently an approved production release in the inspected consoles.

The source and policy audit is delivered with an explicit coverage inventory. **Native acceptance remains incomplete:** no connected iPhone, Android device, simulator, or emulator was available to exercise the release candidate. Every mobile surface is therefore marked partially reviewed, with runtime verification blocked; none is silently treated as passed. Passing unit tests, previous deployment notes, and static previews do not establish shipped behavior.

No application code, backend, OTA, store setting, or release was changed. No purchase, account deletion, notification dispatch, hosted email, credential creation, or submission was performed. Only audit artifacts were added. Existing dirty work was preserved. The Metro and hosted-email instructions were read; Metro was not started or changed.

## Approval prospects

| Store | Current evidence | Assessment and recommendation |
| --- | --- | --- |
| Apple | Version 1.0 is Prepare for Submission; no build attached; TestFlight has no builds; iPhone screenshot count is zero; App Privacy and age ratings are unstarted; review credentials are blank. The local IPA is an internal preview, version 0.1.0. | **Cannot submit the inspected draft as it stands. High rejection risk if the preview behavior is promoted unchanged. Fix first.** A credible submission requires production functionality, truthful paid tiers, privacy and UGC corrections, deletion handling, reviewer access, and device acceptance. |
| Google | App is Draft; production inactive; internal release 0.1.0 version code 3 is available to internal testers; setup 6 of 11 complete; seven app-content declarations need attention; closed-test opt-ins are zero. | **Production access is currently blocked, and review readiness is poor. Fix first.** Internal availability establishes distribution to testers, not production eligibility or policy approval. Complete testing eligibility and the functional, permission, data, and submission work below. |

The existing EAS preview and preview OTA use staging-oriented behavior. The September 29 project notes record the user's report that iOS sandbox subscription checkout works after the retry update. That is useful evidence, but it does not verify Android checkout, restoration, lifecycle events, tier enforcement, real commerce, or a production submission. See [the recorded scope of that result](F:/BusinessApp/docs/business-subscription-store-setup.md:328).

These assessments assume a public local-business app with free customer discovery, paid owner tools, and real-world commerce. A smaller initial release is possible, but it must offer a coherent working product and accurately describe its available capabilities. Silently hiding broken features for reviewers or enabling materially different functionality after review is not an acceptable release strategy.

## Evidence and verification performed

The companion files preserve the detailed audit trail:

- [Coverage inventory](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/coverage-inventory.md): **32 route/layout files, including 30 route files and 2 navigation layouts; 145 embedded surface, picker, gate, and confirmation call sites.** These are call sites, including reusable templates, rather than 145 unique product screens.
- [Source inventory](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/source-inventory.json): 496 source files, hashes, mobile state bindings, API/table calls, and exact surface lines. This is an index, not a claim that every line or database security boundary was independently tested.
- [Binary evidence](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/binary-evidence.json): archive hashes, native permission declarations, privacy manifests, update configuration, and Android ELF program-header results.
- [Console and public-page observations](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/console-evidence.json): sanitized read-only observations; no credentials or private contact details.

Checks completed in this audit:

| Check | Result | Practical limit |
| --- | --- | --- |
| Mobile TypeScript `tsc --noEmit -p apps/mobile/tsconfig.json` | Passed | No native build or runtime validation. |
| Mobile Vitest | **82 files, 1,052 tests passed** | Primarily source/helper regression tests. |
| Shared packages and Supabase shared helpers | **23 files, 261 tests passed** | Corrected command excluded archived `.codex-tmp` tests. |
| Local IPA archive inspection | Version 0.1.0 build 1, minimum iOS 18, Xcode 26.6 metadata, iOS 26.5 SDK; 28 privacy manifests | No App Store distribution signature validation or native execution. |
| Local Android AAB inspection | Version 0.1.0 code 3, target/compile API 36, minimum API 24, four ABIs, 120 native libraries; all 64-bit LOAD alignments at least 16 KB | Generated APK zip alignment and runtime behavior not exercised. |
| Play bundle explorer | Target 36; **Supports 16 KB**; 46 permissions in served enhanced bundle | Console explicitly cautions that runtime errors may remain. Local archive has 45 permissions; served bundle adds licensing protection. |
| Public landing, terms, privacy, support, deletion pages | All rendered in Brave without sign-in; policy pages dated September 29, 2026 | No support email was sent and no deletion request was submitted. |

The two local IPA filenames inspected have the **same SHA-256**, so they are one artifact, not two independent builds. Both use enabled updates, preview channel, and runtime 0.1.0. The folder name containing “diagnosis” is not evidence that this is the disabled-OTA diagnostic profile.

An initial pnpm command attempted automatic dependency setup and stopped because it was noninteractive; no dependency reinstall was performed. A broad root Vitest filter accidentally matched three archived `.codex-tmp` suites, which failed; the corrected scoped run passed. Those archived failures are not classified as current application defects. SQL integration tests, native builds, lint, penetration tests, and production network transaction tests were not run. Docker was unavailable, adb was absent, and browser automation exposes no native app surface here.

## Findings ranked by submission impact

Classification distinguishes a confirmed implementation or console gap from a confirmed published-app violation. These are draft apps: a missing requirement can be confirmed without claiming an already-published policy violation. “Likely risk” indicates policy applicability or reviewer judgment; “unverified concern” indicates missing deployment or runtime evidence. Each recommendation is proposed work only.

### F01 Apple submission and first subscription submission are unfinished

**Apple · Submission blocker · Confirmed console gaps.** Affected: store submission, subscriptions, screenshots, age/content declarations.

Evidence: App Store Connect version 1.0 has no attached build and zero iPhone and iPad screenshots. TestFlight says to upload a build. App Information offers Set Up Age Ratings and Set Up Content Rights Information. All three monthly subscriptions and their group are Prepare for Submission. Each product has English localization, a promotional image and review notes, but its review screenshot is empty. Current available-territory prices are US-only: Essentials $19/month, Growth $39/month, Pro $69/month. The group is correctly ordered Pro, Growth, Essentials. [App config](F:/BusinessApp/apps/mobile/app.config.ts:29) and the available IPA still identify version 0.1.0, which does not match the current 1.0 draft.

Policy: [Apple guidelines 2.1 and 2.3](https://developer.apple.com/app-store/review/guidelines/#performance), [Submit an In-App Purchase, first submission](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase), and [In-App Purchase information, App Review Screenshot](https://developer.apple.com/help/app-store-connect/reference/in-app-purchases-and-subscriptions/in-app-purchase-information/).

Recommended fix: choose the intended release version, align the native marketing version and draft, upload the final distribution build, provide actual device screenshots for every required supported device family and each subscription's review screenshot, complete age/content rights answers, and include the first subscription group and purchasable products in the same submission. Keep app availability consistent with purchasable products; current products are US-only. Revalidate all product fields against the final offer. **Verify:** inspect the final processed build and draft validation, then install that exact candidate. **Work:** native build, store configuration, screenshots and documentation.

### F02 Google submission declarations and listing are unfinished

**Google · Submission blocker · Confirmed console gaps.** Affected: Play app content, store listing and distribution setup.

Evidence: Dashboard setup is 6 of 11 complete. App Content shows seven items needing attention: sign-in details, content ratings, target audience, Data safety, location permissions, foreground-service permissions, and photo/video permissions. Data safety is still at Overview, step 1 of 5. The default listing is Draft: its app icon and feature graphic are present, but phone screenshots and both tablet screenshot sets are empty. Desktop/XR screenshot panels are also empty; that alone does not make those optional distribution surfaces mandatory. The listing advertises the three paid tiers and optional background alerts. Source drafts and assets are recorded in [the store listing documentation](F:/BusinessApp/docs/store-listing/README.md:1); they are not a completed store submission.

Policy: [Play Console Requirements, 3.1–3.3](https://support.google.com/googleplay/android-developer/answer/10788890), [User Data, Data safety section](https://support.google.com/googleplay/android-developer/answer/10144311), and [preview assets, Screenshots](https://support.google.com/googleplay/android-developer/answer/9866151#screenshots).

Recommended fix: finish the actual forms and required listing assets against the final manifest and release behavior. Resolve unnecessary permission declarations by removing the permissions, not by inventing a use case. Supply the external deletion URL in its designated Data safety field; a privacy URL alone does not prove that field is populated. **Verify:** no remaining required setup/declaration tasks, valid listing review, and release validation. **Work:** store configuration, documentation, screenshots; a native build for permission changes.

### F03 Google production testing eligibility has not been met

**Google · Submission blocker · Confirmed eligibility gap.** Affected: production access.

Evidence: the personal-account dashboard shows zero opted-in closed testers, requires 12 continuously for 14 days, and disables Apply for production. The internal release does not meet that gate.

Requirement: [testing requirements for new personal developer accounts, closed testing and production access](https://support.google.com/googleplay/android-developer/answer/14151465).

Recommended fix: run a genuine closed test with at least 12 opted-in testers continuously for the required period, gather meaningful results, and apply for production access with accurate answers. Completion of the period does not guarantee approval of the application. **Verify:** console eligibility and approved production access. **Work:** test coordination, store configuration, documentation; calendar time is unavoidable.

### F04 Reviewers cannot currently access the complete product

**Both · Submission blocker · Confirmed console gaps; credential usability unverified.** Affected: authenticated customer, owner, staff and paid workflows.

Evidence: Apple's Sign-in required is checked but username/password are blank. Review notes contain a “Before submission” instruction to provide an account. Google's sign-in declaration is unstarted. Owner tools depend on active business membership; creation and checkout depend on [the billing provider and server catalog](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:145), including a selected-account sandbox rollout documented at [lines 266 onward](F:/BusinessApp/docs/business-subscription-store-setup.md:266).

Policy: [Apple 2.1(a)–(b)](https://developer.apple.com/app-store/review/guidelines/#app-completeness); [Play Console Requirements 3.3](https://support.google.com/googleplay/android-developer/answer/10788890).

Recommended fix: prepare stable customer, owner and staff review access with seeded non-sensitive content, explain mode switching and all gated features, and provide usable sample QR codes. Review accounts need ordinary, documented access to the submitted functionality. Avoid email-code-only, expiring invitation, private network, location, or manual approval dependencies that reviewers cannot resolve. **Verify:** a fresh installation can follow the final notes from signed out through every role without developer assistance. **Work:** safe backend fixtures, store configuration and review documentation.

### F05 Paid feature tiers are advertised but not enforced

**Both · High rejection risk · Confirmed implementation gap; misleading paid offer if activated unchanged.** Affected: Essentials, Growth and Pro subscriptions; owner workspace.

Evidence: [the catalog](F:/BusinessApp/packages/business-logic/src/business-subscriptions.ts:1) distinguishes features, while [the migration](F:/BusinessApp/supabase/migrations/20260929000200_feature_subscription_catalog.sql:41) explicitly calls its capability snapshot a foundation rather than enforcement. `get_my_business_subscription_features` has no consumer in the scanned app or backend. [Workspace access](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:512) checks owner role; [hub visibility](F:/BusinessApp/apps/mobile/src/lib/business-workspace-config.ts:142) checks business type and role. Neither checks paid feature codes. The [plan screen](F:/BusinessApp/apps/mobile/src/app/listing-plans.tsx:367) advertises tier benefits. Staging notes explicitly leave enforcement unfinished.

Policy: [Apple 2.3.1 and 3.1.2(c)](https://developer.apple.com/app-store/review/guidelines/); [Google Subscriptions, truthful benefits and offer transparency](https://support.google.com/googleplay/android-developer/answer/9900533).

Recommended fix: implement server-authoritative per-feature checks on every relevant operation and matching UI gates, or simplify the offer to benefits the system actually delivers. Preserve legacy purchasers' allowances. Cover upgrades, downgrades, expiry, refund and grace/retry states. **Verify:** an Essentials account cannot invoke Growth/Pro operations directly; valid higher tiers work; entitlement changes propagate across sessions and devices. **Work:** code, backend, tests, updated offers/listing; new candidate build.

### F06 Production pickup ordering and appointment booking are explicitly disabled

**Both · High rejection risk · Confirmed source behavior; production deployment unverified.** Affected: pickups, appointments, deposits, refunds and Pro benefits.

Evidence: [commerce client](F:/BusinessApp/apps/mobile/src/lib/square-commerce.ts:20) rejects any environment other than development/staging. [Appointment client](F:/BusinessApp/apps/mobile/src/lib/appointment-commerce.ts:79) does the same. [Square configuration](F:/BusinessApp/supabase/functions/_shared/square-security.ts:134) requires sandbox; [Stripe configuration](F:/BusinessApp/supabase/functions/_shared/square-security.ts:193) rejects production and requires a test secret. This includes the API used for booking catalog, slots, booking and deposits; it is not only a payment-screen switch.

Policy: [Apple 2.1, 2.2 and 2.3.1](https://developer.apple.com/app-store/review/guidelines/); [Google Functionality, section 2 Broken Functionality](https://support.google.com/googleplay/android-developer/answer/9898783), and [Subscriptions](https://support.google.com/googleplay/android-developer/answer/9900533).

Recommended fix: finish live commerce and provider onboarding, webhooks, cancellation, disputes and refund reconciliation before advertising or selling these benefits. Alternatively scope the first release and paid offer to working capabilities, removing unavailable promises and unusable entry points consistently. Merely changing `APP_ENV` to staging in a store build would leave a sandbox product. **Verify:** separately authorized provider sandbox acceptance, final production credentials/webhook readiness and provider-compliant genuine transactions after launch authorization. Stripe expressly prohibits live-mode testing with real payment details; use its documented simulated payment/error/refund cases. See [Stripe Testing, How to use test cards and go-live keys](https://docs.stripe.com/testing) and [Square, separate Sandbox and production credentials](https://developer.squareup.com/docs/build-basics/access-tokens). **Work:** substantial code/backend/payment configuration, release scope and documentation, native build.

### F07 Production subscription lifecycle configuration is not established

**Both · High rejection risk · Confirmed Apple notification gap; other production settings unverified.** Affected: subscription purchase, renewal, cancellation, refund, restoration and publication access.

Evidence: Apple's Production Server URL is unset while Sandbox Server URL points to RevenueCat. [Webhook code](F:/BusinessApp/supabase/functions/revenuecat-webhook/index.ts:57) defaults to sandbox and rejects environment mismatches. [The rollout notes](F:/BusinessApp/docs/business-subscription-store-setup.md:274) keep global billing disabled and require separate production configuration at line 335. Google RTDN is enabled with a topic configured for subscriptions/voided purchases; delivery and Pub/Sub permissions were not tested. Its three monthly base plans are Active, US-only at $19/$39/$69, with 7-day grace, automatic 53-day account hold and resubscribe allowed. Subscription pause is enabled. [The parser](F:/BusinessApp/supabase/functions/_shared/revenuecat-webhook.ts:53) and its regression tests already handle grace and scheduled pause; missing pause code is not a finding. Current RevenueCat production credentials/webhooks and deployed backend/catalog values remain unverified.

Policy: [Apple 2.1(b), 3.1.1 and 3.1.2](https://developer.apple.com/app-store/review/guidelines/); [Google Subscriptions](https://support.google.com/googleplay/android-developer/answer/9900533). Implementation guidance: [RevenueCat Apple server notifications, Manual setup](https://www.revenuecat.com/docs/platform-resources/server-notifications/apple-server-notifications) and [launch checklist](https://www.revenuecat.com/docs/test-and-launch/launch-checklist). Server notifications are a reliability recommendation, not by themselves a separate Apple review prohibition.

Recommended fix: establish isolated production keys, product/entitlement mappings, production webhooks and environments, enable only verified catalog rows, and prove server entitlements follow the actual store lifecycle. **Verify:** purchase, slow webhook, offline return, restore/reinstall, account switching, renewal, cancellation with paid-period access, expiration, billing retry/grace/account hold, scheduled pause and resume, store resubscribe, refund/revocation, duplicate and out-of-order events. **Work:** backend and RevenueCat/store configuration, native acceptance and documentation; new build if embedded values change.

### F08 Privacy and support are not readily accessible to ordinary customers

**Both · High rejection risk · Confirmed source gap.** Affected: signed-out account and customer account settings.

Evidence: [Account sections](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:131) and [Privacy & Safety row](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:847) offer business blocking, not a policy link. The scanned app's explicit terms/privacy/support links are in [Business plans](F:/BusinessApp/apps/mobile/src/app/listing-plans.tsx:475). That route is absent from [guest-access policy](F:/BusinessApp/apps/mobile/src/lib/navigation-policy.ts:6). The actual public pages work, but general in-app discovery of them is missing.

Policy: [Apple 5.1.1(i), 1.2 and 1.5](https://developer.apple.com/app-store/review/guidelines/); [Google User Data, Privacy Policy](https://support.google.com/googleplay/android-developer/answer/10144311).

Recommended fix: add clear privacy, terms, support and deletion-help links in signed-out and authenticated account settings, reachable without buying a plan or becoming an owner. **Verify:** every role and signed-out user can open the correct public pages on a fresh installation. **Work:** code and native candidate; documentation if URLs change.

### F09 Data disclosures need an app and SDK data inventory

**Both · Submission blocker for unfinished forms; high rejection risk if inaccurate · Confirmed forms unfinished; exact final answers unverified.** Affected: App Privacy, Data safety, analytics, auth, payments, content and push delivery.

Evidence: Apple App Privacy shows Get Started; Google Data safety is at step 1. [Analytics](F:/BusinessApp/apps/mobile/src/lib/business-analytics.ts:6) creates a persistent SecureStore visitor UUID and submits usage events. [SQL](F:/BusinessApp/supabase/migrations/20260927000100_local_growth_features.sql:116) hashes it and stores recent events for 45 days; hashing does not automatically remove disclosure obligations. Purchase access uses an account-linked RevenueCat user ID. Public policy broadly describes activity and technical data but does not specifically explain the persistent browsing identifier or analytics retention. IPA manifests include Google Sign-In, Stripe and RevenueCat data declarations; SDK manifests alone do not establish which optional collection is enabled.

Policy: [Apple App Privacy, Data collection and Data linked to you](https://developer.apple.com/app-store/app-privacy-details/); [Google User Data, Data safety section and Privacy Policy](https://support.google.com/googleplay/android-developer/answer/10144311). Vendor guidance: [RevenueCat Apple Purchases and Identifiers](https://www.revenuecat.com/docs/platform-resources/apple-platform-resources/apple-app-privacy), [RevenueCat Google Data safety](https://www.revenuecat.com/docs/platform-resources/google-platform-resources/google-plays-data-safety).

Recommended fix: reconcile the data map below with actual production SDK configuration and network behavior; complete both forms, include purpose/identity/retention details, and add any necessary consent and withdrawal controls. Do not select “no data collected” because location geofences are local or because the app root manifest has an empty collected-data array. Do not label all vendor optional fields collected without evidence. **Verify:** inspect SDK privacy declarations and production traffic, then compare policy, labels and forms. **Work:** store configuration, policy documentation, potentially code/consent and native build.

### F10 UGC terms acceptance is not implemented

**Google; relevant to Apple UGC safeguards · High rejection risk · Confirmed implementation gap.** Affected: signup, business creation, images, reviews/replies, events, updates and service-request content.

Evidence: [Signup](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:437) creates accounts with display-name metadata, without a terms acceptance step. Social/OTP paths also lack it. `terms_accepted_at` appears only as [a schema column](F:/BusinessApp/supabase/migrations/20260915000100_initial_schema.sql:63), with no write/enforcement in scanned code or migrations. [Business creation gate](F:/BusinessApp/apps/mobile/src/components/business-creation-gate.tsx:23) is a billing acknowledgment. Public terms say use implies agreement; that is not an implemented affirmative UGC acceptance gate.

Policy: [Google UGC, first bullet under Full Policy](https://support.google.com/googleplay/android-developer/answer/9876937); [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content).

Recommended fix: display and require versioned terms/community-policy acceptance before the first UGC action for every identity path and existing users. Enforce acceptance server-side on relevant writes. Define objectionable behavior explicitly. **Verify:** unaccepted accounts cannot upload/create content through either UI or direct API; acceptance is recorded and revocable account deletion still works. **Work:** code, backend, policies and tests; candidate build.

### F11 Blocking businesses does not cover abusive reviewers or other users

**Both · High rejection risk · Confirmed capability gap; applicability to each private workflow requires judgment.** Affected: public customer reviews/replies and customer/business interaction.

Evidence: [Customer safety API](F:/BusinessApp/apps/mobile/src/lib/customer-safety.ts:1) only stores customer-to-business blocks. [Public business page](F:/BusinessApp/apps/mobile/src/components/public-business-page.tsx:771) blocks a business. [Review reporting](F:/BusinessApp/apps/mobile/src/components/pickup/business-review-section.tsx:142) reports review content, with no individual-user blocking capability. Public review authors are reduced to initials, which helps exposure but does not block an abusive author.

Policy: [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content); [Google UGC, public UGC and 1:1 interaction bullets](https://support.google.com/googleplay/android-developer/answer/9876937).

Recommended fix: provide report-user and block-user controls for public review participants and appropriate business interactions, backed by privacy-preserving author references. Define effects consistently across replies, requests, notifications and new interactions. Preserve essential transaction records and support access. **Verify:** blocking a sample abusive author hides/prevents the intended interactions across sessions; direct APIs enforce the same boundaries. **Work:** code/backend, moderation documentation and tests; candidate build.

### F12 Existing moderation tools do not prove objectionable content is filtered before publication

**Both · High rejection risk · Likely risk; operation and filtering coverage unverified.** Affected: photos, business changes, events, offerings, public reviews and owner replies.

Evidence: [Image finalization](F:/BusinessApp/supabase/functions/finalize-business-image/index.ts:334) checks image format, bounds, strips metadata and re-encodes, then publishes to public storage. This is good file security, not semantic content filtering. [Order reviews](F:/BusinessApp/supabase/migrations/20260927000300_verified_order_reviews.sql:15) default to published. [Reply RPC](F:/BusinessApp/supabase/migrations/20260929000500_owner_review_replies.sql:20) checks scope/length and publishes directly. Reporting and admin review tools exist in [admin actions](F:/BusinessApp/apps/web/src/app/admin/reports/actions.ts:21) and SQL; no comprehensive prepublication filter or moderator response evidence was found. Initial business approval does not establish review of every subsequent edit.

Policy: [Apple 1.2](https://developer.apple.com/app-store/review/guidelines/#user-generated-content); [Google UGC, ongoing moderation](https://support.google.com/googleplay/android-developer/answer/9876937).

Recommended fix: establish preventive filtering or a review queue appropriate to each content type, prompt report handling, account sanctions and appeal/support procedures. Cover text and images and changes to already-approved businesses. **Verify:** safe test content is held/filtered/reported, moderators can remove it, public/cached views update, and a staffed response process is documented. Do not upload illegal content as a test. **Work:** backend/code, moderation operations and documentation; candidate build where UI changes.

### F13 Sign in with Apple deletion does not revoke authorization

**Apple · High rejection risk · Confirmed application implementation gap; provider-side behavior not independently tested.** Affected: Apple signup, linking, deletion and reauthorization.

Evidence: [Native Apple sign-in](F:/BusinessApp/apps/mobile/src/lib/mobile-oauth.ts:53) uses identity token and nonce but does not exchange/store the authorization code for Apple revocation. [Deletion endpoint](F:/BusinessApp/supabase/functions/delete-account/index.ts:214) deletes Supabase account data without an Apple revoke call. No Apple credential-revoked listener/manual revoke guidance was found. Supabase sign-out/deleting its user is not evidence that Apple authorization was revoked.

Policy and implementation requirement: [Apple 5.1.1(v)](https://developer.apple.com/app-store/review/guidelines/), [account deletion support](https://developer.apple.com/support/offering-account-deletion-in-your-app/), and [TN3194, Invalidate a user session and Securely store user tokens](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple).

Recommended fix: implement a secure server-side authorization-code exchange and token revocation during deletion, plus credential-revocation handling. For legacy users without tokens, fulfill deletion and provide the manual revocation guidance described by TN3194. **Verify:** with separately authorized disposable accounts, Apple authorization is revoked, data and local session are removed, and reauthorization behaves correctly. **Work:** code/backend/auth configuration, native acceptance and candidate build.

### F14 Deletion coverage needs a retention and provider audit

**Both · High rejection risk · Unverified concern supported by concrete retention paths.** Affected: associated data, reviews, analytics, provider records and device storage.

Evidence: [Deletion SQL](F:/BusinessApp/supabase/migrations/20260919000200_account_deletion.sql:259) transfers shared-business attribution then deletes the auth row. That does not necessarily delete every retained payload. [Order reviews](F:/BusinessApp/supabase/migrations/20260927000300_verified_order_reviews.sql:7) set customer ID null while retaining free-text review content. [Deletion jobs](F:/BusinessApp/supabase/migrations/20260919000200_account_deletion.sql:3) retain job/user/impact data without a retention deadline in this migration. [Client cleanup](F:/BusinessApp/apps/mobile/src/components/account-data-panel.tsx:98) clears auth, nearby state, scan queue and onboarding, but not the analytics visitor UUID or all order/appointment access records. No RevenueCat customer deletion is in the endpoint; any separate support/provider process is unverified.

Counterevidence: order and appointment schemas do contain anonymization triggers; [appointment anonymization](F:/BusinessApp/supabase/migrations/20260927000400_square_sandbox_appointments.sql:229) explicitly clears contact fields. Event reviews also depend on RSVP cascades. Retaining legitimate transaction or shared-business data can be justified; it is not automatically a violation. Nulling an author ID does not by itself remove personal information in free text.

Policy: [Apple account deletion, associated user data](https://developer.apple.com/support/offering-account-deletion-in-your-app/); [Google account deletion, retention FAQ](https://support.google.com/googleplay/android-developer/answer/13327111).

Recommended fix: map every dependent record, storage object, local key and processor record to delete/anonymize/retain, with purpose and retention limits. Remove or scrub user-authored personal content where needed and implement/document provider erasure processes. Clarify justified retained data in the policy. **Verify:** separately authorized deletion fixtures for customers, sole owners, shared owners, staff, active orders and Apple-linked users; inspect database, storage, provider and device results. **Work:** backend/code, provider operations, policy documentation and integration tests; candidate build for local cleanup.

### F15 Delayed media cleanup is hidden from the deletion result

**Both · Moderate risk · Confirmed result-handling gap; cleanup service deployment unverified.** Affected: deletion completion and media storage.

Evidence: [Endpoint response](F:/BusinessApp/supabase/functions/delete-account/index.ts:222) can return `deleted: true, cleanupPending: true`. [Account panel](F:/BusinessApp/apps/mobile/src/components/account-data-panel.tsx:97) checks deletion, ignores cleanupPending and displays “Account deleted.” [Cleanup worker](F:/BusinessApp/supabase/functions/media-cleanup/index.ts:128) has retries, but its live schedule and completion monitoring were not verified.

Policy: [Apple account deletion, keeping users informed when completion takes time](https://developer.apple.com/support/offering-account-deletion-in-your-app/); [Google User Data, Account Deletion Requirement](https://support.google.com/googleplay/android-developer/answer/10144311).

Recommended fix: distinguish account access removal from pending media erasure, state expected completion/support handling, and monitor/retry cleanup to completion. Keep subscription-cancellation guidance available even when publication entitlement has lapsed. **Verify:** controlled storage failure yields accurate user messaging and a completed cleanup job after recovery. **Work:** code/backend operations, retention/support documentation; candidate build.

### F16 Broad Android photo access is unnecessary for the implemented picker

**Google · High rejection risk · Confirmed permission/use mismatch; supported exception not evidenced.** Affected: business photo and offering uploads.

Evidence: uploaded AAB declares `READ_MEDIA_IMAGES`; Play lists it and requests a photo/video declaration. [Media-library plugin](F:/BusinessApp/apps/mobile/app.config.ts:122) adds broad photo access, but no media-library API consumer was found. [Actual upload selection](F:/BusinessApp/apps/mobile/src/components/business-workspace.tsx:2594) uses the system image picker. There is no implemented whole-library management requirement.

Policy: [Restricted Permissions, Photo and Video Permissions and removal FAQ](https://support.google.com/googleplay/android-developer/answer/16935362). SDK guidance: [Expo SDK 57 ImagePicker, Usage and Configuration](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/).

Recommended fix: retain transactional system selection and remove unused media-library/broad media declarations from the merged native manifest. Preserve any legitimate legacy picker fallback with minimum necessary scope. **Verify:** inspect the final AAB and Play declaration, then upload/cancel/select limited photos on supported Android versions without whole-library access. **Work:** code/configuration, **new native build**, store declaration. OTA cannot remove manifest permissions.

### F17 Native capabilities and permission strings exceed actual use

**Both · Moderate risk; foreground-service declaration contributes to Google submission blocking · Confirmed declarations; actual permission prompts unverified.** Affected: contacts, device calendar, biometrics, motion, reminders, overlay and location service.

Evidence: [Plugins](F:/BusinessApp/apps/mobile/app.config.ts:90) include calendar, local authentication, contacts and media library with no current API usage for those features. The AAB declares READ/WRITE_CONTACTS, READ/WRITE_CALENDAR, USE_BIOMETRIC/FINGERPRINT, SYSTEM_ALERT_WINDOW and FOREGROUND_SERVICE_LOCATION. IPA purpose strings also include motion/reminders and a Face ID string saying the app does not use Face ID. Its camera message describes taking business photos, while implemented camera use is rewards/pickup scanning. Geofencing exists, but no `startLocationUpdatesAsync` consumer was found; `LocationTaskService` is nevertheless declared.

Policy: [Apple 5.1.1(ii)–(iv) and 2.5.4](https://developer.apple.com/app-store/review/guidelines/); [Google restricted-permission minimum scope](https://support.google.com/googleplay/android-developer/answer/16935362), and [FGS declaration requirements](https://support.google.com/googleplay/android-developer/answer/13392821). Contacts' additional API 37 rule is future-scoped below, not a current API 36 violation.

Recommended fix: remove unused native modules/capabilities/permission declarations where feasible; document indispensable library-added permissions; write accurate Parish Pass purpose strings for actual camera/location/photo actions. Remove unused location FGS configuration if geofencing does not need it, then confirm no declaration is demanded for a removed service. Inspect merged artifacts rather than trusting plugin input. **Verify:** full final-manifest/plist review and denied/limited permission paths. **Work:** code/configuration and **new native build**, store declarations.

### F18 Optional background nearby alerts may not qualify for Google approval

**Google · High rejection risk; Apple · Moderate risk · Reviewer judgment and unverified declaration/video.** Affected: nearby mobile-business alerts.

Evidence: [Disclosure](F:/BusinessApp/apps/mobile/src/providers/nearby-alerts-provider.tsx:291) clearly explains background use and obtains Continue before requesting permissions. [Native implementation](F:/BusinessApp/apps/mobile/src/lib/nearby-alerts.native.ts:108) evaluates geofences locally and checks following, blocking, enablement and timing. These are positives. The feature is optional; main discovery, calendar and orders work conceptually without it. [Native background capability](F:/BusinessApp/apps/mobile/app.config.ts:112) is enabled, and the Google declaration is unfinished.

Policy: [Google background location, core functionality, disclosure and declaration](https://support.google.com/googleplay/android-developer/answer/9799150); [Apple 5.1.5 and 2.5.4](https://developer.apple.com/app-store/review/guidelines/).

Recommended fix: the lowest-risk initial scope is foreground discovery without background location. If keeping alerts, document why they deliver a core, significant user benefit that cannot reasonably use a foreground alternative, accurately feature them in the listing, and provide the required declaration and device demonstration video. Existing disclosure does not guarantee approval of the use case. **Verify:** fresh-install enable/deny/disable, device-settings revocation, app closed/reboot, blocked/unfollowed business and deletion tests; declaration review. **Work:** product scope/code/native build if removed, otherwise store configuration, video and native acceptance.

### F19 Age and merchant-content boundaries are not established

**Both · Moderate risk; can become high rejection risk if prohibited commerce/content is present · Unverified concern.** Affected: offerings, menus, service requests, events, rewards and audience selection.

Evidence: age questionnaires are unfinished. [Public terms](F:/BusinessApp/apps/public-info/content.mjs:1) prohibit unlawful content but do not give merchants explicit prohibited-item/regulated-offering rules. Menu, offering and service text is merchant supplied; no comprehensive restricted-item enforcement was found. No built-in gambling or lottery mechanic was found in scanned mobile/shared code. Stamp/points rewards appear to be loyalty, not evidence of gambling. The privacy policy says not directed to under-13s; this alone does not settle target-audience or actual access choices.

Policy: [Apple 1.1, 2.3.6, 5.1.4 and 5.3](https://developer.apple.com/app-store/review/guidelines/); [Google Inappropriate Content, Dangerous Products, Marijuana, Tobacco and Alcohol](https://support.google.com/googleplay/android-developer/answer/9878810), [Families](https://support.google.com/googleplay/android-developer/answer/9893335), and [UGC](https://support.google.com/googleplay/android-developer/answer/9876937).

Recommended fix: define and enforce merchant categories and prohibited goods/services, use an adult-appropriate owner purchasing flow, answer age/audience forms from actual accessible content, and avoid child-directed positioning unless the product is designed to satisfy Families requirements. Do not introduce chance-based prizes without a separate policy/rules review. Restrict alcohol/other regulated activity appropriately where permitted; do not assume legal local sales are permitted on both stores. **Verify:** catalog/admin review and safe negative fixtures for prohibited categories; consistent questionnaire answers and surfaced promotion terms. **Work:** policies, moderation/backend/code as needed, store configuration.

### F20 OTA compatibility relies on a manually maintained app version

**Both · Moderate risk · Unverified compatibility concern, not a finding that Expo updates are inherently forbidden.** Affected: launch, native modules and post-review behavior.

Evidence: [Runtime policy](F:/BusinessApp/apps/mobile/app.config.ts:35) uses appVersion, currently 0.1.0; [profiles](F:/BusinessApp/apps/mobile/eas.json:13) distinguish preview and production channels. Both local IPA files are the same preview artifact, with updates enabled and runtime 0.1.0. A version string alone does not prove native compatibility after plugin/SDK/permission changes.

Policy: [Apple 2.5.2 and 2.3.1](https://developer.apple.com/app-store/review/guidelines/). SDK guidance: [Expo runtime versions, appVersion and fingerprint policies](https://docs.expo.dev/eas-update/runtime-versions/).

Recommended fix: separate production update destinations, use a native compatibility fingerprint or rigorously bump runtime/version after native changes, and establish a tested rollback. Update publication must preserve the reviewed product and declared data use. **Verify:** production build points to intended channel/backend; native-incompatible updates are excluded; launch works offline and after update/rollback. **Work:** code/configuration, release procedures and **new native build** for native changes. No OTA was published in this audit.

### F21 Production configuration and public deep links remain unverified

**Both · High rejection risk if misconfigured · Unverified concern with unsafe fallback behavior in source.** Affected: all APIs, OAuth, QR sharing, event links and provider callbacks.

Evidence: [Supabase configuration](F:/BusinessApp/apps/mobile/src/lib/supabase.ts:10) uses staging variables only for staging; otherwise missing configuration can fall back to a local placeholder URL/key. [Share links](F:/BusinessApp/apps/mobile/src/lib/share-links.ts:28) depend on configured public hosts and reject loopback correctly. [Associated domains and Android intent filters](F:/BusinessApp/apps/mobile/app.config.ts:57) are environment-derived; `/events` is an advertised native path but its cold-start mapping into the app calendar was not exercised. Working policy URLs do not prove business/event/invite routes or AASA/assetlinks files work.

Policy: [Apple 2.1](https://developer.apple.com/app-store/review/guidelines/#app-completeness); [Google Broken Functionality](https://support.google.com/googleplay/android-developer/answer/9898783). Auth guidance: [Supabase Apple configuration](https://supabase.com/docs/guides/auth/social-login/auth-apple).

Recommended fix: validate required production configuration at build/release time, fail clearly on missing values, keep development fallbacks out of production, and verify production OAuth audiences/certificates, callback allowlists, public web hosting and link associations. Never embed service-role, provider secret or signing keys in public app variables. Their actual production values were not read or certified here. **Verify:** final candidate's public configuration and safe live read-only requests; cold/warm business/event links, invite resume, payment return and Google/Apple login. **Work:** code/build configuration, backend/provider/hosting settings and native build.

### F22 Native usability and compatibility acceptance is still missing

**Both · Moderate risk, elevated to a release gate for paid/core flows · Unverified concern.** Affected: every route, OS dialog, scanner, paywall, keyboard, map, accessibility and startup.

Evidence: tests pass, but no native session was available. [AppButton](F:/BusinessApp/apps/mobile/src/components/app-button.tsx:43) provides roles, labels, states and 48-point minimum height; [MerchantSheet](F:/BusinessApp/apps/mobile/src/components/merchant-ui.tsx:316) handles keyboard, close, safe-area and modal accessibility; the scanner offers manual entry. These are useful source safeguards, not native accessibility proof. Play says Supports 16 KB and ELF LOAD alignment passes. A supplementary raw RELRO-end calculation flags 49 of 60 64-bit libraries under the formula in the current Android guide, including `libappmodules.so` and `libexpo-modules-core.so`. This conflicts with the broad console compatibility signal and needs authoritative NDK-tool/runtime investigation; it is **not labeled a proven install or crash defect**.

Policy: [Apple 2.1 and 4.0](https://developer.apple.com/app-store/review/guidelines/); [Google Functionality](https://support.google.com/googleplay/android-developer/answer/9898783). Technical guidance: [Android 16 KB pages, ELF, RELRO and runtime testing](https://developer.android.com/guide/practices/page-sizes).

Recommended fix: execute the device matrix below on the exact release candidate, investigate the raw RELRO observations with NDK `llvm-readelf`, check generated APK zip alignment, and test a 16 KB device/emulator. Run VoiceOver/TalkBack, large text, small phones and supported iPads, light/dark themes, reduced motion, denied permissions and slow/offline flows. Record crashes and fix reproducible defects. **Verify:** signed acceptance results and pre-launch reports; no tests should be reported passed without execution. **Work:** native QA, possibly code/dependencies and new build if defects are confirmed.

### F23 Apple EU trader status needs review before EU distribution

**Apple · Moderate risk; regional distribution gate if applicable · Unverified concern.** Affected: EU storefront availability.

Evidence: App Information currently identifies the developer as non-trader and offers compliance guidance. The Business page separately shows Digital Services Act status Active, updated September 29. This is counterevidence to an assertion that account-level compliance is simply unfinished. The app plans paid business subscriptions and commercial promotion; the factual trader assessment and intended app territories still need review.

Requirement: [Apple DSA trader requirements, Assessing whether you're a trader](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements). This is a regional compliance issue, not an automatic worldwide app rejection.

Recommended fix: determine correct trader status from the actual business activity and intended regions; complete verification/contact requirements if applicable, or deliberately limit availability while resolving it. **Verify:** account-level and app-level compliance and chosen territories. **Work:** account/store configuration and documentation; no code change inherently required.

### F24 Android developer and package verification needs confirmation for distribution

**Google · Moderate risk; regional distribution gate where applicable · Unverified concern.** Affected: installation/update eligibility and Play versus EAS/outside-Play signing identities.

Evidence: the app package is `com.stanforddevelopmentsolutions.sdslocal`, configured in [native app configuration](F:/BusinessApp/apps/mobile/app.config.ts:60) and present in the inspected AAB. Play internal distribution exists, but developer identity/package registration and final signing-certificate association were not inspected. Active subscription products and an internal release do not certify those account/package records.

Requirement: [Android developer verification, Where changes are in effect and What you need to do](https://developer.android.com/developer-verification/guides). Regional protections begin September 30, 2026 in Brazil, Indonesia, Singapore and Thailand for participating stores on certified devices; broader rollout is described for 2027. Play automatically registers most apps, so no separate Android Developer Console account or manual registration is presumed necessary for this Play app.

Recommended fix: inspect verified developer/package status and signing-key associations in Play Console; confirm intended territories. If also distributing EAS APKs outside Play, verify the corresponding package/signing identity and applicable registration path. **Verify:** console identity/package records and the exact intended signing certificate; region-specific installation/update acceptance when relevant. **Work:** account/store configuration and release documentation; native signing/build work only if a mismatch is found.

### F25 Local-build instructions remain in the password reset flow

**Both · Improvement; moderate review confusion if shipped · Confirmed source issue.** Affected: recovery.

Evidence: [Reset notice](F:/BusinessApp/apps/mobile/src/app/(tabs)/account.tsx:512) unconditionally tells users the email code appears in a local test inbox. Ordinary production users cannot follow that instruction. Several native permission and residual UI strings also use SDS Local; the policy site explains the former name, so not every old-brand string is automatically misleading.

Policy: [Apple 2.1(a)](https://developer.apple.com/app-store/review/guidelines/#app-completeness); [Google Functionality](https://support.google.com/googleplay/android-developer/answer/9898783).

Recommended fix: show normal delivery guidance outside local development, finish Parish Pass naming in permission/error/support strings, and review all release screens for fixture or diagnostic language. **Verify:** production-environment rendering plus an authorized reset delivery test using the approved plus-alias mailbox only; do not send fabricated-address emails. **Work:** code/copy, candidate build.

## Safeguards already implemented

These findings do not imply that the app lacks all billing, deletion or safety infrastructure.

- Digital owner tools use native RevenueCat/Apple/Google purchasing. Physical pickups and real-world appointments use separate processors. That classification aligns with [Apple 3.1.1 and 3.1.3(e)](https://developer.apple.com/app-store/review/guidelines/) and [Google Payments sections 2 and 3](https://support.google.com/googleplay/android-developer/answer/9858738). Remote digital services must not be slipped into the physical-service path.
- [Plan UI](F:/BusinessApp/apps/mobile/src/app/listing-plans.tsx:430) displays storefront prices, period/renewal information, legal links, restore, manage and a free-customer exit. No fabricated local-price purchase fallback was found. [Restore](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:443) exists; missing-restoration is not a finding.
- [Entitlement confirmation](F:/BusinessApp/apps/mobile/src/providers/listing-billing-provider.tsx:60) polls the backend, and pending purchase messaging warns against buying again. Identity coordination and original-store management reduce account-transfer/double-payment risks. Native lifecycle acceptance is still required.
- [Apple login](F:/BusinessApp/apps/mobile/src/lib/mobile-oauth.ts:215) exists alongside Google; it uses a nonce and preserves the initial returned name. A missing Apple-login option is not a finding. OAuth provider settings and final native capability need device validation.
- Guests can browse Explore/calendar and use applicable guest order/appointment routes. Account creation is not required merely to launch discovery.
- In-app permanent deletion, impact review, typed confirmation, sole-owner deletion/shared-owner transfer and authenticated backend deletion exist. The [external page](https://parish-pass--policies.expo.app/delete-account.html) offers an email request without reinstalling the app. Email-based requests are expressly supported in [Google's deletion-resource FAQ](https://support.google.com/googleplay/android-developer/answer/13327111). No external-form requirement is being invented.
- Business/content/review reporting, business blocking, verified purchase/event review eligibility, platform-admin queues and owner-scope checks exist. The remaining findings concern the coverage and operation of those controls.
- Media upload is authenticated, bounded, reserved, decoded and re-encoded before finalization. Shared commerce helpers include token encryption, webhook signature handling, idempotency and authorization checks. Local tests support these mechanisms; hosted RLS/grants and end-to-end isolation were not certified.
- Nearby alerts have a disclosure and local geofencing; no evidence of selling that location or advertising tracking was found. First-party analytics alone does not prove Apple ATT tracking. Verify SDK integrations before declaring tracking absent.
- The IPA contains a root privacy manifest plus SDK manifests, including required-reason entries for file timestamps, defaults and boot time. “No privacy manifests” is not a finding. Validate the final archive/privacy report against [Apple's SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) and [required-reason API documentation](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).
- Apple's live Business page shows Paid Apps and Free Apps agreements, a bank account, the US tax form and DSA compliance as Active. The audit records status only, omitting private financial/account details. These are not current account-setup blockers; signing and the final production artifact still need verification.

## Privacy and permission reconciliation

This is a proposed data map to complete against production evidence, **not final form answers**. Apple and Google categories, service-provider exceptions and on-device processing rules differ.

| Data or capability | Implementation and destination | Disclosure and verification needed |
| --- | --- | --- |
| Account name, email, user UUID, provider identities and preferences | Supabase auth/profile; native Apple/Google login | Account identifiers/contact information; purposes, linking and provider configuration. |
| Business profiles, addresses/stops, photos, offerings, events, updates and staff access | Supabase database/storage; public business pages | User content/photos/business location; distinguish merchant-published location from customer device location. |
| Reviews, replies, saves/follows, RSVP/reminders, requests and rewards | Supabase and relevant businesses | Content and app activity; visibility to merchants/public; retention and deletion. |
| Customer booking/order contacts, notes, totals and status | Commerce backend, merchant and payment processor | Personal/payment/purchase information actually transmitted; avoid declaring full card credentials received by app servers if processor-hosted. |
| Native subscription history, transaction/product IDs and entitlement | Store, RevenueCat, backend linked by account UUID | Purchase history and user identifiers; function/analytics purposes per enabled vendor features. |
| Notification push token, preferences and delivery records | Expo/Supabase; OS notification service | Identifiers and relevant app activity/technical data; registrations deleted and permissions optional. |
| Visitor UUID and business page/QR/offering/event/click metrics | SecureStore, then hashed identifier and usage in Supabase | Usage/identifier collection, consent/legal basis and retention; currently survives ordinary account cleanup. |
| Customer foreground location and background geofence state | Device, local cache/geofencing; business coordinates from server | Verify traffic and map SDK behavior before selecting “not collected.” Permission access is separate from off-device collection. |
| Google Sign-In, maps, Stripe, RevenueCat, Expo update/push and error/network processing | SDK/service dependent | Read each configured vendor's actual collection and subprocessors; manifests are evidence, not completed labels. |
| Photos/camera | System selection, scanner, uploaded chosen images | Restrict to chosen content and necessary scanner camera. No microphone/audio capture permission was found in the AAB. |
| Contacts/calendar/biometric/motion/reminders | Declared capabilities without current consumers | Remove unused declarations. Do not invent actual collection solely because a permission exists. |

The live policy contains app/provider identity, a privacy contact, HTTPS/access-control explanations, broad data uses, retention exceptions, cancellation guidance and under-13 positioning. Add specificity where the implemented analytics and retention/provider processes demand it, and ensure providers receive equivalent contractual protection. Detailed Stripe/map/Google SDK configuration remains a verification gap; no inaccurate “no collection” certification is made.

## Requirements already effective and upcoming requirements

| Requirement | Timing at this audit | App implication |
| --- | --- | --- |
| Apple Xcode 26 and iOS/iPadOS 26 SDK | Effective April 28, 2026 | Inspected preview metadata meets this floor; verify final distribution archive. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/). |
| Apple minimum deployment iOS 13 | Effective September 9, 2026 | Preview minimum 18 meets it. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/). |
| Apple updated age questions | January 31, 2026 requirement already effective; console also displays newer social-media questions | Complete the actual current questionnaire, including UGC/social/messaging and merchant content. [Apple requirements](https://developer.apple.com/news/upcoming-requirements/), [age-question update](https://developer.apple.com/news/?id=tlur8uvi). |
| Google new apps/updates target API 36 | Effective August 31, 2026 | Uploaded code 3 meets it. November 1 extension is a requested exception, not an automatic future deadline. [Target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878). |
| Google Play Billing Library 7 deprecation | New app/update deadline August 31, 2026; requested extension through November 1 | AAB manifest identifies **Billing Library 8.3.0**, meeting the current supported-version floor. [Billing support timeline](https://developer.android.com/google/play/billing/deprecation-faq). |
| Google Play Billing Library 8 deprecation | New app/update deadline August 31, 2027; requested extension through November 1, 2027 | Plan a supported RevenueCat/native dependency upgrade before that deadline; 8.3.0 is not obsolete at this audit. [Billing support timeline](https://developer.android.com/google/play/billing/deprecation-faq). |
| Google broad photo access policy | Fully effective May 28, 2025 | Current READ_MEDIA_IMAGES finding applies now. [Restricted permissions](https://support.google.com/googleplay/android-developer/answer/16935362). |
| Google API 37+ contacts minimum scope | Declaration prompts September 2026; enforcement January 27, 2027 for target 37+ | API 36 candidate is not automatically subject to the target-37 rule. Remove unused contacts now; assess picker before upgrading. [Contacts timeline](https://support.google.com/googleplay/android-developer/answer/16935362). |
| Google Android 17+ transactional precise-location button | January 27, 2027 enforcement stated in current guidance; target 37+ scope | Plan for nearby search/address pinpointing when upgrading; current declaration still needs attention. [Location minimum scope and timeline](https://support.google.com/googleplay/android-developer/answer/17033915). |
| Google 16 KB compatibility | Current technical requirement for target 35+; current guide states updates blocked February 1, 2027 if unsupported | Console reports support; LOAD alignment passes; finish generated APK and runtime checks, including RELRO concern. [Android guide](https://developer.android.com/guide/practices/page-sizes). |
| Android developer verification | Regional protections effective September 30, 2026; wider rollout described for 2027 | Verify developer/package/signing registration for intended distribution; no worldwide date is invented. [Android verification rollout](https://developer.android.com/developer-verification/guides). |

The current official Android guide was consulted directly; an older remembered enforcement date was not substituted for its February 1, 2027 update-block wording. No universal API 37 submission deadline or unannounced future Apple SDK floor is inferred.

## Minimum work before submission

1. Decide the first release's functional scope. Either complete production pickup/booking and the paid feature tiers, or change the offer and entry points so every advertised paid benefit works. Keep incomplete production billing disabled until verification succeeds.
2. Correct UGC acceptance, author blocking and preventive moderation coverage. Establish a staffed report/support process and merchant-content boundaries.
3. Make policies/support accessible to every role, complete the actual data inventory and disclosures, add Apple revocation handling, and resolve deletion/retention/cleanup behavior.
4. Remove unnecessary broad permissions and native capability residue. Decide whether background location is justified or omitted from the first release. Produce fresh native artifacts; OTA cannot make manifest changes.
5. Validate isolated production backend, authentication, payment and update configuration. Run the release-candidate device/role/lifecycle matrix, including 16 KB and accessibility checks. Record actual results.
6. Prepare reviewer accounts/QR samples/instructions and accurate device screenshots. Align Apple native/draft version, attach the build and first subscription submission, and complete all required Apple/Google declarations and listing assets.
7. Complete Google's closed testing and production-access application. Resolve intended-region compliance, including Apple EU trader status where applicable.

For Apple, the minimum is not merely uploading an IPA. For Google, neither the internal track nor a successful build replaces the production-access gate. Store-readiness repairs, routine fixture setup and sandbox acceptance need a later authorization to implement under this audit-only request. Real charges, destructive deletion, actual notification delivery and email delivery require deliberately scoped authorization before execution.

## Improvements after the minimum fixes

- Consider a coherent smaller initial paid offering rather than three tiers whose meaningful differentiation and production operations are unfinished.
- Document billing during preparation/moderation clearly and reduce the chance that a rejected business pays without useful ongoing value. Consider suitability checks before subscription and transparent support/refund handling; no blanket rule requiring a free moderation period is asserted.
- Add explicit retention periods and monitored erasure jobs, including provider-request ownership. Offer an easy analytics choice where appropriate.
- Replace production fallback configuration with release validation, maintain a reproducible binary/source/update mapping, and retain acceptance results for each candidate.
- Investigate Play's low DEX optimization signal after functional correctness; it is an optimization recommendation, not a confirmed policy violation.
- Complete brand consistency and accessibility verification, including QR/manual scanning parity and large-text paywall/recovery flows.

## Tailored reviewer access and submission checklist

| Task | Evidence required before submission |
| --- | --- |
| Freeze candidate | Record source revision/dirty snapshot, EAS build ID, marketing/build versions, binary hash, runtime, channel, backend and current OTA group. No production artifact was certified in this audit. |
| Signed-out review | Launch, Explore search/filter/manual location, public business details, calendar/events, policy/support links, and safe guest pickup/booking entry points all work. |
| Customer account | Stable password access plus tested Apple/Google paths; follows, rewards, orders, requests, appointments, event RSVP/reviews, notifications, report/block, profile, deletion impact view. Avoid forcing an inaccessible OTP mailbox. |
| Owner account | A reviewed active business, draft/pending business, inventory/photos/events/rewards/staff and operations examples; instructions for mode switching and subscription tools. Seed only authorized non-sensitive fixtures. |
| Staff account | Membership in an allowed sample business, scanner/manual-code example, restricted owner actions, invite/resume instructions. Do not navigate a live staff-invite link casually: acceptance can occur on load. |
| Subscriptions | Visible store products/localized prices; free exit; terms/privacy/support, restore/manage; reviewer can reach every offered tier and documented gate. First Apple products and group attached to the app submission. Never put sandbox store credentials in general review account notes. |
| Commerce | Distinguish owner digital subscription from customer real-world payment. Document accessible working provider setup, quote/fees/deposit/cancellation/refund terms and safe examples. Explain any release-scoped unavailable capability truthfully. |
| Privacy/deletion | Matching labels/policy/SDK map, designated external deletion URL, account data consequences and retained-data reasons, Apple revoke implementation and pending cleanup handling. |
| Permissions | Final manifest/plist, necessary purpose strings, permission forms/videos, denied/limited access demonstrated. Screenshots from the final native candidate. |
| Content and audience | Age/content/target-audience forms, prohibited-item rules and content rights; UGC/report/block controls reachable; no misleading claim that all public merchant content has already been moderated. |
| Store operations | Revalidate agreements/tax/bank and signing/certificates, territories/trader status, manual/staged release choice and support mailbox. Apple's agreements/bank/tax/DSA statuses were Active in the live console; Google account/payment status and signing were not certified. |
| Google test gate | Continuous closed-test opt-ins and duration, meaningful tester evidence, approved production access, completed app declarations and required listing assets. |
| Submit decision | Review all findings and outstanding acceptance results. This audit grants no submission authorization. |

## Human workflow coverage inventory

**P = partially reviewed:** relevant implementation/control flow and source/test evidence examined; end-to-end native behavior not verified. **B = blocked:** runtime requires an unavailable release-candidate device or an action excluded by the audit. **R = reviewed:** the stated read-only browser surface was actually observed. All routes and embedded modal call sites are additionally listed individually with source lines in the [coverage companion](F:/BusinessApp/docs/audits/store-readiness-2026-09-30/coverage-inventory.md).

| Role and surface | Workflows and secondary states included | Status and remaining gap |
| --- | --- | --- |
| Root index and both layouts | Provider startup, splash/auth loading, mode routing, guest path policy, stack/tab navigation | P; B native cold start, session expiry, update and back-navigation. |
| Account and business-account | Sign-in/signup, OTP, recovery, remembered session, Apple/Google sign-in/linking, profile and region picker, notification settings, blocks, account data, creation entry, mode switching and sign-out | P; B every native identity path, delivery, multi-account session and settings accessibility. |
| Business-new and business creation gate | Draft resume/discard, subscription entry, business model/name/category/contact/location/service area, address/map, readiness and creation errors | P; B full native creation/approval; writes excluded. |
| Listing-plans | Catalog/store loading, empty products/retry/error, monthly/annual availability, localized pricing, legal links, upgrade/downgrade, restore, management, pending confirmation, diagnostics and free exit | P; B store sheets/lifecycle. Prior iOS checkout result recorded, not rerun. |
| Explore | Search/autocomplete, category/area/mobile filters, offering results, ranking, pagination, distance/manual location, public page, loading/no-results/error/denial | P; B native map/location and guest/auth interaction. |
| Public business via b/[slug] and embedded viewer | Valid/unavailable business; contact/share/directions; full menu/item details; events/RSVP; rewards/join/code; reviews/reports; business safety/block; image viewer | P; B deep-link cold/warm start and all native overlays. |
| Calendar and Rewards | Calendar-only alias, event directory/category/area filters, date/week/month views, following filters, wallet, reminders/timing/repetition pickers, RSVP/waitlist, QR sheet, event image viewer and empty/error states | P; B OS reminders, notification timing, QR and large-text/keyboard use. Device-calendar access is not implemented. |
| Order | Menu/product options/quantity, pickup scheduling, contact, reward application, quote, review, native Stripe or external Square checkout, cancel/pending/failure/retry and status return | P; B sandbox payment authorization and production functionality. |
| Orders | Account and guest order history, pagination, status, empty/error/loading and detail access | P; B install/account/device proof persistence and isolation. |
| Pickup-order and pickup-orders | Owner queue/business selector, detail/actions, status transitions, scanned/manual pickup, item/full refunds, payment review/pending/failed refunds, customer response | P; B mutations/refunds/notifications excluded. |
| Book-appointment and Appointment | Service/resource/slot/date choice, contact/review, slot retry/conflict, deposit checkout, saved guest proof, appointment polling, reschedule/cancel confirmation and payment/refund state | P; B native bookings and charges; source production guard confirmed. |
| Business-appointments, Business-requests and service operations | Business selection, appointment/request views, setup navigation and unsaved-change confirmation | P; B role-specific native operation. |
| Service-request and my-service-requests | Chosen service, dynamic required/optional answers, review/submit, pending/unconfirmed leave, history/detail/cancel and retry/error states | P; B backend transactions and real delivery excluded. |
| Request-form and Service-requests | Owner question builder/type picker/preview, dirty discard, customer form setup, request list/detail, status changes and access rejection | P; B writes and merchant response delivery excluded. |
| Business-reviews and my-event-reviews | Verified eligibility, review creation/update, owner replies, response sheet, loading/empty/error and report pathways | P; B live writes and author-block capability absent. |
| Event-attendees | Authorized attendee list/search/group detail, check-in, export and failure states | P; B export privacy/native sharing and check-in writes excluded. |
| Notification and Alerts inbox | Deep links to business/event/update/order/request/appointment, audience/context checks, list/detail, dismiss/clear, maps error, registration/preferences and nearby-alert sheets | P; B actual push/local delivery, notification cold start and channel/device settings. |
| Staff-invite and auth/callback | Token/PKCE parsing, canceled/invalid/expired/sign-in-required cases, auth-intent resume, acceptance and scope | P; B OAuth UI and invite acceptance mutation excluded. |
| Staff-scan | Business choice, camera permission/torch, manual rewards or pickup code, token preview/confirm, stamp/points/redemption, amounts, duplicate/wrong-business/error, activity/chime and offline queue | P; B camera/haptics/audio/scan and queued mutation replay. |
| Businesses and Business workspace hub | Business search/status/list, role selection, new creation, revoked access, loading/error, section routing | P; B mode/access transitions and native presentation. |
| Workspace profile/contact/hours/location/mobile-location | Branding/color/type pickers; contact; opening intervals/time pickers; service area/address/geocoding/map; scheduled stop draft/publish/remove/discard | P; B edits, location and native picker acceptance. |
| Workspace offerings and ordering | Inventory tools, sections, add/edit/archive/reorder, CSV/JSON import preview, photos, Square menu sync; Stripe/Square connection/onboarding/disconnect; pickup hours, settings and rewards | P; B imports/onboarding/provider writes and final production setup. |
| Workspace appointments | Services/resources/team assignment, price/payment/deposit rules, availability/start intervals, cancellation rules, service editor, appointment detail, refund/cancel/reimbursement confirmations | P; B all writes and transaction side effects excluded. |
| Workspace events/updates/rewards | Event creation/edit/date/time/photos/archive/RSVP counts; follower update composer/detail/send; reward rules/preview/checkout choices and enablement | P; B publishing, notification dispatch, loyalty mutations and promotional compliance. |
| Workspace photos/staff/QR/sharing/review/preview | Image upload/selection/captions/reorder/remove; invite/member/revoke/remove sheets; QR poster/share; readiness errors/submission; customer-view preview | P; B native file/share sheets, mutation and complete moderation operation. |
| Reusable UI surfaces | Date/time/choice/color pickers, sign-in gates, sheet templates, item viewer, pickup scheduler, refund picker, report dialog, request preview and discard confirmations | P; all 145 indexed call sites; B focus/back/keyboard and live display. |
| OS and SDK surfaces | Apple/Google auth, billing purchase/manage/restore, Stripe PaymentSheet, Square browser/callback, photo selector, scanner permission, location permission, notification prompt, maps/share/document picker, OS settings | B; source invocation reviewed but no native execution. |
| Store consoles and public pages | Apple draft/info/privacy/subscription group/all three product records/current US pricing/TestFlight/Business status; Play dashboard/app-content/data-safety/release/bundle/listing/all three subscriptions and base plans/monetization setup; five public policy/help pages | R for observed read-only states; P for optional offer subpages, final asset fidelity and unvisited account/provider/verification settings. |

## Backend and shared-package coverage

| Domain | Cross-references reviewed | Status and limits |
| --- | --- | --- |
| Auth and deletion | Mobile auth/storage/intents, native OAuth, deletion edge function, deletion jobs/ownership SQL, commerce/appointment anonymization, cleanup worker and public deletion guidance | P; no destructive execution, Apple revoke missing, provider retention and live cleanup jobs unverified. |
| Billing | Shared subscription catalog, listing billing/identity helpers/provider, paywall, RevenueCat parser/edge authentication/environment handling, catalog/rollout/event-ordering migrations | P; local regression tests passed; deployed production values and lifecycle unverified. |
| Commerce and appointments | square-commerce dispatcher; routing, security/configuration, Square/Stripe clients/services, checkout rewards, scheduling, order/appointment proofs, payment/refund/support/recovery helpers and relevant RLS/RPC migrations | P; no live provider charges/onboarding; production deliberately unsupported in source. |
| Provider callbacks/webhooks | Square OAuth/webhook/maintenance; Stripe OAuth/webhook/checkout return; signature, URL, encryption, environment and recovery helpers | P; hosted callback registrations, signing secret rotation and production reconciliation unverified. |
| Loyalty and staff | loyalty-token/loyalty-transact, token/preview authorization, offline queue, memberships/invites, reward calculations and SQL access rules | P; no scan transaction replay or live staff invitation acceptance. |
| Media and storage | Upload-intent/finalize/cleanup functions, bounded staging/reservations/preflight/finalization RPCs, bucket/object policies, image-processing configuration and client pipeline | P; real decoding/access/limits covered in source/tests, hosted policies and CDN/cleanup outcomes unverified. |
| UGC and platform moderation | Reports/block tables and client APIs, business approval/moderation-role grants, verified order/event review SQL, public initials, owner replies, web admin reports/customer-review queues | P; prevention/user blocking gaps, live staffing/timeliness and removal/cache behavior unverified. |
| Discovery, events, requests and notifications | Shared types/validation/API client/business logic, public discovery/analytics, event RSVP/reminder counts, dynamic request schema/status rules, notification-dispatch preferences/audience logic | P; no hosted delivery, consent/analytics completion or SQL regression run in this audit. |

All 15 edge-function entry points are represented above and indexed in the JSON. This is an approval-readiness cross-reference, not an assertion of an exhaustive security penetration test. SQL/source that was only indexed remains partially reviewed; deployed migrations/RLS/grants must be checked against the production release.

## Remaining verification and authorization gaps

No gap below is silently considered passed:

1. **Exact production artifacts and configuration:** processed distribution IPA/AAB, signing, entitlements, versions, channels/runtime, bundled environment, deployed production migrations/functions/RLS/storage rules, required-reason report and current SDK signatures. The inspected preview cannot stand in for these.
2. **Every native surface:** the 30 route files, two layouts, all embedded surfaces and OS/SDK dialogs on iOS and Android; supported iPad, small phone, large text, accessibility, light/dark, keyboard/back gestures, restart, poor network and offline states.
3. **Billing:** final native product load and all lifecycle cases in F07; actual Google sandbox purchase acceptance; current RevenueCat/store production connections and restore-account behavior.
4. **Real-world transactions:** provider onboarding/catalog sync, quote/stock/slot changes, duplicate submissions, checkout cancel/fail/pending, paid confirmation, order fulfillment, item/full refunds, appointment deposits/reschedule/cancel, processor disconnection and webhook recovery. Sandbox tests need scoped authorization; any later genuine live transaction requires separate explicit approval and processor-compliant use. Do not use real payment details for Stripe live-mode testing.
5. **Deletion:** safe disposable fixtures and explicit destructive-test authorization; confirm ownership effects, active transaction handling, all dependent records/provider/local keys, revoked Apple authorization, cleanup retries and external support completion.
6. **Permissions and location:** native denied/limited/revoked states, actual merged release permissions, all nearby-alert lifecycle tests, videos/declarations; no location or camera access was granted by this audit.
7. **UGC:** terms enforcement, user blocking, moderation/filter and removal operation, staff response records, merchant/restricted-content boundaries, promotion rules and age answers. No report was sent to a live queue.
8. **Public application hosting and callbacks:** business/event/invite URLs, AASA/assetlinks, auth and payment return, cold/warm navigation. Policy/help pages were verified, but complete application public routing was not.
9. **Store evidence not inspected:** optional subscription offer subpages/future pricing schedules, current RevenueCat dashboard, final screenshot/asset fidelity against the release candidate, final reviewer-account logins, Google account/payment verification, signing/certificates, production eligibility application, and app territories/trader factual assessment. Apple's three main product records, current available US prices and active agreements/bank/tax/DSA statuses were inspected. Google icon/feature graphic presence and empty phone/tablet/desktop/XR screenshot panels were inspected.
10. **Operational tests:** hosted emails only through the approved confirmed plus-alias mailbox, and only after explicit test scope; notification delivery only to authorized test devices/accounts. No external messages were sent in this audit.

The highest priorities are **production functionality and truthful tiers, UGC controls, accessible privacy/accurate data disclosures, Apple deletion/revocation, unnecessary native permissions/background-location scope, and complete reviewer/store setup**. Google closed testing is a separate hard scheduling gate. Proceed with fixes only after the user directs the implementation scope.
