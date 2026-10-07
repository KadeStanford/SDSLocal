import type { AppTheme } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive';
export function buttonPresentation(
  colors: AppTheme,
  variant: ButtonVariant,
  disabled = false,
  loading = false,
) {
  const blocked = disabled || loading;
  return {
    disabled: blocked,
    accessibilityState: { disabled: blocked, busy: loading },
    backgroundColor: blocked
      ? colors.backgroundSelected
      : variant === 'primary'
        ? colors.actionPrimary
        : variant === 'destructive'
          ? colors.errorSurface
          : variant === 'secondary'
            ? colors.backgroundSelected
            : 'transparent',
    color: blocked
      ? colors.textSecondary
      : variant === 'primary'
        ? colors.onAction
        : variant === 'destructive'
          ? colors.errorText
          : variant === 'tertiary'
            ? colors.accent
            : colors.text,
  };
}

/** NativeTabs already reserves its actual native bar. Web supplies its measured overlay height. */
export function bottomContentPadding(safeAreaBottom: number, overlayHeight = 0, buffer = 16) {
  return Math.max(0, safeAreaBottom) + Math.max(0, overlayHeight) + Math.max(0, buffer);
}

export function dataDisplayState(loading: boolean, count: number, error: string | null) {
  if (count > 0) return 'content';
  if (loading) return 'loading';
  return error ? 'error' : 'empty';
}
