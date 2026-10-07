# Approved inset menu and quantity controls

The user selected inset gallery direction 08 and approved its refined Add/Customize buttons, then approved separate circular quantity controls. Final publication was authorized after centering the plus/minus icons.

Implemented in the native mobile components: inset menu photography, price/action rows, matching Add/Customize controls, framed variation/modifier sections, an inset detail photo, a docked price/action footer and scrollable quantity controls. Plus/minus use geometric strokes centered in equal 44-point circles; disabled states remain distinct. Existing cart and reward calculations, payment routing and callback contracts are retained. Previously requested left-side Back navigation is included for the customer ordering flow and business creation footer.

Validation: 64 focused component, menu, order, reward and onboarding tests passed; mobile TypeScript and scoped lint passed. Native component fixtures passed 60 theme/width/text-size layout cases, including required options, edited items, unavailable items and missing photos. Icon stroke bounds were checked against both circle centers. These are React Native Web component renders with fixture data and approximated native symbols, not device screenshots or completed processor payments.

Preview evidence: `.codex-tmp/menu-native-final/`; selected interactive prototype: `.codex-tmp/menu-inset-refined/`. The quantity strokes in both use geometry rather than text glyph baselines. No new native dependency or configuration was introduced.

The staging account reward credit requested separately was already applied and verified through the customer wallet function: eight existing demo programs with three redemptions each. It does not require this OTA.

Release artifacts and source hashes use the `.codex-tmp/menu-inset-` prefix. The publication record is appended after Expo channel readback succeeds.


## Approved OTA published

Published 2026-09-30T01:25:47.183Z after user approval. Expo preview channel and environment; staging backend; runtime 0.1.0.

[Expo update](https://expo.dev/accounts/kadestanford/projects/sds-local/updates/168e6022-9664-45b8-a7ae-97e9f133a20e)

- android: 01a0efea-f22f-7d5a-8b9b-fca6beeb3a3c
- ios: 01a0efea-f22f-7eed-9f7e-e5007fdb1cbf

Fresh iOS/Android exports verified unchanged native configuration, staging backend and test payment settings. Source hashes stayed stable during export and were rechecked before publication. Active channel readback verified both published IDs. Exact source and bundle hashes are stored in .codex-tmp/menu-inset-source.json and menu-inset-bundle-verification.json.
