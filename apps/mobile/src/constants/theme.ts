/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';
import { color, radius, spacing, themeColors } from '@sds/design-tokens';

export type AppTheme = { readonly [K in keyof typeof themeColors.light]: string };
export const Colors: { readonly light: AppTheme; readonly dark: AppTheme } = themeColors;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    // React Native Web quotes variable expressions as family names; use native CSS families.
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'system-ui',
    mono: 'ui-monospace',
  },
});

export const Spacing = {
  half: 2,
  one: spacing.xs,
  two: spacing.sm,
  three: spacing.md,
  four: spacing.lg,
  five: spacing.xl,
  six: 64,
} as const;

/** Shared product tokens: calm local-marketplace green, warm surfaces, and soft geometry. */
export const Brand = {
  primary: color.brand,
  primaryBright: '#2FB07C',
  primarySoft: '#DCECE3',
  danger: color.danger,
  border: color.border,
  onPrimary: '#FFFFFF',
} as const;

export const Radius = {
  small: radius.sm + 4,
  medium: radius.md + 2,
  large: radius.lg,
  hero: 26,
  pill: radius.pill,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
