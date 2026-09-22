# Mobile UI style audit

Baseline: 20 September 2026, existing working tree, Expo SDK 57. Screenshot reviewed: `IMG_6479.PNG`. Source is authoritative; the screenshot predates the working See all action. Both system light and dark themes are supported. This phase changes presentation only; existing staging data, authentication, business tools and transaction logic remain authoritative.

## Inventory and findings before implementation

Severity: High = interaction/readability risk; Medium = hierarchy/consistency; Low = refinement. Status initially records the planned disposition; completion and verification are recorded below after implementation.

| Route / component                                | Concrete finding                                                                                                                       | Severity | Correction / disposition                                                                                                         | Remaining verification                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Root tabs / stack (`_layout`, `app-tabs`)        | Native tabs provide automatic platform insets; screens add unrelated fixed 110–140pt spacers. Web navigation is a wide desktop header. | High     | Use platform automatic insets plus shared bottom buffer; measure web bar; preserve routes and native tabs.                       | Physical native inset/keyboard check   |
| Discover (`explore`)                             | Cover-only identity; green metadata; bright outlines; event business is plain text.                                                    | Medium   | Contained 44pt logo badge; shared branded event rows; neutral metadata and dividers. Preserve filters, result count and See all. | Signed-in phone check                  |
| Search / categories / filters                    | Existing 44pt category controls and accurate count already work; clear action is smaller; sheet choices have duplicate control styles. | Medium   | Preserve search/filter logic; normalize action sizing and sheet controls.                                                        | Horizontal gestures on phone           |
| Discover loading / error / empty                 | Initial spinner reserves little space; fixed light error surface in dark theme.                                                        | Medium   | Reserved skeleton rows and semantic retry/empty state. Preserve stale content on errors.                                         | Slow/offline phone check               |
| Public business (`b/[slug]`, inline viewer)      | Logo uses cover crop and is over hero photography; headings compete with identity.                                                     | High     | Contain logo on neutral tile in separate identity block; keep cover photography.                                                 | Real transparent/light logos           |
| About / hours / menu / services                  | Recent source already orders About early, groups hours, and supports image/no-image menu rows.                                         | Low      | Preserve section order, grouping, prices and report actions. Shared text tokens apply.                                           | Long menu names / text scaling         |
| Public upcoming events                           | Correct reminder/direction behavior, but no consistent host identity.                                                                  | Medium   | Add shared identity row; retain event photos and controls.                                                                       | Reminder and Directions on phone       |
| Calendar (`calendar` → Rewards event mode)       | Plain host label, oversized event title, custom row unrelated to Discover.                                                             | Medium   | Shared compact event anatomy, date tile, logo, host, time and reminder status.                                                   | Chronology / reminder regression       |
| Event details / notification event destination   | Large business-colored surface; identity only text.                                                                                    | Medium   | Neutral elevated surface with host logo and retained event information/actions.                                                  | Deep links / media viewer              |
| Rewards wallet / membership                      | Large saturated header, decorative glow and repeated gift icon dominate content.                                                       | Medium   | Neutral reward surface, host logo, concise title, retained progress and redemption status.                                       | Native QR/redemption check             |
| Reward history / balances                        | Operational figures and QR expiration are existing working behavior.                                                                   | Low      | Preserve calculations, history and QR; shared typography applies.                                                                | Authorized staging transaction only    |
| Following                                        | Hand-built circular logo rendering duplicates logic and can crop.                                                                      | Medium   | Shared contain/failure-safe logo; keep search/filter/unfollow confirmation.                                                      | Signed-in list                         |
| Alerts inbox / compact alerts                    | Long uppercase type labels and date share a nonwrapping row; green text is weak on dark.                                               | Medium   | Sentence case, wrapping metadata, semantic accent; preserve read/dismiss.                                                        | VoiceOver/swipe clear                  |
| Nearby alerts / radius                           | Existing adjustable 48pt slider, permission disclosures and saved/failed states.                                                       | Low      | Preserve range, geofencing and scheduling; shared typography/action geometry.                                                    | Device location permission             |
| Account overview / settings                      | Useful consistent settings rows; fixed bottom spacer.                                                                                  | Medium   | Preserve grouping; shared insets and typography; everyday settings remain prominent.                                             | Large text                             |
| Login / signup / password recovery               | Good labels, password visibility, keyboard refs and validation; local primary button and weak input border.                            | Medium   | Shared action behavior, semantic input/error colors, stable readable fields. Preserve OAuth/email flows.                         | Real auth without fabricated accounts  |
| Onboarding / business-new                        | Working staged role/setup flow; local action shapes; hardcoded bottom spacer.                                                          | Medium   | Normalize geometry/insets; preserve optional setup, draft restoration and validation.                                            | Keyboard/dirty-state device check      |
| Account & data / deletion                        | Deliberately separate danger zone and typed confirmation; fixed 520pt minimum adds dead space.                                         | Low      | Preserve security/confirmations; remove unnecessary minimum; keep danger subordinate.                                            | Inspect without deleting               |
| Business list / entry (`businesses`, `business`) | Existing direct mobile workspace access and business selection.                                                                        | Low      | Preserve navigation; shared spacing/text/insets.                                                                                 | Owner and staff roles                  |
| Business hub                                     | Logo uses cover crop, fallback separate from customer identity.                                                                        | Medium   | Shared logo; retain direct tool rows and attention priority.                                                                     | Long business name                     |
| Business details / contact / location            | Full mobile forms; duplicate buttons and weak dark input separation.                                                                   | Medium   | Shared actions and input tokens; preserve patches/required fields.                                                               | Inline validation / keyboard           |
| Hours editor                                     | Time controls are 40pt high; existing day grouping/native picker works.                                                                | High     | Raise controls to 44pt; preserve time editing and copy behavior.                                                                 | Native picker                          |
| Menu/service management                          | Reorder controls 34×34; nested bordered form surfaces are visually heavy.                                                              | High     | 44pt reorder controls, restrained form surfaces, shared actions. Preserve import/images/order.                                   | Long content / dirty guard             |
| Photos / media                                   | Business logo preview uses photographic crop.                                                                                          | Medium   | Contain logo previews; keep cover/gallery crop and upload pipeline.                                                              | Wide/tall/transparent assets           |
| Event management                                 | Full editor, scheduling, cover/gallery available; action styles duplicated.                                                            | Medium   | Shared actions/form styling; retain scheduling/validation.                                                                       | Save and unsaved changes               |
| Updates / publishing                             | Readiness and notifications are consequential; copy already distinguishes draft/publish.                                               | Low      | Preserve logic; shared action hierarchy and notices.                                                                             | Authorized staging publish only        |
| Rewards configuration                            | Working points/visits configuration and validation.                                                                                    | Low      | Shared form/button treatment; preserve rules/balances.                                                                           | Do not transact for visual tests       |
| Staff management                                 | Existing invite/revoke/remove flow available on mobile.                                                                                | Low      | Shared button and field treatment; preserve authorization.                                                                       | Do not send unsolicited invites        |
| QR / poster / business preview                   | Existing printable layout and public-page preview work.                                                                                | Low      | Preserve export/print logic; preview inherits logo improvements.                                                                 | Native print/share                     |
| Dirty-state / confirmations                      | Existing alerts and edge-back blocker protect edits.                                                                                   | Low      | Preserve guards; normalize only controls.                                                                                        | Physical edge swipe                    |
| Staff invite / business selection                | Explicit accept path and role gate already present.                                                                                    | Low      | Shared typography, touch geometry and bottom buffer.                                                                             | Valid existing invitation only         |
| Staff scanner / manual entry                     | Completed scanner state machine, camera, success/failure, queue and duplicate protection.                                              | Low      | Preserve camera/transaction structure; shared typography/insets and control contrast only.                                       | Camera/permission/device-only states   |
| Scanner confirmation / history / offline queue   | Text distinguishes pending, queued and completed outcomes.                                                                             | Low      | Preserve semantics and recent activity.                                                                                          | Authorized disposable transaction only |
| ChoicePicker / sheets                            | Done has no 44pt target; sheet lacks bottom safe area; parent pressable wraps content.                                                 | High     | Separate backdrop from sheet; accessible Done, opaque elevated surface, safe-area padding.                                       | Native focus/gesture                   |
| Sign-in gate / report dialog                     | Duplicate pill buttons; report Cancel too small; report keyboard can obscure action.                                                   | Medium   | Shared actions and 44pt controls; keep protected report submission.                                                              | Native modal focus/keyboard            |
| ThemedText / theme                               | 36pt global title, 24pt subtitle used as card title; no explicit card/button/number roles.                                             | Medium   | Refine existing tokens with semantic roles; keep body 16pt and metadata 14pt.                                                    | Dynamic Type                           |
| Buttons / selection / icons                      | 34–42pt actions, many unrelated radii, disabled opacity fades text; expo-symbols already consistent.                                   | High     | Shared button variants/state, normalize effective targets and geometry; retain platform symbol mapping.                          | Screen readers                         |
| Logos / images                                   | Repeated selection/failure code, crop for textual logos, no unified fallback.                                                          | High     | Shared source selection, contain, cache, restrained monogram, decorative accessibility behavior.                                 | Arbitrary merchant logo contrast       |
| Motion / feedback                                | Splash and alert dismissal animate without explicit Reduced Motion handling.                                                           | Medium   | Respect Reduced Motion for changed animation paths; retain gesture ownership policy.                                             | Native reduced-motion setting          |
| Generic loading / empty / error / offline        | Several bespoke notices; some hardcoded light palettes; offline scanner semantics already honest.                                      | Medium   | Shared data-state presentation where repeated; semantic notices; preserve offline queue.                                         | Full native offline journey            |
| Unused starter components                        | AnimatedIcon/collapsible/hint/web badge are not primary product screens.                                                               | Low      | Inventory but avoid unrelated rewrites.                                                                                          | No product impact                      |

