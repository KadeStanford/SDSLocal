import { useColorScheme } from '@/hooks/use-color-scheme';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { PublicBusinessPageContent } from '@/components/public-business-page';
import { CustomerAction } from '@/components/customer-ui';
import { CustomerBrand } from '@/components/customer-brand';
import { SwipeBackView } from '@/components/swipe-back-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';

interface BusinessLookup {
  readonly id: string;
  readonly name: string;
}

/**
 * Public business destination for branded QR signs.
 *
 * The URL is intentionally the same `/b/:slug` shape used by the web app so
 * an existing customer can scan a sign and land in the native business page
 * when universal/app links are configured. New visitors can still browse the
 * page and use the sign-in/create-account CTA without a per-scan prompt.
 */
export default function PublicBusinessRoute() {
  const params = useLocalSearchParams<{ slug?: string | string[] }>();
  const slug = useMemo(() => {
    const value = params.slug;
    return Array.isArray(value) ? value[0] : value;
  }, [params.slug]);
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const bottomContentInset = insets.bottom + Spacing.four;
  const [business, setBusiness] = useState<BusinessLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);

  useEffect(() => {
    let active = true;
    if (!slug) {
      const timeout = setTimeout(() => {
        if (!active) return;
        setError('This business link is incomplete.');
        setLoading(false);
      }, 0);
      return () => {
        active = false;
        clearTimeout(timeout);
      };
    }

    const timeout = setTimeout(() => {
      void supabase
        .from('businesses')
        .select('id, name')
        .eq('slug', slug)
        .maybeSingle()
        .then(({ data, error: lookupError }) => {
          if (!active) return;
          if (lookupError) {
            setError(userMessageFromError(lookupError, 'We could not open this business page.'));
          } else if (!data) {
            setError('This business page is unavailable.');
          } else {
            setBusiness(data as BusinessLookup);
          }
          setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [slug]);

  return (
    <SwipeBackView onSwipeBack={() => router.back()}>
      <ThemedView style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.container}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <CustomerAction label="Back" icon="back" iconOnly onPress={() => router.back()} />
            <View style={{ flex: 1, paddingLeft: 14 }}>
              <CustomerBrand />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: bottomContentInset }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            scrollEnabled={!viewerOpen && !mapInteractionActive}
          >
            {loading ? (
              <ActivityIndicator color={Brand.primaryBright} style={styles.loader} />
            ) : error || !business ? (
              <View style={[styles.errorCard, { backgroundColor: colors.errorSurface }]}>
                <ThemedText style={{ color: colors.errorText }} type="smallBold">
                  {error ?? 'Business page unavailable.'}
                </ThemedText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.back()}
                  style={[styles.secondaryButton, { borderColor: colors.border }]}
                >
                  <ThemedText type="smallBold">Go back</ThemedText>
                </Pressable>
              </View>
            ) : (
              <PublicBusinessPageContent
                businessId={business.id}
                onBlocked={() => router.replace('/explore')}
                onMapInteractionChange={setMapInteractionActive}
                onViewerChange={setViewerOpen}
              />
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: Spacing.two,
    minHeight: 56,
    paddingHorizontal: Spacing.four,
  },
  backButton: { minWidth: 64, minHeight: 44, justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center' },
  headerSpacer: { minWidth: 64 },
  pressed: { opacity: 0.72 },
  content: {
    alignSelf: 'center',
    gap: Spacing.three,
    maxWidth: 760,
    padding: Spacing.four,
    width: '100%',
  },
  loader: { marginVertical: Spacing.six },
  errorCard: { borderRadius: Radius.large, gap: Spacing.three, padding: Spacing.four },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});
