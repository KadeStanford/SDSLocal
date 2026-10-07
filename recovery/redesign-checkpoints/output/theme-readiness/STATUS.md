# Dark-mode checkpoint

Native dark-mode support remains in the candidate source. `useTheme()` selects the shared light/dark semantic palette from the device color scheme, and the shared `PageHeader`, `HeaderBack`, `Surface`, `SectionHeading`, `AppButton`, `ThemedText`, and `AppIcon` use those theme roles. `CustomerBrand` also selects the dark mark. This establishes retained support in those components, not complete screen acceptance.

The completed 144-view gallery was light-mode evidence. The separate 21-check stress run included one `home-dark` discovery check, which passed its rendering/geometry checks. It did not establish whole-app contrast, all modals/states, or installed iOS/Android dark-mode proof.

Web currently has no global system-dark theme. Its existing `.business-theme-dark` style remains in the candidate and approved design baseline. The new web utility header includes fixed ivory/white/evergreen/mint colors. Those need a scoped check within a business page's existing dark theme. No global web-dark feature or demonstrated visual regression is claimed before that check.

The latest published baseline is pinned to second staging OTA group `16899e45-ef46-427c-870a-009ff22a3caf`, channel `preview`, runtime `0.1.0`. Its publication receipt is `task-4/.combined-admin-publication-v2/release-receipt.json`; source is `task-4/parish-pass-combined-release-v1`. Source-manifest SHA256 is `52edce8caa09b60fa81a66398b548106cfe2e10ef48a6d4d41e3f0c13dbf8ab0`, published identity `76846411ca7fc8ac05c01c72b29764765795b4e34a5778f30298fb7eacb8a683`. All 500 manifest source hashes were verified against that source. No files were blindly copied or merged.

The candidate remains at the synthetic-entry-removal checkpoint `c8fdaace793838dec271cda14196b85a818f1b7894c4d5e4fb29e7fff8b07478`. The route/sidebar/gallery removal is retained. No application source has been changed during this new theme task.

The first comparison output's raw-byte checks are valid. Its semantic classifications must **not** be used for integration: the AST comparison initially included `SourceFile.text`, incorrectly treating formatting/comments as semantic differences. The script was corrected to exclude that full-file text; its corrected comparison still needs to run. Integration will compare the published source, previous approved design base, and current candidate, preserve security/admin changes, and resolve overlapping visual edits deliberately.

Execution is blocked by the terminal service returning `helper_unknown_error: setup refresh had errors`. This persists after the laptop was reported online and after harmless probes using the supported PowerShell shell. File/image access works; command execution has not recovered. The attempted focused preview launch did not start. No new screenshot, build, export, unit-test, or runtime dark-mode result is claimed.

Prepared next work is in `dark-mode-verification-plan.json`. Only a focused read-only native preview and, if needed, a focused web preview will run; no Docker or obsolete preview fleet. No redesign OTA publication is authorized or performed.
