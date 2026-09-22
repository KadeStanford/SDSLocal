import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { safeProductImage } from '@/lib/pickup-order-flow';
import { useTheme } from '@/hooks/use-theme';

export function ProductPhoto({
  image,
  detail = false,
  cover = false,
}: {
  image: string | null;
  detail?: boolean;
  cover?: boolean;
}) {
  const c = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedAspectRatio, setLoadedAspectRatio] = useState<number | null>(null);
  const uri = safeProductImage(image);

  useEffect(() => {
    setLoadedAspectRatio(null);
    setFailedUri(null);
  }, [uri]);

  if (uri && uri !== failedUri)
    return (
      <Image
        source={{ uri }}
        recyclingKey={uri}
        // Product photography should remain fully visible in item cards and the
        // detail sheet. Only an explicitly marked cover (for example, a
        // business hero image) should crop to fill its frame.
        contentFit={cover ? 'cover' : 'contain'}
        accessible={false}
        onLoad={(event) => {
          const source = event.source;
          if (!detail || !source?.width || !source?.height) return;
          const aspectRatio = source.width / source.height;
          if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
            setLoadedAspectRatio((current) => (current === aspectRatio ? current : aspectRatio));
          }
        }}
        onError={() => setFailedUri(uri)}
        style={
          cover
            ? { width: '100%', height: 100 }
            : detail
              ? {
                  width: '100%',
                  aspectRatio: loadedAspectRatio ?? 16 / 9,
                  borderRadius: 16,
                  backgroundColor: c.backgroundElement,
                }
              : {
                  width: 88,
                  height: 88,
                  borderRadius: 12,
                  backgroundColor: c.backgroundElement,
                }
        }
      />
    );
  return detail ? (
    <View
      accessible={false}
      style={{
        height: 104,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.backgroundElement,
      }}
    >
      <SymbolView
        name={{ ios: 'fork.knife', android: 'restaurant', web: 'restaurant' }}
        tintColor={c.textSecondary}
        style={{ width: 32, height: 32 }}
      />
    </View>
  ) : null;
}
