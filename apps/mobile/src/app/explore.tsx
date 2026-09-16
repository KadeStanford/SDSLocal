import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ModeSwitch } from '@/components/mode-switch';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { storagePublicUrl } from '@/lib/storage-url';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

interface BusinessCardData {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category_summary: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly primary_color: string;
  readonly business_photos:
    | readonly {
        readonly role: string;
        readonly media_assets:
          | { readonly storage_path: string; readonly status: string }
          | readonly { readonly storage_path: string; readonly status: string }[]
          | null;
      }[]
    | null;
}

export default function DiscoverScreen() {
  const { session } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [businesses, setBusinesses] = useState<BusinessCardData[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [businessResult, followingResult] = await Promise.all([
      supabase
        .from('businesses')
        .select(
          'id, name, description, category_summary, city, region_code, primary_color, business_photos(role, media_assets(storage_path, status))',
        )
        .eq('status', 'active')
        .order('name'),
      session
        ? supabase.from('business_follows').select('business_id').eq('customer_id', session.user.id)
        : Promise.resolve({ data: [], error: null }),
    ]);
    const queryError = businessResult.error ?? followingResult.error;
    if (queryError)
      setError(userMessageFromError(queryError, 'We could not load nearby businesses.'));
    else {
      setBusinesses((businessResult.data ?? []) as BusinessCardData[]);
      setFollowingIds(
        new Set(
          (followingResult.data ?? []).map((row: { business_id: string }) => row.business_id),
        ),
      );
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadBusinesses(), 0);
    return () => clearTimeout(timeout);
  }, [loadBusinesses]);

  const visibleBusinesses = businesses.filter((business) => {
    const search = query.trim().toLowerCase();
    return (
      (filter === 'all' || followingIds.has(business.id)) &&
      (!search ||
        [business.name, business.description, business.category_summary, business.city].some(
          (value) => value?.toLowerCase().includes(search),
        ))
    );
  });

  if (selectedBusinessId) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable onPress={() => setSelectedBusinessId(null)} style={styles.backButton}>
              <ThemedText type="smallBold">‹ Discover</ThemedText>
            </Pressable>
            <PublicBusinessPageContent businessId={selectedBusinessId} />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBusinesses} />}
        >
          <ModeSwitch />
          <View style={styles.heading}>
            <ThemedText type="title">Discover local</ThemedText>
            <ThemedText themeColor="textSecondary">
              Businesses, services, and places worth knowing nearby.
            </ThemedText>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search businesses or categories"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            style={[
              styles.search,
              { color: colors.text, backgroundColor: colors.backgroundElement },
            ]}
          />
          {session && (
            <View style={styles.filters} accessibilityRole="radiogroup">
              {(['all', 'following'] as const).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: filter === value }}
                  onPress={() => setFilter(value)}
                  style={[styles.filterButton, filter === value && styles.filterButtonSelected]}
                >
                  <ThemedText
                    style={filter === value ? styles.filterTextSelected : undefined}
                    type="smallBold"
                  >
                    {value === 'all' ? 'All businesses' : `Following (${followingIds.size})`}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          )}

          {error ? (
            <View style={styles.errorCard}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : loading && businesses.length === 0 ? (
            <ActivityIndicator color={Brand.primaryBright} />
          ) : visibleBusinesses.length === 0 ? (
            <View style={styles.emptyCard}>
              <ThemedText type="subtitle">Nothing found</ThemedText>
              <ThemedText themeColor="textSecondary">
                {filter === 'following'
                  ? 'Businesses you follow will appear here.'
                  : 'Try a different business name, category, or city.'}
              </ThemedText>
            </View>
          ) : (
            <View style={styles.list}>
              {visibleBusinesses.map((business) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onPress={() => setSelectedBusinessId(business.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BusinessCard({
  business,
  onPress,
}: {
  readonly business: BusinessCardData;
  readonly onPress: () => void;
}) {
  const coverRow = business.business_photos?.find((photo) => photo.role === 'cover');
  const asset = Array.isArray(coverRow?.media_assets)
    ? coverRow.media_assets[0]
    : coverRow?.media_assets;
  const coverUrl = asset?.status === 'ready' ? storagePublicUrl(asset.storage_path) : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.businessCard, pressed && styles.pressed]}
    >
      {coverUrl ? (
        <Image
          accessibilityLabel=""
          contentFit="cover"
          source={{ uri: coverUrl }}
          style={styles.cardImage}
          transition={180}
        />
      ) : (
        <View
          style={[
            styles.cardImage,
            styles.cardFallback,
            { backgroundColor: business.primary_color },
          ]}
        >
          <ThemedText style={styles.fallbackLetter}>
            {business.name.slice(0, 1).toUpperCase()}
          </ThemedText>
        </View>
      )}
      <View style={styles.cardCopy}>
        <ThemedText type="subtitle">{business.name}</ThemedText>
        <ThemedText style={styles.category} type="smallBold">
          {business.category_summary || 'Local business'}
        </ThemedText>
        <ThemedText numberOfLines={2} themeColor="textSecondary" type="small">
          {business.description || 'Learn more about this local business.'}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="smallBold">
          {[business.city, business.region_code].filter(Boolean).join(', ') ||
            'Location details coming soon'}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.four,
  },
  heading: { gap: Spacing.two },
  search: { minHeight: 52, borderRadius: Radius.medium, paddingHorizontal: 16, fontSize: 16 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  filterButtonSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  filterTextSelected: { color: Brand.onPrimary },
  list: { gap: Spacing.three },
  businessCard: {
    overflow: 'hidden',
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  cardImage: { width: '100%', aspectRatio: 1.9 },
  cardFallback: { alignItems: 'center', justifyContent: 'center' },
  fallbackLetter: { color: Brand.onPrimary, fontSize: 42, fontWeight: '800' },
  cardCopy: { padding: Spacing.three, gap: Spacing.one },
  category: { color: Brand.primaryBright, textTransform: 'uppercase', letterSpacing: 0.8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  errorCard: { borderRadius: 16, backgroundColor: '#F8E6E6', padding: Spacing.three },
  errorText: { color: '#761F1F' },
  emptyCard: {
    borderRadius: 20,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.four,
    gap: Spacing.two,
  },
});
