import { useState, type ReactNode, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { ParishPalette } from './parish-brand';
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
  const cardWidth = rowWidth;
  const split = Boolean(children) && businesses.length > 3;
  const renderCard = (
    business: BusinessCardData,
    presentation: 'featured' | 'compact' = 'compact',
    stretch = false,
  ) => (
    <BusinessCard
      discovery
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
          <DiscoveryCategoryBand
            items={[{ id: 'all', title: 'Discover' }, ...plan.filters].map((item) => ({
              id: item.id,
              title: labels[item.id] ?? item.title,
            }))}
            selected={selected?.id ?? 'all'}
            width={rowWidth}
            onChange={onCollectionChange}
          />
        )}
        {sections.map((section, sectionIndex) => (
          <View key={section.id} style={styles.section}>
            <View style={styles.sectionHeading}>
              <ThemedText
                accessibilityRole="header"
                style={[
                  styles.title,
                  { flex: 1 },
                  sectionIndex > 0 && { fontSize: 22, lineHeight: 28 },
                ]}
              >
                {section.title}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={{ fontSize: 13, lineHeight: 18 }}
              >
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
                cardGap={16}
                showIndicators
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
  feed: { gap: 24 },
  section: { gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '700' },
});

function DiscoveryCategoryBand({
  items,
  selected,
  width,
  onChange,
}: {
  items: readonly { id: string; title: string }[];
  selected: string;
  width: number;
  onChange: ((id: string) => void) | undefined;
}) {
  const colors = useTheme();
  const { fontScale } = useWindowDimensions();
  const columns = fontScale > 1.15 ? 2 : 4;
  const categoryWidth = Math.max(50, (width - 26) / columns);
  const core = ['all', 'lunch', 'services', 'coffee'];
  // Existing additional collections remain reachable by swiping the same band.
  const ordered = [
    ...core.flatMap((id) => items.filter((item) => item.id === id)),
    ...items.filter((item) => !core.includes(item.id)),
  ];
  const symbols: Record<string, ComponentProps<typeof SymbolView>['name']> = {
    all: { ios: 'safari', android: 'explore', web: 'explore' },
    lunch: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
    services: { ios: 'wrench.and.screwdriver', android: 'handyman', web: 'handyman' },
    coffee: { ios: 'cup.and.saucer', android: 'local_cafe', web: 'local_cafe' },
    rewards: { ios: 'gift', android: 'card_giftcard', web: 'card_giftcard' },
  };
  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.divider,
        backgroundColor: colors.backgroundElement,
        padding: 12,
        overflow: 'hidden',
        marginTop: -8,
      }}
    >
      <HorizontalScrollRow
        accessibilityLabel={
          ordered.length > columns
            ? 'Business categories. Swipe for more categories.'
            : 'Business categories'
        }
        snapToInterval={categoryWidth * columns}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={{
          paddingRight:
            ordered.length % columns ? categoryWidth * (columns - (ordered.length % columns)) : 0,
        }}
      >
        {ordered.map((item) => {
          const active = selected === item.id;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={item.title}
              accessibilityState={{ selected: active }}
              disabled={!onChange}
              onPress={() => onChange?.(item.id)}
              style={({ pressed }) => ({
                width: categoryWidth,
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  backgroundColor: active ? ParishPalette.evergreen : colors.backgroundSelected,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView
                  name={symbols[item.id] ?? symbols.all!}
                  tintColor={active ? '#FFFFFF' : colors.text}
                  style={{ width: 23, height: 23 }}
                />
              </View>
              <ThemedText
                style={{
                  width: '100%',
                  fontSize: 13,
                  lineHeight: 18,
                  fontWeight: '600',
                  textAlign: 'center',
                }}
              >
                {item.title}
              </ThemedText>
            </Pressable>
          );
        })}
      </HorizontalScrollRow>
    </View>
  );
}
