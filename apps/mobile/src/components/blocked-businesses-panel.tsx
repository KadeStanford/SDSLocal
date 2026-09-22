import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { unblockBusiness } from '@/lib/customer-safety';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useNearbyAlerts } from '@/providers/nearby-alerts-provider';

interface BlockedBusinessRow {
  readonly business_id: string;
  readonly businesses:
    | { readonly id: string; readonly name: string }
    | readonly { readonly id: string; readonly name: string }[]
    | null;
}

interface BlockedBusiness {
  readonly id: string;
  readonly name: string;
}

export function BlockedBusinessesPanel() {
  const { session } = useAuth();
  const nearbyAlerts = useNearbyAlerts();
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const [businesses, setBusinesses] = useState<BlockedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('blocked_businesses')
      .select('business_id, businesses(id, name)')
      .eq('customer_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      setMessage('We couldn’t update your blocked businesses.');
    } else {
      setBusinesses(
        ((data ?? []) as BlockedBusinessRow[]).flatMap((row) => {
          const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
          return business ? [{ id: business.id, name: business.name }] : [];
        }),
      );
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  async function unblock(business: BlockedBusiness) {
    if (!session || pendingId) return;
    setPendingId(business.id);
    setMessage(null);
    const { error } = await unblockBusiness(session.user.id, business.id);
    setPendingId(null);
    if (error) {
      setMessage('We couldn’t update your blocked businesses. Please try again.');
      return;
    }
    setBusinesses((current) => current.filter((item) => item.id !== business.id));
    await nearbyAlerts.refresh();
    setMessage(`${business.name} is no longer blocked. It may appear after you refresh Explore.`);
  }

  return (
    <View style={styles.stack}>
      <View style={[styles.info, { backgroundColor: colors.backgroundElement }]}>
        <ThemedText type="subtitle">Blocked businesses</ThemedText>
        <ThemedText themeColor="textSecondary">
          Blocking hides a business from Explore, Following, and customer event recommendations.
          Unblocking does not automatically follow it again.
        </ThemedText>
      </View>
      {loading ? (
        <ActivityIndicator color={Brand.primary} />
      ) : businesses.length === 0 ? (
        <View style={[styles.empty, { borderColor: colors.border }]}>
          <ThemedText type="subtitle">No blocked businesses</ThemedText>
          <ThemedText themeColor="textSecondary">
            Businesses you block will appear here so you can restore them later.
          </ThemedText>
        </View>
      ) : (
        businesses.map((business) => (
          <View key={business.id} style={[styles.row, { borderColor: colors.border }]}>
            <ThemedText style={styles.name} type="smallBold">
              {business.name}
            </ThemedText>
            <Pressable
              disabled={Boolean(pendingId)}
              onPress={() => void unblock(business)}
              style={styles.unblock}
            >
              <ThemedText style={styles.unblockText} type="smallBold">
                {pendingId === business.id ? 'Unblocking…' : 'Unblock'}
              </ThemedText>
            </Pressable>
          </View>
        ))
      )}
      {message ? (
        <ThemedText themeColor="textSecondary" type="small">
          {message}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.three },
  info: { borderRadius: Radius.large, gap: Spacing.two, padding: Spacing.four },
  empty: { borderWidth: 1, borderRadius: Radius.large, gap: Spacing.two, padding: Spacing.four },
  row: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  name: { flex: 1 },
  unblock: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Brand.primarySoft,
    paddingHorizontal: Spacing.three,
  },
  unblockText: { color: Brand.primary },
});
