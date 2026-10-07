import { createElement } from 'react';
import { vi } from 'vitest';

// Render actual icon node data without loading native SVG bindings in Node.
vi.mock('react-native-svg', () => {
  const element = (tag: string) => ({ children, ...props }: any) => createElement(tag, props, children);
  return { default: element('svg'), Svg: element('svg'), Path: element('path'), Circle: element('circle'), Ellipse: element('ellipse'), Line: element('line'), Polygon: element('polygon'), Polyline: element('polyline'), Rect: element('rect'), Defs: element('defs'), LinearGradient: element('linearGradient'), Stop: element('stop') };
});
vi.mock('@/lib/haptics', () => ({ haptics: { selection: vi.fn(), light: vi.fn(), medium: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
