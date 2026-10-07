import { CustomerOrdersHeader } from '@/components/pickup/customer-orders-header';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCallback, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useOrderPolling } from '@/hooks/use-order-polling';
import { commerce, readGuestOrderAccess } from '@/lib/square-commerce';
import {
  loadCustomerOrders,
  mergeCustomerOrders,
  type CustomerOrderPage,
  type CustomerOrdersResult,
  type CustomerOrderView,
} from '@/lib/customer-orders';
import { pickupDiscoveryEnabled } from '@/lib/pickup-discovery';
import { AppButton } from '@/components/app-button';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { CustomerOrderCard } from '@/components/pickup/customer-order-card';
export default function OrdersScreen() {
  const { session, loading } = useAuth();
  if (loading) return <ListLoading label="Loading your orders" rows={2} />;
  if (!pickupDiscoveryEnabled(process.env.EXPO_PUBLIC_APP_ENV))
    return (
      <EmptyState
        title="Orders are unavailable"
        message="Pickup ordering isn’t available in this environment."
      />
    );
  return <CustomerOrders key={session?.user.id ?? 'guest'} userId={session?.user.id ?? null} />;
}
function CustomerOrders({ userId }: { userId: string | null }) {
  const c = useTheme();
  const bottom = useScreenBottomPadding();
  const [view, setView] = useState<CustomerOrderView>('current');
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={['top', 'left', 'right']}
    >
      <CustomerOrdersHeader signedIn={!!userId} view={view} onView={setView} />
      <CustomerOrdersList key={`${userId}:${view}`} userId={userId} view={view} bottom={bottom} />
    </SafeAreaView>
  );
}
function CustomerOrdersList({
  userId,
  view,
  bottom,
}: {
  userId: string | null;
  view: CustomerOrderView;
  bottom: number;
}) {
  const c = useTheme();
  const pending = useRef(false);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState<{
    source: CustomerOrdersResult;
    result: CustomerOrdersResult;
  } | null>(null);
  const fetchPage = useCallback(
    (offsets: { account: number | null; device: number | null }) =>
      loadCustomerOrders(userId, view, offsets, {
        access: readGuestOrderAccess,
        read: (body) => commerce<CustomerOrderPage>('customer_orders', body),
      }),
    [userId, view],
  );
  const read = useCallback(() => fetchPage({ account: 0, device: 0 }), [fetchPage]);
  const state = useOrderPolling(`${userId}:${view}`, read, view === 'current');
  const pullRefresh = usePullRefresh(() => state.refresh());
  const data = state.data;
  const result = page?.source === data ? page.result : data;
  const rows = result?.orders ?? [];
  async function loadMore() {
    if (
      !data ||
      !result ||
      pending.current ||
      (result.nextAccount === null && result.nextDevice === null)
    )
      return;
    pending.current = true;
    setMore(true);
    try {
      const next = await fetchPage({ account: result.nextAccount, device: result.nextDevice });
      setPage({
        source: data,
        result: { ...next, orders: mergeCustomerOrders(rows, next.orders) },
      });
    } catch {
      state.setError('More orders could not load. Your loaded orders are still here.');
    } finally {
      pending.current = false;
      setMore(false);
    }
  }
  return (
    <FlatList
      style={{ flex: 1 }}
      data={rows}
      keyExtractor={(o) => o.id}
      renderItem={({ item }) => <CustomerOrderCard order={item} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottom, gap: 0 }}
      initialNumToRender={8}
      refreshControl={
        <RefreshControl
          refreshing={pullRefresh.refreshing}
          onRefresh={pullRefresh.onRefresh}
          tintColor={c.accent}
        />
      }
      ListHeaderComponent={
        <View style={{ gap: 12, paddingBottom: 12 }}>
          {!!state.error && (
            <>
              <StateNotice kind="error" message={state.error} />
              <AppButton
                label="Retry"
                variant="secondary"
                loading={state.loading}
                onPress={() => {
                  void state.refresh();
                }}
              />
            </>
          )}
          {!userId && (
            <AppButton
              label="Sign in for account orders"
              variant="tertiary"
              onPress={() => router.push('/account')}
            />
          )}
        </View>
      }
      ListEmptyComponent={
        state.loading ? (
          <ListLoading label="Loading your orders" rows={2} />
        ) : !state.error ? (
          <View style={{ gap: 16 }}>
            <EmptyState
              title={view === 'current' ? 'No current orders' : 'No past orders yet'}
              message={
                view === 'current'
                  ? 'Your next pickup will appear here, from checkout through collection.'
                  : 'Completed, refunded, and expired orders appear here.'
              }
            />
            {view === 'current' && (
              <AppButton
                label="Find a place to order"
                variant="secondary"
                onPress={() => router.push('/explore')}
              />
            )}
          </View>
        ) : null
      }
      ListFooterComponent={
        result && (result.nextAccount !== null || result.nextDevice !== null) ? (
          <AppButton
            label="Load more orders"
            variant="secondary"
            loading={more}
            onPress={() => {
              void loadMore();
            }}
            style={{ marginTop: 16 }}
          />
        ) : null
      }
    />
  );
}
