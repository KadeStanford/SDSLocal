import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BusinessColors, BusinessThemeProvider } from './business-theme';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const state = vi.hoisted(() => ({ scheme: 'light' as 'light' | 'dark' }));
vi.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => state.scheme }));
vi.mock('react-native', () => ({
  Platform: { select: (values: Record<string, unknown>) => values.web },
}));

function Probe() {
  const c = useTheme();
  return (
    <span>
      {c.background}|{c.text}|{c.actionPrimary}
    </span>
  );
}

describe('business theme scope', () => {
  it.each(['light', 'dark'] as const)('keeps %s customer siblings on the app theme', (scheme) => {
    state.scheme = scheme;
    const app = Colors[scheme];
    const business = BusinessColors[scheme];
    expect(
      renderToStaticMarkup(
        <>
          <Probe />
          <BusinessThemeProvider>
            <Probe />
          </BusinessThemeProvider>
          <Probe />
        </>,
      ),
    ).toBe(
      `<span>${app.background}|${app.text}|${app.actionPrimary}</span><span>${business.background}|${business.text}|${business.actionPrimary}</span><span>${app.background}|${app.text}|${app.actionPrimary}</span>`,
    );
    expect(business.actionPrimary).toBe(app.actionPrimary);
    expect(business).toEqual(app);
  });
});
