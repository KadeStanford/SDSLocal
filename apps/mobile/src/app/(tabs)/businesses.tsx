import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { StateNotice } from '@/components/data-state';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppChrome } from '@/components/app-chrome';
import { SwipeBackView } from '@/components/swipe-back-view';
import { BottomTabInset, Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { BusinessWorkspace } from '@/components/business-workspace';
import { NewBusinessWorkspace } from '@/app/(tabs)/business-new';
import { supabase } from '@/lib/supabase';
import { storagePublicUrl } from '@/lib/storage-url';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useListingBilling } from '@/providers/listing-billing-provider';
import { listingStatusMessage } from '@/lib/listing-billing-core';
import { workspaceSectionLabel, type BusinessSection } from '@/lib/business-workspace-config';
import type { BusinessType } from '@sds/types';
import { getBusinessStatusLabel } from '@sds/business-logic';

const businessListTimeoutMs = 10000;

interface BusinessPhotoSummary {
  readonly role: string;
  readonly media_assets:
    | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
      }[]
    | null;
}

interface BusinessSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly business_type: BusinessType;
  readonly status: 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
  readonly primary_color: string | null;
  readonly business_photos: readonly BusinessPhotoSummary[] | null;
  readonly role: 'owner' | 'staff';
}

interface MembershipRow {
  readonly role: BusinessSummary['role'];
  readonly businesses:
    Omit<BusinessSummary, 'role'> | readonly Omit<BusinessSummary, 'role'>[] | null;
}

