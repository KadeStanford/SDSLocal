# Prompt for the next BusinessApp agent

You are continuing Parish Pass in F:\BusinessApp on Windows. This is an existing React Native/Expo mobile app with a Next.js web app and hosted Supabase backend. Continue the task I give you; do not start a redesign from scratch or publish/deploy anything unless my new request authorizes it.

First run one harmless command to confirm commands work. Read AGENTS.md, applicable nested AGENTS.md files, and relevant local skills. If a command fails, report the actual error; do not repeatedly retry or change security settings. Inspect Git status before editing and preserve other people's uncommitted work. Use the installed Windows Git at C:\Program Files\Git\cmd\git.exe if PATH Git reports MSYS errors.

## Saved branches and source locations

Repository: https://github.com/KadeStanford/SDSLocal (public; never commit secrets).

- codex/current-2026-10-07: emergency snapshot of the original F:\BusinessApp checkout, including its previously uncommitted source. It is based on the existing remote main rather than publishing unchecked local historical commits. Original local history is preserved in the private repository-before.bundle.
- codex/current-preview-2026-10-07: the 500 verified frozen mobile source files for the latest published security/admin preview OTA, over the emergency monorepo snapshot. recovery/ contains a source manifest, release identifiers, all 15 deployed Supabase Edge Function source bundles, and the newer backend cutover source. Other web/backend runtime files are retained local source, not a guarantee they match every deployed service.
- codex/current-redesign-2026-10-07: the recovered approved mobile redesign, integrated with the later published mobile security/admin changes, plus the local RN Web review dashboard and handoff files. This is a saved candidate awaiting release acceptance, not a published redesign OTA.

The root checkout is F:\BusinessApp. The active redesign checkout is F:\BusinessApp\.codex-tmp\parish-pass-dark-review. The published-source recovery checkout is F:\BusinessApp\.codex-tmp\parish-pass-current-preview. The two recovery checkouts are independent Git repositories associated with this project, not Git worktrees. Inspect their own Git status and branch. They live on F:, outside Codex's installation/user-data directory. If these checkouts are missing after a reset, restore the named branches from GitHub into clearly named separate directories; do not overwrite the root checkout.

## Published release that must be preserved

Normal Expo preview uses runtime 0.1.0 and update group 16899e45-ef46-427c-870a-009ff22a3caf. EAS project ID: 2406d47e-390c-4a39-932c-325b2ec5ab99. Supabase staging project: lgddhdexvwclfrnzjtly. The redesign has not replaced that live OTA.

The old receipt actually lived at C:\Users\Stanj\Documents\Codex\2026-10-05\task-4\.combined-admin-publication-v2\release-receipt.json. A verified copy and all 500 source files now live in F:\BusinessApp\EmergencyBackup\2026-10-07\published-preview-source. Preserve scanner account/business/version guards, server-verified admin access, auth/session behavior, moderation privacy and decisions, notification contracts, commerce contracts, and backend RPC signatures. Do not overwrite newer runtime/backend changes with older redesign source. Never deploy web/backend folders from the candidate merely because its mobile UI is being released; web/security reconciliation remains a separate release check.

## Redesign status and review

Recovered candidate: task-5 consistency, 1,073 source files after the synthetic admin removal. All seven requested checkpoint files and the original patch are preserved under EmergencyBackup\2026-10-07\redesign-checkpoints and in the redesign branch's recovery/redesign-checkpoints. The earlier header manifest describes the pre-removal checkpoint; the synthetic-entry correction is the later authority. Apply the old patch only to its exact declared base, not blindly to main or the current release.

Built-in dark mode exists: app.config.ts uses userInterfaceStyle automatic, and useTheme selects shared light/dark Colors. Preserve the approved Back-left, Parish Pass-brand-next, Alerts-right subpage header. Reuse PageHeader and the existing customer, merchant, flow, admin, button, input, and icon components. Preserve the removal of the synthetic/demo entry from the redesign route/sidebar/gallery; keep real role-protected Account → Admin access. Fixtures belong only in review/tests.

The working dashboard is http://localhost:4207/dashboard.html. File: F:\BusinessApp\.codex-tmp\parish-pass-dark-review\review\offline\dashboard.html. One static Node server serves it: node F:\BusinessApp\.codex-tmp\parish-pass-dark-review\review\serve.cjs. Check whether port 4207 already has this server before starting another. Use HTTP, not a file:// link. Start background helpers hidden. This server is a browser review server, not Metro.

