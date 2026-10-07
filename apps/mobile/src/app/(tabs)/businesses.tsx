import { useTheme } from '@/hooks/use-theme';
import { withBusinessTheme } from '@/components/business-theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import {
  MerchantBusinessList,
  merchantColors,
  type BusinessListFilter,
} from '@/components/merchant-business-list';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { router, useFocusEffect, useLocalSearchParams, type Href } from 'expo-router';
import { StateNotice } from '@/components/data-state';
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
import { Brand, type Colors } from '@/constants/theme';
import { BusinessWorkspace } from '@/components/business-workspace';
import { NewBusinessWorkspace } from '@/app/business-new';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useListingBilling } from '@/providers/listing-billing-provider';
import { listingStatusMessage } from '@/lib/listing-billing-core';
import { type BusinessSection } from '@/lib/business-workspace-config';
import type { BusinessType } from '@sds/types';

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

function BusinessesScreen() {
  const { pickupNotice } = useLocalSearchParams<{ pickupNotice?: string }>();
  const bottomPadding = useScreenBottomPadding();
  const scheme = useColorScheme();
  const colors = useTheme();
  const { session, loading: authLoading } = useAuth();
  const { summary: listingPlan } = useListingBilling();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<BusinessListFilter>('all');
  const merchantTheme = merchantColors(scheme, colors);
  const planMessage = listingPlan ? listingStatusMessage(listingPlan) : 'No publishing plan yet';
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
      setError('We could not reach your businesses. Check your connection and try again.');
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

  const pullRefresh = usePullRefresh(loadBusinesses);
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
            search={search}
            filter={filter}
            planMessage={planMessage}
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
            search={search}
            filter={filter}
            planMessage={planMessage}
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
    <View style={[styles.container, { backgroundColor: merchantTheme.background }]}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView
          contentOffset={{ x: 0, y: Math.max(0, businessListReturnOffset) }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            businessListScrollOffset.current = event.nativeEvent.contentOffset.y;
          }}
          refreshControl={
            <RefreshControl
              refreshing={pullRefresh.refreshing}
              onRefresh={pullRefresh.onRefresh}
              tintColor={merchantTheme.text}
            />
          }
        >
          <AppChrome />
          {!!pickupNotice && <StateNotice message={pickupNotice} />}
          {!session && (
            <ThemedText style={{ color: merchantTheme.secondary }}>
              Sign in from Account to manage a business.
            </ThemedText>
          )}
          {!!error && (
            <>
              <StateNotice message={error} kind="error" />
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadBusinesses()}
                style={{ minHeight: 44, justifyContent: 'center' }}
              >
                <ThemedText type="smallBold" style={{ color: merchantTheme.text }}>
                  Retry loading businesses
                </ThemedText>
              </Pressable>
            </>
          )}
          {loading && businesses.length === 0 ? (
            <ActivityIndicator color={merchantTheme.text} />
          ) : (
            session && (
              <MerchantBusinessList
                businesses={businesses}
                search={search}
                filter={filter}
                onSearch={setSearch}
                onFilter={setFilter}
                onOpen={openBusiness}
                onAdd={beginCreatingBusiness}
                onPlan={() => router.push('/listing-plans' as Href)}
                onStaffScan={() => router.push('/staff-scan')}
                planMessage={planMessage}
              />
            )
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function BusinessesDestinationUnderlay({
  businesses,
  colors,
  scrollOffset,
  search,
  filter,
  planMessage,
}: {
  readonly businesses: readonly BusinessSummary[];
  readonly colors: (typeof Colors)['light'] | (typeof Colors)['dark'];
  readonly scrollOffset: number;
  readonly search: string;
  readonly filter: BusinessListFilter;
  readonly planMessage: string;
}) {
  const c = merchantColors(useColorScheme(), colors);
  const bottom = useScreenBottomPadding();
  return (
    <View
      style={[styles.container, { backgroundColor: c.background }]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView
          scrollEnabled={false}
          contentInsetAdjustmentBehavior="automatic"
          contentOffset={{ x: 0, y: Math.max(0, scrollOffset) }}
          contentContainerStyle={[styles.content, { paddingBottom: bottom }]}
        >
          <AppChrome />
          <MerchantBusinessList
            businesses={businesses}
            search={search}
            filter={filter}
            onSearch={() => {}}
            onFilter={() => {}}
            onOpen={() => {}}
            onAdd={() => {}}
            onPlan={() => {}}
            onStaffScan={() => {}}
            planMessage={planMessage}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', maxWidth: 720, alignSelf: 'center', padding: 16, gap: 20 },
});

export default withBusinessTheme(BusinessesScreen);
