export const color = {
  ink: '#15221B',
  canvas: '#F8F7F2',
  surface: '#FFFFFF',
  brand: '#176B4D',
  brandStrong: '#0E4C36',
  accent: '#E99B45',
  danger: '#B42318',
  muted: '#66756D',
  border: '#D7DED9',
} as const;

/**
 * Semantic surfaces shared by the native app and the web experience.
 * Keep component styles pointed at these roles instead of inventing a new
 * color for each screen.  The dark palette intentionally keeps the same
 * contrast relationships as the light palette.
 */
export const themeColors = {
  light: {
    text: '#14231C',
    background: '#F6F5F0',
    backgroundElement: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    backgroundSelected: '#DCECE3',
    textSecondary: '#596860',
    textMuted: '#627168',
    accent: '#176B4D',
    accentPressed: '#0E4C36',
    onAccent: '#FFFFFF',
    actionPrimary: '#176B4D',
    actionPressed: '#0E4C36',
    onAction: '#FFFFFF',
    destructive: '#B42318',
    divider: '#DEE4DF',
    inputBorder: '#7B8980',
    infoSurface: '#E8EFF7',
    infoText: '#153B62',
    skeleton: '#DEE4DF',
    backdrop: 'rgba(4,12,8,0.58)',
    logoSurface: '#87958D',
    border: '#BFCAC3',
    successSurface: '#E7F0EA',
    successText: '#164E38',
    warningSurface: '#FFF0C7',
    warningText: '#3D3100',
    errorSurface: '#F8E6E6',
    errorText: '#761F1F',
  },
  dark: {
    text: '#F3F7F4',
    background: '#0E1411',
    backgroundElement: '#1B2721',
    surfaceElevated: '#28372F',
    backgroundSelected: '#26362E',
    textSecondary: '#AEBBB4',
    textMuted: '#9AACA1',
    accent: '#70D6A6',
    accentPressed: '#A0E8C5',
    onAccent: '#10271B',
    actionPrimary: '#176B4D',
    actionPressed: '#0E4C36',
    onAction: '#FFFFFF',
    destructive: '#FFB4AB',
    divider: '#35493D',
    inputBorder: '#7C9284',
    infoSurface: '#203344',
    infoText: '#C0DDF6',
    skeleton: '#35493D',
    backdrop: 'rgba(4,12,8,0.72)',
    logoSurface: '#87958D',
    border: '#718078',
    successSurface: '#20372B',
    successText: '#B7E3C9',
    warningSurface: '#3D3420',
    warningText: '#F2D992',
    errorSurface: '#432526',
    errorText: '#F2B8B8',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  compact: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const minimumTouchTarget = 44;

export const typography = {
  title: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5 },
  section: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  card: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  secondary: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  metadata: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  button: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  number: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
} as const;

export const iconSize = { small: 18, normal: 22, large: 28 } as const;
