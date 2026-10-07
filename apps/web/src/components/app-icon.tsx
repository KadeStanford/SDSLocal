import { createElement, type SVGProps } from 'react';
import { iconNodes, type IconName } from '@sds/design-tokens';

export function AppIcon({ name, size = 22, ...props }: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
      {iconNodes[name].map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}
    </svg>
  );
}
