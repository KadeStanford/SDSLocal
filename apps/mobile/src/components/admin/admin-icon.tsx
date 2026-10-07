import { createElement, type ComponentType } from 'react';
import { View, type ColorValue } from 'react-native';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';
import { adminIconNodes } from './admin-icon-nodes';

const primitives = {
  path: Path,
  circle: Circle,
  line: Line,
  polyline: Polyline,
  rect: Rect,
} as unknown as Record<string, ComponentType<Record<string, string | number>>>;
/** Uses the same canonical Lucide paths as AppIcon, with no broad redesign dependency. */
export function AdminIcon({
  name,
  size = 22,
  tintColor = '#102D25',
}: {
  name: string;
  size?: number;
  tintColor?: ColorValue;
}) {
  const nodes =
    adminIconNodes[name as keyof typeof adminIconNodes] ?? adminIconNodes['circle-help'];
  return (
    <View accessible={false} importantForAccessibility="no" style={{ width: size, height: size }}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 24 24"
        fill="none"
        stroke={tintColor}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {nodes.map(([tag, attributes], index) =>
          createElement(primitives[tag]!, { ...attributes, key: index }),
        )}
      </Svg>
    </View>
  );
}
