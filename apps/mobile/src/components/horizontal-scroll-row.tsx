import { ScrollView, type ScrollViewProps } from 'react-native';

import { HORIZONTAL_SCROLL_GESTURE_PROPS } from '@/lib/gesture-policy';
import { useSwipeBackGestureBlocker } from '@/components/swipe-back-view';

export function HorizontalScrollRow({
  children,
  showsHorizontalScrollIndicator = false,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  ...props
}: Omit<ScrollViewProps, 'horizontal'>) {
  const { beginControlGesture, endControlGesture } = useSwipeBackGestureBlocker();

  return (
    <ScrollView
      {...props}
      {...HORIZONTAL_SCROLL_GESTURE_PROPS}
      horizontal
      onTouchStart={(event) => {
        beginControlGesture();
        onTouchStart?.(event);
      }}
      onTouchEnd={(event) => {
        endControlGesture();
        onTouchEnd?.(event);
      }}
      onTouchCancel={(event) => {
        endControlGesture();
        onTouchCancel?.(event);
      }}
      showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
    >
      {children}
    </ScrollView>
  );
}
