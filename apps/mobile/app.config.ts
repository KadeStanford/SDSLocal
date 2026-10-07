import type { ConfigContext, ExpoConfig } from 'expo/config';

const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;
const testerBuild = process.env.EXPO_PUBLIC_TESTER_BUILD === 'true';
if (testerBuild) {
  if (
    process.env.EXPO_PUBLIC_APP_ENV !== 'staging' ||
    process.env.EXPO_PUBLIC_STAGING_SUPABASE_URL !== 'https://lgddhdexvwclfrnzjtly.supabase.co' ||
    !process.env.EXPO_PUBLIC_STAGING_SUPABASE_ANON_KEY
  ) {
    throw new Error(
      'Tester builds require the approved staging backend and its public client key.',
    );
  }
  for (const name of [
    'EXPO_PUBLIC_PRIVACY_URL',
    'EXPO_PUBLIC_TERMS_URL',
    'EXPO_PUBLIC_SUPPORT_URL',
  ]) {
    const url = new URL(process.env[name] ?? 'https://missing.invalid');
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      !url.hostname.includes('.') ||
      /(?:localhost|\.local$|\.invalid$|\.test$|^example\.(?:com|org|net)$|^(?:\d{1,3}\.){3}\d{1,3}$|:)/.test(
        url.hostname,
      )
    ) {
      throw new Error(`Tester builds require a public HTTPS ${name}.`);
    }
  }
}
const shareBaseUrl = process.env.EXPO_PUBLIC_SHARE_BASE_URL;
const loopbackHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
function reachableHost(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return /^https?:$/.test(parsed.protocol) && !loopbackHosts.has(parsed.hostname)
      ? parsed.hostname
      : undefined;
  } catch {
    return undefined;
  }
}
const publicHost = reachableHost(shareBaseUrl) ?? reachableHost(siteUrl);
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '2406d47e-390c-4a39-932c-325b2ec5ab99';
const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME?.trim();
const stripeMerchantIdentifier = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER?.trim();
const stripeEnableGooglePay = process.env.EXPO_PUBLIC_STRIPE_ENABLE_GOOGLE_PAY === 'true';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Parish Pass',
  slug: 'sds-local',
  description: 'Discover, follow, and earn rewards with local businesses.',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/branding/parish-pass/native-icon-light.png',
  backgroundColor: '#102D25',
  scheme: 'sdslocal',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: testerBuild ? 'fingerprint' : 'appVersion' },
  updates: {
    ...(process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === 'true' ? { enabled: false } : {}),
    url: `https://u.expo.dev/${easProjectId}`,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
  },
  ios: {
    bundleIdentifier: 'com.stanforddevelopmentsolutions.sdslocal',
    icon: {
      light: './assets/branding/parish-pass/native-icon-light.png',
      dark: './assets/branding/parish-pass/native-icon-dark.png',
      tinted: './assets/branding/parish-pass/native-icon-tinted.png',
    },
    deploymentTarget: '18.0',
    supportsTablet: true,
    // Required for the native Sign in with Apple capability. This is applied
    // during the next native build; Expo Go can still be used for local tests.
    usesAppleSignIn: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    associatedDomains: publicHost ? [`applinks:${publicHost}`] : [],
  },
  android: {
    package: 'com.stanforddevelopmentsolutions.sdslocal',
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      backgroundColor: '#102D25',
      foregroundImage: './assets/branding/parish-pass/native-adaptive-foreground.png',
      monochromeImage: './assets/branding/parish-pass/native-adaptive-monochrome.png',
    },
    intentFilters: publicHost
      ? [
          {
            action: 'VIEW',
            autoVerify: true,
            category: ['BROWSABLE', 'DEFAULT'],
            data: [
              { scheme: 'https', host: publicHost, pathPrefix: '/b' },
              { scheme: 'https', host: publicHost, pathPrefix: '/events' },
              { scheme: 'https', host: publicHost, pathPrefix: '/staff-invite' },
            ],
          },
        ]
      : [],
  },
  web: {
    output: 'static',
    favicon: './assets/branding/parish-pass/native-favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    'expo-maps',
    [
      'expo-calendar',
      {
        writeOnlyAccess: true,
        writeOnlyCalendarPermission:
          'SDS Local adds events to your calendar only when you choose Add to Calendar.',
      },
    ],
    'expo-apple-authentication',
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'SDS Local does not use Face ID in the current app flow.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'SDS Local uses your location to show nearby businesses and mobile business stops.',
        locationAlwaysAndWhenInUsePermission:
          'SDS Local uses your location in the background only when you enable alerts for nearby mobile businesses.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    [
      'expo-contacts',
      {
        contactsPermission: 'SDS Local uses your contacts only when you choose to invite friends.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'SDS Local accesses your photos only when you choose an image to upload.',
        savePhotosPermission:
          'SDS Local saves images to your photo library only when you choose Save.',
        granularPermissions: ['photo'],
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'SDS Local uses your photos so you can add images to your business page.',
        cameraPermission:
          'SDS Local uses your camera so you can take photos for your business page.',
        microphonePermission: false,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow SDS Local staff to scan customer rewards cards.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-notifications',
      {
        color: '#176B4D',
        defaultChannel: 'updates',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#102D25',
        image: './assets/branding/parish-pass/native-splash.png',
        imageWidth: 106,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#102D25',
          image: './assets/branding/parish-pass/native-splash.png',
        },
      },
    ],
    ...(googleIosUrlScheme
      ? [
          ['@react-native-google-signin/google-signin', { iosUrlScheme: googleIosUrlScheme }] as [
            string,
            { iosUrlScheme: string },
          ],
        ]
      : []),
    [
      '@stripe/stripe-react-native',
      {
        enableGooglePay: stripeEnableGooglePay,
        ...(stripeMerchantIdentifier ? { merchantIdentifier: stripeMerchantIdentifier } : {}),
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    testerBuild,
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    // Do not put a loopback URL into the mobile manifest. Web development may
    // still use localhost, but a phone must only receive a reachable host.
    siteUrl: publicHost ? (shareBaseUrl ?? siteUrl) : undefined,
    easProjectId,
    eas: { projectId: easProjectId },
  },
});
