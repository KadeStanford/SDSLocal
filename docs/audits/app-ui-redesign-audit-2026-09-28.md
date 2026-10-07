# App UI redesign audit — 28 September 2026

## Scope and confidence

Source baseline: `37522bb2236931bffe7daf25694b2d6dd0c5bd38`, including the published merchant list, compact order actions, and shared dark background correction. Reviewed the route inventory, screen composition, shared presentation components, and the 17 destinations in `business-workspace-config.ts`. Customer and business modes, guest and signed-in entry points, and native/web presentation were considered.

This is a source-based design and usability audit, informed by the user's supplied screenshots. It is **not a fresh visual inspection of every page on a phone**. Source findings are distinguished below from layout risks that require device verification. Previous September 20 findings are not assumed to remain valid: current code already has grouped Account settings, neutral reward cards, a compact order-business picker, and revised refund controls.

No app code, payment configuration, customer data, or staging deployments were changed for this audit. No payments, refunds, emails, or account changes were triggered.

## Design direction

Use the redesigned business list as the reference for operational screens: shared app canvas, restrained surfaces, compact rows, readable status, clear groups, one prominent task action, and secondary actions in a menu or detail view. Retain useful photography and business identity on customer discovery pages. The reference is its hierarchy and interaction pattern; different page types still need appropriate layouts.

Priority means redesign value, not a security or payment defect:

- **P1:** substantial redesign; current composition makes important work harder to scan or act on.
- **P2:** focused redesign or consistency work; usable structure with avoidable density, styling, or hierarchy issues.
- **P3:** preserve structure and polish specific details.

## Ranked redesign candidates

