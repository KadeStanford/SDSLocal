import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import type { IdentityPhoto } from '@/lib/business-identity';
import { useTheme } from '@/hooks/use-theme';
import { BusinessIdentityRow } from './business-identity-row';
import { ThemedText } from './themed-text';
import { AppIcon } from './app-icon';

export function EventDetailHeading({
  title,
  businessName,
  photos,
  image,
  when,
  where,
  onOpenPhoto,
  onDirections,
}: {
  readonly title: string;
  readonly businessName: string;
  readonly color: string;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly image?: string | undefined;
  readonly when: string;
  readonly where: string;
  readonly onOpenPhoto?: () => void;
  readonly onDirections?: (() => void) | undefined;
}) {
  const colors = useTheme();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <View style={styles.stack}>
      <View
        style={{
          borderRadius: 20,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.divider,
          backgroundColor: colors.backgroundElement,
        }}
      >
        {image && image !== failedImage && (
          <View style={styles.hero}>
            <Pressable
              accessibilityRole={onOpenPhoto ? 'button' : 'image'}
              disabled={!onOpenPhoto}
              accessibilityLabel={`View event photo for ${title}`}
              onPress={onOpenPhoto}
              style={{ backgroundColor: colors.backgroundElement }}
            >
              <Image
                source={{ uri: image }}
                contentFit="cover"
                onError={() => setFailedImage(image)}
                style={styles.image}
              />
            </Pressable>
          </View>
        )}
        <View style={{ padding: 16, gap: 12 }}>
          <BusinessIdentityRow name={businessName} photos={photos} size={36} />
          <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32 }}>
            {title}
          </ThemedText>
        </View>
      </View>
      <View style={[styles.facts, { backgroundColor: colors.backgroundElement }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          <AppIcon name="calendar" size={22} tintColor={colors.accent} />
          <View style={[styles.fact, { flex: 1 }]}>
            <ThemedText themeColor="textSecondary" type="small">
              When
            </ThemedText>
            <ThemedText type="card">{when}</ThemedText>
          </View>
        </View>
        <View style={[styles.fact, styles.location, { borderColor: colors.divider }]}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <ThemedText themeColor="textSecondary" type="small">
              Where
            </ThemedText>
            {onDirections && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Directions to ${where}`}
                onPress={onDirections}
                style={{
                  minHeight: 44,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  borderRadius: 12,
                  backgroundColor: colors.backgroundSelected,
                }}
              >
                <ThemedText type="smallBold" style={{ color: colors.accent }}>
                  Directions
                </ThemedText>
                <AppIcon name="external-link" size={18} tintColor={colors.accent} />
              </Pressable>
            )}
          </View>
          <ThemedText>{where}</ThemedText>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: 20 },
  hero: { overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9 },
  facts: { borderRadius: 20, padding: 16, gap: 16 },
  fact: { gap: 4 },
  location: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
});