## Completion and evidence

Implementation, automated checks, limited visual coverage, OTA identifiers and the physical-phone checklist are recorded below. Source inspection is not physical-device proof.

The route inventory also includes `index` (existing role-aware redirect), `auth/callback` (existing OAuth/session recovery handoff), `notification` (existing notification destination resolution), and generated not-found/sitemap routes. Their routing and authentication logic were inspected and retained; notification presentation inherits the shared theme and insets. `AppChrome`, customer action rows, media viewers, hours summaries, reward QR panels, external links and provider-driven overlays retain their existing responsibilities. No replacement navigation or authentication system was introduced.

## Implemented outcome

All correction/disposition rows above were completed as scoped: shared components and tokens replace repeated presentations; rows marked Preserve intentionally retain working domain behavior. This is a source-wide audit, not a claim that every signed-in screen has been exercised on a device.

- Discover retains cover photography, category/search/filter behavior, counts and See all. Business cards add contained identity; event cards share host identity with Calendar. Initial loading reserves space and failed refreshes retain available content.
- Public pages separate hero photographs from the logo/name block and preserve About, Hours, offerings, events and rewards ordering. Featured menu items no longer acquire an invented Popular label.
- Rewards replace oversized saturated headers/glows with neutral surfaces and business logos. QR, balances, expiration and redemption logic remain unchanged. Logo hydration is an optional read-only query and safely falls back.
- Calendar details now expose Directions for physical addresses using the existing URL builder. Online events do not receive this action. Reminder authentication and scheduling remain unchanged; public event copy no longer incorrectly implies the viewer follows that business.
- Account, onboarding and workspace forms use shared action geometry, readable field/error colors and explicit pending state on primary account/workspace actions. Business hours and reorder targets are at least 44 points. Existing role gates, form validation, draft restoration and unsaved-change guards remain intact.
- The scanner retains its camera, manual entry, queue, duplicate prevention, success/failure and transaction flow. Only inherited typography, theme/insets and small control geometry changed; visual decoration must not slow scanning.
- Choice sheets separate backdrop and content, use safe-area padding and accessible Done controls. Report dialogs gain keyboard avoidance. Swipe underlays are hidden from accessibility without changing the gesture algorithm. Splash/alert animation observes Reduced Motion.
- Web navigation measures its real overlay height, respects business/customer routes and defers viewport-specific content until hydration. Native tabs remain native. No new native packages/configuration, database migrations or hosted writes were made for this task. Existing unrelated working-tree changes were preserved.

