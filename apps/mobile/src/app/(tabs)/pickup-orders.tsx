import { PickupOrderCard } from '@/components/pickup/business-order-components';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
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
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { PickupIdentity } from '@/components/pickup/order-presentation';
export default function PickupOrdersScreen() {
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
        contentContainerStyle={{
          padding: 16,
          paddingBottom: bottom,
          gap: 24,
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl
            refreshing={state.loading && !!data}
            onRefresh={() => {
              void workspace.refresh();
              void state.refresh();
            }}
            tintColor={c.accent}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <ThemedText type="title">Pickup orders</ThemedText>
          <ThemedText themeColor="textSecondary">Manage today’s pickups.</ThemedText>
        </View>
        {workspace.businesses.length > 1 && (
          <View style={{ gap: 8 }}>
            <ThemedText type="smallBold">Business</ThemedText>
            {workspace.businesses.map((b) => (
              <Pressable
                key={b.id}
                accessibilityRole="radio"
                accessibilityLabel={`${b.name}, ${b.counts.active} active, ${b.counts.ready} ready`}
                accessibilityState={{ selected: b.id === businessId }}
                onPress={() => workspace.select(b.id)}
                style={{
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: b.id === businessId ? c.backgroundSelected : c.backgroundElement,
                }}
              >
                <PickupIdentity
                  business={b}
                  name={b.name}
                  subtitle={`${b.counts.placed} new · ${b.counts.preparing} preparing · ${b.counts.ready} ready`}
                />
              </Pressable>
            ))}
          </View>
        )}
        {business && (
          <View style={{ gap: 12 }}>
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
          </View>
        )}
        {data && !data.connected && (
          <StateNotice message="Square needs to reconnect. You can manage existing pickups here; ask an owner to reconnect in Ordering & Square." />
        )}
        {!!workspace.error && <StateNotice message={workspace.error} />}{' '}
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['active', 'ready', 'history'] as const).map((v) => (
                <Pressable
                  key={v}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: view === v }}
                  onPress={() => {
                    setPage(null);

                    setView(v);
                  }}
                  style={{
                    flexGrow: 1,
                    minHeight: 48,
                    padding: 12,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: view === v ? c.actionPrimary : c.backgroundElement,
                  }}
                >
                  <ThemedText type="smallBold" style={{ color: view === v ? c.onAction : c.text }}>
                    {v === 'active'
                      ? `Active${data ? ` · ${data.counts.active}` : ''}`
                      : v === 'ready'
                        ? `Ready${data ? ` · ${data.counts.ready}` : ''}`
                        : 'History'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
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
            <EmptyState
              title={
                !businessId
                  ? 'No pickup businesses yet'
                  : view === 'ready'
                    ? 'Nothing waiting at the counter'
                    : view === 'history'
                      ? 'No past pickups'
                      : 'You’re all caught up'
              }
              message={
                !businessId
                  ? 'An owner can enable pickup in Ordering & Square.'
                  : view === 'active'
                    ? 'New paid orders appear here. Keep this screen open for updates.'
                    : view === 'ready'
                      ? 'Orders move here when your team marks them ready.'
                      : 'Completed pickups and refunds appear here.'
              }
            />
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
