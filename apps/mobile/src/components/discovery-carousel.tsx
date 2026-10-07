import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { ThemedText } from './themed-text';

export function carouselPosition(offset: number, interval: number, total: number) {
  if (!Number.isFinite(offset) || interval <= 0 || total <= 0) return 0;
  return Math.max(0, Math.min(total - 1, Math.round(offset / interval)));
}

export function CarouselIndicators({ position, total }: { position: number; total: number }) {
  const colors = useTheme();
  const start = Math.max(0, Math.min(position - 2, total - 5));
  return (
    <View
      accessibilityLabel={`Business ${position + 1} of ${total}`}
      accessible
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingTop: 2,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        {Array.from({ length: Math.min(total, 5) }, (_, dot) => {
          const active = start + dot === position;
          return (
            <View
              key={start + dot}
              style={{
                width: active ? 20 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: active ? colors.accent : colors.textSecondary,
                opacity: active ? 1 : 0.45,
              }}
            />
          );
        })}
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={{ fontSize: 12 }}>
        {position + 1} / {total}
      </ThemedText>
    </View>
  );
}

export function DiscoveryCarousel({
  id,
  title,
  total,
  cardWidth,
  rowWidth,
  children,
  cardGap = 12,
  showIndicators = true,
}: {
  id: string;
  title: string;
  total: number;
  cardWidth: number;
  rowWidth: number;
  children: ReactNode;
  cardGap?: number;
  showIndicators?: boolean;
}) {
  const [position, setPosition] = useState(0);
  return (
    <View style={{ gap: 10 }}>
      <HorizontalScrollRow
        accessibilityLabel={`${title}, ${total} businesses. Swipe to explore.${showIndicators ? '' : ` Business ${position + 1} of ${total}.`}`}
        testID={`discovery-carousel-${id}`}
        snapToInterval={cardWidth + cardGap}
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={32}
        onScroll={(event) =>
          setPosition(
            carouselPosition(event.nativeEvent.contentOffset.x, cardWidth + cardGap, total),
          )
        }
        contentContainerStyle={{ gap: cardGap, paddingRight: Math.max(0, rowWidth - cardWidth) }}
      >
        {children}
      </HorizontalScrollRow>
      {showIndicators && <CarouselIndicators position={position} total={total} />}
    </View>
  );
}
