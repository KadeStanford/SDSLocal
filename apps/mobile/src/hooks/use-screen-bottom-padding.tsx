import { createContext, useContext, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bottomContentPadding } from '@/lib/ui-presentation';

const TabOverlayContext = createContext({ height: 0, setHeight: (_height: number) => {} });
export function TabOverlayProvider({ children }: { readonly children: ReactNode }) {
  const [height, setHeight] = useState(0);
  return (
    <TabOverlayContext.Provider value={{ height, setHeight }}>
      {children}
    </TabOverlayContext.Provider>
  );
}
export function useTabOverlay() {
  return useContext(TabOverlayContext);
}
export function useScreenBottomPadding(includeTabOverlay = true) {
  const insets = useSafeAreaInsets();
  const { height } = useTabOverlay();
  // NativeTabs computes the real native bar obstruction (iOS scroll inset / Android safe area).
  // Do not add a guessed bar height on top of that system measurement.
  return bottomContentPadding(
    insets.bottom,
    Platform.OS === 'web' && includeTabOverlay ? height : 0,
  );
}
