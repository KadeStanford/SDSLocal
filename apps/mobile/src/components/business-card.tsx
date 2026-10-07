import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { businessAssetPath } from '@/lib/business-identity';
import {
  businessCardAccessibilityLabel,
  businessStatusIndicators,
  canonicalCategoryLabel,
  type BusinessStatusIndicator,
  type BusinessHour,
} from '@/lib/discovery-core';
import {
  initialPickupModule,
  pickupModulePresentation,
  pickupDiscoveryEnabled,
} from '@/lib/pickup-discovery';
import { storagePublicUrl } from '@/lib/storage-url';
import { DiscoveryMerchantCard } from './discovery-merchant-card';
import { BusinessLogo } from './business-logo';
import { ThemedText } from './themed-text';
import { PickupNavigationButton } from './pickup-navigation-button';
import { BusinessRating } from './business-rating';
import { AppButton } from './app-button';
import {
  businessRatingAccessibilityLabel,
  type BusinessReviewSummary,
} from '@/lib/business-review-summary';
export interface BusinessCardData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category_summary: string | null;
  readonly offering_search_text: string;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly timezone?: string;
  readonly hours?: readonly BusinessHour[];
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly distanceMiles?: number | null;
  readonly isOpenNow?: boolean;
  readonly created_at: string;
  readonly primary_color: string;
  readonly status: string;
  readonly business_type: string;
  readonly has_active_rewards?: boolean;
  readonly reviewSummary?: BusinessReviewSummary;
  readonly supportsPickupOrdering?: boolean;
  readonly pickupStatus?: 'accepting' | 'paused' | undefined;
  readonly stops?: readonly {
    readonly starts_at: string;
    readonly ends_at: string;
    readonly is_published: boolean;
    readonly latitude?: number | null;
    readonly longitude?: number | null;
  }[];
  readonly loyalty_programs:
    | readonly { readonly id: string; readonly is_active: boolean }[]
    | { readonly id: string; readonly is_active: boolean }
    | null;
  readonly events?:
    | readonly {
        readonly id: string;
        readonly business_id: string;
        readonly title: string;
        readonly address_text: string | null;
        readonly starts_at: string;
        readonly is_published: boolean;
        readonly publish_at: string | null;
        readonly archived_at: string | null;
      }[]
    | null;
  readonly business_photos:
    | readonly {
        readonly role: string;
        readonly media_assets:
          | { readonly storage_path: string; readonly status: string }
          | readonly { readonly storage_path: string; readonly status: string }[]
          | null;
      }[]
    | null;
}

export function BusinessCard({
  business,
  isFollowing,
  onPress,
  presentation = 'featured',
  stretch = false,
  discovery = false,
}: {
  readonly business: BusinessCardData;
  readonly isFollowing: boolean;
  readonly onPress: () => void;
  readonly presentation?: 'featured' | 'compact';
  readonly stretch?: boolean;
  readonly discovery?: boolean;
}) {
  const [failedCover, setFailedCover] = useState<string | null>(null);
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const pickup = pickupModulePresentation(process.env.EXPO_PUBLIC_APP_ENV, {
    ...initialPickupModule(business.id),
    supported: Boolean(business.supportsPickupOrdering),
    loading: false,
    discoveryStatus: business.pickupStatus ?? 'accepting',
  });
  const coverPath = businessAssetPath(business.business_photos, 'cover');
  const coverUrl = coverPath
    ? /^https?:\/\//i.test(coverPath)
      ? coverPath
      : storagePublicUrl(coverPath)
    : null;
  const indicators = businessStatusIndicators(
    {
      ...business,
      supportsPickupOrdering:
        pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV) &&
        Boolean(business.supportsPickupOrdering),
      has_active_rewards: hasActiveLoyalty(business.loyalty_programs),
    },
    isFollowing ? new Set([business.id]) : new Set(),
    new Date(),
  );
  if (discovery)
    return (
      <DiscoveryMerchantCard
        business={business}
        isFollowing={isFollowing}
        onPress={onPress}
        coverUrl={coverUrl}
        pickup={pickup}
        indicators={indicators}
      />
    );
  return (
    <View
      style={[
        styles.businessCard,
        stretch && { flex: 1 },
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.divider,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={
          businessCardAccessibilityLabel({
            name: business.name,
            supportsPickupOrdering: pickup.kind === 'open',
          }) +
          (business.reviewSummary
            ? `. ${businessRatingAccessibilityLabel(business.reviewSummary)}`
            : '')
        }
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          stretch && { flex: 1 },
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.divider,
          },
          pressed && styles.pressed,
        ]}
      >
        {coverUrl && coverUrl !== failedCover && (
          <View style={styles.cardImageWrap}>
            <Image
              accessibilityLabel=""
              cachePolicy="memory-disk"
              contentFit="cover"
              onError={() => setFailedCover(coverUrl)}
              source={{ uri: coverUrl }}
              style={[styles.cardImage, presentation === 'compact' && { aspectRatio: 3.1 }]}
              transition={180}
            />
          </View>
        )}
        <View style={styles.cardCopy}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <BusinessLogo
              name={business.name}
              photos={business.business_photos}
              size={presentation === 'featured' ? 58 : 52}
              decorative
            />
            <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
              <ThemedText style={styles.businessName}>{business.name}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {canonicalCategoryLabel(business.category_summary)}
              </ThemedText>
              <LocationChip business={business} />
            </View>
          </View>
          <View style={styles.cardMeta}>
            {business.reviewSummary && (
              <View
                style={{
                  backgroundColor: colors.backgroundSelected,
                  borderRadius: 20,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                }}
              >
                <BusinessRating summary={business.reviewSummary} compact />
              </View>
            )}
            {business.isOpenNow && (
              <View
                style={{
                  backgroundColor: colors.backgroundSelected,
                  borderRadius: 20,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                }}
              >
                <ThemedText
                  type="small"
                  style={{ color: colors.accent, fontSize: 12, lineHeight: 16 }}
                >
                  ● Open now
                </ThemedText>
              </View>
            )}
            {indicators
              .filter((indicator) => indicator !== 'pickup')
              .map((indicator) => (
                <FeatureChip key={indicator} kind={indicator} />
              ))}
          </View>
        </View>
      </Pressable>
      {indicators.includes('pickup') && (
        <View
          style={{
            paddingHorizontal: 18,
            paddingTop: 0,
            paddingBottom: 16,
            borderTopWidth: 0,
            borderTopColor: colors.divider,
            backgroundColor: colors.backgroundElement,
          }}
        >
          {pickup.kind === 'open' ? (
            <PickupNavigationButton
              label="Order ahead"
              variant="primary"
              destination={{ pathname: '/order', params: { businessId: business.id } }}
            />
          ) : (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              accessibilityLabel="Pickup paused. Ordering unavailable."
            >
              Ⅱ Pickup paused
            </ThemedText>
          )}
        </View>
      )}
      {!indicators.includes('pickup') && (
        <View style={{ paddingHorizontal: 18, paddingBottom: 16 }}>
          <AppButton label="View business" variant="secondary" onPress={onPress} />
        </View>
      )}
    </View>
  );
}

