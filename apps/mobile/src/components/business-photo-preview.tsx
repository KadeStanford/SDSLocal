import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from './themed-text';
import { BusinessPreviewSection } from './business-preview-section';

export function BusinessPhotoPreview({
  photos,
  onOpen,
  onSeeAll,
}: {
  photos: readonly { id: string; url: string; caption?: string | null; altText?: string | null }[];
  onOpen: (index: number) => void;
  onSeeAll: () => void;
}) {
  const c = useTheme();
  const tile = (index: number, extra = false) => {
    const photo = photos[index];
    if (!photo) return null;
    return (
      <Pressable
        key={photo.id}
        accessibilityRole="button"
        accessibilityLabel={
          extra
            ? `See all ${photos.length} photos`
            : `Open photo ${index + 1}: ${photo.caption || photo.altText || 'Business photo'}`
        }
        onPress={() => (extra ? onSeeAll() : onOpen(index))}
        style={{
          flex: 1,
          overflow: 'hidden',
          borderRadius: 12,
          backgroundColor: c.backgroundElement,
        }}
      >
        <Image
          source={{ uri: photo.url }}
          contentFit="cover"
          style={{ width: '100%', height: '100%' }}
        />
        {extra && (
          <View
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
            }}
          >
            <ThemedText type="subtitle" style={{ color: '#fff' }}>
              +{photos.length - 2}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: '#fff' }}>
              See all photos
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };
  return (
    <BusinessPreviewSection
      title="Photos"
      action={`See all (${photos.length})`}
      onSeeAll={onSeeAll}
    >
      <View style={{ height: 210, flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1.5 }}>{tile(0)}</View>
        {photos.length > 1 && (
          <View style={{ flex: 1, gap: 8 }}>
            {tile(1)}
            {photos.length > 2 && tile(2, photos.length > 3)}
          </View>
        )}
      </View>
    </BusinessPreviewSection>
  );
}
