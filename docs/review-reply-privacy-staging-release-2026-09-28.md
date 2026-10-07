# Review reply fix and Privacy & Safety refinement — staging

## Review reply fix

The screenshot showed a retained draft after `merchant_review_reply` failed through the Square commerce Edge endpoint. Review reads already used an owner-only database RPC. Reply saves now use `reply_to_business_review`, independent of payment-provider setup. Staging Edge configuration was inspected (`ACTIVE`, version 46, `verify_jwt=false`); the exact earlier Edge failure was not isolated and is not claimed as a gateway configuration defect.

The new authenticated RPC checks active owner membership, exact business/review/source, published moderation state and 3–1,500 trimmed characters. It locks the review and atomically updates the public response, actor/time and audit record. An identical retry returns the confirmed response without another audit event. Anonymous execution is revoked; no private table grants are widened. The client checks exact response identity, source, text and timestamp before clearing a draft or claiming success. Failed saves retain the draft and require status refresh before retry.

Migration `20260929000500_owner_review_replies` is deployed to project `lgddhdexvwclfrnzjtly`. Post-deployment rolled-back tests verify order/event saves and audit records, identical retry, wrong-business and hidden-review rejection, invalid source/blank/oversized validation, and denial of staff, inactive owners, nonowners and guests. An actual authenticated database-role call passes. Live REST resolves the endpoint and rejects anonymous requests with HTTP 401 / SQLSTATE 42501. No test replies, event fixtures, memberships or email deliveries persist. Signed-in device acceptance remains pending.

## Privacy & Safety

Blocked businesses use a concise heading, compact wrapping rows, actual counts and shared semantic controls. Failed/unknown reads do not imply an empty list. Retry preserves a previously loaded list. Null business joins remain addressable as Unavailable business so their block can still be removed. Account changes remount private state; obsolete results are ignored. Ref guards serialize immediate read/write taps. Thrown read/unblock failures recover, and a successful unblock stays successful when recommendations refresh fails; its refresh action does not repeat the mutation.

## Verification and acceptance

Mobile TypeScript and 58 checks across four files pass. Five actual Privacy controller checks cover failed/invalid reads, duplicate taps, unavailable businesses, saved-unblock/refresh separation and abandoned/account-scoped state. Two actual review-screen checks cover draft recovery/status refresh and confirmed save; ten reply-client checks cover exact RPC arguments, validation and rejected/mismatched confirmations. Shared controls regressions remain included. Controller and rendered checks do not establish native geometry or live signed-in REST/device acceptance.

Phone checks remain required: post/update an order review response and event review response, verify public visibility and owner filters, failure/retry with retained draft, Privacy unblock/recommendations, both themes, enlarged text and narrow width. The complete app-wide redesign remains active. Account deletion presentation, hours controls and QR utility actions remain implementation work.

## Published Preview verification

- Group `b921f98e-0f3a-47bf-a7c0-494df6328f1b`, source `b5ed6e9c0df233d65cc33c8cdaa2d981d2eb8682`.
- Android update `01a0eb04-4cbd-704a-ba72-028f2b4debb3`.
- iOS update `01a0eb04-4cbd-7609-a7bf-ecfac9bd0c45`.
- Both native bundles exported from a stable source snapshot preserving concurrent subscription work. Fresh channel state matches exact published IDs/source, Preview branch/environment, staging configuration and runtime `0.1.0`.
- Resolved Expo native configuration matches the prior invitation release exactly. Native fingerprint hashes changed: Expo CLI comparisons for each platform identify only `file:eas.json`. Parsed old/new EAS files confirm the sole edit is the new `preview-store` profile; the existing Preview build profile/configuration are identical. This evidence establishes the inspected configuration relationship, not device acceptance.
- Listing billing readback remains disabled. No subscription backend migration, credential, provider connection or activation was changed by this UI release.
- The user authorized coordination with “Plan business subscription tiers.” That chat was read and sent the exact group/source, preservation requirements, division of ownership and fingerprint evidence. Store/subscription work stays in that chat; combined source snapshots and Preview publication must preserve both sets of work.
- All review-reply database tests rolled back. The user's next signed-in device reply/public display test is still required.