function LocationChip({ business }: { readonly business: BusinessCardData }) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const distance =
    typeof business.distanceMiles === 'number' && Number.isFinite(business.distanceMiles)
      ? business.distanceMiles < 0.1
        ? '< 0.1 mi'
        : `${business.distanceMiles.toFixed(1)} mi`
      : null;
  const location = [business.city, business.region_code].filter(Boolean).join(', ');
  const displayLocation = distance ? [distance, location].filter(Boolean).join(' · ') : location;
  if (!displayLocation) return null;

  return (
    <View accessibilityLabel={`Location: ${displayLocation}`} style={styles.locationChip}>
      <SymbolView
        name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
        tintColor={colors.textSecondary}
        style={styles.locationIcon}
      />
      <ThemedText numberOfLines={1} style={styles.locationText} themeColor="textSecondary">
        {displayLocation}
      </ThemedText>
    </View>
  );
}

function FeatureChip({ kind }: { readonly kind: BusinessStatusIndicator }) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const content = (
    {
      pickup: {
        label: 'Order ahead',
        name: { ios: 'bag.fill', android: 'shopping_bag', web: 'shopping_bag' },
      },
      stop: {
        label: 'Next stop',
        name: { ios: 'truck.box.fill', android: 'local_shipping', web: 'local_shipping' },
      },
      rewards: {
        label: 'Rewards',
        name: { ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard' },
      },
      event: {
        label: 'Event',
        name: { ios: 'calendar', android: 'event', web: 'event' },
      },
      following: {
        label: 'Following',
        name: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
      },
    } as const
  )[kind];

  return (
    <View
      style={[
        styles.featureChip,
        {
          backgroundColor: colors.backgroundSelected,
          borderRadius: 20,
          paddingHorizontal: 9,
          paddingVertical: 5,
        },
      ]}
    >
      <SymbolView
        name={content.name}
        tintColor={colors.textSecondary}
        style={styles.featureChipIcon}
      />
      <ThemedText style={styles.featureChipText} themeColor="textSecondary">
        {content.label}
      </ThemedText>
    </View>
  );
}

export function hasActiveLoyalty(programs: BusinessCardData['loyalty_programs']): boolean {
  if (!programs) return false;
  if (Array.isArray(programs)) {
    return (programs as readonly { readonly is_active: boolean }[]).some(
      (program) => program.is_active,
    );
  }
  return (programs as { readonly is_active: boolean }).is_active;
}

const styles = StyleSheet.create({
  businessCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
  },
  compactCard: { flexDirection: 'column' },
  pressed: { opacity: 0.72 },
  cardLogo: { position: 'absolute', left: 14, bottom: 12, padding: 3, borderRadius: 13 },
  cardImageWrap: { position: 'relative', width: '100%', overflow: 'hidden' },
  cardImage: { width: '100%', aspectRatio: 2.1 },
  imagePlaceholder: { height: 100 },
  cardFallback: { alignItems: 'center', justifyContent: 'center' },
  cardCopy: { width: '100%', padding: 18, gap: 6 },
  businessName: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: '100%',
  },
  locationIcon: { width: 17, height: 17 },
  locationText: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureChipIcon: { width: 17, height: 17 },
  featureChipText: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
});
