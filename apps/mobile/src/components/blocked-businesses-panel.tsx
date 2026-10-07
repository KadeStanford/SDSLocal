import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { unblockBusiness } from '@/lib/customer-safety';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';

interface BlockedBusinessRow {
  readonly business_id: string;
  readonly businesses: { readonly name: string } | readonly { readonly name: string }[] | null;
}
interface BlockedBusiness {
  readonly id: string;
  readonly name: string;
}
export function BlockedBusinessesPanel() {
  const { session } = useAuth();
  return session ? (
    <BlockedBusinessesContent key={session.user.id} userId={session.user.id} />
  ) : (
    <ThemedText themeColor="textSecondary">Sign in to manage blocked businesses.</ThemedText>
  );
}
function BlockedBusinessesContent({ userId }: { userId: string }) {
  const colors = useTheme();
  const nearbyAlerts = useNearbyAlerts();
  const [businesses, setBusinesses] = useState<BlockedBusiness[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [readError, setReadError] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [refreshNeeded, setRefreshNeeded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(false);
  const readBusy = useRef(false);
  const writeBusy = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    if (readBusy.current || writeBusy.current) return;
    readBusy.current = true;
    setLoading(true);
    setReadError(false);
    try {
      const { data, error } = await supabase
        .from('blocked_businesses')
        .select('business_id, businesses(id, name)')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });
      if (!mounted.current) return;
      if (error || !Array.isArray(data)) throw error ?? new Error('Invalid blocked businesses');
      const rows = data as BlockedBusinessRow[];
      if (rows.some((row) => !row || typeof row.business_id !== 'string' || !row.business_id))
        throw new Error('Invalid business identity');
      setBusinesses(
        rows.map((row) => {
          const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
          return {
            id: row.business_id,
            name:
              typeof business?.name === 'string' && business.name.trim()
                ? business.name
                : 'Unavailable business',
          };
        }),
      );
    } catch {
      if (mounted.current) setReadError(true);
    } finally {
      readBusy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [userId]);
  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);
  async function refreshSuggestions() {
    if (readBusy.current || writeBusy.current) return;
    writeBusy.current = true;
    setRefreshing(true);
    try {
      await nearbyAlerts.refresh();
      if (mounted.current) setRefreshNeeded(false);
    } catch {
      if (mounted.current) setRefreshNeeded(true);
    } finally {
      writeBusy.current = false;
      if (mounted.current) setRefreshing(false);
    }
  }
  async function unblock(business: BlockedBusiness) {
    if (writeBusy.current || readBusy.current) return;
    writeBusy.current = true;
    setPendingId(business.id);
    setWriteError(null);
    setMessage(null);
    try {
      const { error } = await unblockBusiness(userId, business.id);
      if (!mounted.current) return;
      if (error) throw error;
      setBusinesses((current) => current?.filter((item) => item.id !== business.id) ?? null);
      setMessage(`${business.name} is no longer blocked. Unblocking does not follow it again.`);
      try {
        await nearbyAlerts.refresh();
        if (mounted.current) setRefreshNeeded(false);
      } catch {
        if (mounted.current) setRefreshNeeded(true);
      }
    } catch {
      if (mounted.current) setWriteError('This business could not be unblocked. Please try again.');
    } finally {
      writeBusy.current = false;
      if (mounted.current) setPendingId(null);
    }
  }
  const disabled = loading || Boolean(pendingId) || refreshing;
  return (
    <View style={styles.stack}>
      <View style={styles.heading}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Blocked businesses
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          Blocking hides businesses from Home, Following and event recommendations.
        </ThemedText>
      </View>
      {readError && (
        <View
          accessibilityRole="alert"
          style={[styles.notice, { backgroundColor: colors.errorSurface }]}
        >
          <ThemedText style={{ color: colors.errorText }}>
            Blocked businesses could not refresh.{' '}
            {businesses ? 'Your previous list is shown below.' : 'Try again to load your list.'}
          </ThemedText>
          <AppButton
            label="Retry blocked businesses"
            variant="secondary"
            disabled={disabled}
            onPress={() => void load()}
          />
        </View>
      )}
      {loading && (
        <View accessibilityLiveRegion="polite" style={styles.loading}>
          <ActivityIndicator color={colors.text} />
          <ThemedText themeColor="textSecondary" type="small">
            Loading blocked businesses…
          </ThemedText>
        </View>
      )}
      {businesses !== null && (
        <>
          <ThemedText themeColor="textSecondary" type="small">
            {businesses.length} blocked {businesses.length === 1 ? 'business' : 'businesses'}
          </ThemedText>
          {businesses.length === 0 ? (
            <View
              style={[
                styles.empty,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              <ThemedText type="smallBold">No blocked businesses</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                Businesses you block will appear here.
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.list, { borderColor: colors.border }]}>
              {businesses.map((business) => (
                <View
                  key={business.id}
                  style={[
                    styles.row,
                    { backgroundColor: colors.backgroundElement, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.identity}>
                    <ThemedText type="smallBold">{business.name}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      Hidden from recommendations
                    </ThemedText>
                  </View>
                  <AppButton
                    label="Unblock"
                    accessibilityLabel={`Unblock ${business.name}`}
                    variant="secondary"
                    disabled={disabled || readError}
                    loading={pendingId === business.id}
                    onPress={() => void unblock(business)}
                  />
                </View>
              ))}
            </View>
          )}
        </>
      )}
      {!!writeError && (
        <View
          accessibilityRole="alert"
          style={[styles.notice, { backgroundColor: colors.errorSurface }]}
        >
          <ThemedText style={{ color: colors.errorText }}>{writeError}</ThemedText>
        </View>
      )}
      {!!message && (
        <ThemedText accessibilityLiveRegion="polite" themeColor="textSecondary" type="small">
          {message}
        </ThemedText>
      )}
      {refreshNeeded && (
        <View style={styles.stack}>
          <ThemedText themeColor="textSecondary" type="small">
            Your block list was saved. Recommendations could not refresh.
          </ThemedText>
          <AppButton
            label="Refresh recommendations"
            variant="secondary"
            disabled={disabled}
            loading={refreshing}
            onPress={() => void refreshSuggestions()}
          />
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  heading: { gap: Spacing.two },
  notice: { padding: Spacing.three, gap: Spacing.two, borderRadius: Radius.small },
  loading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  empty: { borderWidth: 1, padding: Spacing.four, gap: Spacing.two, borderRadius: Radius.medium },
  list: { borderWidth: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  identity: { flexGrow: 1, flexShrink: 1, flexBasis: 180, gap: Spacing.one },
});
