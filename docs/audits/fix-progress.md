# SDSLocal audit fix progress

## F07 — loyalty preview authorization

- Status: implemented and independently verified on 21 September 2026, including handler-level coverage.
- Worker: `luna_worker` configuration; spawned worker/thread `01a0c6e2-5bf0-7c73-b4cf-0ba51e388dd7` (`Ptolemy`).
- Configured model: `gpt-5.6-luna`, reasoning effort `high`, sandbox `workspace-write`.
- Runtime model evidence: the spawn request explicitly supplied `gpt-5.6-luna` and `high`; the worker completion payload did not expose separate resolved-model telemetry.
- Root cause: `loyalty-transact` checked business membership only when the optional `expectedBusinessId` was supplied. An authenticated caller with a valid short-lived customer QR could omit that field and receive customer preview data.
- Implementation: authorization now runs after token verification against the signed token's `claims.businessId` and before membership, rewards, business, or profile reads. `expectedBusinessId` remains a consistency check. Existing active owner/staff membership rules and reconcile authorization are preserved.
- Changed files:
  - `supabase/functions/loyalty-transact/index.ts`
  - `supabase/functions/loyalty-transact/index.test.ts`
  - `supabase/functions/_shared/loyalty-preview-authorization.ts`
  - `supabase/functions/_shared/loyalty-preview-authorization.test.ts`
- Regression coverage: pure-policy cases for omitted/mismatched expected business IDs, unrelated caller/customer, staff from another business, inactive staff, unsupported manager role, active staff, active owner, and token-owner behavior requiring an existing authorized staff membership; plus handler-level cases invoking the real request handler for omitted-ID nonstaff denial before protected-data queries, authorized preview success, and conflicting-ID rejection without profile/business exposure.
- Verification performed:
  - Focused handler and policy Vitest: 12 passed.
  - `pnpm.cmd typecheck`: 8/8 packages passed.
  - `pnpm.cmd test`: 429 tests passed.
  - Prettier check on changed files and `git diff --check`: passed.
- Limitations: handler tests use real token signing/verification and real authorization logic, with Supabase auth/database mocked at the client boundary. No live Supabase Edge Function request, PostgreSQL/RLS execution, or iOS/Android device test was run. Deno is not installed locally, so official Edge Function typecheck remains pending; a temporary shim surfaced an existing narrowing diagnostic at `index.ts:379`. Hosted integration verification remains pending. No other audit finding was started.

## F01 — account-switching billing identity race

- Status: implemented, independently reviewed, and published as a verified staging OTA on 21 September 2026.
- Worker: `luna_worker` configuration; spawned worker/thread `01a0c6fb-67e7-7b02-aec2-5a21ee2cfd41` (`Linnaeus`).
- Configured/runtime launch: explicit `gpt-5.6-luna`, reasoning effort `high`; the worker completion payload did not expose separate resolved-model telemetry.
- Root cause: delayed initialization could continue into RevenueCat `configure`/`logIn` after an account switch; sign-out cleared React state without explicitly logging out of the SDK; subscription summary state was not tagged to the current account.
- Implementation: serialized native billing identity transitions with a generation-aware coordinator; stale continuations cannot make SDK calls or commit state; sign-out calls the SDK logout path; summary state is bound to the current user; purchase, restore, and manage are gated until the SDK identity and summary agree. Existing purchase, restore, cross-store, and deferred-downgrade behavior was preserved.
- Changed files:
  - `apps/mobile/src/providers/listing-billing-provider.tsx`
  - `apps/mobile/src/lib/listing-billing-identity.ts`
  - `apps/mobile/src/lib/listing-billing-identity.test.ts`
- Deterministic regression coverage: delayed A/B completion, pending sign-out, rapid A/B/A switching with serialized native calls, and purchase rejection during identity transition.
- Verification performed:
  - Focused provider-isolation, discovery/business-page parity, settings-persistence, and checkout-readiness matrix: 10 files, 133 passed.
  - `pnpm.cmd test` from `apps/mobile`: 32 files, 433 passed.
  - `pnpm.cmd typecheck` from `apps/mobile`: passed.
  - Root `pnpm.cmd typecheck`: 8/8 packages passed.
  - Root `pnpm.cmd test`: passed; mobile contributed 433 passed.
  - Changed-file ESLint, Prettier, and `git diff --check`: passed.
  - Root lint/format remain non-clean only for unrelated baseline files: two existing mobile lint errors plus one warning, and four unrelated formatting files including the intentionally unchanged audit copy.
- Hosted staging verification: Supabase dashboard reported Healthy; read-only SQL showed PostgreSQL 17.6, latest migration `20260921080606`, one `get_my_listing_billing` function, and no `get_business_listing_status` function. The deployed `loyalty-transact` function showed 11 deployments, last updated two days ago, and zero invocations since its last deploy. No hosted data, migrations, functions, or secrets were changed. The local F07 backend changes remain distinct from hosted deployment state.
- OTA publication:
  - Branch: `staging`; runtime: `0.1.0`.
  - Message: `Verified listing billing identity isolation for account switching and sign-out`.
  - Update group: `932f8c06-389e-4e64-836f-fc3d6df4dc69`.
  - Android update: `01a0c710-7db3-7fed-8e68-473bfc19bf8f`.
  - iOS update: `01a0c710-7db3-7855-b722-052468ff5203`.
  - Dashboard: https://expo.dev/accounts/kadestanford/projects/sds-local/updates/932f8c06-389e-4e64-836f-fc3d6df4dc69
- Remaining limitations: SDK tests use a mocked RevenueCat seam; no physical iOS/Android device, App Store, or Google Play transaction was exercised. The OTA was published only after the local proof and read-only hosted-state checks above. No other audit finding was started.
