# Operations layout correction — September 30, 2026

The first operations release retained the older page shells around the redesigned content. The device screenshots exposed this mismatch: duplicated business context, oversized navigation and filtering controls, and a second card around the customer reward card.

## Changes

- Appointments and Requests share a compact brand/account/alerts header, title, and business context. The business selector appears below the title and is interactive only when there is more than one eligible business.
- Appointments uses a summary, compact underlined filters, date tiles, and agenda rows. Booking setup is available from the title action; search and refresh are inline controls.
- Requests uses a compact intake-form action and filters, search, and request summaries with customer initials and a clear review action. Existing request status and detail actions remain connected.
- Customer rewards use one evergreen card containing the business identity, reward, progress, and attached action strip. Ready rewards are grouped before in-progress cards. Stamp width and height are calculated from the measured grid width and explicitly equal on native platforms.
- Both Menu and Services show **+ Add category** beside Categories. It opens the existing category editor directly, respects editing permissions, and is disabled during saves/uploads.
- Reward detail selection is derived from refreshed wallet data instead of synchronizing duplicate selected-card state in an effect.
- The release source checks now require the new operations shell, request controls, category action, and grouped wallet components.

## Validation

- TypeScript: passed.
- Mobile tests: **989 passed across 76 files**. Coverage includes single/multiple eligible businesses, category permissions and disabled state, wallet grouping, progress, opening and code availability.
- Targeted lint: zero errors; six existing warnings in wallet/request cleanup refs and business workspace unused declarations.
- Browser component validation: **30 layouts** (320/390/430 widths, light/dark, Appointments/Requests/Wallet/Menu/Services). No horizontal page overflow; stamps had equal measured width and height at all sizes.
- Interactive checks passed for category actions on both editors, business switching and single-business chooser omission, appointment filtering/refresh, and request search/open/intake actions.
- Reviewed actual shared app UI components with sample data in `.codex-tmp/operations-fidelity-review/index.html`. Browser adapters replace native icons, alerts infrastructure, and data connections. These checks do not constitute an on-device iOS render test.

## Release

The correction targets the existing **preview** channel, **preview** EAS environment, **staging** backend, and runtime **0.1.0**. It requires no new native build. Export checks compare native configuration to the channel's prior update, verify staging configuration, and require a stable source snapshot through publication.

- Verified active on the preview channel at **2026-09-30T07:08:55.179Z**.
- Update group: `01253a6e-d013-4375-ab22-41ddf5c15c31`.
- iOS: `01a0f124-b10a-79ad-969f-9ffe76558c0a`.
- Android: `01a0f124-b10a-701c-9d62-06fad6f7cb1b`.
- Both exported bundles contain the new layout labels, category action, and prior approved search, business tabs, activity chime, order, payment, and business details features. Source hashes were unchanged between export and publication, and native configuration matched the previous update.