export default function BusinessesScreen() {
  const { pickupNotice } = useLocalSearchParams<{ pickupNotice?: string }>();
  const bottomPadding = useScreenBottomPadding();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { session, loading: authLoading } = useAuth();
  const { summary: listingPlan } = useListingBilling();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<{
    readonly id: string;
    readonly section: BusinessSection | null;
  } | null>(null);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const businessListScrollOffset = useRef(0);
  const [businessListReturnOffset, setBusinessListReturnOffset] = useState(0);

  const loadBusinesses = useCallback(async () => {
    if (!session) {
      setBusinesses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await Promise.race([
      supabase
        .from('business_members')
        .select(
          'role, businesses(id, name, slug, status, business_type, primary_color, business_photos(role, media_assets(storage_path, status, alt_text)))',
        )
        .eq('user_id', session.user.id)
        .eq('is_active', true),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), businessListTimeoutMs)),
    ]);
    if (!result) {
      setError('We could not reach your business workspaces. Check your connection and try again.');
      setLoading(false);
      return;
    }
    const { data, error: queryError } = result;
    if (queryError) {
      setError(userMessageFromError(queryError, 'We could not load your businesses.'));
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as MembershipRow[];
    setBusinesses(
      rows.flatMap((membership) => {
        const records = Array.isArray(membership.businesses)
          ? membership.businesses
          : membership.businesses
            ? [membership.businesses]
            : [];
        return records.map((business) => ({ ...business, role: membership.role }));
      }),
    );
    setLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void loadBusinesses();
    }, [loadBusinesses]),
  );

  function openBusiness(businessId: string, section: BusinessSection | null) {
    setBusinessListReturnOffset(businessListScrollOffset.current);
    setSelectedBusiness({ id: businessId, section });
  }

  function beginCreatingBusiness() {
    setBusinessListReturnOffset(businessListScrollOffset.current);
    setCreatingBusiness(true);
  }

  if (selectedBusiness) {
    return (
      <BusinessWorkspace
        businessId={selectedBusiness.id}
        exitUnderlay={
          <BusinessesDestinationUnderlay
            businesses={businesses}
            colors={colors}
            scrollOffset={businessListReturnOffset}
          />
        }
        initialSection={selectedBusiness.section}
        onBack={() => setSelectedBusiness(null)}
      />
    );
  }

  if (creatingBusiness) {
    return (
      <SwipeBackView
        onSwipeBack={() => setCreatingBusiness(false)}
        underlay={
          <BusinessesDestinationUnderlay
            businesses={businesses}
            colors={colors}
            scrollOffset={businessListReturnOffset}
          />
        }
      >
        <NewBusinessWorkspace
          onBack={() => setCreatingBusiness(false)}
          onCreated={(businessId) => {
            setCreatingBusiness(false);
            setSelectedBusiness({ id: businessId, section: null });
          }}
        />
      </SwipeBackView>
    );
  }

  if (authLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Brand.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentOffset={{ x: 0, y: Math.max(0, businessListReturnOffset) }}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            businessListScrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadBusinesses}
              tintColor={Brand.primary}
            />
          }
        >
          <View style={styles.headerBlock}>
            <AppChrome />
            {!!pickupNotice && <StateNotice message={pickupNotice} />}
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowDot, { backgroundColor: Brand.primary }]} />
              <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                BUSINESS HUB
              </ThemedText>
            </View>
            <ThemedText type="title">Manage your business</ThemedText>
            <ThemedText themeColor="textSecondary">
              Keep every local business, team member, and customer touchpoint in one place.
            </ThemedText>
          </View>

          {session && businesses.some((business) => business.role === 'owner') ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(tabs)/listing-plans' as Href)}
              style={[
                styles.planCallout,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              <View style={styles.flex}>
                <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                  LISTING PLAN
                </ThemedText>
                <ThemedText type="small">
                  {listingPlan ? listingStatusMessage(listingPlan) : 'Check your publishing access'}
                </ThemedText>
              </View>
              <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                View ›
              </ThemedText>
            </Pressable>
          ) : null}

          {!session ? (
            <View style={[styles.notice, { backgroundColor: colors.warningSurface }]}>
              <ThemedText style={{ color: colors.warningText }}>
                Sign in from Account to manage a business.
              </ThemedText>
            </View>
          ) : loading && businesses.length === 0 ? (
            <ActivityIndicator color={Brand.primary} />
          ) : error ? (
            <View style={[styles.notice, { backgroundColor: colors.errorSurface }]}>
              <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText>
            </View>
          ) : businesses.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{ ios: 'building.2.fill', android: 'business', web: 'storefront' }}
                  tintColor={Brand.primary}
                  style={styles.emptyIconImage}
                />
              </View>
              <View style={styles.emptyCopy}>
                <ThemedText type="subtitle">Create your first workspace</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Build a public page, publish offerings and events, and invite staff when you’re
                  ready.
                </ThemedText>
              </View>
              <Pressable
                onPress={beginCreatingBusiness}
                style={[styles.primaryButton, { backgroundColor: Brand.primary }]}
              >
                <ThemedText style={styles.primaryText} type="smallBold">
                  Create a business
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.workspaceList}>
              <View style={styles.listHeader}>
                <View>
                  <ThemedText type="subtitle">Your workspaces</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} · pull
                    to refresh
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={beginCreatingBusiness}
                  style={[styles.addButton, { borderColor: Brand.primary }]}
                >
                  <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                    + Add
                  </ThemedText>
                </Pressable>
              </View>
              {businesses.map((business) => (
                <View
                  key={business.id}
                  style={[
                    styles.businessCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: colors.border,
                      borderLeftColor: business.primary_color ?? Brand.primary,
                    },
                  ]}
                >
                  <View style={styles.businessHeading}>
                    <WorkspaceLogo business={business} colors={colors} />
                    <View style={styles.businessTitle}>
                      <ThemedText type="subtitle" numberOfLines={2}>
                        {business.name}
                      </ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {business.role === 'owner' ? 'Owner workspace' : 'Staff access'}
                      </ThemedText>
                    </View>
                    <StatusPill status={business.status} />
                  </View>
                  <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                  <ThemedText themeColor="textSecondary" type="small">
                    {business.role === 'owner'
                      ? `Edit details, ${workspaceSectionLabel('offerings', business.business_type).toLowerCase()}, events, photos, rewards, staff, and publishing.`
                      : 'View the public page and use the secure staff scanner.'}
                  </ThemedText>
                  <View style={styles.businessActions}>
                    <Pressable
                      onPress={() =>
                        openBusiness(business.id, business.role === 'owner' ? null : 'preview')
                      }
                      style={[styles.primaryButton, { backgroundColor: Brand.primary }]}
                    >
                      <ThemedText style={styles.primaryText} type="smallBold">
                        {business.role === 'owner' ? 'Open workspace' : 'View business'}
                      </ThemedText>
                    </Pressable>
                    {business.role === 'owner' ? (
                      <Pressable
                        onPress={() => openBusiness(business.id, 'preview')}
                        style={[styles.secondaryButton, { borderColor: colors.border }]}
                      >
                        <ThemedText type="smallBold">Page preview</ThemedText>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => router.push('/staff-scan')}
                        style={[styles.secondaryButton, { borderColor: colors.border }]}
                      >
                        <ThemedText type="smallBold">Staff scanner</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function BusinessesDestinationUnderlay({
  businesses,
  colors,
  scrollOffset,
}: {
  readonly businesses: readonly BusinessSummary[];
  readonly colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  readonly scrollOffset: number;
}) {
  const bottomPadding = useScreenBottomPadding();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          contentOffset={{ x: 0, y: Math.max(0, scrollOffset) }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerBlock}>
            <AppChrome />
            <View style={styles.eyebrowRow}>
              <View style={[styles.eyebrowDot, { backgroundColor: Brand.primary }]} />
              <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                BUSINESS HUB
              </ThemedText>
            </View>
            <ThemedText type="title">Manage your business</ThemedText>
            <ThemedText themeColor="textSecondary">
              Keep every local business, team member, and customer touchpoint in one place.
            </ThemedText>
          </View>
          <View style={styles.workspaceList}>
            <View style={styles.listHeader}>
              <View>
                <ThemedText type="subtitle">Your workspaces</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} · pull
                  to refresh
                </ThemedText>
              </View>
              <View style={[styles.addButton, { borderColor: Brand.primary }]}>
                <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                  + Add
                </ThemedText>
              </View>
            </View>
            {businesses.map((business) => (
              <View
                key={business.id}
                style={[
                  styles.businessCard,
                  {
                    backgroundColor: colors.backgroundElement,
                    borderColor: colors.border,
                    borderLeftColor: business.primary_color ?? Brand.primary,
                  },
                ]}
              >
                <View style={styles.businessHeading}>
                  <WorkspaceLogo business={business} colors={colors} />
                  <View style={styles.businessTitle}>
                    <ThemedText type="subtitle" numberOfLines={2}>
                      {business.name}
                    </ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      {business.role === 'owner' ? 'Owner workspace' : 'Staff access'}
                    </ThemedText>
                  </View>
                  <StatusPill status={business.status} />
                </View>
                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />
                <ThemedText themeColor="textSecondary" type="small">
                  {business.role === 'owner'
                    ? `Edit details, ${workspaceSectionLabel('offerings', business.business_type).toLowerCase()}, events, photos, rewards, staff, and publishing.`
                    : 'View the public page and use the secure staff scanner.'}
                </ThemedText>
                <View style={styles.businessActions}>
                  <View style={[styles.primaryButton, { backgroundColor: Brand.primary }]}>
                    <ThemedText style={styles.primaryText} type="smallBold">
                      {business.role === 'owner' ? 'Open workspace' : 'View business'}
                    </ThemedText>
                  </View>
                  <View style={[styles.secondaryButton, { borderColor: colors.border }]}>
                    <ThemedText type="smallBold">
                      {business.role === 'owner' ? 'Page preview' : 'Staff scanner'}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatusPill({ status }: { readonly status: BusinessSummary['status'] }) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const active = status === 'active';
  return (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: active ? colors.successSurface : colors.backgroundSelected,
          borderColor: active ? colors.successText : colors.border,
        },
      ]}
    >
      <ThemedText
        style={{ color: active ? colors.successText : colors.textSecondary }}
        type="smallBold"
      >
        {getBusinessStatusLabel(status)}
      </ThemedText>
    </View>
  );
}

function WorkspaceLogo({
  business,
  colors,
}: {
  readonly business: BusinessSummary;
  readonly colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const logoRow = business.business_photos?.find((photo) => photo.role === 'logo');
  const logoAsset = Array.isArray(logoRow?.media_assets)
    ? logoRow.media_assets[0]
    : logoRow?.media_assets;
  const logoUrl =
    logoAsset?.status === 'ready' && !imageFailed ? storagePublicUrl(logoAsset.storage_path) : null;
  const accentColor = business.primary_color ?? Brand.primary;

  return (
    <View
      accessibilityLabel={`${business.name} logo`}
      style={[
        styles.businessIcon,
        {
          backgroundColor: colors.backgroundSelected,
          borderColor: accentColor,
        },
      ]}
    >
      {logoUrl ? (
        <Image
          accessibilityLabel={`${business.name} logo`}
          cachePolicy="memory-disk"
          contentFit="cover"
          onError={() => setImageFailed(true)}
          source={{ uri: logoUrl }}
          style={styles.businessIconImage}
          transition={180}
        />
      ) : (
        <ThemedText style={[styles.businessIconLetter, { color: accentColor }]} type="subtitle">
          {business.name.slice(0, 1).toUpperCase()}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  headerBlock: { gap: Spacing.two },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  eyebrowDot: { width: 8, height: 8, borderRadius: 4 },
  workspaceList: { gap: Spacing.three },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addButton: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  businessCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  businessHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  businessIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  businessIconImage: { width: '100%', height: '100%', borderRadius: 29 },
  businessIconLetter: { fontSize: 26, lineHeight: 32 },
  businessTitle: { flex: 1, gap: Spacing.one },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  cardDivider: { height: StyleSheet.hairlineWidth, width: '100%' },
  businessActions: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
  secondaryButton: {
    minHeight: 50,
    flex: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
  },
  primaryButton: {
    minHeight: 50,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
  },
  primaryText: { color: '#FFFFFF' },
  emptyCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primarySoft,
  },
  emptyIconImage: { width: 26, height: 26 },
  emptyCopy: { gap: Spacing.one },
  notice: { borderRadius: Radius.medium, padding: Spacing.three },
  flex: { flex: 1 },
  planCallout: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
