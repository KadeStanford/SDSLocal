import { createElement } from 'react';

/** Outline stand-ins for native SF Symbols in component review screenshots. */
export function VisualSymbol({
  name,
  tintColor,
  style,
}: {
  name: string | { ios: string };
  tintColor?: string;
  style?: { width?: number; height?: number };
}) {
  const key = (typeof name === 'string' ? name : name.ios).replace('.fill', '');
  const paths: Record<string, string> = {
    'slider.horizontal.3':
      'M3 6h4 M11 6h10 M3 12h10 M17 12h4 M3 18h4 M11 18h10 M7 3v6 M13 9v6 M7 15v6',
    'arrow.clockwise': 'M20 8a9 9 0 1 0 1 8 M20 3v5h-5',
    ellipsis: 'M5 12h.01 M12 12h.01 M19 12h.01',
    flag: 'M5 22V3 M5 3c5-4 9 4 14 0v11c-5 4-9-4-14 0',
    'arrow.up.right': 'M6 18L18 6 M6 6h12v12',
    'pause.circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M9 8v8 M15 8v8',
    plus: 'M12 5v14 M5 12h14',
    xmark: 'M5 5l14 14 M19 5L5 19',
    'xmark.circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M8 8l8 8 M16 8l-8 8',
    'wrench.and.screwdriver': 'M14 3a6 6 0 0 0-6 8L2 17l5 5 6-6a6 6 0 0 0 8-6l-4 4-4-4 4-4z',
    'checkmark.seal':
      'M12 2l3 2 4 1 1 4 2 3-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-3 1-4 4-1z M7 12l3 3 7-7',
    envelope: 'M2 5h20v14H2z M2 5l10 8L22 5',
    clock: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2',
    sparkles: 'M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z',
    'chevron.left': 'M15 5l-7 7 7 7',
    'chevron.right': 'M9 5l7 7-7 7',
    'chevron.down': 'M5 9l7 7 7-7',
    pencil: 'M4 16L16 4l4 4L8 20H4z M14 6l4 4',
    trash: 'M4 6h16 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7',
    magnifyingglass: 'M21 21l-6-6 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
    'mappin.and.ellipse':
      'M12 22s7-9 7-14a7 7 0 0 0-14 0c0 5 7 14 7 14 M15 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    'person.crop.circle':
      'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M5 19c1-6 13-6 14 0',
    bell: 'M4 17h16l-2-3V9a6 6 0 0 0-12 0v5z M10 21h4',
    lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
    'hand.raised':
      'M7 11V5a2 2 0 0 1 4 0v6 M11 7V3a2 2 0 0 1 4 0v9 M15 7a2 2 0 0 1 4 0v10c0 7-10 7-12 2l-4-6c-1-3 2-4 4-1',
    externaldrive: 'M3 9h18v12H3z M3 9l3-6h12l3 6 M6 16h7 M17 16h1',
    calendar: 'M3 5h18v16H3z M7 2v6 M17 2v6 M3 10h18',
    ticket: 'M2 5h20v5a2 2 0 0 0 0 4v5H2v-5a2 2 0 0 0 0-4z M15 5v14',
    creditcard: 'M2 5h20v14H2z M2 10h20 M5 15h5',
    'building.2': 'M3 22V2h10v20 M13 9h8v13 M6 6h4 M6 10h4 M6 14h4 M16 13h2 M16 17h2',
    'square.grid.2x2': 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    bag: 'M5 7h14l1 14H4z M8 8V6a4 4 0 0 1 8 0v2',
    gift: 'M3 8h18v4H3z M5 12v9h14v-9 M12 8v13',
    checkmark: 'M4 12l5 5L20 6',
    'checkmark.circle': 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M7 12l3 3 7-7',
  };
  return createElement(
    'svg',
    {
      width: style?.width ?? 20,
      height: style?.height ?? 20,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: tintColor ?? 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': true,
    },
    createElement('path', { d: paths[key] ?? paths['square.grid.2x2'] }),
  );
}
