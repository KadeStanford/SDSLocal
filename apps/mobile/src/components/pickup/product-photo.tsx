import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { safeProductImage } from '@/lib/pickup-order-flow';
import { useTheme } from '@/hooks/use-theme';

export function ProductPhoto({
  image,
  detail = false,
  cover = false,
  menu = false,
}: {
  image: string | null;
  detail?: boolean;
  cover?: boolean;
  menu?: boolean;
}) {
  const c = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = safeProductImage(image);
  if (!uri) return null;

  if (uri && uri !== failedUri)
    return (
      <Image
        source={{ uri }}
        recyclingKey={uri}
        contentFit={cover || menu || detail ? 'cover' : 'contain'}
        accessible={false}
        onError={() => setFailedUri(uri)}
        style={
          cover
            ? { width: '100%', height: 100 }
            : detail
              ? {
                  width: '100%',
                  height: 180,
                  borderRadius: 12,
                  backgroundColor: c.backgroundElement,
                }
              : {
                  width: menu ? '100%' : 88,
                  height: menu ? 165 : 88,
                  flexShrink: 0,
                  borderRadius: 12,
                  backgroundColor: c.backgroundElement,
                }
        }
      />
    );
  return detail || menu ? (
    <View
      accessible={false}
      style={{
        height: detail ? 180 : 165,
        borderRadius: 12,
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
