import { Image } from 'expo-image';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import {
  businessAssetPath,
  businessMonogram,
  logoAccessibilityLabel,
  logoImagePolicy,
  logoSource,
  type IdentityPhoto,
} from '@/lib/business-identity';
import { storagePublicUrl } from '@/lib/storage-url';
import { ThemedText } from './themed-text';

export function businessLogoUrl(photos: readonly IdentityPhoto[] | null | undefined) {
  const path = businessAssetPath(photos, 'logo');
  return path ? (/^https?:\/\//i.test(path) ? path : storagePublicUrl(path)) : null;
}

export function BusinessLogo({
  name,
  uri,
  photos,
  size = 44,
  decorative = false,
}: {
  readonly name: string;
  readonly uri?: string | null | undefined;
  readonly photos?: readonly IdentityPhoto[] | null | undefined;
  readonly size?: number;
  readonly decorative?: boolean;
}) {
  const colors = useTheme();
  const candidate = uri ?? businessLogoUrl(photos);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const source = logoSource(candidate, failedUri);
  const monogram = businessMonogram(name);
  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={logoAccessibilityLabel(name, decorative)}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 4,
          backgroundColor: source ? colors.logoSurface : colors.backgroundSelected,
          borderColor: colors.divider,
        },
      ]}
    >
      {source ? (
        <Image
          {...logoImagePolicy}
          accessible={false}
          recyclingKey={source}
          source={{ uri: source }}
          onError={() => setFailedUri(source)}
          style={styles.image}
        />
      ) : monogram ? (
        <ThemedText
          accessible={false}
          allowFontScaling={false}
          style={{
            fontSize: Math.max(12, size * 0.32),
            lineHeight: size * 0.55,
            fontWeight: '600',
          }}
        >
          {monogram}
        </ThemedText>
      ) : (
        <SymbolView
          name={{ ios: 'building.2', android: 'storefront', web: 'storefront' }}
          tintColor={colors.textSecondary}
          size={size * 0.5}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '84%', height: '84%' },
});
