import type { ConfigContext, ExpoConfig } from 'expo/config';

const siteUrl = process.env.EXPO_PUBLIC_SITE_URL;
const publicHost = siteUrl ? new URL(siteUrl).hostname : undefined;
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? '2406d47e-390c-4a39-932c-325b2ec5ab99';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'SDS Local',
  slug: 'sds-local',
  description: 'Discover, follow, and earn rewards with local businesses.',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'sdslocal',
  userInterfaceStyle: 'automatic',
  runtimeVersion: { policy: 'appVersion' },
  ios: {
    bundleIdentifier: 'com.stanforddevelopmentsolutions.sdslocal',
    icon: './assets/expo.icon',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
    associatedDomains: publicHost ? [`applinks:${publicHost}`] : [],
  },
  android: {
    package: 'com.stanforddevelopmentsolutions.sdslocal',
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      backgroundColor: '#F8F7F2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
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
            ],
          },
        ]
      : [],
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
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
        backgroundColor: '#176B4D',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
    siteUrl,
    easProjectId,
    eas: { projectId: easProjectId },
  },
});
