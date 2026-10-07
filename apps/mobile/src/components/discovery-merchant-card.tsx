import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useTheme } from '@/hooks/use-theme';
import {
  businessCardAccessibilityLabel,
  canonicalCategoryLabel,
  type BusinessStatusIndicator,
} from '@/lib/discovery-core';
import { businessRatingAccessibilityLabel } from '@/lib/business-review-summary';
import type { pickupModulePresentation } from '@/lib/pickup-discovery';
import type { BusinessCardData } from './business-card';
import { BusinessLogo } from './business-logo';
import { BusinessRating } from './business-rating';
import { ThemedText } from './themed-text';
import { PickupNavigationButton } from './pickup-navigation-button';
import { AppButton } from './app-button';

/** Discovery-only presentation. General BusinessCard callers keep their original layout. */
export function DiscoveryMerchantCard({
  business,
  isFollowing,
  onPress,
  coverUrl,
  pickup,
  indicators,
}: {
  business: BusinessCardData;
  isFollowing: boolean;
  onPress: () => void;
  coverUrl: string | null;
  pickup: ReturnType<typeof pickupModulePresentation>;
  indicators: readonly BusinessStatusIndicator[];
}) {
  const c = useTheme();
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const [loadedCover, setLoadedCover] = useState<string | null>(null);
  const compact = !['food_drink', 'mobile'].includes(business.business_type);
  const hasImage = Boolean(coverUrl && coverUrl !== failedCover);
  const location = [business.city, business.region_code].filter(Boolean).join(', ');
  const distance =
    typeof business.distanceMiles === 'number' && Number.isFinite(business.distanceMiles)
      ? business.distanceMiles < 0.1
        ? '< 0.1 mi'
        : `${business.distanceMiles.toFixed(1)} mi`
      : null;
  const facts = [canonicalCategoryLabel(business.category_summary), distance, location]
    .filter(Boolean)
    .join(' · ');
  const chip = {
    borderRadius: 20,
    backgroundColor: c.backgroundSelected,
    paddingHorizontal: 9,
    paddingVertical: 5,
  };
  const label = { fontSize: 13, lineHeight: 18, color: c.text };
  const media = hasImage ? (
    <View
      style={{
        overflow: 'hidden',
        backgroundColor: c.backgroundSelected,
        ...(compact
          ? { width: 88, height: 88, borderRadius: 12 }
          : { width: '100%' as const, aspectRatio: 16 / 9 }),
      }}
    >
      <Image
        source={{ uri: coverUrl! }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel=""
        onError={() => setFailedCover(coverUrl)}
        onLoad={() => setLoadedCover(coverUrl)}
        style={{ width: '100%', height: '100%' }}
        transition={180}
      />
      {loadedCover !== coverUrl && (
        <View
          accessibilityLabel="Loading business photo"
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator color={c.accent} />
        </View>
      )}
      {!compact && isFollowing && (
        <View style={{ position: 'absolute', left: 12, top: 12 }}>
          <FollowingBadge />
        </View>
      )}
    </View>
  ) : compact ? (
    <View
      style={{
        width: 88,
        height: 88,
        borderRadius: 12,
        backgroundColor: c.backgroundSelected,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BusinessLogo name={business.name} photos={business.business_photos} size={48} decorative />
    </View>
  ) : (
    <View
      style={{
        width: '100%',
        aspectRatio: 16 / 9,
        backgroundColor: c.backgroundSelected,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <BusinessLogo name={business.name} photos={business.business_photos} size={56} decorative />
      <ThemedText style={{ fontSize: 13, lineHeight: 18, color: c.text }}>
        {coverUrl ? 'Business photo unavailable' : 'No business photo'}
      </ThemedText>
    </View>
  );
  const badges = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {business.reviewSummary && (
        <View style={chip}>
          <BusinessRating summary={business.reviewSummary} compact compactSize={13} />
        </View>
      )}
      {business.isOpenNow && (
        <View style={chip}>
          <ThemedText style={label}>● Open now</ThemedText>
        </View>
      )}
      {business.isOpenNow === false && Boolean(business.hours?.length) && (
        <View style={chip}>
          <ThemedText style={label}>Closed now</ThemedText>
        </View>
      )}
      {isFollowing && (compact || !hasImage) && <FollowingBadge />}
      {indicators
        .filter((kind) => !['pickup', 'following'].includes(kind))
        .map((kind) => (
          <View key={kind} style={chip}>
            <ThemedText style={label}>
              {
                (
                  { stop: 'Next stop', rewards: 'Rewards', event: 'Event' } as Partial<
                    Record<BusinessStatusIndicator, string>
                  >
                )[kind]
              }
            </ThemedText>
          </View>
        ))}
    </View>
  );
  const identity = (
    <View style={{ flex: 1, minWidth: 0, gap: compact ? 6 : 12 }}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <BusinessLogo
          name={business.name}
          photos={business.business_photos}
          size={compact ? 28 : 40}
          decorative
        />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <ThemedText
            style={{
              fontSize: compact ? 18 : 20,
              lineHeight: compact ? 24 : 26,
              fontWeight: '700',
            }}
          >
            {business.name}
          </ThemedText>
          <ThemedText
            themeColor="textSecondary"
            style={{ fontSize: compact ? 13 : 14, lineHeight: compact ? 18 : 20 }}
          >
            {facts}
          </ThemedText>
        </View>
      </View>
      {badges}
    </View>
  );
  return (
    <View
      style={{
        borderRadius: compact ? 18 : 20,
        borderWidth: 1,
        borderColor: c.divider,
        backgroundColor: c.backgroundElement,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          businessCardAccessibilityLabel({
            name: business.name,
            supportsPickupOrdering: pickup.kind === 'open',
          }) +
          (business.reviewSummary
            ? `. ${businessRatingAccessibilityLabel(business.reviewSummary)}`
            : '')
        }
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
      >
        {compact ? (
          <View style={{ padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            {media}
            {identity}
          </View>
        ) : (
          <>
            {media}
            <View style={{ padding: 16 }}>{identity}</View>
          </>
        )}
      </Pressable>
      <View style={{ paddingHorizontal: compact ? 14 : 16, paddingBottom: compact ? 14 : 16 }}>
        {indicators.includes('pickup') ? (
          pickup.kind === 'open' ? (
            <PickupNavigationButton
              label="Order ahead"
              variant="primary"
              destination={{ pathname: '/order', params: { businessId: business.id } }}
              style={{ minHeight: 48, borderRadius: 12 }}
              labelStyle={{ fontSize: 16, lineHeight: 22 }}
            />
          ) : (
            <AppButton
              label="Pickup paused"
              accessibilityLabel="Pickup paused. Ordering unavailable."
              disabled
              onPress={() => {}}
              style={{ minHeight: 48, borderRadius: 12 }}
              labelStyle={{ fontSize: 16, lineHeight: 22 }}
            />
          )
        ) : (
          <AppButton
            label="View business"
            variant="secondary"
            onPress={onPress}
            style={{ minHeight: compact ? 44 : 48, borderRadius: 12 }}
            labelStyle={{ fontSize: 16, lineHeight: 22 }}
          />
        )}
      </View>
    </View>
  );
}

function FollowingBadge() {
  const c = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: c.backgroundSelected,
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 5,
      }}
    >
      <SymbolView
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        tintColor={c.text}
        style={{ width: 14, height: 14 }}
      />
      <ThemedText style={{ fontSize: 13, lineHeight: 18, color: c.text }}>Following</ThemedText>
    </View>
  );
}
