import { Animated, StyleSheet } from 'react-native';

/**
 * A scroll-linked page indicator. Keeping this separate from RewardsScreen
 * makes the viewer animation reusable for business and event galleries.
 */
export function EventPagerDot({
  index,
  pageWidth,
  scrollX,
}: {
  readonly index: number;
  readonly pageWidth: number;
  readonly scrollX: Animated.Value;
}) {
  const center = index * pageWidth;
  const distance = Math.max(1, pageWidth);
  const inputRange = [center - distance, center, center + distance];

  return (
    <Animated.View
      accessibilityLabel={`Photo ${index + 1}`}
      style={[
        styles.dot,
        {
          opacity: scrollX.interpolate({
            inputRange,
            outputRange: [0.42, 1, 0.42],
            extrapolate: 'clamp',
          }),
          transform: [
            {
              scale: scrollX.interpolate({
                inputRange,
                outputRange: [0.82, 1.5, 0.82],
                extrapolate: 'clamp',
              }),
            },
          ],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
