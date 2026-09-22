import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessLogo } from '../business-logo';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
import { brandColor, readableTextColor } from '@/lib/color-contrast';
import { businessAssetPath, type IdentityPhoto } from '@/lib/business-identity';
import { storagePublicUrl } from '@/lib/storage-url';
import { ProductPhoto } from './product-photo';

/** Content and footer are siblings; neither absolute positioning nor a nested vertical list. */
export function PickupFlowLayout({
  navigation,
  children,
  footer,
}: {
  navigation: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      style={{ flex: 1, minHeight: 0, backgroundColor: c.background }}
      edges={['top', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1, minHeight: 0 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flexShrink: 0, paddingHorizontal: 16, paddingVertical: 4 }}>
          {navigation}
        </View>
        {children}
        {footer && (
          <View
            testID="pickup-sticky-footer"
            style={{
              flexShrink: 0,
              padding: 16,
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopWidth: 1,
              borderTopColor: c.divider,
              backgroundColor: c.background,
            }}
          >
            {footer}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export function PickupMerchantHeader({
  name,
  color,
  photos,
}: {
  name: string;
  color?: string | undefined;
  photos?: IdentityPhoto[] | undefined;
}) {
  const c = useTheme();
  const background = color ? brandColor(color) : c.backgroundElement;
  const foreground = color ? readableTextColor(background) : c.text;
  const cover = businessAssetPath(photos, 'cover');
  return (
    <View style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: background }}>
      {cover && <ProductPhoto image={storagePublicUrl(cover)} cover />}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 }}>
        <BusinessLogo name={name} photos={photos} size={48} decorative />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText type="card" style={{ color: foreground }}>
            {name}
          </ThemedText>
          <ThemedText type="small" style={{ color: foreground }}>
            Pickup menu
          </ThemedText>
        </View>
      </View>
    </View>
  );
}
