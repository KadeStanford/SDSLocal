import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { businessAssetPath } from '@/lib/business-identity';
import {
  businessCardAccessibilityLabel,
  businessStatusIndicators,
  canonicalCategoryLabel,
  type BusinessStatusIndicator,
} from '@/lib/discovery-core';
import {
  initialPickupModule,
  pickupModulePresentation,
  pickupDiscoveryEnabled,
} from '@/lib/pickup-discovery';
import { storagePublicUrl } from '@/lib/storage-url';
import { BusinessLogo } from './business-logo';
import { ThemedText } from './themed-text';
import { PickupNavigationButton } from './pickup-navigation-button';
export interface BusinessCardData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category_summary: string | null;
  readonly offering_search_text: string;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly created_at: string;
  readonly primary_color: string;
  readonly status: string;
  readonly business_type: string;
  readonly has_active_rewards?: boolean;
  readonly supportsPickupOrdering?: boolean;
  readonly pickupStatus?: 'accepting' | 'paused' | undefined;
  readonly stops?: readonly {
    readonly starts_at: string;
    readonly ends_at: string;
    readonly is_published: boolean;
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
}: {
  readonly business: BusinessCardData;
  readonly isFollowing: boolean;
  readonly onPress: () => void;
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
  return (
    <View
      style={[
        styles.businessCard,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.divider,
          borderLeftColor: business.primary_color,
        },
      ]}
    >
      <Pressable
        accessibilityLabel={businessCardAccessibilityLabel({
          name: business.name,
          supportsPickupOrdering: pickup.kind === 'open',
        })}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.compactCard,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.divider,
            borderLeftColor: business.primary_color,
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.cardImageWrap, styles.compactImageWrap]}>
          {coverUrl && coverUrl !== failedCover ? (
            <Image
              accessibilityLabel=""
              cachePolicy="memory-disk"
              contentFit="cover"
              onError={() => setFailedCover(coverUrl)}
              source={{ uri: coverUrl }}
              style={[styles.cardImage, styles.compactImage]}
              transition={180}
            />
          ) : (
            <View
              style={[
                styles.cardImage,
                styles.compactImage,
                styles.cardFallback,
                { backgroundColor: colors.backgroundSelected },
              ]}
            >
              <ThemedText style={[styles.fallbackLetter, { color: colors.textSecondary }]}>
                {canonicalCategoryLabel(business.category_summary)}
              </ThemedText>
            </View>
          )}
          <View style={styles.cardLogo}>
            <BusinessLogo name={business.name} photos={business.business_photos} decorative />
          </View>
        </View>
        <View style={styles.cardCopy}>
          <ThemedText numberOfLines={2} style={styles.businessName}>
            {business.name}
          </ThemedText>
          <View style={styles.categoryRow}>
            <ThemedText themeColor="textSecondary" type="smallBold" numberOfLines={1}>
              {canonicalCategoryLabel(business.category_summary)}
            </ThemedText>
          </View>
          <LocationChip business={business} />
          {indicators.length > 0 && (
            <View style={styles.cardMeta}>
              {indicators
                .filter((indicator) => indicator !== 'pickup')
                .map((indicator) => (
                  <FeatureChip key={indicator} kind={indicator} />
                ))}
            </View>
          )}
        </View>
      </Pressable>
      {indicators.includes('pickup') && (
        <View style={{ padding: 12, paddingTop: 0 }}>
          {pickup.kind === 'open' ? (
            <PickupNavigationButton
              label="Order ahead"
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
    </View>
  );
}

function LocationChip({ business }: { readonly business: BusinessCardData }) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const location =
    [business.city, business.region_code].filter(Boolean).join(', ') ||
    'Location details coming soon';

  return (
    <View accessibilityLabel={`Location: ${location}`} style={styles.locationChip}>
      <SymbolView
        name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
        tintColor={colors.textSecondary}
        style={styles.locationIcon}
      />
      <ThemedText numberOfLines={1} style={styles.locationText} themeColor="textSecondary">
        {location}
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
    <View style={styles.featureChip}>
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
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 3,
  },
  compactCard: { minHeight: 124, flexDirection: 'row', alignItems: 'flex-start' },
  pressed: { opacity: 0.72 },
  cardLogo: { position: 'absolute', right: 6, bottom: 6 },
  cardImageWrap: { position: 'relative' },
  cardImage: { width: '100%', aspectRatio: 1.9 },
  compactImageWrap: { width: 98, height: 124, flexShrink: 0 },
  compactImage: { width: 98, height: 124, aspectRatio: undefined },
  cardFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackLetter: { fontSize: 13, lineHeight: 18, textAlign: 'center', padding: 8 },
  cardCopy: { flex: 1, minHeight: 124, justifyContent: 'center', padding: 14, gap: 6 },
  businessName: { fontSize: 18, lineHeight: 23, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', alignItems: 'center' },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    maxWidth: '100%',
  },
  locationIcon: { width: 17, height: 17 },
  locationText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  featureChipIcon: { width: 17, height: 17 },
  featureChipText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
});
