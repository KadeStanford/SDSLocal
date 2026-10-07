import { Animated, ScrollView, type ScrollViewProps } from 'react-native';

import { HORIZONTAL_SCROLL_GESTURE_PROPS } from '@/lib/gesture-policy';
import { useSwipeBackGestureBlocker } from '@/components/swipe-back-view';

export function HorizontalScrollRow({
  animated = false,
  children,
  showsHorizontalScrollIndicator = false,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  ...props
}: Omit<ScrollViewProps, 'horizontal'> & { animated?: boolean }) {
  const { beginControlGesture, endControlGesture } = useSwipeBackGestureBlocker();

  const ScrollComponent = animated ? Animated.ScrollView : ScrollView;
  return (
    <ScrollComponent
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
    </ScrollComponent>
  );
}
