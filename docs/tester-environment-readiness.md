# Parish Pass tester environment

Updated October 1, 2026. This is a production-like sandbox release candidate, not a public launch. Backend fixes are deployed to staging. Compatible mobile fixes are published on the existing preview OTA channel for iOS and Android. The dedicated tester native build has not been distributed.

## Environment contract

| Boundary | Tester setting |
| --- | --- |
| Backend | `lgddhdexvwclfrnzjtly`, existing staging project |
| App configuration | `EXPO_PUBLIC_APP_ENV=staging` with EAS `preview` environment |
| Native build profile | `tester-store`, store distribution, Android AAB |
| Update channel | `testers`; separate from `preview` and `production` |
| Runtime compatibility | Fingerprint policy; new native dependencies require a matching native build |
| Payments and subscriptions | Sandbox/test mode only; production billing remains disabled |
| Business feature enforcement | Enabled for explicitly enrolled sandbox accounts |
| Business plan grants | Actual sandbox purchase/restore lifecycle; enrollment does not grant a plan |
| Public policy/support pages | Existing `parish-pass--policies.expo.app` pages; all four returned HTTP 200 |
| Audience for the first acceptance run | App owner and invited consenting testers; broader/teen rollout remains subject to the privacy and moderation work |

The bundle/package identifier remains the registered application identifier so existing store subscription configuration can be used. This build replaces another build of the same app on a device; it is not a second side-by-side app. The `testers` channel becomes useful only after a native build carrying that channel is installed. An OTA to the existing preview build cannot change its embedded channel or native capabilities.

## Verified in this work

- Staging feature enforcement, private RPC restrictions, and moderation result-contract migrations deployed and checked.
- Existing rewards remain visible and redeemable after billing suspension. New benefits remain gated; moderation suspension is not bypassed.
- Existing paid pickup handoff can award its promised reward, with its order linkage recorded at insertion for settlement/refund handling.
- Existing appointment rescheduling, cancellation, and deposit refund paths pass the expired-business SQL fixture.
- Four staging regression suites pass with rollback-only fixtures. Full isolated local SQL suite passes 36/36; the new private helper also passes the updated access-control test.
- Checkout integration passed against real isolated Supabase with simulated Square transport: duplicate/concurrent checkout, replay, guest isolation, refunds, slot capacity, expiration, and disconnect. This is not evidence of a real provider transaction.
- Mobile owner/staff upgrade messages and access refresh logic implemented. Existing obligations and payment disconnect remain accessible. Targeted mobile tests and TypeScript pass.
- Tester config preflight passes using actual EAS preview variables; 14 unsafe/missing configuration variants are rejected.

See `audits/store-readiness-implementation/tester-readiness.json` and `staging-database-release.json` for receipts. Earlier audit findings remain open unless supported by new evidence.

## Before building the tester candidate

Run from `apps/mobile`:

```powershell
node ../../node_modules/eas-cli/bin/run env:exec preview 'node ../../scripts/verify-tester-build.cjs' --non-interactive
node ../../node_modules/typescript/bin/tsc --noEmit
```

Run config regression checks from the repository root:

```powershell
node scripts/verify-tester-build.cjs --test
```

Freeze a release manifest containing the exact source revision plus hashes of all included uncommitted/untracked app files, test results, backend receipt, build IDs, and runtime fingerprints. This repository currently has substantial uncommitted work; a Git SHA alone does not identify the candidate. Do not silently omit pending source files.

Next native build commands, once the candidate is frozen:

```powershell
node ../../node_modules/eas-cli/bin/run build --profile tester-store --platform ios
node ../../node_modules/eas-cli/bin/run build --profile tester-store --platform android
```

The compatible mobile fixes were published to the existing preview OTA channel. Dedicated tester builds, store submission, and tester invitations have not been performed. Verify signing, Apple/Google access, and store sandbox subscription products before distribution. The release candidate must launch without Metro or a developer computer.

