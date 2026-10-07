# Staff invitation and sign-in callback refinement

## Implementation

Staff invitations now use the shared app canvas, semantic notice colors, a bounded 480-point content column, one task panel and a top arrow back pill. Guest sign-in keeps the invite attached; accepted invitations show the server-provided business and Staff role. Loading pauses local navigation. The sign-in callback retains its authentication flow and uses a scrollable bounded error layout, semantic error surface and top back pill.

Invitation acceptance runs once automatically after authentication resolves. Rejected/thrown requests stop with an explicit Retry invitation action. Immediate duplicate retries are serialized. Successful acceptance is retained if the business-access refresh fails or returns false; Refresh business access retries that read without accepting again. Account/token changes remount private state; abandoned results cannot update the screen or refresh access. The existing authenticated RPC remains authoritative. No hosted invitation, email or acceptance mutation was triggered during verification.

## Verification and limits

Mobile TypeScript passes. Five actual-screen controller regressions exercise failed-request retry limits, duplicate taps, exact token and workspace navigation, false access refresh, late abandoned results, guest intent preservation, scope keys and malformed responses. Together with shared merchant UI regressions, 46 checks pass. The hook harness covers controller behavior; it does not establish native geometry, gesture or server integration acceptance.

Native acceptance remains required for real invitation sign-in/acceptance, business workspace access, invalid/expired links, both themes, enlarged text, narrow widths and safe areas. Full app-wide redesign completion remains unproven.

## Remaining utility review — current source

Staff invitation and sign-in callback presentation are implemented in this pass. The current source review identifies the next concrete utility work:

- `BlockedBusinessesPanel`: replace local accent controls with shared task rows/actions; separate failed/unknown reads from a real empty list, provide Retry, scope private rows by account and recover thrown reads/unblock calls.
- `AccountDataPanel`: semantic error/destructive/warning colors in both themes; preserve impact review, typed DELETE gate, final confirmation and store-subscription warning. Existing fixed pale error surfaces need replacement. No account deletion is required for presentation verification.
- `HoursEditor`: adapt day/time controls to narrow widths and large text; retain day switches/native picker/schedule semantics and save/dirty guards. Saving should pause switches and picker changes.
- `BusinessQrPoster`: shared actions with accessible busy/disabled states and wrapping layout, recovery for failed clipboard calls, stable scope/duplicate action handling. The white printable poster and high-contrast QR are intentional and should remain separate from the app canvas.
- Sharing and contact workspace screens already use shared AppButton wrappers and focused field panels. Further changes should address a demonstrated layout or recovery issue, with phone acceptance still required.

This is a current-source disposition record, not native acceptance or an app-wide completion claim.

## Verified Preview publication

- Group `4dca4eb6-1c7d-43f9-ae09-b920b9c24bc0`, source `d03c89bf25c9ac07f52cdfd2a52f58edb69dc3a9`.
- Android update `01a0eaf0-cc5d-7bce-8a67-615ed15e7e26`.
- iOS update `01a0eaf0-cc5d-7332-90bd-b39cbd471002`.
- Both native exports succeeded from a stable source snapshot including preserved concurrent subscription work. Fresh channel readback matches exact published IDs, source, Preview branch/environment and staging configuration. Runtime remains `0.1.0`; resolved native configuration and fingerprints match the prior verified ratings release.
- Existing ratings/seeded reviews, Account/alerts, Home, rewards, Calendar, event RSVP, attendee inbox and order refinements remain included. This publication does not enable subscription billing or deploy subscription backend migrations.
- Native acceptance remains pending.