| Rank | Page or page family                              | Priority | Current evidence                                                                                                                                                                                                                                                             | Recommended change                                                                                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Business appointment management                  | P1       | Setup renders service editors, payment policies, resources, scheduling rules and general settings in one long view. Schedule renders each appointment with contact/notes, payment explanations and applicable action buttons inline.                                         | Separate schedule from configuration. Use day/status filters and compact appointment rows; open a detail view for contact, payment review and actions. Put services, staff/resources and booking policy in separate settings sections.                                                                                                                |
| 2    | Menu / products / services editor                | P1       | Category cards contain item rows; editing expands many fields, image controls and options inside the list. Intro, import tools, section creation and item editing compete for space.                                                                                         | Searchable inventory with category navigation, price/visibility summaries and an Add action. Edit one item in a dedicated screen/sheet. Put import and reorder in a secondary menu. Keep validation, dirty-state guards and import results.                                                                                                           |
| 3    | Business service-request inbox                   | P1       | Each card shows the entire message and contact metadata, then up to three stacked status buttons. Status is a raw string with an underscore replacement. The rendered list has no status filter or compact request summary.                                                  | New / In progress / Done filters, unread or attention count, readable status chips and concise rows. Open the message and contact actions in detail; show the next relevant action prominently. Clarify that replies occur by email.                                                                                                                  |
| 4    | Business reviews and customer event-review entry | P1       | Business review cards each include an always-visible multiline reply editor and Post/Update button. Every unreviewed attended event expands a star selector, text field and submit button in the list.                                                                       | Review/activity inbox with rating/date/reply status. Open a composer for one selected review/event. Distinguish public replies from private customer support. Preserve verified eligibility and moderation state.                                                                                                                                     |
| 5    | Customer appointment booking and status          | P1       | Booking puts service choice, staff choice, time choices and contact fields into one long selection view. Earlier day / date / Later day share a nonwrapping row. Status is mostly stacked text followed by Refresh, cancellation and rescheduling controls.                  | Service → time → contact → review progression with a persistent summary. Compact date navigation, grouped time choices and a clear availability state. Use a status-led confirmation page with date/time/location, paid/due summary and secondary change actions. Narrow-screen/large-text overflow is a device-check risk, not a reproduced failure. |
| 6    | Ordering and payment setup                       | P2       | Provider wrapper and provider panel can repeat major headings. Stripe setup uses several large instruction/status blocks; Square has a different connection/readiness presentation. Pickup settings remain below the setup/status content.                                   | One consistent payment setup overview: connection, verification, menu, hours and accepting-orders status. Show the next required step; open configuration sections on demand. Keep Square-specific and Stripe-specific requirements visible where relevant.                                                                                           |
| 7    | Alerts inbox and notification preferences        | P2       | Full-page and modal inboxes duplicate headers/controls and detail presentation. Clear all has a 36pt minimum height. Preferences render nearby-alert settings plus repeated business-by-business notification switches. Some active eyebrow/link text uses fixed dark green. | One shared inbox presentation with compact timestamp/status rows and contextual bulk actions. Preferences should have global categories and a searchable per-business drill-down. Increase Clear all to the project's 44pt control minimum and use theme-aware link colors.                                                                           |
| 8    | Account overview and authentication/settings     | P2       | Overview is now grouped correctly, but nearly every row carries explanatory text and a 68pt minimum height. Account, business workspace and customer activity together form a long settings surface. Auth/forms also retain local control styling.                           | Compact identity header and concise settings rows, with descriptions reserved for ambiguous entries. Keep the existing groups and separate deletion flow. Standardize form/button appearance across login, recovery, profile and sign-in methods.                                                                                                     |
| 9    | Events, updates, loyalty and staff editors       | P2       | Workspace mixes existing-content cards with creation/editing forms and repeated action controls. Staff invitation content precedes the member list. Publishing readiness is another padded form-style card.                                                                  | Content lists with Add/Invite actions and focused editors. For events, separate upcoming/past and draft/published. For staff, show people and invite status first. For publishing, make incomplete checklist rows actionable and show the submission state clearly.                                                                                   |
| 10   | Customer calendar, rewards and following         | P2       | Calendar uses small 11pt event counts. Rewards list cards are already neutral and grouped, but detail combines progress, QR and history. QR is fixed at 245pt. Following has its own filter-sheet style.                                                                     | Keep the improved cards. Make calendar date selection/empty days clearer and counts readable. Give Show code a focused view and responsive QR sizing. Reuse common search/filter sheets. QR fit and scan readability need device checks.                                                                                                              |
| 11   | Listing plans / publishing entitlement           | P2       | Each plan has a large card and choice button. Unavailable builds expose store-key/product/Preview-build instructions directly in the customer-facing screen. Restore, refresh and legal details form additional action blocks.                                               | Clear current-plan/usage summary, concise plan comparison and one selected-plan action. Show unavailable billing as a user-facing state; move build/configuration instructions out of the normal product flow. Preserve price, renewal, restoration and legal disclosures.                                                                            |
| 12   | Public business page and discovery               | P2       | Public business pages stack hero/identity, At a glance, booking/order actions, contact actions, About, hours, offerings and other sections. Public menu rows add a footer with price/overflow. Discovery also has a separate filter style.                                   | Preserve imagery and business identity. Prioritize the business's main customer task, make supporting details collapsible or navigable, and compact menu rows. Align filters and metadata with shared patterns. This needs representative food, service, retail and mobile-business phone review before choosing one layout.                          |

### Supporting source anchors

