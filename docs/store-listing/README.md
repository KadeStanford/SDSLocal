# Parish Pass store listing drafts

Prepared September 29, 2026 using the user-selected evergreen, ivory and mint
branding and implemented app features. English (United States) copy is in
`en-US.json`. Asset sources use the existing clean Parish Pass SVG emblem;
the feature graphic includes the complete emblem as requested by the user.

## Asset files

| File | Destination | Specification |
| --- | --- | --- |
| `assets/app-icon-google-512.png` | Google Play app icon | 512 × 512, opaque RGB PNG |
| `assets/google-feature-graphic-1024x500.png` | Google Play feature graphic | 1024 × 500, opaque RGB PNG |
| `assets/app-icon-apple-1024.png` | Reference for native App Store icon | 1024 × 1024, opaque RGB PNG |
| `assets/subscription-essentials-1024.png` | Apple Essentials subscription image | 1024 × 1024, opaque RGB PNG |
| `assets/subscription-growth-1024.png` | Apple Growth subscription image | 1024 × 1024, opaque RGB PNG |
| `assets/subscription-pro-1024.png` | Apple Pro subscription image | 1024 × 1024, opaque RGB PNG |

All PNGs are flattened, use 72 DPI metadata and have no rounded corners.
Dimensions, alpha state and file sizes were checked after rendering. The
feature graphic and icons were visually inspected. Regenerate with
`node scripts/prepare-store-branding.cjs <path-to-sharp>`.

Suggested feature graphic alt text is in `en-US.json`; the current Play asset
details UI did not expose a dedicated alt-text field.

## Saved draft preparation

- Apple iOS version 1.0: description, promotional text, keywords, marketing and
  support URLs, copyright, review notes and complete review contact. The user
  supplied the review telephone directly for Apple; it is not retained here.
- Apple App Information: subtitle "Local businesses & rewards", Lifestyle
  primary category and Business secondary category.
- Apple subscriptions: all three branded images and individual review notes.
  Product IDs, prices and purchase options remain as configured for sandbox.
- Apple release setting: manual release, so approval alone does not release it.
- Google default en-US listing: name, short/full descriptions, app icon and the
  corrected feature graphic saved as a draft.
- Google listing Review step completed, including individual AI labels for
  the icon and feature graphic. The existing branding README records Imagegen
  creation of the selected logo concept; these uploads use clean vector
  derivatives of that concept. The listing overview confirms **Draft** after
  the final save. Phone screenshot slots remain empty at the user's request,
  pending clean Android captures; existing iPhone staging captures were not used.
- Google store settings: Lifestyle category saved pending review, public
  support email and HTTPS website applied. Contact details use Google's
  immediate contact-publication action; production remains inactive.
- Google privacy policy URL saved pending review.
- Google Ads set to no ads and saved pending review. Current mobile source has
  no ad SDK, sponsored feed or banner implementation. Revisit before adding ads.
- Google government-app response set to no and saved pending review.
- Google health response set to no health features and saved pending review.
  Current booking tools are for general businesses; revisit this response if
  healthcare-specific appointments or health features are introduced.
- Google financial features: rewards/points selected, Documentation step
  completed (no additional documents requested), and saved pending review.
- Google advertising ID: no, saved pending review. The uploaded sandbox AAB's
  manifest has no AD_ID permission, and current mobile source does not call
  an advertising-ID collection API. Revisit if SDKs or collection change.

Apple subscription image uploads are separate from the main app icon embedded
in the native binary. No App Store build was attached when these drafts were
prepared. Upload a correctly signed store build with the native icon already
configured in `apps/mobile/app.config.ts`. Apple controls processing, review
and image presentation; this upload does not prove that the icon already
appears in an iPhone purchase sheet.

## Before production submission

1. Capture current, clean iPhone and Android screenshots from the actual app.
   The error screens and staging review fixtures supplied during debugging are
   unsuitable for marketing. Apple currently requests 6.5-inch screenshots
   (1242 × 2688 or 1284 × 2778 portrait), with additional supported device sizes
   handled in Media Manager. Google requires at least two phone/tablet captures;
   four clean 1080 × 1920 phone captures are a useful starting set. Include
   discovery, a business page, events/rewards and business-owner tools.
2. Provide a working dedicated review account and relevant business fixtures.
   Apple's review contact is saved. Do not use a sandbox Apple Account as app
   review credentials. Keep credentials out of this document and source control.
3. Complete Apple age/content rights and App Privacy declarations, Google
   content rating, audience, Data safety, app access and background-location
   declarations against the final production build and SDK configuration.
   Public privacy/support/deletion pages exist, but their URLs alone do not
   complete either store's questionnaires.
   The uploaded sandbox bundle also triggers foreground-service and broad
   photo-permission forms. Current source uses location geofencing, with no
   startLocationUpdatesAsync/foreground-service flow, and the system image
   picker for selected uploads. Review/remove unused native permissions in the
   release build rather than claiming unrestricted photo access or a foreground
   service use case the app does not implement.
4. Supply the background-location demonstration described in
   `docs/nearby-alerts-store-review.md`; verify the physical-device behavior.
5. Finish production business-tier enforcement and commerce acceptance checks
   in `docs/business-subscription-store-setup.md`, configure production billing
   events/backend and verify lifecycle behavior. Sandbox purchase success does
   not establish complete production acceptance.
6. Google currently requires a closed test with at least 12 opted-in testers
   for at least 14 days before this personal account can apply for production
   access. The internal sandbox test is separate and does not satisfy it.
7. Check the draft Apple version against the final binary marketing version
   (current preview binaries use 0.1.0). Resolve this before attaching a release
   build. Complete any applicable territory/trader compliance decisions before
   choosing production availability.

No listing or subscription was submitted for review or released by this work.

## References

- [Apple purchase images and review metadata](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/view-and-edit-in-app-purchase-information)
- [Apple native app and App Store icons](https://developer.apple.com/documentation/Xcode/preparing-your-app-for-distribution)
- [Google Play assets and screenshot guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Google health-feature declarations](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Google financial-feature declarations](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en)
- [Google personal-account testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google AI asset declarations](https://support.google.com/googleplay/android-developer/answer/17262077?hl=en)
- [Google advertising ID declarations](https://support.google.com/googleplay/android-developer/answer/6048248?hl=en)