Primary implementation files: `packages/design-tokens/src/index.ts`; mobile `components/business-logo.tsx`, `business-identity-row.tsx`, `business-card.tsx`, `event-card.tsx`, `app-button.tsx`, `data-state.tsx`, `themed-text.tsx`, `public-business-page.tsx`, `business-workspace.tsx`, `choice-picker.tsx`, `report-dialog.tsx`, `swipe-back-view.tsx`; `app/explore.tsx`, `rewards.tsx`, `account.tsx`; `hooks/use-screen-bottom-padding.tsx`, `use-reduced-motion.ts`; `lib/business-identity.ts`, `ui-presentation.ts`, `discovery-core.ts`. Other audited screens inherit the shared theme and inset refinements. Test additions are `lib/ui-presentation.test.ts`, `components/ui-components.test.tsx` and `ui-visual-fixtures.test.tsx`.

## Verification boundaries

The component tests use server rendering with native/image mocks; they verify contracts and semantics, not native gestures. The visual fixture renders the real shared components through React Native Web with geometric local SVG samples for wide/tall/square transparent-logo cases. No fixture was written to hosted data. Enlarged text is a 140% CSS render check, not a Dynamic Type test.

Read-only staging inspection found seven active businesses with ready cover assets and no ready logo assets. The live app therefore correctly displays monograms. Real uploaded business-logo integration remains a device acceptance check; no merchant identity was fabricated or uploaded.

