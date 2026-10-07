# Prompt for the next BusinessApp agent

You are continuing Parish Pass in F:\BusinessApp on Windows: an existing React Native/Expo mobile app, Next.js web app, and hosted Supabase backend. Continue the task I give you. Preserve the approved redesign, functionality, security/admin behavior, and other people's work. Do not start from scratch.

First run one harmless command, read AGENTS.md and applicable nested instructions/skills, and inspect Git status before editing. Report command failures accurately; do not repeatedly retry or change security settings. Windows Git is C:\Program Files\Git\cmd\git.exe if PATH Git reports MSYS issues.

## Saved source and GitHub

Public repository: https://github.com/KadeStanford/SDSLocal. Never commit secrets.

- codex/current-2026-10-07: original F:\BusinessApp source snapshot including the previously uncommitted work. This is a recovery snapshot, not necessarily the latest mobile release. Original unchecked local history is retained privately in repository-before.bundle.
- codex/current-preview-2026-10-07: 500 byte-verified mobile/shared files from the earlier security/admin preview release over the root snapshot. Preserve this baseline. recovery/latest-redesign-release.json points to the newer redesign release.
- codex/current-redesign-2026-10-07: active approved redesign integrated with the later security/admin changes, now published on normal preview, plus review fixtures, validation evidence, and receipts. Use this branch for continuing mobile redesign work.

Root checkout: F:\BusinessApp. Active mobile redesign source: F:\BusinessApp\.codex-tmp\parish-pass-dark-review. Earlier preview source checkout: F:\BusinessApp\.codex-tmp\parish-pass-current-preview. The two nested source checkouts are independent Git repositories, not Git worktrees; inspect their own branches/status. They live on F:, outside Codex user data. If lost, clone each named branch into a separate directory without overwriting root changes. The root app source was not replaced with the redesign.

## Live OTA and security baseline

The redesigned mobile OTA was published on 2026-10-07 to normal Expo channel/branch preview, runtime 0.1.0, using the preview EAS environment and staging backend. Group: 2bd5b6d8-1252-4688-968a-1c27aa3cc32c. Android update: 01a11853-e553-7212-b782-91d4b899ea6a. iOS update: 01a11853-e553-7d5d-a104-670ae0939b0f. EAS project: 2406d47e-390c-4a39-932c-325b2ec5ab99. Supabase staging project: lgddhdexvwclfrnzjtly.

Published runtime source commit: 3cbd0afd62be54e1e1d2e0d65447ee61bfcc9f5b on codex/current-redesign-2026-10-07. Final branch commits also include documentation and test-harness changes after export. Read recovery/redesign-release.json and OTA-PREPARATION.md. Both normal-preview manifests selected these exact update IDs, and downloaded native Hermes bundles matched the frozen hashes. Source maps matched 306 app/shared files per platform. Actual installed-phone acceptance has not been performed. Do not republish an update merely because this task previously authorized it; my next request must authorize a new publication.

The new OTA incorporates the security/admin baseline group 16899e45-ef46-427c-870a-009ff22a3caf, whose 500 source hashes were verified. Preserve scanner account/business/version guards, verified admin access, auth/session behavior, moderation privacy/decisions, notifications, commerce contracts, and backend RPC signatures. REVIEW-SOURCE.json records 11 runtime deltas and three reviewed merge resolutions. The original receipt and frozen source are preserved privately under EmergencyBackup\2026-10-07\published-preview-source.

Inspected source for all 15 deployed Edge Functions (130 references, 46 unique TypeScript files) and seven security/admin SQL migrations is in recovery/checked-hosted-source in both nested branches. This archive contains code/schema definitions and a manifest, not credentials or database rows. Raw hosted receipts, schema inventory and newer admin web source remain in the private backup. Candidate web/backend runtime folders are not certified to match the deployed services; reconcile them separately before any web/backend deployment. No backend/database changes were made by this recovery/publication task.

## Redesign and dark mode

The recovered task-5 consistency candidate has 1,073 source files after synthetic-admin removal. Seven requested handoff/manifest/patch checkpoints survived and were preserved. Earlier header manifest predates the removal; the synthetic-entry correction is authoritative. Do not blindly apply the old patch to another base.

