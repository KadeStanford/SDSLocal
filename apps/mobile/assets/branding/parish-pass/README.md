# Parish Pass — selected Modern / Architectural direction

Selected by the user on 2026-09-28 from `board-modern-selected.png`.

Palette: midnight evergreen `#102D25`, ivory `#F4F2E9`, mint `#89C9A2`.
Typography: bold geometric sans-serif. The live UI uses platform-native sans
text for accessible scaling and sharp rendering rather than a raster wordmark.

- `icon-light.png`: opaque ivory icon source with evergreen emblem and mint diamond.
- `icon-dark.png`: opaque evergreen icon source with mint emblem and ivory diamond.
- `symbol-light.png`, `symbol-dark.png`: transparent exploratory standalone marks.
- `wordmark-light.png`, `wordmark-dark.png`: transparent exploratory wide lockups.

Imagegen created all PNG sources. Square icon sources are 1254 × 1254.
Wide lockups are 2172 × 724. Transparent assets are retained as design drafts;
the ivory alpha versions need edge cleanup before large-format production use.
The live app uses clean scalable geometry in `src/components/parish-brand.tsx`
and native text. The generated icon sources remain candidates for native builds.

## Applied now

The customer home header picks the corresponding light/dark symbol colors.
The JavaScript startup overlay uses the ivory symbol and mint diamond on an
evergreen canvas, followed by the Parish Pass name and tagline. It animates once
per application mount for 1.5 seconds and fades into the app. Reduce Motion skips
the animation; a bounded fallback removes an interrupted overlay. This replaces
the active blue Expo JavaScript startup overlay.
Both are compatible with the current staging OTA runtime.

## Native-build handoff

The native branding configuration now uses the clean mark derivatives below.
These changes require installation of the new Preview binary; OTA cannot
replace the icons or launch image embedded in an existing installation.

- `native-icon-light.png` and `native-icon-dark.png`: opaque 1024px icon sources.
- `native-icon-tinted.png`: opaque grayscale iOS tinted appearance source.
- `native-adaptive-foreground.png` and `native-adaptive-monochrome.png`:
  transparent 1024px layers with centered artwork inside the adaptive safe zone.
- `native-splash.png`: transparent 512px ivory emblem with mint diamond;
  both appearances use evergreen background and 106-point image width.
- `native-favicon.png`: 64px light icon derivative.
- Matching `native-*.svg` files are the clean scalable source geometry.

`app.config.ts` uses Parish Pass as the display name and preserves the EAS
slug/project, bundle/package IDs, auth scheme, and OAuth URL schemes. The native
splash replaces the starter Expo image and matches the JavaScript canvas.

Native asset choices:

- App display name: `Parish Pass`; preserve the EAS slug/project, bundle IDs,
  auth scheme, and OAuth URL schemes.
- Base and iOS icon: clean ivory/evergreen light and mint/evergreen dark variants.
- Android adaptive foreground: selected symbol with safe margins, evergreen
  background and a clean single-color monochrome layer from the same mark.
- Native splash: selected symbol, evergreen background, ivory wordmark if used.
- Mobile-web favicon: selected symbol/icon at appropriate small sizes.

Original concept comparisons remain in the sibling `parish-pass-test` folder.