Limited browser inspection covers signed-out Discover, live cover cards, public Calendar (17 events), event details, public business content, login/signup entry and shared loading/empty/error/offline/action fixtures. Responsive checks use 375x812, 430x932 and 412x915 viewports. Both fixture themes and long event/business names were inspected. Narrow-browser public page inspection includes image and no-image menu rows. Inactive swipe-back content is no longer in the visible accessibility tree. Existing staging data was read only.

Not performed: signed-in rewards, account deletion flow, owner form saves, staff scanner success/failure on camera, native modal focus, VoiceOver/TalkBack, actual offline queue transactions, native reminder scheduling, physical keyboard/safe-area and edge gestures. Those require a real authorized session/device. Source audit and passing regressions support preservation but do not prove these device behaviors.

## Physical-phone acceptance checklist (not performed by the worker)

1. Force-close and reopen the installed Preview app while online.
2. Confirm the new OTA is received using the group below.
3. Review Discover while signed out.
4. Review Discover while signed in.
5. Confirm business cards show useful cover photography and business identity.
6. Confirm uploaded real logos are not cropped; include a transparent wordmark.
7. Confirm businesses without logos have restrained fallbacks.
8. Review Coming up and confirm each event visibly identifies its host.
9. Tap See all and review Calendar branding and chronology.
10. Open an event and test Reminder and Directions.
11. Review a public business hero, logo, About, Hours, Menu, Events and Rewards.
12. Review the Rewards tab, balances, progress, history and QR presentation.
13. Review Login, Signup and Onboarding.
14. Review Account and account deletion without completing deletion.
15. Open the business workspace and several editing forms.
16. Test required-field validation and unsaved-change behavior.
17. Review staff scanning without a real redemption unless using authorized disposable staging data.
18. Open representative bottom sheets and confirmation modals; check focus and keyboard behavior.
19. Scroll to the bottom of several screens and confirm content clears the tab bar.
20. Increase phone text size and inspect main screens; check VoiceOver/TalkBack and Reduced Motion.
21. Test horizontal controls and confirm they do not trigger back navigation.
22. Repeat representative checks on Android when an Android Preview build is available.

## Automated checks

