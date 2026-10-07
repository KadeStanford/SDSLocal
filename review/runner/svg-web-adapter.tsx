// Browser review only. Use the installed SVG implementation and translate the
// native decorative/accessibility props at the web boundary. No SVG geometry,
// sizes, colours, font choices or native insets are invented here.
import React, { forwardRef } from 'react';
import OfficialSvg from '@parish-audit/svg-library';
export * from '@parish-audit/svg-library';
export const Svg = forwardRef<any, any>(function AuditSvg(
  { accessible, accessibilityLabel, accessibilityRole, ...props },
  ref,
) {
  const accessibility = accessible === false
    ? { 'aria-hidden': true, focusable: false }
    : {
        ...(accessibilityLabel ? { 'aria-label': accessibilityLabel } : {}),
        ...(accessibilityRole ? { role: accessibilityRole } : {}),
      };
  return <OfficialSvg {...props} {...accessibility} ref={ref} />;
});
export default Svg;
