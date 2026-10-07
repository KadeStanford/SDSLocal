# Published redesigned mobile OTA — 2026-10-07

Normal preview channel/branch, runtime 0.1.0, staging backend. Group: 2bd5b6d8-1252-4688-968a-1c27aa3cc32c. Runtime source: 3cbd0afd62be54e1e1d2e0d65447ee61bfcc9f5b. Publication was explicitly authorized by the user. See recovery/redesign-release.json for exact IDs, bundle hashes and verification.

Both native production exports passed; 306 app/shared source files per platform matched the frozen source. Normal-preview manifests selected both exact update IDs, and downloaded Hermes bundles matched the frozen SHA-256 hashes and byte lengths. Installed-phone acceptance is not claimed.

The previous security/admin group 16899e45-ef46-427c-870a-009ff22a3caf was integrated with the approved redesign. Scanner/account/admin/auth/moderation/notification contracts were preserved; REVIEW-SOURCE.json records the 11 source deltas and three reviewed merges. No hosted backend/database deployment occurred. The older candidate web/backend folders require separate reconciliation.

Built-in dark support remains through automatic appearance, useTheme/Colors, PageHeader, AppIcon, AppButton, AppTextInput, shared customer/merchant/flow layouts and useAdminStyles. Back-left, branding-next, alerts-right stays consistent. Synthetic/demo admin entry remains removed; real protected Account → Admin remains. Reward-wallet CTA contrast and moderation backup panel/form theme reuse were fixed.

Validation: 83/94 test files passed; all 1,020 executed tests passed; 11 files failed to initialize on native Flow/Expo bindings. Focused security/UI: six files, 53 tests passed. Typecheck remains failing with 258 diagnostics. These unresolved checks and installed-device acceptance are follow-up work, not successful validation claims.

Review: 34 routes, 77 state/viewport pairs; 12 captured light/dark views, 0 recorded blocked, 142 uncaptured. Six matched pages: discovery, business details, Account, rewards, order status, alerts. Actual RN Web components and isolated fixtures are separate from the native entry point. Older captures predate the two small theme fixes; rebuilt scrollable previews include them. Native camera/gestures, keyboard/safe areas/status bars and provider payments still need device checks.

Active source: F:\BusinessApp\.codex-tmp\parish-pass-dark-review. Dashboard: http://localhost:4207/dashboard.html (node review/serve.cjs only if its one server is absent). Metro is separate; read AGENTS.md and docs/metro-lan-only.md first. Continue with NEXT-AGENT-PROMPT.md. Do not republish without a new user request.
