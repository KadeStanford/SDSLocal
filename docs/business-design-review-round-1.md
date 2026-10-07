## Annotated feedback revision

Removed featured business accent and standardized business rows, renamed Manage subscription, gave Add business an explicit label. Alerts now use full-width swipe containers and cards, aligned title/actions, search followed by underline audience tabs and one unread switch. Overview unifies branding and business identity with a full-width preview action; operation tiles have consistent width, plain icons, navigation cues and stronger labels. Original theme colors preserved. Carbon tile guidance informed the restrained rows: https://carbondesignsystem.com/components/tile/usage/

Validated 54 existing component tests plus fixture render; both themes at 390px and 320px including simulated 150% text. Screenshots remain component renders, not native device captures. No OTA published; awaiting review.

## Dispatch refinement — selected September 29

The user selected Dispatch. Implemented evergreen masthead, Parish Pass mark, featured business action card, operation tiles, consistent filters, scanner surfaces and alert cards while retaining original app theme colors. No dependency added. No OTA published for this revision; awaiting screenshot review.

Validation: 193 focused regression tests passed; component renders for Manage, Staff Scan, Orders (empty), Alerts and services overview in both themes. All fit 390px and 320px, including simulated 150% text. Screenshot artifacts: `.codex-tmp/dispatch-proof/*-review.png`. These use fixture data, browser font substitution and approximate native symbols; they exclude native navigation and camera. Device verification remains before release.

# Parish Pass business design review — round 1

Status: proposals awaiting user feedback. No OTA publication is authorized until the user has seen screenshots; none was published during this round.

## Constraints retained

- Preserve the original Parish Pass light/dark colors. The user rejected black/charcoal replacements.
- Improve element design and a coherent identity, rather than asking the user to name one specific disliked element.
- React Native Paper was rejected and removed; package.json and the lockfile have no Paper dependency.
- Continue offering combinations for approval/rejection. Do not claim the overall design goal complete until the user has accepted a direction and the resulting implementation is verified.

## Proposals

1. **Dispatch**: branded evergreen masthead, highlighted business, direct action strip, compact utility navigation.
2. **Pass**: pass-shaped business cards with separated action stubs, larger typography and inset navigation.
3. **Studio**: restrained masthead, aligned business directory, inline operations, underline filters.

Each includes interactive Manage, Staff Scan, and Orders views. Sample business names reflect the existing workspace, while orders and customer names are fictitious preview data. Preview actions do not mutate backend data. The shared logo uses the existing clean native SVG asset; UI icons use the visualization runtime's Lucide set.

Editable review fragment:
`C:/Users/Stanj/.codex/visualizations/2026/09/29/01a0edf6-6c02-7da2-970d-dd5eeabb9940/parish-pass-directions.html`

## Evidence and limits

- Rendered 18 views: three directions × three screens × two themes.
- Verified search, business filters, screen navigation, award/redeem mode and order queue switches.
- All nine layouts fit the narrow review viewport without horizontal overflow.
- Browser runtime reported no JavaScript errors; icon loading was verified after enabling access to the runtime's prescribed CDN.
- Screenshots: `.codex-tmp/design-directions/`.
- These are inspectable design concepts, not native app or staging screenshots. Screen behavior and native accessibility must be verified when an approved direction is implemented.

The previous goal turn made progress by removing the rejected dependency and restoring the original palette. This round adds concrete alternatives for the user to judge; no approval is assumed.
