import { merchantThemeColors } from '@sds/design-tokens';
import { useColorScheme } from './use-color-scheme';
import { useContext } from 'react';
import type { AppTheme } from '@/constants/theme';
import { ThemeOverride } from './use-theme';

export function merchantColors(scheme: string | null, c?: AppTheme | null) {
  const key = scheme === 'dark' ? 'dark' : 'light';
  if (!c) return merchantThemeColors[key];
  return {
    ...merchantThemeColors[key],
    background: c.background,
    surface: c.backgroundElement,
    text: c.text,
    secondary: c.textSecondary,
    border: c.divider,
  };
}
export function useMerchantTheme() {
  return merchantColors(useColorScheme(), useContext(ThemeOverride));
}
