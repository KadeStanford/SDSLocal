# Nearby mobile-business alerts: store-review notes

## User-facing purpose

Nearby mobile-business alerts tell a customer when a **mobile business they
already follow** has a currently active, published service stop within the
customer's selected whole-mile radius from 1 through 25 miles. The feature uses operating-system
geofencing. It does not continuously track the customer, track fixed-location
businesses, or alert for businesses the customer does not follow.

The disclosure shown before permission prompts is:

> SDS Local uses your location to alert you when mobile businesses you follow
> are serving nearby, even when the app is closed or not in use. Your location
> is evaluated on this device and is not used for advertising.

The settings card also states that SDS Local does not upload a continuous
location history.

## Opt-in and permission sequence

The feature defaults off. Merely launching SDS Local or following a business
does not request location access. After the customer explicitly enables
**Nearby mobile-business alerts**, SDS Local:

1. shows the in-app disclosure;
2. requests notification permission;
3. requests foreground/While Using location permission;
4. requests background/Always location permission only after foreground access
   is granted; and
5. registers geofences only when every required permission is currently
   available.

On Android 11 and later, SDS Local explains that the operating system is about
to open app settings before requesting background access. On both platforms,
the app re-checks permission and location-service state when it becomes active.
The UI never labels the feature Enabled solely because an account preference is
on; Enabled means the current device also has the required permissions.

## Data and privacy behavior

- Published stop coordinates come from Supabase.
- The device evaluates geofence entry locally and creates the nearby
  notification locally.
- SDS Local does not continuously upload customer coordinates, create a
  server-side customer travel history, use location for advertising, or include
  precise coordinates in analytics or notification content.
- A recent foreground/last-known coordinate may be cached only on the device,
  for up to 24 hours, to prioritize a bounded set of regions. It is a single
  replaceable value, not a location trail.
- Local deduplication retains only a user/stop/service-window key and expiration
  metadata. Old records expire automatically.

The eventual public privacy policy must plainly describe the above purpose,
background processing, retention, device-local prioritization and
deduplication, permission choices, and how a customer disables the feature or
deletes their account. A public policy URL has intentionally not been invented
for this staging phase.

## Reviewer demonstration

Use an EAS Preview build connected to the staging project and a staging customer
account that follows a staging mobile business with a current published stop.

1. Open **Account → Notifications**.
2. Show that Nearby mobile-business alerts is initially Off and the distance
   defaults to 5 miles.
3. Tap the switch and show the disclosure before any system permission prompt.
4. Grant notifications, While Using location, and Always/Allow all the time
   location in sequence.
5. Return to the screen and show Enabled.
6. Use the staging-only **Send test nearby alert** action to demonstrate local
   notification presentation and safe navigation. Explain that this action does
   not simulate or prove geofence entry.
7. For a real demonstration, publish a short-lived staging stop at a safe public
   location, leave the selected radius, then enter it during its active service
   window. Re-entering the same stop window should not generate another alert.
8. Turn the global switch off and show that monitoring stops. Re-enable it and
   show that the selected distance remains.

Apple and Google reviewers should receive staging account credentials and the
exact business/stop name in the review notes. A short screen recording is likely
needed for Google Play's background-location declaration and is also useful for
Apple review. The recording should show the in-app disclosure, the user action
that begins the permission sequence, the background-location system choice, the
resulting status, and a representative alert/navigation result.

## Platform declarations and limitations

- Google Play requires the Background Location declaration form, a prominent
  in-app disclosure before the runtime request, a privacy policy, and typically
  a short video demonstrating the core background-location feature. The declared
  purpose must match the app: alerts for active nearby stops from followed mobile
  businesses.
- Apple review notes should explain why Always authorization is required for
  region-entry delivery while SDS Local is not in use and how the user opts in
  and disables it.
- iOS permits at most 20 monitored regions per app. Android permits at most 100.
  SDS Local deterministically prioritizes active stops, then soonest upcoming
  stops, then proximity when a recent foreground location exists, over a
  seven-day horizon.
- Android does not guarantee that a force-stopped app will wake for a geofence.
  SDS Local reconciles registrations the next time it launches or returns to the
  foreground. Device vendors may impose additional background restrictions.
- Focus, Do Not Disturb, notification, sound, and battery settings remain under
  operating-system control. SDS Local does not implement separate quiet hours.
- Automated tests and the staging test action do not prove real background
  delivery. Physical-device entry testing remains required before store review.

## Official references

- [Expo Location background permissions and geofencing](https://docs.expo.dev/versions/v57.0.0/sdk/location/)
- [Google Play background-location requirements](https://support.google.com/googleplay/android-developer/answer/9799150)
- [Google Play prominent disclosure guidance](https://support.google.com/googleplay/android-developer/answer/11150561)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
