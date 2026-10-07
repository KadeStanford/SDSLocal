import type { ComponentType, ReactNode } from 'react';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemeOverride } from '@/hooks/use-theme';

/** Business controls retain the established Parish Pass light and dark palette. */
export const BusinessColors = Colors;

export function BusinessThemeProvider({ children }: { readonly children: ReactNode }) {
  const scheme = useColorScheme();
  return (
    <ThemeOverride.Provider value={BusinessColors[scheme === 'dark' ? 'dark' : 'light']}>
      {children}
    </ThemeOverride.Provider>
  );
}

export function withBusinessTheme<P extends object>(Component: ComponentType<P>) {
  return function BusinessThemedScreen(props: P) {
    return (
      <BusinessThemeProvider>
        <Component {...props} />
      </BusinessThemeProvider>
    );
  };
}