Built-in dark mode exists through automatic appearance, useTheme and shared Colors. Reuse PageHeader, customer/merchant/flow/admin layouts, AppButton, AppTextInput, AppIcon and useAdminStyles. Subpages keep Back top-left, Parish Pass branding beside it, and Alerts on the right. Keep the synthetic/demo admin entry removed from route/sidebar/gallery. Keep real role-protected Account → Admin access. Fixtures stay in review/tests only.

Continuation fixes: reward-wallet CTA label/chevron use onAccent for the dark mint button; moderation backup panel/form reuse useAdminStyles. apps/mobile/metro.config.js resolves six @sds packages from this checkout's source so dependency junctions cannot silently bundle the older root packages. Native source-map checks confirmed this worked. Native camera/gestures, system status bars, keyboard/safe areas and provider payment UI remain device-check exceptions.

Working dashboard: http://localhost:4207/dashboard.html. File: F:\BusinessApp\.codex-tmp\parish-pass-dark-review\review\offline\dashboard.html. One static server: node F:\BusinessApp\.codex-tmp\parish-pass-dark-review\review\serve.cjs. Check port 4207 before starting another; start background helpers hidden. Use HTTP, not file://. This browser review server is separate from Metro.

It renders actual React Native components through RN Web with real icons/branding and matching isolated fixtures, separate light/dark views, and scrollable previews. Six matched pages have 12 captures: discovery, business details, Account, rewards, order status, alerts. Coverage is 34 routes / 77 state-viewport pairs: 12 captured, 0 recorded blocked, 142 uncaptured. Uncaptured means unverified, not passed. Older captures predate the two theme fixes; rebuilt scrollable previews include them. Check images/fonts before captures. Review adapters are not in the OTA entry point. The user narrowed the immediate request to confirming built-in dark support and publishing; exhaustive page-state visual review remains unfinished.

## Validation and remaining work

Actual iOS and Android production exports passed, source/asset hashes were frozen, and the published downloads matched. Relevant focused tests: six files, 53 tests passed (admin/scanner/profile/security/shared UI/redesign fixtures). Latest full mobile run: 83 of 94 test files passed; all 1,020 executed tests passed; 11 files could not initialize (React Native Flow imports and Expo EventEmitter bindings). Typecheck still fails with 258 diagnostics, including installed Expo/Supabase/type-resolution issues; the original root also fails. This is not a clean full test/typecheck result. Preserve review/evidence and fix the dependency/test harness safely when requested. Installed-device review and the remaining 142 capture views are still unfinished.

The active checkout currently shares installed dependencies through ignored node_modules junctions to F:\BusinessApp. Reinstall using the committed pnpm lockfile after moving/cloning; do not trust copied dependency caches. Some review scripts have machine-specific F: paths. Never use review/runner as the shipped entry point. No new native dependency/runtime change was introduced by this OTA.

## Emergency recovery and safety

Private authoritative backup: F:\BusinessApp\EmergencyBackup\2026-10-07 (Git-ignored). Keep F:\BusinessApp when wiping Codex. It contains original source/history, verified frozen source, all recovered checkpoints, private configuration, read-only schema/migration inventory, final Git bundles, native exports, and release/download verification receipts. Two broad ZIP attempts are partial; use verified folders and final bundles. Verify bundles before restoring into a fresh directory.

The optional Supabase data export was cancelled at my request: resetting Codex does not erase hosted Supabase. No completed database/application-data dump exists. No auth accounts/password/session/MFA/OAuth rows were exported. Schema inventory is reference material, not a tested pg_dump restore. Supabase and Expo remain hosted when only Codex is removed. Reconnect plugin/CLI accounts after reinstall if needed; credentials are never in GitHub.

Scan all tracked and nonignored untracked files before commits; inspect staged paths. Keep .env files, tokens, service-role/provider keys, private receipts and database material outside the public repo. Check all three repositories, not just root. Code/receipts are on GitHub; private configuration and backup artifacts intentionally remain local and ignored.

No Docker, paid services, server fleet, or staging/database changes were authorized. AGENTS.md requires reading docs/metro-lan-only.md before any Metro operation. Phone manifests must advertise active LAN IPv4, never localhost/127.0.0.1; use scripts/start-local.ps1 where compatible. The no-Docker instruction takes precedence over a Docker-dependent startup workflow. Hosted email tests must obey AGENTS.md: no fabricated recipients; intentional staging deliveries only to kade20413+<unique-test-alias>@gmail.com unless I authorize otherwise.

Continue my next requested task from this state, with concise updates and honest distinctions between saved, rendered, tested, published and unverified work.
