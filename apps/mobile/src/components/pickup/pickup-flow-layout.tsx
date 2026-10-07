import { CustomerAction } from '../customer-ui';
import { CustomerBrand } from '../customer-brand';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusinessLogo } from '../business-logo';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';
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
        <View
          style={{
            flexShrink: 0,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            gap: 20,
          }}
        >
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
  photos,
}: {
  name: string;
  color?: string | undefined;
  photos?: IdentityPhoto[] | undefined;
}) {
  const c = useTheme();
  const background = c.background;
  const foreground = c.text;
  const cover = businessAssetPath(photos, 'cover');
  return (
    <View
      style={{
        borderRadius: 12,
        borderWidth: 0,
        overflow: 'hidden',
        backgroundColor: background,
      }}
    >
      {cover && <ProductPhoto image={storagePublicUrl(cover)} cover />}
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 8 }}>
        <BusinessLogo name={name} photos={photos} size={56} decorative />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText
            type="card"
            style={{ color: foreground, fontSize: 24, lineHeight: 30, letterSpacing: -0.5 }}
          >
            {name}
          </ThemedText>
          <ThemedText type="small" style={{ color: c.textSecondary }}>
            Pickup menu
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export function CustomerFlowNavigation({
  title,
  subtitle,
  step,
  onBack,
  onOrders,
}: {
  title: string;
  subtitle?: string | undefined;
  step?: number | undefined;
  onBack: () => void;
  onOrders?: (() => void) | undefined;
}) {
  const c = useTheme();
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <CustomerAction label="Back" icon="back" iconOnly onPress={onBack} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <CustomerBrand />
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <ThemedText type="title" style={{ fontSize: 26, lineHeight: 32, letterSpacing: -0.6 }}>
            {title}
          </ThemedText>
          {subtitle && (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          )}
        </View>
        {onOrders && <CustomerAction label="Orders" onPress={onOrders} />}
        {step !== undefined && (
          <View
            accessibilityLabel={`Checkout step ${step} of 4`}
            style={{ gap: 7, alignItems: 'flex-end' }}
          >
            <ThemedText type="caption" themeColor="textSecondary">
              {step} of 4
            </ThemedText>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1, 2, 3, 4].map((n) => (
                <View
                  key={n}
                  style={{
                    width: 15,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: n <= step ? c.accent : c.divider,
                  }}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