| Check                           | Result                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`             | Passed                                                                                                  |
| `pnpm lint`                     | Passed; no reported lint warnings                                                                       |
| `pnpm typecheck`                | Passed across all 8 packages                                                                            |
| `pnpm test`                     | Passed: 274 tests total, including 242 mobile tests in 17 files                                         |
| `pnpm build`                    | Passed: 8 tasks, including Expo web export and Next build                                               |
| `git diff --check`              | Passed                                                                                                  |
| Preview environment guard       | Staging; Supabase project `lgddhdexvwclfrnzjtly`                                                        |
| Preview config guard            | App version/runtime `0.1.0`; channel/environment `preview`                                              |
| Protected file hashes           | App configuration, both EAS configurations, package manifests and lockfile unchanged from task baseline |
| Browser console on final export | No captured errors or warnings after hydration correction                                               |

New tests cover ready/missing/failed/signed logo sources, contain policy, monograms, accessible identity, event identity data, card structure, action busy/disabled variants, semantic theme completeness and contrast, retained/loading/empty data decisions and inset arithmetic. Existing navigation, gestures, business form configuration, onboarding, discovery and account-deletion regressions pass. Turbo's existing missing-output warnings concern cache configuration and do not fail the checks.

Filter and category sheets were additionally opened and dismissed in the browser; both surfaces and their Done actions were visually inspected. Signup fields and Google action clear the measured bottom bar at a 412-point viewport. No signup, email, reminder, report or transaction was submitted.

## Published Preview OTA

Published and independently re-read from EAS on 20 September 2026 UTC with message **Unify mobile UI and business branding**.

| Field                              | Verified value                         |
| ---------------------------------- | -------------------------------------- |
| Branch / channel / EAS environment | `preview` / `preview` / `preview`      |
| App environment / Supabase project | `staging` / `lgddhdexvwclfrnzjtly`     |
| Runtime, both platforms            | `0.1.0`                                |
| Update group                       | `462ebd0f-0098-488f-8fc0-1f92a2812bfe` |
| iOS update                         | `01a0bd21-502e-7b46-aae7-131f4831b71b` |
| Android update                     | `01a0bd21-502e-7d4a-aac3-0ca021cd6fca` |

Both platforms belong to the same group. Each platform's native fingerprint matches its prior Preview update; protected native/configuration/package hashes also match the task baseline. No native rebuild was performed or required by these changes. Production was untouched. No hosted Supabase data, email, invitations or transactions were changed by this audit.

The development launcher retains LAN-only Metro at `192.168.0.36:8081`, verified in both manifest host and launch-asset URL, with Compose Watch running. This local development configuration is separate from the published Preview OTA.

## Follow-up: stronger merchant identity and event details

User feedback after the first OTA: rewards felt too similar and the event detail page was unsatisfactory. This follow-up supersedes the original neutral-header decision for merchant-owned reward surfaces.

- Added `BusinessBrandHeader`: substantial saved-business-color header, 56-point contained logo, business/program titles and contrasting black/white text. Shared by wallet cards, their swipe-back underlay, reward details and public reward enrollment. Neutral progress and QR surfaces remain readable.
- Added `EventDetailHeading`: optional contained event artwork above the branded host, then the title and labeled When/Where facts. Removed the generic introductory copy and monolithic enclosing card. Actions, About and Good to know have distinct placement. Existing image viewer, reminder preferences and directions callbacks are retained. Single-image events no longer duplicate the hero as a thumbnail.
- Brand colors accept valid short/full hex and fall back safely for invalid data. Seven new tests verify normalization and contrast across light/dark merchant colors.
- Browser inspection: real staging event details at 375-point width; shared reward headers in plum/gold/blue, both theme surfaces, 140% text, long names and contained portrait artwork. These are local presentation fixtures, not invented hosted merchant assets. No signed-in transactions or native phone tests were performed.

The existing first-OTA identifiers above remain historical. The follow-up Preview identifiers are recorded below after publication.

Follow-up verification: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` and `git diff --check` passed. The suite now has 281 tests, including 249 mobile tests in 18 files. Protected native/configuration/package hashes remain unchanged. The browser event flow had no captured errors; its existing native-animation path warns about the expected JavaScript fallback on web. No native configuration was changed to address a browser-only warning.

Follow-up OTA published and independently verified, message **Strengthen business branding and event details**:

| Field                          | Value                                  |
| ------------------------------ | -------------------------------------- |
| Branch / channel / environment | `preview`                              |
| App environment / runtime      | `staging` / `0.1.0`                    |
| Group                          | `a302e49c-d8d4-47eb-bc47-96fa38f89207` |
| iOS                            | `01a0bd31-aee6-7786-95e5-3405a4311209` |
| Android                        | `01a0bd31-aee6-7e3c-849d-9cfb46920c86` |

Both native fingerprints match the preceding Preview release. Production and hosted business data were untouched. Force-close and reopen Preview online to receive this revision; native phone verification remains the user's acceptance step.

## Pickup workspace follow-up

The successfully paid Sandbox pilot exposed an undiscoverable merchant queue and
weak hierarchy throughout ordering. The new Business-mode Orders tab opens the
inbox directly, with an eligible-business selector only when needed. Order details
have real merchant identity, labeled pickup/contact facts, an itemized receipt,
a connected timeline and one next fulfillment action. Configuration stays in the
existing Ordering & Square tool. Customer menu, customization, cart, scheduling,
review, checkout recovery and tracking now share this compact receipt language.
Public pickup distinguishes accepting, scheduled, paused, no slots, provider error
and loading; Discover uses the same pure presentation resolver and a batch status
read. See [Square commerce](square-commerce.md#business-pickup-workspace) for
permissions, deployment evidence, verification limits and the physical checklist.