For any later tester OTA, use the `preview` environment **and** `EXPO_PUBLIC_TESTER_BUILD=true`, the same public URLs, and the `testers` channel. Build-profile variables are not automatically inherited by `eas update`. Verify the computed fingerprint matches the installed tester build and record the update group; never publish this candidate to `production`.

## Enroll real tester accounts

Have testers create their own accounts and confirm their email. Do not share seed-account passwords or manufacture email addresses. Use the authenticated user's UUID, not a guessed email, to enroll or remove sandbox access:

```powershell
node scripts/staging-playground/tester-access.cjs --check <confirmed-user-uuid>
node scripts/staging-playground/tester-access.cjs --enable <confirmed-user-uuid>
node scripts/staging-playground/tester-access.cjs --disable <confirmed-user-uuid>
```

The operator script requires the existing staging credentials and project/billing safety guards. It sends no email and grants no subscription. Enroll each business payer being tested, including one with no plan and others exercising Basic/Growth/Pro purchases. Use separate owner, staff, and customer accounts to test permissions. Keep fictional merchants visibly identifiable as test data and tell testers no real goods/services will be fulfilled.

## Required acceptance before outside distribution

| Area | Acceptance evidence still needed |
| --- | --- |
| Native install/update | Fresh install on real iPhone and Android; cold start offline/online; update then restart; matching-runtime rollback; no Metro dependency |
| Identity | Real sign-up, verification, sign-in/out, password recovery, Apple/Google flows, second-device session, account deletion and provider cleanup |
| Subscriptions | Store sandbox purchase, cancellation, restore, expiration and plan change; payer versus staff access; failed/network-interrupted purchase; RevenueCat delivery/replay |
| Commerce | Sandbox merchant connection, payment, interrupted checkout, fulfillment, cancellation, partial/full refund, webhook retry; test both supported payment rails |
| Permissions | Camera, photos, location and notifications allowed/denied/revoked; fresh install; push arrival on a locked device |
| Customer paths | Search, business details, events/date navigation, RSVP, rewards scan/redemption, pickup, service requests, bookings and changes |
| Business paths | Profile/catalog/category/photo editing, events, request handling, staff roles, scanning, appointments, order handling, plans and disconnect |
| Accessibility | Large text, screen reader names/order, keyboard, contrast, touch targets, modal dismissal and both themes |
| Privacy/moderation | Resolve the open UGC acceptance, abusive-user controls, triage/notification destination, retention/provider deletion and youth-audience disclosures; establish owner response procedure |
| Operations | Confirm scheduler/webhook health, error visibility, support inbox ownership, backup/restore procedure, tester-data cleanup, and named release rollback operator |

Record device/OS, native build number, runtime/update IDs, account role, expected and actual behavior, screenshot and reproduction steps for every failure. Real auth or delivery acceptance must use legitimate consenting recipients; operator-triggered hosted email tests are limited to the approved `kade20413+<unique-test-alias>@gmail.com` mailbox.

No Google volunteer cohort exists yet. Recruit genuine participants and verify the requirements shown in this app's Play Console before scheduling a production-access attempt. Do not equate internal testing, automated fixtures, or fabricated users with storefront eligibility.

## Release and recovery policy

The first milestone is an owner-tested native sandbox build. The second is a small invited tester cohort after the acceptance blockers above are resolved. Public launch is a separate decision; payment production enablement and store submission are not implied by sandbox success.

Keep the last known-good tester update/build and backend receipts. If a release fails, stop expansion, republish the prior compatible update or rebuild as appropriate, and preserve existing-order recovery. Database changes require a reviewed forward fix or restoration procedure; do not reset a shared database or toggle enforcement off casually to hide a defect.

The last full application SQL lint had zero errors and 12 warnings: eight unused variables and four implicit empty-array/JSON literal casts. These did not block the verified staging deployment. They remain cleanup work; this report does not claim they were fixed.

## Mobile staging release — October 1, 2026

[Verified OTA update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/2217fdae-1e17-48ad-9ff7-2a895a867b46) · preview channel · staging backend · iOS and Android · runtime 0.1.0. Both published bundle hashes match the verified exports. No native configuration changes are activated by this update.
