import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/hooks/use-theme';
import { PickupNavigationButton } from './pickup-navigation-button';
import { ThemedText } from './themed-text';

export function OfferingSearchResultCard({
  businessId,
  name,
  description,
  sectionName,
  price,
  businessName,
  location,
  imageUrl,
  pickupAvailability,
  onPress,
}: {
  readonly businessId: string;
  readonly name: string;
  readonly description: string;
  readonly sectionName: string;
  readonly price: string;
  readonly businessName: string;
  readonly location?: string | undefined;
  readonly imageUrl: string | null;
  readonly pickupAvailability?: 'accepting' | 'paused' | undefined;
  readonly onPress: () => void;
}) {
  const c = useTheme();
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = imageUrl && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <View
      style={{
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.divider,
        overflow: 'hidden',
        backgroundColor: c.backgroundElement,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${name} from ${businessName}${price ? `, ${price}` : ''}`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 112,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 12,
          backgroundColor: c.backgroundElement,
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <View
          style={{
            width: 88,
            height: 88,
            overflow: 'hidden',
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.background,
          }}
        >
          {showImage ? (
            <Image
              accessibilityLabel=""
              cachePolicy="memory-disk"
              contentFit="cover"
              onError={() => setImageFailed(true)}
              source={{ uri: imageUrl! }}
              style={{ width: 88, height: 88 }}
              transition={180}
            />
          ) : (
            <SymbolView
              name={{ ios: 'bag', android: 'shopping_bag', web: 'shopping_bag' }}
              tintColor={c.textSecondary}
              style={{ width: 28, height: 28 }}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <ThemedText type="card" numberOfLines={2} style={{ flex: 1, minWidth: 0 }}>
              {name}
            </ThemedText>
            {!!price && <ThemedText type="smallBold">{price}</ThemedText>}
          </View>
          {!!description && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
              {description}
            </ThemedText>
          )}
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {[businessName, sectionName, location].filter(Boolean).join(' · ')}
          </ThemedText>
          <ThemedText type="smallBold" themeColor="accent">
            View business profile
          </ThemedText>
        </View>
      </Pressable>
      {pickupAvailability === 'accepting' && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <PickupNavigationButton
            label="View pickup menu"
            destination={{ pathname: '/order', params: { businessId } }}
          />
        </View>
      )}
      {pickupAvailability === 'paused' && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Pickup ordering is paused
          </ThemedText>
        </View>
      )}
    </View>
  );
}
