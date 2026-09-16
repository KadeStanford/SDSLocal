/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#14231C',
    background: '#F6F5F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#DCECE3',
    textSecondary: '#596860',
  },
  dark: {
    text: '#F3F7F4',
    background: '#0E1411',
    backgroundElement: '#19221E',
    backgroundSelected: '#26362E',
    textSecondary: '#AEBBB4',
  },
} as const;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Shared product tokens: calm local-marketplace green, warm surfaces, and soft geometry. */
export const Brand = {
  primary: '#176B4D',
  primaryBright: '#2FB07C',
  primarySoft: '#DCECE3',
  danger: '#A13D3D',
  border: '#718078',
  onPrimary: '#FFFFFF',
} as const;

export const Radius = {
  small: 12,
  medium: 16,
  large: 22,
  hero: 26,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