- Appointment setup and schedule: [appointment-workspace.tsx](../../apps/mobile/src/components/appointment-workspace.tsx#L640), [schedule rows](../../apps/mobile/src/components/appointment-workspace.tsx#L1123).
- Inventory editor: [business-workspace.tsx](../../apps/mobile/src/components/business-workspace.tsx#L3369), [item editing](../../apps/mobile/src/components/business-workspace.tsx#L3542).
- Request controls: [service-requests.tsx](../../apps/mobile/src/app/service-requests.tsx#L115).
- Review composer: [business-reviews.tsx](../../apps/mobile/src/app/business-reviews.tsx#L138), [attended event composer](../../apps/mobile/src/app/my-event-reviews.tsx#L162).
- Booking date row: [book-appointment.tsx](../../apps/mobile/src/app/book-appointment.tsx#L355), [appointment status](../../apps/mobile/src/app/appointment.tsx#L338).
- Payment setup: [ordering-panel.tsx](../../apps/mobile/src/components/ordering-panel.tsx#L113), [Stripe panel](../../apps/mobile/src/components/stripe-ordering-panel.tsx#L175).
- Inbox controls: [notification.tsx](../../apps/mobile/src/app/notification.tsx#L343), [modal control style](../../apps/mobile/src/components/alerts-button.tsx#L422).
- Account grouping: [account.tsx](<../../apps/mobile/src/app/(tabs)/account.tsx#L743>), [row geometry](<../../apps/mobile/src/app/(tabs)/account.tsx#L1712>).
- Plans unavailable state: [listing-plans.tsx](../../apps/mobile/src/app/listing-plans.tsx#L222).
- Public page sequence: [public-business-page.tsx](../../apps/mobile/src/components/public-business-page.tsx#L973).

## Shared issues to address before broad screen changes

1. **Palette consistency.** The approved merchant list still defines most colors locally, while other screens use semantic theme tokens or fixed Brand colors. Bring the approved merchant appearance into shared semantic roles rather than copying its hex colors across pages. Keep the recently corrected shared canvas. Fixed `Brand.primary` text on the app's dark background calculates to approximately **2.88:1** contrast; examples include Alerts eyebrow/Clear all text. Inspect actual component surfaces before choosing replacements. Prefer `accent` for interactive text and `textSecondary` for metadata.
2. **Action hierarchy.** Lists should present summaries and a clear next action. Avoid turning every record into a fully expanded form or a column of equally prominent buttons. Keep financial/destructive actions behind explicit review and retain role/version restrictions.
3. **Common geometry and form anatomy.** Use shared spacing, dividers, input states, button variants and sheet headers. Current screens mix pill buttons, 8–16pt corners, oversized cards and individually styled forms. Existing `AppButton`, `FormField`, `CommerceField` and state components are a starting point; define missing compact row, status and editor patterns.
4. **State-aware copy.** The business order header always says “accept the order, then mark it ready,” including ready/completed orders. Replace it with the instruction for the current stage. Several setup screens show staging implementation instructions; distinguish a concise test-mode label from details only useful to developers. Do not remove information needed to safely use Sandbox.
5. **Responsive operational layouts.** Test long names, dates, badges and large text rather than relying on fixed one-line arrangements. The booking date row, rating/date review headers, hub Preview control and dense calendar cells need attention. Native tab glass appearance is platform-owned; screenshots alone do not establish a custom navigation defect. Verify actual bottom padding and touch behavior before changing navigation.

## Route coverage and disposition

| Route / screen state                                                       | Disposition                                                                                                                            |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/explore` — discovery, search/categories/filter, inline business viewer   | P2 metadata/filter polish; preserve working discovery structure.                                                                       |
| `/b/[slug]` — public business                                              | P2 task hierarchy and section density; preserve shared logo/media handling.                                                            |
| `/calendar` — calendar/event detail via Rewards                            | P2 calendar navigation/readability; keep shared reminder behavior.                                                                     |
| `/rewards` — wallet, reward QR/detail, history, following                  | P2 selected subviews; neutral wallet cards already improved.                                                                           |
| `/account` — overview                                                      | P2 compact settings refinement; grouping already improved.                                                                             |
| Account login/signup/OAuth/recovery/profile/sign-in methods                | P2 shared forms; preserve flow and validation.                                                                                         |
| Account Notifications                                                      | P2 global categories and per-business drill-down.                                                                                      |
| Account Privacy & Safety                                                   | P3 compact blocked-business rows.                                                                                                      |
| Account & data / deletion                                                  | P3 styling only; keep impact preview and typed confirmation.                                                                           |
| `/businesses` — merchant list                                              | Reference layout; preserve approved design and shared canvas.                                                                          |
| `/business`                                                                | Redirect into workspace; no independent page redesign.                                                                                 |
| `/business-new`                                                            | P2 unify controls and reduce setup-card density; staged flow already exists.                                                           |
| `/pickup-orders` — business queue                                          | P2 compact business identity/filter toolbar and card metadata. Do not restore the old full business list; its picker is already fixed. |
| `/pickup-order` — business detail                                          | P3 information density and state-specific header copy. Footer/refund panel already redesigned.                                         |
| `/orders` — customer current/history                                       | P3 card/filter polish; keep virtualized list and guest/account recovery.                                                               |
| `/order` — menu, item options, cart, scheduling, contact, review, status   | P3 consistency and narrow/large-text checks. Preserve staged flow, sticky action, accurate receipt and server confirmation.            |
| `/book-appointment`                                                        | P1 step progression and date/time selection.                                                                                           |
| `/appointment`                                                             | P1 status-led detail and secondary change actions.                                                                                     |
| `/service-request`                                                         | P2 compact service picker and focused request form.                                                                                    |
| `/service-requests`                                                        | P1 operational request inbox.                                                                                                          |
| `/my-service-requests`                                                     | P2 compact statuses/history with focused detail and cancel action.                                                                     |
| `/business-reviews`                                                        | P1 review/reply inbox with on-demand composer.                                                                                         |
| `/my-event-reviews`                                                        | P1 keep list compact and open review composer on demand.                                                                               |
| `/event-attendees`                                                         | P2 searchable/check-in-status rows and subordinate export action. FlatList structure is already useful.                                |
| `/staff-scan` — rewards, pickup scan, events, manual code, result/activity | P3 preserve task-specific scanning; harmonize business/task selector, manual-entry and results.                                        |
| `/staff-invite`                                                            | P3 align invitation summary and acceptance controls.                                                                                   |
| `/listing-plans`                                                           | P2 plan comparison/availability and customer-facing copy.                                                                              |
| `/notification` and Alerts modal/detail                                    | P2 shared inbox/details and compact controls.                                                                                          |
| `/auth/callback`                                                           | P3 keep simple progress/error/retry state.                                                                                             |
| `/index`, root layouts, native/web tabs                                    | Routing/shared chrome review; no separate content redesign. Verify safe-area/keyboard behavior on devices.                             |

## Embedded business workspace coverage

These are real pages even though many live inside one workspace component.

| Destination                  | Disposition                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Hub landing                  | P2 quick task/status overview; grouped destinations are already useful. Preserve setup/readiness attention. |
| Preview                      | Same P2 public-business recommendations.                                                                    |
| Profile                      | P2 focused identity editor with clear save state.                                                           |
| Contact                      | P3 reuse shared field layout.                                                                               |
| Hours                        | P3 compact day rows; preserve grouped schedule/native picker.                                               |
| Appointments                 | P1 service/resource/settings separation and schedule inbox.                                                 |
| Ordering & payments          | P2 connection/readiness overview with consistent provider anatomy.                                          |
| Location / service area      | P2 progressive fields by business/service-area type.                                                        |
| Mobile location              | P2 compact stop list with dedicated editor.                                                                 |
| Offerings                    | P1 searchable list and focused editor.                                                                      |
| Events                       | P2 upcoming/draft lists and focused editor.                                                                 |
| Updates                      | P2 compact post history and separate composer.                                                              |
| Rewards                      | P2 program overview and focused rule editor.                                                                |
| Photos                       | P2 media grid, clear logo/cover roles and contextual actions.                                               |
| Staff                        | P2 member/invitation list with Invite action and separate invite form.                                      |
| QR poster                    | P3 retain printable/scannable preview; align utility controls.                                              |
| Sharing                      | P3 concise public-link row with copy/share actions.                                                         |
| Review / publishing          | P2 actionable readiness checklist and clear submission state.                                               |
| Analytics card (hub adjunct) | P3 compact metrics, theme-aware Details control and adequate touch target.                                  |

## Suggested implementation order

1. **Shared foundation:** adopt the approved merchant visual roles, compact row/status/editor patterns, semantic dark-mode text and consistent sheets. Keep the approved list as the reference.
2. **Business daily work:** service requests and review replies, then inventory and appointment schedule/setup. These bring the most immediate reduction in repetitive controls and scrolling.
3. **Customer completion:** appointment booking/status, Account and notifications; then review entry and request history.
4. **Browse and setup refinement:** public business/discovery, calendar/rewards, payment setup, content tools and plans. Keep proven order checkout/confirmation and scan layouts stable while polishing them.

## Acceptance for each redesign

- On a normal phone, the main task/status should be apparent before scrolling through instructions or settings.
- Editing one record should not expand editors for the rest of a list.
- Use the shared canvas in both themes; read action labels, metadata and error states against their actual surfaces.
- Check a narrow phone, large text, long business/customer names, keyboard visibility, safe areas and back gestures.
- Verify loading, empty, failed, stale/offline and saved states with a meaningful recovery action.
- Preserve owner/staff and guest/account differences, dirty-form protection, public/private reply visibility and existing financial confirmations.
- Do not declare screen or payment acceptance complete from source review alone. Capture representative device screens after implementation.

## Audit outcome

The main opportunity is reorganizing information and actions, followed by styling consistency. The highest-value redesigns are appointment management, inventory editing, service requests, review replies and customer appointments. The approved business list and current checkout components provide useful patterns to reuse. Implementation and phone acceptance are the next phase; this audit does not publish changes.
