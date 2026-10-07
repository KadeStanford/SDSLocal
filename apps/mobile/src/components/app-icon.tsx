import { createElement, type ComponentType } from 'react';
import { StyleSheet, View, type ColorValue, type ViewProps } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { iconNodes, resolveIconName } from '@sds/design-tokens';
import { useTheme } from '@/hooks/use-theme';

const primitives = { path: Path, circle: Circle, ellipse: Ellipse, line: Line, polygon: Polygon, polyline: Polyline, rect: Rect } as unknown as Record<string, ComponentType<Record<string, string | number>>>;
export type AppIconProps = ViewProps & {
  name: string | { ios?: string; android?: string; web?: string };
  size?: number;
  tintColor?: ColorValue;
  weight?: string;
  fill?: boolean;
};

/** One icon family on every platform. Existing symbol names remain semantic aliases. */
export function AppIcon({ name, size = 22, tintColor, style, fill = false, weight: _weight, ...props }: AppIconProps) {
  const theme = useTheme();
  const color = tintColor ?? theme.text;
  const resolved = resolveIconName(typeof name === 'string' ? name : name.ios ?? name.web ?? name.android ?? 'circle-help');
  const dimensions = StyleSheet.flatten(style);
  const width = typeof dimensions?.width === 'number' ? dimensions.width : size;
  const height = typeof dimensions?.height === 'number' ? dimensions.height : size;
  return (
    <View accessible={false} importantForAccessibility="no" {...props} style={[{ width, height }, style]}>
      <Svg width="100%" height="100%" viewBox="0 0 24 24" fill={fill ? color : 'none'} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {iconNodes[resolved].map(([tag, attributes], index) => createElement(primitives[tag]!, { ...attributes, key: index }))}
      </Svg>
    </View>
  );
}
