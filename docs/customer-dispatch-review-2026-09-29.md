# Customer Dispatch review — September 29, 2026

Status: implemented locally for visual review; no OTA published. Explicit user approval is required before any new OTA.

## Scope
Customer Home/Discover, pickup menu, cart, pickup time, contact details, checkout review, customer orders, order status, Account, Sign in, and Sign up. Original theme colors retained. Shared brand and checkout navigation components, neutral merchant surfaces, consistent card borders and filled actions. Authentication, payment, and order business logic remain unchanged.

Prior business follow-up fixes remain included locally: branding above back navigation, styled business action sheet, consistent expanded Operations header, and updated staff business chooser.

## Evidence
- 107 focused component, navigation, ordering, discovery, and auth-intent tests pass.
- Mobile TypeScript passes; focused ESLint passes.
- Eleven screens rendered in both themes at 390px; checked at 320px with normal and 150% text.
- Review gallery: `.codex-tmp/customer-redesign/index.html`.
- Account/auth fixture: `.codex-tmp/customer-pages-visual.test.tsx` (copy into components temporarily to regenerate). No real auth, email, or payment requests made.
- These are React Native Web component test renders, not on-device captures. Fixtures replace network data; native icons/navigation are approximated. Home uses sample cover artwork. Checkout/status screenshots show the initial viewport; remaining content scrolls.

Await customer critique and approval. Do not publish automatically.

## Second review — customer-refined

User accepted the direction of the non-Home screens during review and requested a different Home design. Current gallery: `.codex-tmp/customer-refined/index.html`.

- Shared compact customer navigation and filled icon actions; smaller checkout step indicator.
- Menu uses separated rows; checkout summary groups pickup/contact/receipt into one surface.
- Matching form and account-row treatments, with accessible filled controls.
- Home revised again: compact location header, search/filter toolbar with cross-platform clear action, working quick discovery filters, photo-led listings, and a compact no-photo fallback. Existing demo stock café cover used in the fixture. No photos uploaded or changed remotely.
- Apple and Google sign-in were omitted by the first fixture's availability configuration, not removed from the app. Corrected previews enable Google and simulate supported Apple availability. Both are placed before the email form. Existing native sign-in and email OTP handlers retained.
- Added email-code entry preview. Native Apple button is approximated in the browser fixture; actual app uses Expo's AppleAuthenticationButton.
- 149 focused tests plus one account/authentication rendering fixture pass; mobile TypeScript passes. Changed-component lint passes. Explore's pre-existing `react-hooks/set-state-in-effect` finding at the offering-search reset remains (confirmed in HEAD); remaining Explore lint passes with only that rule disabled for the check.
- Twelve pages checked at 320px, normal and 150% text, in both themes. Regular previews at 390px. Native navigation and icons remain approximated; browser fixture data is not a live phone session.

No OTA published. Await explicit approval.

## Home and email-code revision

- User approved Sign in and Sign up; preserve their current presentation.
- Home now contains location/search in a dedicated surface, outlined quick-filter tiles, and full-width business cards that group photos, metadata, and ordering actions. Location wraps on narrow screens and larger text.
- Email verification has a destination card and six visual code cells backed by one accessible native input. Full-code paste, digit sanitization, autofill metadata, destination changes, and busy-state locking have focused regression coverage.
- 12 focused discovery/verification/auth-intent tests and the account rendering fixture pass. Mobile TypeScript and changed-component ESLint pass. Browser screenshots captured in both themes; these are component fixtures, with native icons approximated, not phone captures.
- Updated reviews: `.codex-tmp/customer-refined/parish-review.png` and `.codex-tmp/customer-refined/email-code-review.png`.
- No OTA published; explicit user approval remains required.


## Complete pending review gallery

User approved Home, then requested every pending image plus specific clarification about Rewards and customer Orders. Gallery: `.codex-tmp/pending-final-review/index.html`. It collects the latest Home/carousel variants, customer flow/account/authentication screens, and the three business follow-up screens. Orders includes Current and a newly rendered History fixture. Rewards wallet, Following, and reward details were not part of the Dispatch redesign and had no dedicated preview; current component renders are now included separately and explicitly marked **not redesigned**. Calendar, reward QR, and public business details still have no dedicated final redesign preview in this set. No app styling or behavior changed during this inventory/review turn, and no OTA was published.


## Rewards and Following redesign — awaiting final approval

This supersedes the earlier inventory note that Rewards and Following were not redesigned. The user requested both before the next OTA and explicitly authorized publishing all pending redesigns and app logic together once these final designs are approved. No OTA has been published during this work.

- Rewards uses the shared customer brand/navigation, consistent merchant cards with logos, prominent visit/point progress, ready-reward status, and filled actions.
- Following uses matching full-width banner/logo cards, search and filters, separate business/follow actions, and an explicit keep-following/unfollow confirmation. Existing follow and reward-code handlers are retained.
- Reward details uses the same brand, balance surface, and filled code action.
- Review gallery: `.codex-tmp/rewards-redesign/index.html`; paired images: `rewards-review.png`, `following-review.png`, and `reward-detail-review.png` in that directory. These render the current React Native components using sample data in a browser; native icons are approximated, not on-device captures.
- 24 focused tests pass (customer rewards, discovery home, UI components, rotating reward code); mobile TypeScript passes. New/changed component lint passes. Rewards screen retains its existing selected-card state-effect lint error and ref-cleanup warning, confirmed in HEAD; no new lint findings remain.
- Both themes visually inspected at 390px; narrow 320px and 150% text overflow checks pass. Sample logos and banner photos loaded successfully.

Await the user's design response. Upon approval, perform the release checks and publish all pending app redesigns and logic to Expo staging together. Keep the earlier documented backend seed-photo limitation separate from OTA delivery.


## Final approval and publication

The user approved the redesign OTA. All pending mobile redesigns and app logic were published together to preview/staging as group a7f5f559-57b5-48b6-8c5a-9ff350dff0f4. See docs/customer-final-staging-release-2026-09-29.md for verified platform IDs and release checks.
