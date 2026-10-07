import { useState } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { safeProductImage } from '@/lib/pickup-order-flow';
import { useTheme } from '@/hooks/use-theme';

export function ProductPhoto({
  image,
  detail = false,
  cover = false,
  menu = false,
  compact = false,
}: {
  image: string | null;
  detail?: boolean;
  cover?: boolean;
  menu?: boolean;
  compact?: boolean;
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
          compact
            ? {
                width: 96,
                height: 96,
                borderRadius: 12,
                flexShrink: 0,
                backgroundColor: c.backgroundSelected,
              }
            : cover
              ? { width: '100%', height: 100 }
              : detail
                ? {
                    width: '100%',
                    aspectRatio: 16 / 9,
                    borderRadius: 0,
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
  return detail || menu || compact ? (
    <View
      accessible={false}
      style={{
        ...(detail ? { width: '100%', aspectRatio: 16 / 9 } : { height: compact ? 96 : 165 }),
        ...(compact ? { width: 96, flexShrink: 0 } : {}),
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.backgroundSelected,
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
