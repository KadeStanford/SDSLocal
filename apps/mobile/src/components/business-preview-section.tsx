import { useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { Animated, Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { AppButton } from './app-button';
import { HorizontalScrollRow } from './horizontal-scroll-row';

export function BusinessPreviewSection({
  title,
  detail,
  action = 'See all',
  onSeeAll,
  children,
}: {
  title: string;
  detail?: string;
  action?: string;
  onSeeAll: () => void;
  children?: ReactNode;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <ThemedText type="subtitle">{title}</ThemedText>
          {!!detail && (
            <ThemedText type="caption" themeColor="textSecondary">
              {detail}
            </ThemedText>
          )}
        </View>
        <AppButton
          label={action}
          accessibilityLabel={`${action} ${title.toLowerCase()}`}
          variant="secondary"
          onPress={onSeeAll}
          style={{ minHeight: 44, paddingHorizontal: 14 }}
        />
      </View>
      {children}
    </View>
  );
}

export function BusinessPreviewCarousel({
  children,
  count,
  label,
  width = 260,
}: {
  children: ReactNode;
  count: number;
  label: string;
  width?: number;
}) {
  const c = useTheme();
  const [index, setIndex] = useState(0);
  const [viewport, setViewport] = useState(width);
  const dotCount = Math.min(count, 6);
  const dotStep = dotCount > 1 ? (count - 1) / (dotCount - 1) : 1;
  const [scrollX] = useState(() => new Animated.Value(0));
  return (
    <View style={{ gap: 10 }}>
      <HorizontalScrollRow
        animated
        onLayout={(event) => setViewport(event.nativeEvent.layout.width)}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: true,
        })}
        accessibilityLabel={label}
        snapToInterval={width + 12}
        decelerationRate="fast"
        contentContainerStyle={{ gap: 12, paddingRight: Math.max(0, viewport - width) }}
        onMomentumScrollEnd={(e) =>
          setIndex(
            Math.min(
              count - 1,
              Math.max(0, Math.round(e.nativeEvent.contentOffset.x / (width + 12))),
            ),
          )
        }
      >
        {children}
      </HorizontalScrollRow>
      {count > 1 && (
        <View
          accessibilityLabel={`Card ${index + 1} of ${count}`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          {Array.from({ length: dotCount }, (_, i) => (
            <View
              key={i}
              style={{ width: 16, height: 5, justifyContent: 'center', alignItems: 'center' }}
            >
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.border }} />
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 16,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: c.accent,
                  opacity: scrollX.interpolate({
                    inputRange: [
                      (i - 1) * dotStep * (width + 12),
                      i * dotStep * (width + 12),
                      (i + 1) * dotStep * (width + 12),
                    ],
                    outputRange: [0, 1, 0],
                    extrapolate: 'clamp',
                  }),
                  transform: [
                    {
                      scaleX: scrollX.interpolate({
                        inputRange: [
                          (i - 1) * dotStep * (width + 12),
                          i * dotStep * (width + 12),
                          (i + 1) * dotStep * (width + 12),
                        ],
                        outputRange: [0.32, 1, 0.32],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              />
            </View>
          ))}
          <ThemedText type="caption" themeColor="textSecondary" style={{ marginLeft: 5 }}>
            Swipe to explore
          </ThemedText>
        </View>
      )}
    </View>
  );
}

export function BusinessOfferingPreview({
  name,
  description,
  price,
  imageUri,
  onPress,
}: {
  name: string;
  description?: string;
  price?: string;
  imageUri?: string | null;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 260,
        padding: 10,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 18,
        backgroundColor: c.backgroundElement,
        gap: 12,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          contentFit="cover"
          style={{ height: 138, borderRadius: 11 }}
          accessibilityLabel={`${name} photo`}
        />
      ) : (
        <View
          style={{
            height: 88,
            borderRadius: 11,
            backgroundColor: c.backgroundSelected,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ThemedText type="subtitle">{name.substring(0, 1)}</ThemedText>
        </View>
      )}
      <View style={{ paddingHorizontal: 4, paddingBottom: 5, gap: 6 }}>
        <ThemedText type="card" numberOfLines={2}>
          {name}
        </ThemedText>
        {!!description && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {description}
          </ThemedText>
        )}
        {!!price && <ThemedText type="smallBold">{price}</ThemedText>}
      </View>
    </Pressable>
  );
}
