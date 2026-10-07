# Mobile UI style guide

The mobile app uses the existing green identity, system typography and Expo SDK 57 controls. This guide standardizes presentation without establishing a new consumer brand. Token source: `packages/design-tokens/src/index.ts`; mobile aliases: `apps/mobile/src/constants/theme.ts`.

## Principles

- Put business identity beside useful content. Keep photography for atmosphere, products and venues.
- Use neutral surfaces for routine information. Green indicates a primary action, selection or meaningful status.
- Keep Discover compact. Use alignment, space and typography before adding borders, pills or nested cards.
- Preserve mobile capabilities, draft protection, role gates, camera workflows and existing domain calculations.
- Make missing, loading and failed data explicit; never invent ratings, popularity, reward balances or urgency.

## Semantic colors

Use `useTheme()` roles instead of screen-specific hex values. Light and dark have matching keys.

| Role                                                                     | Use                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `background`                                                             | Screen canvas                                                                  |
| `backgroundElement` / `surfaceElevated`                                  | Card / raised sheet surface                                                    |
| `backgroundSelected`                                                     | Selected control and readable disabled-action surface                          |
| `text` / `textSecondary` / `textMuted`                                   | Main content / supporting copy / quiet metadata                                |
| `accent` / `accentPressed` / `onAccent`                                  | Theme-aware links and selected indicators; dark accent is lighter for contrast |
| `actionPrimary` / `actionPressed` / `onAction`                           | Existing deep green filled action with white text in both themes               |
| `divider` / `border` / `inputBorder`                                     | Passive separation / structural outline / stronger editable-field boundary     |
| `successSurface`, `successText`, and equivalent warning/error/info roles | Paired feedback colors; always include readable text                           |
| `destructive`                                                            | Theme-aware destructive text                                                   |
| `skeleton` / `backdrop`                                                  | Static loading geometry / modal dimming                                        |
| `logoSurface`                                                            | Midtone backing that keeps light and dark transparent logo artwork visible     |

Automated contrast tests cover normal semantic text on canvas, card and elevated surfaces, filled action labels, notices and input boundaries. Arbitrary uploaded logo artwork cannot have guaranteed contrast; its adjacent business name remains readable independently.

## Typography and geometry

`ThemedText` maps to shared roles. Keep normal font scaling enabled for readable content. The decorative logo monogram alone does not scale because the adjacent business name does.

| Role             | Size / line height | Weight                 |
| ---------------- | ------------------ | ---------------------- |
| Screen title     | 30 / 36            | 700                    |
| Section heading  | 22 / 28            | 700                    |
| Card title       | 18 / 24            | 600                    |
| Body             | 16 / 24            | 400                    |
| Secondary        | 15 / 22            | 400                    |
| Metadata         | 14 / 20            | 400                    |
| Label            | 14 / 20            | 600                    |
| Button           | 15 / 22            | 600                    |
| Caption          | 13 / 18            | 400; nonessential only |
| Prominent number | 24 / 30            | 700                    |

Shared spacing is 4, 8, 12, 16, 24, 32 and 48 points. Existing mobile aliases remain available; use 16 for normal screen padding, 8 for closely related information and 24 between sections. Existing mobile radii are 12 for controls, 16 for cards, 22 for larger groups and 26 for hero surfaces. Pills are reserved for compact filters/status, not every action. Icons use 18/22/28 as small/normal/large guidance; existing platform symbol mapping remains authoritative.

## Buttons and forms

Use `AppButton` for primary, secondary, tertiary and destructive actions. Minimum height is 48 and minimum width 44; allow labels to wrap. Icon-only actions require an explicit label. `loading` sets busy and disabled accessibility states, blocks repeat presses and shows a spinner. Disabled controls retain readable text. Account and workspace wrappers preserve their existing haptics and pass saving/busy state explicitly.

Use one primary action per task area, secondary Cancel/back actions and quiet tertiary utility actions. Destructive actions remain in the existing account-data/security confirmation flow. Do not convert Delete into the default primary action.

Keep persistent field labels, existing keyboard types, return-key behavior, validation, draft restoration and unsaved-change guards. Use `inputBorder`, semantic error text and opaque modal surfaces. A visual refactor must not simplify away business hours, services, menus, media, staff or event editing. Reorder/time controls need at least a 44-point target even when their icon is small.

## Business identity and photography

`BusinessLogo` is the single logo renderer. Select a ready `business_photos` asset with role `logo`; never substitute a cover. Preserve signed URL query strings and use the existing storage URL helper for stored paths. Expo Image uses `contain`, memory/disk caching and no decorative transition. The inner artwork occupies 84% of its stable tile so wordmarks and tall marks are not cropped. A failure is remembered for that source; changing source allows a new attempt.

