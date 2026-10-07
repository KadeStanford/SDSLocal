# Parish Pass test branding

These exploratory PNGs were generated with the Imagegen skill on 2026-09-28.
Original generated files remain in the Codex generated-images directory.

| Direction | App icon source | Wide in-app lockup |
| --- | --- | --- |
| Green admission pass / PP | `icon-pass-green.png` | `wordmark-pass-light.png` |
| Terracotta neighborhood pin | `icon-neighborhood-pin.png` | `wordmark-pin-dark.png` |
| Green parish emblem / gold diamond | `icon-parish-emblem.png` | `wordmark-parish-emblem.png` |

Icons: 1254 × 1254 opaque RGB PNGs. Wide lockups: 2172 × 724 RGBA PNGs with
transparent backgrounds. The green text versions are intended for light
surfaces; the ivory pin lockup is intended for dark surfaces. These are raster
test concepts; preserve the original sources when preparing final vector,
monochrome, platform-sized, or iOS Icon Composer derivatives.

The current staging home experiment uses the parish emblem beside native
text reading “Parish Pass.” The other directions are available for comparison.
Native installed app icons and the operating-system splash image cannot change
by OTA. The new native build config now uses Parish Pass artwork and display
name, preserving bundle identifiers, auth scheme and runtime.

## Expo starter-asset audit

Source audit: `apps/mobile/app.config.ts`, `_layout.tsx`, and component imports.

| Asset | Current usage | OTA replacement possible? |
| --- | --- | --- |
| `assets/images/icon.png` | Old starter file; base config now uses `native-icon-light.png` | New native build required to replace installed icon |
| `assets/expo.icon/Assets/expo-symbol 2.svg` and `grid.png` | Old Icon Composer artwork; iOS config now uses clean Parish Pass light/dark/tinted PNGs | New native build required |
| `assets/images/android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png` | Old files; adaptive config now uses Parish Pass foreground/monochrome and solid evergreen background | New native build required |
| `assets/images/splash-icon.png` | Old file; splash config now uses `native-splash.png` | New native build required |
| `assets/images/favicon.png` | Old file; web config now uses `native-favicon.png` | Web export/deployment |
| `assets/images/expo-logo.png` | Unused starter `AnimatedIcon` components; root now renders `ParishSplash` | Active JavaScript usage replaced |
| `assets/images/logo-glow.png` | Starter `AnimatedIcon` components; no caller found | Unused starter component |
| `assets/images/expo-badge.png`, `expo-badge-white.png` | Starter `WebBadge`; no caller found | Unused starter component |
| `assets/images/react-logo*.png`, `tutorial-web.png` | No source references found | Unused starter files |

The active JavaScript splash now uses the selected Parish Pass emblem, ivory
wordmark and evergreen canvas. The OS splash configuration remains a native
build resource. This audit does
not treat the `expo-symbols` package or standard SF/Material UI symbols as
placeholder brand assets.
