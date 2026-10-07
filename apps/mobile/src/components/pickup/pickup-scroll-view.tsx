import { useRef } from 'react';
import { ScrollView, type ScrollViewProps } from 'react-native';

/** Mount with a new key for each checkout step or order-status page. */
export function PickupScrollView({
  getSavedOffset,
  onOffsetChange,
  ...props
}: Omit<ScrollViewProps, 'onScroll' | 'onContentSizeChange'> & {
  getSavedOffset: () => number;
  onOffsetChange: (offset: number) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const restored = useRef(false);
  return (
    <ScrollView
      {...props}
      ref={scroll}
      onScroll={(event) => onOffsetChange(event.nativeEvent.contentOffset.y)}
      onScrollBeginDrag={() => {
        // Never override a user's gesture, even if content is still loading.
        restored.current = true;
      }}
      onContentSizeChange={() => {
        // Expanding support forms and incoming status updates also resize content.
        // Only restore on entry; subsequent layout changes belong to the user.
        if (restored.current) return;
        restored.current = true;
        const offset = getSavedOffset();
        if (offset > 0) scroll.current?.scrollTo({ y: offset, animated: false });
      }}
    />
  );
}