Use restrained two-initial monograms when the logo is missing, not ready or fails. If no usable name exists, show a generic business symbol. Do not generate pretend merchant logos. Adjacent logos are decorative to avoid duplicate screen-reader announcements; standalone identity has a label.

Covers use `cover` and retain their photographic role. Discover keeps a 98×124 cover area with a small 44-point identity badge. Public business pages keep the hero photograph and place a 64-point logo beside the name below it. Posters contain the entire logo. Merchant cover/gallery/menu images are not converted into logos.

## Shared cards

`BusinessCard`: cover or category placeholder, contained identity badge, name, useful category/location metadata and real following/reward availability. A long list name may truncate in the compact row; the full accessible name and business detail remain available. Keep actual result counts and business filters unchanged. Do not claim popularity from `is_featured`; label that merchant-controlled state Featured.

`EventCard`: compact date tile, wrapping 18-point event title, `BusinessIdentityRow`, time/location metadata and textual reminder state. Discover and Calendar share this anatomy; public event sections and details share the same host identity. Calendar remains chronological. Do not promote every event into a large promotional banner.

Wallet and reward detail cards use `RewardIdentity`: a contained 44-point merchant logo, merchant name and a slim merchant-color accent on a neutral surface. Put the program title and reward description above the balance panel, with one primary code action below it. Public reward enrollment may retain its merchant header. Avoid large color blocks, decorative glows and repeated gift icons. Balance calculations, QR security and transaction handling stay in existing domain code.

Event details use a dedicated page hierarchy rather than placing all information inside one large card: Back, optional contained event artwork, merchant-colored host header, event title, labeled When/Where facts, actions, About and practical details. Open artwork in the existing full-screen viewer. Missing images collapse cleanly to the branded host header; do not add an empty image placeholder or generic introductory paragraph. Keep reminder settings and photo navigation functional.

## Data states, sheets and navigation

Use `ListLoading` for reserved list geometry, `EmptyState` for a genuine empty result and `StateNotice` for paired semantic feedback. Keep retained results visible if a refresh fails. Do not show zero results before initial loading completes. Retry actions must call the existing load path. Offline scanner queue states retain their precise existing wording and behavior.

Choice sheets have separate dismissible backdrops and opaque content, a labeled 44-point-or-larger Done action and bottom safe-area padding. Report dialogs retain submission protection and account requirements, and avoid keyboard-obscured actions. Do not wrap interactive sheet contents inside the dismissing backdrop.

Main scroll views use `useScreenBottomPadding`. NativeTabs handles platform bar obstruction; native scrolling uses automatic content insets plus the safe-area buffer. Web measures the actual bottom navigation overlay. Avoid new device-specific 110/130/140-point screen spacers. Nested native sheets and legacy specialized layouts still require device inspection before changing their inset strategy.

## Accessibility and motion

Preserve readable body/metadata sizes, flexible wrapping, accessible names and selected/disabled/busy state. Hide inactive swipe-back underlays from accessibility while retaining gesture ownership and unsaved-change guards. The splash and alert dismissal respect Reduced Motion. Never disable horizontal controls to work around edge-back gestures.

Check 375-, 430- and 412-point widths, both themes, long content, missing media and enlarged text. Browser render fixtures are helpful but do not certify VoiceOver, TalkBack, Dynamic Type, keyboard avoidance, native modal focus, camera controls or physical edge gestures. Follow the phone checklist in `mobile-ui-style-audit.md` after every meaningful mobile release.

## Avoid

Pickup screens use a compact merchant identity, receipt rows with quantities and
modifiers, and a connected status timeline. Keep one primary fulfillment action
and put explicit owner-only refunds below it. Business Orders is a visible tab
when eligible; setup remains in Ordering & Square. Use business-local dates and
times, neutral paused/no-slot surfaces, an informational scheduled-pickup surface,
and a warning with Retry for provider errors. Paused pickup has no order button.
Closed storefront hours do not imply that future online pickup is unavailable.
Keep loading, no orders, retained stale results and authorization loss distinct.

- `cover` rendering for logos, stretching artwork, or replacing useful cover photography with a large logo.
- Bright borders and green text on every passive row, nested bordered cards, or oversized reward decoration.
- Screen-specific button systems, tiny reorder actions, fixed-height multiline text or opacity-only disabled text.
- Fabricated business identity, test accounts, unsolicited invitations or real redemption/email delivery for visual inspection.
- Changing native configuration, packages, database schema or authentication semantics to achieve a presentation update.
