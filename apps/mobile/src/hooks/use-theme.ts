/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { createContext, useContext } from 'react';
import { Colors, type AppTheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export const ThemeOverride = createContext<AppTheme | null>(null);

export function useTheme() {
  const override = useContext(ThemeOverride);
  const scheme = useColorScheme();
  const theme = scheme === 'unspecified' ? 'light' : scheme;

  return override ?? Colors[theme];
}
