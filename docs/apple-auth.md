# Sign in with Apple

The mobile app now uses Apple's native authentication on supported iOS devices and sends the
returned identity token to Supabase. The browser auth page uses Supabase's Apple OAuth flow. Both
flows create a new account when the Apple identity is new, or sign the person into the existing
account when it has already been linked.

The repository configuration enables the iOS capability with `ios.usesAppleSignIn` and the
`expo-apple-authentication` config plugin. A new native build is required after changing that
capability; JavaScript-only updates can continue through Compose Watch.

Before testing outside Expo Go, configure the provider once:

1. In Apple Developer, enable **Sign in with Apple** for the SDS Local App ID
   (`com.stanforddevelopmentsolutions.sdslocal`).
2. In Supabase Authentication → Providers → Apple, enable Apple and add the App ID. For browser
   sign-in, also create an Apple Services ID and signing key, then add the generated client secret.
   For the local Supabase stack, the equivalent `[auth.external.apple]` block belongs in
   `supabase/config.toml` with `enabled = true`, an Apple client ID, and a secret supplied through
   environment variables; do not commit those values.
   Restart the local Supabase stack after changing this configuration so the Auth service reloads it.
3. Add the web callback URL to the Supabase redirect allow list:
   `${NEXT_PUBLIC_SITE_URL}/auth/callback`.
4. Rebuild the iOS app so the Apple capability is included in its entitlements.

Apple supplies a person's name only on the first native authorization. The mobile flow captures it
immediately and stores it in the user's profile when available.

Existing users can open **Account → Sign-in methods → Connect** beside Apple. That action opens
native Sign in with Apple and sends the verified ID token to Supabase's identity-linking endpoint,
so the Apple identity is attached to the current account; it does not silently create a second
account. Manual identity linking and the Apple provider must be enabled in Supabase for this button
to complete.
