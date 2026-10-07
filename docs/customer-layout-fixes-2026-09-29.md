# Customer layout corrections — September 29, 2026

- Home now places its actual alerts control inside the brand row, using an inline AppChrome layout. The swipe-back Home underlay uses the same composition. Other AppChrome placements remain unchanged.
- Public review headers place stars and date in a wrapping row, followed by separate verification and event-title lines. Long titles remain visible within the review card.
- No OTA published for these changes; awaiting visual approval.

Validation: 12 focused component/flow tests, mobile TypeScript, and 24 browser geometry checks (light/dark, 320/390/430px, normal and 135% text) passed. Screenshots are React Native Web component test renders with fixture reviews and approximated native symbols, not native phone captures. They include the real AlertsButton rather than omitting the app utility control.

Preview files: `.codex-tmp/customer-layout-fixes/home-review.png` and `reviews-review.png`. Geometry evidence: `verification.json` in the same directory.

Lint: the changed components and regression test pass. The broader Home screen lint run reports a pre-existing `react-hooks/set-state-in-effect` error at `explore.tsx:410` in the offering search reset; these layout changes do not touch that effect.


## Approved OTA published

Published 2026-09-29T21:47:56.505Z after user approval. Expo preview channel and environment; staging backend; runtime 0.1.0.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/78aeff4b-5e7d-45bf-b072-e3f6ec5c91d3)

- android: 01a0ef23-80d9-71f0-ac9c-59d860e7a7dc
- ios: 01a0ef23-80d9-732c-95a5-f7ee9d5317ce

Fresh iOS/Android exports verified unchanged native configuration, staging backend and test payment settings. Source hashes stayed stable during export and were rechecked before publication. Active channel readback verified both published IDs. Exact source and bundle hashes are stored in .codex-tmp/customer-layout-source.json and customer-layout-bundle-verification.json.
