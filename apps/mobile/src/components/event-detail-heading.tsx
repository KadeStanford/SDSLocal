import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import type { IdentityPhoto } from '@/lib/business-identity';
import { brandColor } from '@/lib/color-contrast';
import { useTheme } from '@/hooks/use-theme';
import { BusinessBrandHeader } from './business-brand-header';
import { ThemedText } from './themed-text';

export function EventDetailHeading({
  title,
  businessName,
  color,
  photos,
  image,
  when,
  where,
  onOpenPhoto,
}: {
  readonly title: string;
  readonly businessName: string;
  readonly color: string;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly image?: string | undefined;
  readonly when: string;
  readonly where: string;
  readonly onOpenPhoto: () => void;
}) {
  const colors = useTheme();
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <View style={styles.stack}>
      <View style={styles.hero}>
        {image && image !== failedImage && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View event photo for ${title}`}
            onPress={onOpenPhoto}
            style={{ backgroundColor: brandColor(color) }}
          >
            <Image
              source={{ uri: image }}
              contentFit="contain"
              onError={() => setFailedImage(image)}
              style={styles.image}
            />
          </Pressable>
        )}
        <BusinessBrandHeader name={businessName} color={color} photos={photos} />
      </View>
      <ThemedText type="title">{title}</ThemedText>
      <View style={[styles.facts, { backgroundColor: colors.backgroundElement }]}>
        <View style={styles.fact}>
          <ThemedText themeColor="textSecondary" type="small">
            When
          </ThemedText>
          <ThemedText type="card">{when}</ThemedText>
        </View>
        <View style={[styles.fact, styles.location, { borderColor: colors.divider }]}>
          <ThemedText themeColor="textSecondary" type="small">
            Where
          </ThemedText>
          <ThemedText>{where}</ThemedText>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: 20 },
  hero: { borderRadius: 22, overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 1.6 },
  facts: { borderRadius: 16, padding: 16, gap: 16 },
  fact: { gap: 4 },
  location: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16 },
});
