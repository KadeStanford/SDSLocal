import { withBusinessTheme } from '@/components/business-theme';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { BusinessScreenHeader, BusinessTabs } from '@/components/business-screen-header';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { PickupOrderCard } from '@/components/pickup/business-order-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useOrderPolling } from '@/hooks/use-order-polling';
import { commerce } from '@/lib/square-commerce';
import { type PickupOrder, type PickupQueue } from '@/lib/square-commerce-core';
import { mergeOrders, type QueueView } from '@/lib/pickup-workspace';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/app-button';
import { ListLoading, StateNotice } from '@/components/data-state';
import { PickupIdentity } from '@/components/pickup/order-presentation';
function PickupOrdersScreen() {
  const workspace = usePickupWorkspace();
  const params = useLocalSearchParams<{ businessId?: string }>();
  const handled = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (
      params.businessId &&
      handled.current !== params.businessId &&
      workspace.businesses.some((b) => b.id === params.businessId)
    ) {
      handled.current = params.businessId;
      workspace.select(params.businessId);
    }
  }, [params.businessId, workspace]);
  const id = workspace.selected;
  return <PickupInbox key={id ?? 'none'} businessId={id} />;
}
function PickupInbox({ businessId }: { businessId: string | null }) {
  const c = useTheme();
  const bottom = useScreenBottomPadding();
  const workspace = usePickupWorkspace();
  const [view, setView] = useState<QueueView>('active');
  const [choosingBusiness, setChoosingBusiness] = useState(false);
  const [page, setPage] = useState<{
    source: PickupQueue;
    orders: PickupOrder[];
    next: number | null;
  } | null>(null);
  const [more, setMore] = useState(false);
  const morePending = useRef(false);
  const read = useCallback(
    async () => (businessId ? commerce<PickupQueue>('queue', { businessId, view }) : null),
    [businessId, view],
  );
  const state = useOrderPolling(`${businessId}:${view}`, read, view !== 'history');
  const pullRefresh = usePullRefresh(() => Promise.all([workspace.refresh(), state.refresh()]));
  const data = state.data;
  const extra = page?.source === data ? page.orders : [];
  const next = page?.source === data ? page.next : (data?.nextOffset ?? null);
  const business = data?.business ?? workspace.businesses.find((b) => b.id === businessId);
  const orders = mergeOrders(data?.orders ?? [], extra);
  async function loadMore() {
    if (morePending.current || next === null || !businessId || !data) return;
    morePending.current = true;
    setMore(true);
    try {
      const result = await commerce<PickupQueue>('queue', { businessId, view, offset: next });
      setPage({ source: data, orders: mergeOrders(extra, result.orders), next: result.nextOffset });
    } catch {
      state.setError('More orders could not load. Try again.');
    } finally {
      morePending.current = false;
      setMore(false);
    }
  }
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        automaticallyAdjustContentInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: 20,
          paddingBottom: bottom,
          gap: 16,
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={c.accent}
          />
        }
      >
        <BusinessScreenHeader title="Orders" subtitle="Manage pickups and customer requests." />
        <Modal
          visible={choosingBusiness}
          animationType="slide"
          onRequestClose={() => setChoosingBusiness(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
              <ThemedText type="title">Choose business</ThemedText>
              {workspace.businesses.map((b) => (
                <Pressable
                  key={b.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: b.id === businessId }}
                  onPress={() => {
                    setChoosingBusiness(false);
                    workspace.select(b.id);
                  }}
                  style={{
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor:
                      b.id === businessId ? c.backgroundSelected : c.backgroundElement,
                    minHeight: 64,
                  }}
                >
                  <PickupIdentity
                    business={b}
                    name={b.name}
                    subtitle={
                      b.counts.placed +
                      ' new · ' +
                      b.counts.ready +
                      ' ready · ' +
                      (b.counts.requests ?? 0) +
                      ' requests'
                    }
                  />
                </Pressable>
              ))}
              <AppButton
                label="Close"
                variant="secondary"
                onPress={() => setChoosingBusiness(false)}
              />
            </ScrollView>
          </SafeAreaView>
        </Modal>
        {business && (
          <View
            style={{
              gap: 12,
              padding: 16,
              borderRadius: 12,
              backgroundColor: c.backgroundElement,
              borderWidth: 1,
              borderColor: c.divider,
            }}
          >
            <PickupIdentity business={business} name={business.name} />
            <ThemedText
              type="smallBold"
              style={{ color: data?.settings?.is_open ? c.successText : c.textSecondary }}
            >
              {!data
                ? 'Checking ordering status…'
                : data.settings?.enabled && data.settings.is_open
                  ? '● Accepting online orders'
                  : 'Ⅱ Online ordering paused'}
            </ThemedText>
            {workspace.businesses.length > 1 && (
              <AppButton
                label="Switch business"
                variant="tertiary"
                style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
                onPress={() => setChoosingBusiness(true)}
              />
            )}
          </View>
        )}
        {data && !data.connected && (
          <StateNotice message="Payments need attention. You can manage existing pickups here; ask an owner to check Ordering & payments." />
        )}
        {!!workspace.error && <StateNotice message={workspace.error} />}
        {!!state.error && (
          <>
            <StateNotice message={state.error} kind="error" />
            <AppButton
              label="Retry orders"
              variant="secondary"
              onPress={() => void state.refresh()}
            />
          </>
        )}
        {businessId && (
          <View style={{ gap: 12 }}>
            <BusinessTabs
              value={view}
              onChange={setView}
              options={[
                { value: 'active', label: 'Active', count: data?.counts.active ?? 0 },
                { value: 'ready', label: 'Ready', count: data?.counts.ready ?? 0 },
                { value: 'requests', label: 'Requests', count: data?.counts.requests ?? 0 },
                { value: 'history', label: 'History' },
              ]}
            />
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {state.lastUpdated
                ? `${state.error ? 'Last saved view' : 'Updated'} ${new Date(state.lastUpdated).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · ${state.error ? 'Pull to retry' : view === 'history' ? 'Pull to refresh' : 'Auto-updates while open'}`
                : 'Checking orders…'}
            </ThemedText>
          </View>
        )}
        {!data && (state.loading || workspace.loading) ? (
          <ListLoading label="Loading pickup orders" />
        ) : (
          !orders.length &&
          !state.error && (
            <View style={{ gap: 16, paddingVertical: 32, alignItems: 'center' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: c.backgroundElement,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SymbolView name="bag" tintColor={c.textMuted} style={{ width: 28, height: 28 }} />
              </View>
              <ThemedText type="card" style={{ textAlign: 'center' }}>
                {!businessId
                  ? 'No pickup businesses yet'
                  : view === 'requests'
                    ? 'No requests awaiting reply'
                    : view === 'ready'
                      ? 'Nothing waiting at the counter'
                      : view === 'history'
                        ? 'No past pickups'
                        : 'You’re all caught up'}
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center', maxWidth: 300 }}>
                {!businessId
                  ? 'An owner can enable pickup in Ordering & payments.'
                  : view === 'requests'
                    ? 'Customer changes, cancellations, and issues appear here until your team replies.'
                    : view === 'active'
                      ? 'New paid orders appear here. Keep this screen open for updates.'
                      : view === 'ready'
                        ? 'Orders move here when your team marks them ready.'
                        : 'Completed pickups and refunds appear here.'}
              </ThemedText>
            </View>
          )
        )}
        {orders.map((order) => (
          <PickupOrderCard
            key={order.id}
            order={{ ...order, business: data?.business ?? order.business ?? null }}
            now={state.lastUpdated ?? 0}
          />
        ))}
        {next !== null && (
          <AppButton
            label="Load more orders"
            variant="secondary"
            loading={more}
            onPress={() => void loadMore()}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default withBusinessTheme(PickupOrdersScreen);
