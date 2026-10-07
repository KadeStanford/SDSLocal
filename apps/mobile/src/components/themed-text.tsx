import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { typography } from '@sds/design-tokens';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'card'
    | 'button'
    | 'caption'
    | 'number';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        {
          color: theme[themeColor ?? 'text'],
          fontFamily: Platform.OS === 'web' ? 'system-ui' : Fonts.sans,
        },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && [styles.linkPrimary, { color: theme.accent }],
        type === 'card' && typography.card,
        type === 'button' && typography.button,
        type === 'caption' && typography.caption,
        type === 'number' && typography.number,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: typography.metadata,
  smallBold: typography.label,
  default: typography.body,
  title: typography.title,
  subtitle: typography.section,
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
