# Account authentication refinement

## Presentation changes

- One compact form, with sign-in/create-account tabs, a maximum width of 480 points and one primary submit action.
- Browsing and business setup actions sit below the form and provider sign-in controls.
- Email-code and password recovery have top arrow back pills. Account subpages also use the shared back pill.
- Shared theme/buttons replace local secondary and recovery button styles. The unavailable-sign-in notice uses semantic error colors.
- Session persistence has a themed checkbox and a minimum 48-point row. Mode and persistence controls cannot change while busy; swipe-back also pauses during submission.
- Password Show/Hide keeps its accessible label, uses theme accent and has a 44-point target.

## Preserved behavior

Existing validation, email/password and code authentication, Google/Apple calls, remembered-session storage, password reset, staff invitation and business-creation intents remain in the Account controller. Native Apple and Google branded controls remain. No hosted email, signup or password-reset request was triggered during presentation verification.

## Verification

86 focused checks pass across shared UI, pickup/navigation and authentication intent regressions. New rendered controls checks cover both themes, selected/checked accessibility states, exact available callbacks and rejection of busy mode/preference changes. These checks do not establish native geometry or live authentication.

An intermediate full TypeScript run reported an unrelated `subscriptionOption` optional-property type error in `listing-store-packages.ts`; the final combined TypeScript gate passes. The completed concurrent subscription changes are preserved in the verified export snapshot. Published Preview group `fe8cfe38-c15c-4198-bcde-e566f684ac8c` passes both native exports and fresh channel verification. See [release evidence](ratings-auth-attendees-staging-release-2026-09-28.md).

## Phone acceptance still required

Sign-in/signup/recovery/code layouts, password visibility, enlarged text, keyboard focus/insets, native provider buttons and top back pills need device review in both themes. Authentication request behavior remains subject to existing integration acceptance. The app-wide redesign objective remains active.
