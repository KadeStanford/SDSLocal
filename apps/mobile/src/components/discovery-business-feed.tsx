import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { HorizontalScrollRow } from './horizontal-scroll-row';
import { DiscoveryCarousel } from './discovery-carousel';
import type { DiscoveryFeedPlan } from '@/lib/discovery-feed';
import { BusinessCard, type BusinessCardData } from './business-card';
import { ThemedText } from './themed-text';
import { DISCOVER_LOCAL_SECTION_TITLE } from '@/lib/discovery-core';

export function DiscoveryBusinessFeed({
  businesses,
  followingIds,
  onOpenBusiness,
  children,
  plan,
  collection = 'all',
  onCollectionChange,
  title = DISCOVER_LOCAL_SECTION_TITLE,
}: {
  readonly businesses: readonly BusinessCardData[];
  readonly followingIds: ReadonlySet<string>;
  readonly onOpenBusiness: (id: string) => void;
  readonly children?: ReactNode;
  readonly plan?: DiscoveryFeedPlan | null | undefined;
  readonly collection?: string;
  readonly onCollectionChange?: ((id: string) => void) | undefined;
  readonly title?: string;
}) {
  const colors = useTheme();
  const [rowWidth, setRowWidth] = useState(350);
  const cardWidth = Math.min(340, Math.max(240, rowWidth - 42));
  const split = Boolean(children) && businesses.length > 3;
  const renderCard = (
    business: BusinessCardData,
    presentation: 'featured' | 'compact' = 'compact',
    stretch = false,
  ) => (
    <BusinessCard
      key={business.id}
      business={business}
      isFollowing={followingIds.has(business.id)}
      onPress={() => onOpenBusiness(business.id)}
      presentation={presentation}
      stretch={stretch}
    />
  );
  if (plan) {
    const selected = plan.filters.find((item) => item.id === collection);
    const sections = selected ? [{ ...selected, layout: 'compact' as const }] : plan.sections;
    const byId = new Map(businesses.map((b) => [b.id, b]));
    const labels: Record<string, string> = {
      breakfast: 'Breakfast',
      coffee: 'Coffee',
      lunch: 'Lunch',
      dinner: 'Dinner',
      treats: 'Sweet treats',
      mobile: 'Mobile stops',
      services: 'Services',
      shops: 'Shops',
      boutiques: 'Boutiques',
      clothing: 'Clothing',
      gifts: 'Gift shops',
      florists: 'Florists',
      rewards: 'Rewards',
      new: 'New places',
      community: 'Things to do',
      seasonal: 'Seasonal',
      'rain-coffee': 'Rainy-day coffee',
      'cool-down': 'Cool down',
      'warm-up': 'Warm up',
      'open-evening': 'Open now',
    };
    return (
      <View style={styles.feed} onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
        {plan.filters.length > 1 && (
          <HorizontalScrollRow contentContainerStyle={{ gap: 8 }}>
            {[{ id: 'all', title: 'Discover' }, ...plan.filters].map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected: (selected?.id ?? 'all') === item.id }}
                disabled={!onCollectionChange}
                onPress={() => onCollectionChange?.(item.id)}
                style={{
                  minHeight: 44,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  backgroundColor:
                    (selected?.id ?? 'all') === item.id
                      ? colors.backgroundSelected
                      : colors.backgroundElement,
                }}
              >
                <ThemedText type="smallBold">{labels[item.id] ?? item.title}</ThemedText>
              </Pressable>
            ))}
          </HorizontalScrollRow>
        )}
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText accessibilityRole="header" style={[styles.title, { flex: 1 }]}>
                {section.title}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {section.businessIds.length} {section.businessIds.length === 1 ? 'place' : 'places'}
              </ThemedText>
            </View>
            {section.businessIds.length > 1 ? (
              <DiscoveryCarousel
                key={`${section.id}:${section.businessIds.join(',')}:${cardWidth}`}
                id={section.id}
                title={section.title}
                total={section.businessIds.length}
                cardWidth={cardWidth}
                rowWidth={rowWidth}
              >
                {section.businessIds.map((id) => {
                  const business = byId.get(id);
                  return business ? (
                    <View key={id} style={{ width: cardWidth, flexShrink: 0 }}>
                      {renderCard(business, 'featured', true)}
                    </View>
                  ) : null;
                })}
              </DiscoveryCarousel>
            ) : (
              section.businessIds.map((id, index) => {
                const business = byId.get(id);
                return business
                  ? renderCard(
                      business,
                      section.layout === 'featured' && index === 0 ? 'featured' : 'compact',
                    )
                  : null;
              })
            )}
          </View>
        ))}
        {sections.length === 0 && (
          <ThemedText themeColor="textSecondary">
            No local matches right now. Change your area or use Filters to explore more businesses.
          </ThemedText>
        )}
        {children}
      </View>
    );
  }
  return (
    <View style={styles.feed}>
      {businesses.length > 0 && (
        <View style={styles.section}>
          <ThemedText accessibilityRole="header" style={styles.title}>
            {title}
          </ThemedText>
          {(split ? businesses.slice(0, 3) : businesses).map((b) => renderCard(b))}
        </View>
      )}
      {children}
      {split && (
        <View style={styles.section}>
          <ThemedText accessibilityRole="header" style={styles.title}>
            More to explore
          </ThemedText>
          {businesses.slice(3).map((b) => renderCard(b))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  feed: { gap: 28 },
  section: { gap: 20 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 19, lineHeight: 25, fontWeight: '700', letterSpacing: -0.4 },
});