Review contains actual React Native components rendered through RN Web, real branding/icons, isolated matching fixtures, light/dark controls, and scrollable previews. Captures cover six matched pages (12 theme views): discovery, business details, Account, rewards, order status, and alerts. Coverage ledger has 34 routes and 77 state/viewport pairs: 12 captured views, 0 recorded blocked views, 142 uncaptured views. Uncaptured does not mean verified. Native iPhone/camera/status-bar/gesture/payment checks are still pending. Verify images and fonts before new captures. Preserve source identity in evidence; older screenshots predate the last two theme fixes.

Theme fixes made in this continuation: reward-wallet label/chevron use onAccent on the dark mint CTA; the published moderation backup panel and form now use the existing useAdminStyles theme hook. No functionality was intentionally changed. The browser bundle was rebuilt successfully; it is not a native OTA export. Review adapters intentionally stub native/hosted effects and are never an OTA entry point.

## Validation and OTA gate

Read the redesign checkout's OTA-PREPARATION.md and review/evidence. Full mobile run: 81 of 94 suites passed; 1,018 tests passed and two assertions failed; eleven suites failed to initialize because the review test mocks do not yet cover new native icon imports. One failed assertion was a stale frozen admin contract hash; its test has since been copied from the published source and passed. The remaining assertion expects the old pressed opacity instead of the approved shared button's current style. Investigate and update a test only after checking its intended behavior.

Follow-up focused run passed all 53 tests in six suites covering admin access/decisions, scanner session guards, profile security, shared UI, redesign refinements, and rendered visual fixtures. Candidate typecheck still fails (242 diagnostics), and the original root checkout also fails with installed dependency/type resolution errors including missing expo/config exports and Supabase auth types. Do not describe the candidate as passing typecheck or ready to publish. Repair/reinstall dependencies from the committed lockfile safely, rerun the project's normal typechecks/tests, then perform a genuine native export and release checks before asking for final OTA approval. Existing root/mobile dependency junctions point to F:\BusinessApp's installed dependencies; review scripts currently contain machine-specific F: paths.

Do not publish a redesign OTA until I explicitly approve publication. Stage/preparation means preserving the candidate and documenting the gate. Use the ordinary preview channel/runtime only after validating compatibility and preserving the exact newer security/admin behavior. Expo, Supabase, and GitHub plugins were connected; use their available tools for read-only release/schema/source verification. Do not assume CLI sessions survive a Codex reinstall.

## Private backup and safety

Private backup folder: F:\BusinessApp\EmergencyBackup\2026-10-07. It is Git-ignored and must never be pushed to this public repository. It contains original Git history, byte-preserved current source, frozen published source, redesign checkpoints, private configuration copies, and read-only Supabase schema/migration inventory. Two broad ZIP attempts are partial and are not the authoritative backup; use the verified source folders and Git bundles.

I stopped the optional Supabase data export because resetting Codex does not erase hosted Supabase. No completed database/application-data backup exists. I authorized no auth account/password/session/MFA/OAuth backup. The schema inventory is recovery reference material, not a tested pg_dump restore. Do not claim a full database/media backup. No staging/database changes were made by this backup task. Supabase and Expo are remote services and remain intact if only Codex is removed.

Keep .env files, tokens, service-role keys, provider credentials, private receipts and database material outside GitHub. Before any new commit, inspect staged paths and scan new content for known local secret values, private keys, PATs, credential URLs and private JWTs. Do not print secret values. Check tracked and nonignored untracked files in every relevant checkout, not just the root's status.

No Docker, paid services, unnecessary Node server fleet, staging/database mutations, or OTA publication were authorized for this recovery task. AGENTS.md requires reading docs/metro-lan-only.md before any Metro operation. Metro phone manifests must advertise the active LAN IPv4, never localhost/127.0.0.1; follow scripts/start-local.ps1. The user's no-Docker requirement takes precedence if the normal startup script requires Docker: explain the concrete conflict before taking an incompatible action. Hosted email tests must obey AGENTS.md: never use fabricated recipients; intentional staging deliveries only to kade20413+<unique-test-alias>@gmail.com unless I authorize another destination.

Continue my next requested task from this saved state. Give concise updates, preserve progress, and be honest about what is rendered, tested, published or still pending.
