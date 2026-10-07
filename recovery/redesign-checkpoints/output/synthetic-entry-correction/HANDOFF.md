# Synthetic admin entry removal — bounded checkpoint

Completed only the correction requested by Kade. Broader redesign, native export/integration checks, and redesign OTA readiness work are paused until the admin/security OTA finishes. No publication approval is inferred from visual feedback.

The current review gallery at `http://127.0.0.1:4176/header-consistency/dashboard.html` contains 140 views, with the four synthetic-entry cards removed. The main gallery also excludes those four cards from its ready-for-review list; their historical evidence is explicitly archived. Real Admin views remain in both galleries.

## Exact source change

Owned checkout: `C:\Users\Stanj\Documents\Codex\2026-10-05\task-5\consistency`.

- Deleted `apps/web/src/app/admin/demo/page.tsx`, removing the application entry page and its `Open synthetic admin desk` action.
- Removed only the local `About these fixtures` link to `/admin/demo` from `apps/web/src/app/admin/moderation-workspace.tsx`.

The fixture banner remains, so read-only/synthetic test screens retain their honest environment label. All 1,072 other source files are byte-identical to the previous delivered candidate. Native has no synthetic-entry route. Real native Account → Admin, its fresh authorization check, web Account → Admin, web login, and server role checks are unchanged. No fixture, test, library, hook, provider, payment/order contract, SQL migration, or frozen release file was edited.

Current source identity: `c8fdaace793838dec271cda14196b85a818f1b7894c4d5e4fb29e7fff8b07478` (1,073 source files).

The additive [patch](synthetic-entry-removal.patch) is 2,227 bytes, SHA256 `d08d03e639e36306932c05e845023af069b926f77d8bd23a4c2b987ab5a15e15`. Apply only after the exact previous design candidate `76c33ea7ddcf612bfcd8eda9190f9e0923714194acbff1a9a21d4b1d44885212`, using its preserved v1 patch if reconstructing from the approved focused-v2 baseline. This is not a patch for clean `79af559`, the published admin OTA, or a pending security checkout.

Previous design delivery files `output/header-consistency/source-manifest.json` and `parish-pass-consistency-final.patch` are unchanged. The current gallery manifest/dashboard are updated; their original bytes and the two original source files are retained under `before/`. Previous screenshots and checks remain attributable to the previous source, rather than being relabelled as new acceptance evidence.

## Verification and current limits

- Exact additive patch application and reconstruction: PASS (one deletion, one modified file; no commit).
- Whole-source scope/preservation comparison: PASS, 1,072 unchanged files.
- Three headless gallery checks: PASS, desktop/narrow current-gallery filtering/count and main ready-for-review admin list. Current count 140; synthetic-entry count zero. Actual gallery pixels inspected.
- Direct live route response and the 12 admin recaptures: DEFERRED. Existing native `4193` and web `3056` preview services return `ECONNREFUSED`; gallery `4176` returns HTTP 200. They were not restarted under the user's pause. Thus route deletion is source-verified, without a new runtime 404 or production-build claim. Admin captures are labelled as preserved pre-removal evidence.

No native exports, production builds, broader implementation, Docker, staging writes, commit/push, OTA, or frozen-release mutation was performed. Prior v1 full checks remain preserved; they are not repeated acceptance evidence for this correction. Native/installed-device and redesign OTA readiness work remain held at the user's request.

## Minimal handoff to the functional/release owner

The useful local test harness is preserved. Its current bootstrap depends on the removed route:

- `apps/web/src/lib/admin/moderation-server.ts`: development-only `requireAdminPage()` redirects a missing synthetic session to `/admin/demo`.
- `scripts/admin/start-demo.ps1`: directs the tester to `/admin/demo` to create that session.
- `apps/web/src/proxy.ts`: contains the existing `/admin/demo` allowlist entry for login-only preview handling.

Before using the corrected app source with that harness, isolate its entry component/bootstrap inside the local test harness, rather than restoring a shipped app page or relaxing real Admin authorization. A small runner-only overlay in a separate temporary demo checkout can provide the existing guarded `/admin/demo` bootstrap exclusively for the local harness. The removed component is preserved at `before/consistency/apps/web/src/app/admin/demo/page.tsx` for that owner. Retain the loopback-only, development-only, no-Supabase-environment guards and the opaque session check. The owner can remove the dead proxy allowlist entry as part of a separately reviewed support change.

Those support edits were **not** made here. The frozen admin/security release remains untouched; coordinate any eventual integration separately after it finishes. Its current local demo bootstrap cannot be presumed runnable against this corrected checkout until the owner makes the harness adjustment. The task-4 running harness and its fixtures were not altered.

Evidence: [source manifest](source-manifest.json), [patch check](patch-check.json), [verification](verification.json), and [original checkpoint](checkpoint.json).
