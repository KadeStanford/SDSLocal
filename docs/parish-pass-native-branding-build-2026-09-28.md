# Parish Pass native branding Preview builds

Requested to remove the embedded Expo splash preceding the animated Parish Pass
overlay, and to include the selected app icon in the new build.

Native source: isolated commit `5085e21`, shared workspace commit `b134675`.
EAS profile/environment/channel: `preview`; internal distribution.

- iOS build: `474ce2f8-42ba-4ad9-baf9-40837048090c`
  https://expo.dev/accounts/kadestanford/projects/sds-local/builds/474ce2f8-42ba-4ad9-baf9-40837048090c
- Android build: `0e325e04-a6f4-4117-937e-a373c6015126`
  https://expo.dev/accounts/kadestanford/projects/sds-local/builds/0e325e04-a6f4-4117-937e-a373c6015126

The build configuration replaces base and iOS icons with clean 1024px light,
dark and tinted sources; Android uses transparent adaptive and monochrome
layers with safe margins and evergreen background. Native splash uses the same
ivory emblem, mint diamond and evergreen canvas as the JavaScript overlay.
The installed display name becomes Parish Pass. The EAS project, slug, bundle
and package IDs, auth/OAuth schemes, app version `0.1.0` and runtime policy are
preserved. Web favicon configuration also uses the new mark.

The source snapshot retains current Home, Account, alerts, merchant and order
workflows, the animated splash and the Preview source guard. Later page
redesigns in the other chat can ship by compatible OTA.

Validation: TypeScript and staging config/source preflight passed. Inspected
rendered light/dark icon artwork. PNG sources and SVG geometry are in
`apps/mobile/assets/branding/parish-pass/native-*`; iOS icons are opaque,
adaptive and splash layers are transparent. Physical-device appearance must
be checked after installing the completed build.

The local MSYS Git executable returns `/f/...` paths, which caused EAS's Git
archive mode to fail with `spawn git ENOENT`. Both builds were successfully
uploaded using supported `EAS_NO_VCS=1` with an absolute `EAS_PROJECT_ROOT`
pointing at the committed isolated snapshot. Ignored environment files and
dependency junctions are excluded by Expo's archive rules. The source commit
is recorded in each build message because this archive mode omits Git metadata.

The user authorized coordination with “Finish staging payments and onboarding”;
that chat received ownership boundaries, commit and both build links. Installing
the new binary is required; an OTA cannot remove the Expo artwork embedded in
the previously installed app.

iOS build finished successfully. Downloaded IPA inspection confirms Parish Pass
display name, preserved bundle identifier, runtime `0.1.0`, Preview update
channel and EAS URL, the SplashScreen launch storyboard and compiled asset
catalog. The cloud logs confirm compilation of the launch storyboard.
Android completion verification is pending.
