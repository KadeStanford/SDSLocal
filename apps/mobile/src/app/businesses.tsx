import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ModeSwitch } from '@/components/mode-switch';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { BusinessWorkspace } from '@/app/business';
import { NewBusinessWorkspace } from '@/app/business-new';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

interface BusinessSummary {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: 'draft' | 'pending_review' | 'active' | 'suspended' | 'archived';
  readonly role: 'owner' | 'staff';
}

interface MembershipRow {
  readonly role: BusinessSummary['role'];
  readonly businesses:
    Omit<BusinessSummary, 'role'> | readonly Omit<BusinessSummary, 'role'>[] | null;
}

export default function BusinessesScreen() {
  const { session, loading: authLoading } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<{
    readonly id: string;
    readonly section: BusinessSection;
  } | null>(null);
  const [creatingBusiness, setCreatingBusiness] = useState(false);

  const loadBusinesses = useCallback(async () => {
    if (!session) {
      setBusinesses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('business_members')
      .select('role, businesses(id, name, slug, status)')
      .eq('user_id', session.user.id)
      .eq('is_active', true);
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

  useEffect(() => {
    if (!session) return;
    let active = true;
    void supabase
      .from('business_members')
      .select('role, businesses(id, name, slug, status)')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .then(({ data, error: queryError }) => {
        if (!active) return;
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
      });
    return () => {
      active = false;
    };
  }, [session]);

  function openBusiness(businessId: string, section: BusinessSection) {
    setSelectedBusiness({ id: businessId, section });
  }

  if (selectedBusiness) {
    return (
      <BusinessWorkspace
        businessId={selectedBusiness.id}
        initialSection={selectedBusiness.section}
        onBack={() => setSelectedBusiness(null)}
      />
    );
  }

  if (creatingBusiness) {
    return (
      <NewBusinessWorkspace
        onBack={() => setCreatingBusiness(false)}
        onCreated={(businessId) => {
          setCreatingBusiness(false);
          setSelectedBusiness({ id: businessId, section: 'details' });
        }}
      />
    );
  }

  if (authLoading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color="#176B4D" />
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
          <ThemedText type="title">Your businesses</ThemedText>
          <ThemedText themeColor="textSecondary">
            Owner tools and staff access are gathered here.
          </ThemedText>

          {!session ? (
            <View style={styles.notice}>
              <ThemedText style={styles.noticeText}>Sign in from Account to continue.</ThemedText>
            </View>
          ) : loading && businesses.length === 0 ? (
            <ActivityIndicator color="#176B4D" />
          ) : error ? (
            <View style={styles.errorNotice}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          ) : businesses.length === 0 ? (
            <View style={styles.emptyCard}>
              <ThemedText type="subtitle">No business access yet</ThemedText>
              <ThemedText themeColor="textSecondary">
                Create a business profile or ask an owner to add you as staff.
              </ThemedText>
              <Pressable onPress={() => setCreatingBusiness(true)} style={styles.primaryButton}>
                <ThemedText style={styles.primaryText} type="smallBold">
                  Create a business
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.list}>
              {businesses.map((business) => (
                <View key={business.id} style={styles.businessCard}>
                  <View style={styles.businessHeading}>
                    <View style={styles.businessTitle}>
                      <ThemedText type="subtitle">{business.name}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {business.role === 'owner' ? 'Owner' : 'Staff'} ·{' '}
                        {business.status.replaceAll('_', ' ')}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => openBusiness(business.id, 'preview')}
                      style={styles.compactButton}
                    >
                      <ThemedText type="smallBold">View page</ThemedText>
                    </Pressable>
                  </View>

                  {business.role === 'owner' ? (
                    <>
                      <ThemedText themeColor="textSecondary" type="small">
                        Manage this business without leaving the app.
                      </ThemedText>
                      <View style={styles.actionGrid}>
                        <ManagementButton
                          label="Business details"
                          onPress={() => openBusiness(business.id, 'details')}
                        />
                        <ManagementButton
                          label="Offerings"
                          onPress={() => openBusiness(business.id, 'offerings')}
                        />
                        <ManagementButton
                          label="Events"
                          onPress={() => openBusiness(business.id, 'events')}
                        />
                        <ManagementButton
                          label="Rewards"
                          onPress={() => openBusiness(business.id, 'rewards')}
                        />
                        <ManagementButton
                          label="Photos"
                          onPress={() => openBusiness(business.id, 'photos')}
                        />
                      </View>
                    </>
                  ) : (
                    <Pressable
                      onPress={() => router.push('/staff-scan')}
                      style={styles.primaryButton}
                    >
                      <ThemedText style={styles.primaryText} type="smallBold">
                        Open staff scanner
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type BusinessSection = 'preview' | 'details' | 'offerings' | 'events' | 'rewards' | 'photos';

function ManagementButton({
  label,
  onPress,
}: {
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.managementButton}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
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
  list: { gap: Spacing.three },
  businessCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  businessHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  businessTitle: { flex: 1, gap: Spacing.one },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  managementButton: {
    minHeight: 46,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    paddingHorizontal: 12,
  },
  compactButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    paddingHorizontal: 14,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: '#176B4D',
    paddingHorizontal: 18,
  },
  primaryText: { color: '#FFFFFF' },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  notice: { borderRadius: 14, padding: Spacing.three, backgroundColor: '#FFF0C7' },
  noticeText: { color: '#3D3100' },
  errorNotice: { borderRadius: 14, padding: Spacing.three, backgroundColor: '#F8E6E6' },
  errorText: { color: '#761F1F' },
});
