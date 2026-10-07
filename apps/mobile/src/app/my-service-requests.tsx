import { CustomerBrand } from '@/components/customer-brand';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppChrome } from '@/components/app-chrome';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import {
  CustomerRequestDetails,
  CustomerRequestInbox,
  canCancelCustomerRequest,
  filterCustomerRequests,
  requestBusinessName,
  requestIsClosed,
  type CustomerRequest,
} from '@/components/customer-request-inbox';
import {
  MerchantButton,
  MerchantFilters,
  MerchantHeading,
  MerchantSearch,
  MerchantSheet,
  merchantStyles,
} from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

export default function MyServiceRequestsScreen() {
  const { requestId } = useLocalSearchParams<{ requestId?: string }>();
  const { session } = useAuth();
  const owner = session?.user.id ?? null;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const generation = useRef(0);
  const mutation = useRef(false);
  const openedLink = useRef<string | null>(null);
  const c = useMerchantTheme();
  const bottomPadding = useScreenBottomPadding();
  const [snapshot, setSnapshot] = useState<{
    owner: string | null;
    requests: CustomerRequest[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'history'>('all');
  const requests = snapshot?.owner === owner ? snapshot.requests : [];
  const selected = requests.find((request) => request.id === selectedId);
  const visible = filterCustomerRequests(requests, filter, query);
  useEffect(() => {
    setSelectedId(null);
    setNotice(null);
    setError(null);
    setQuery('');
    setFilter('all');
  }, [owner]);
  const load = useCallback(async () => {
    const version = ++generation.current;
    if (!owner) {
      setSnapshot(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('service_requests')
        .select(
          'id, business_id, request_message, preferred_timing, status, created_at, form_answers, businesses(name)',
        )
        .eq('customer_id', owner)
        .order('created_at', { ascending: false });
      if (version !== generation.current || ownerRef.current !== owner) return;
      if (queryError) throw queryError;
      setSnapshot({ owner, requests: (data ?? []) as CustomerRequest[] });
      setError(null);
    } catch (cause) {
      if (version === generation.current && ownerRef.current === owner)
        setError(
          userMessageFromError(cause, 'Your service requests could not load. Please retry.'),
        );
    } finally {
      if (version === generation.current && ownerRef.current === owner) setLoading(false);
    }
  }, [owner]);
  const pullRefresh = usePullRefresh(load);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );
  useEffect(() => {
    const link = owner && requestId ? owner + ':' + requestId : null;
    if (
      link &&
      openedLink.current !== link &&
      requests.some((request) => request.id === requestId)
    ) {
      openedLink.current = link;
      setSelectedId(requestId!);
    }
  }, [requestId, snapshot, owner]);

  async function cancel(request: CustomerRequest, requestOwner: string) {
    if (mutation.current || ownerRef.current !== requestOwner || !canCancelCustomerRequest(request))
      return;
    mutation.current = true;
    setSavingId(request.id);
    setError(null);
    try {
      const { data, error: cancelError } = await supabase.rpc('cancel_service_request', {
        p_request_id: request.id,
      });
      if (ownerRef.current !== requestOwner) return;
      if (cancelError || !data)
        throw (
          cancelError ??
          new Error('This request can no longer be cancelled. Refresh to check its status.')
        );
      setSnapshot((current) =>
        current?.owner === requestOwner
          ? {
              ...current,
              requests: current.requests.map((row) =>
                row.id === request.id ? { ...row, status: 'cancelled' } : row,
              ),
            }
          : current,
      );
      setNotice('Request cancelled.');
      await load();
    } catch (cause) {
      if (ownerRef.current === requestOwner)
        setError(userMessageFromError(cause, 'This request could not be cancelled. Please retry.'));
    } finally {
      mutation.current = false;
      setSavingId(null);
    }
  }
  function confirmCancel(request: CustomerRequest) {
    if (!owner || mutation.current) return;
    const requestOwner = owner;
    Alert.alert(
      'Cancel this request?',
      `Cancel your request to ${requestBusinessName(request)}? This cannot be undone.`,
      [
        { text: 'Keep request', style: 'cancel' },
        {
          text: 'Cancel request',
          style: 'destructive',
          onPress: () => void cancel(request, requestOwner),
        },
      ],
    );
  }
  return (
    <View style={[merchantStyles.screen, { backgroundColor: c.background }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[merchantStyles.content, { paddingBottom: bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={pullRefresh.refreshing}
              onRefresh={pullRefresh.onRefresh}
              tintColor={c.text}
            />
          }
        >
          <AppChrome />
          <CustomerBrand />
          <MerchantHeading
            title="Service requests"
            subtitle="Track your quotes and consultations."
          />
          {!owner ? (
            <EmptyState
              title="Your requests, in one place"
              message="Sign in to track requests you have sent to businesses."
              actionLabel="Sign in"
              onAction={() => router.push('/account')}
            />
          ) : (
            <>
              {!!error && (
                <View style={{ gap: 12 }}>
                  <StateNotice kind="error" message={error} />
                  <MerchantButton
                    label="Retry"
                    secondary
                    loading={loading}
                    onPress={() => void load()}
                  />
                </View>
              )}
              {!!notice && <StateNotice kind="success" message={notice} />}
              <MerchantSearch
                value={query}
                onChange={setQuery}
                placeholder="Search businesses or requests"
              />
              <MerchantFilters
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All', count: requests.length },
                  {
                    value: 'active',
                    label: 'Active',
                    count: requests.filter((request) => !requestIsClosed(request)).length,
                  },
                  {
                    value: 'history',
                    label: 'History',
                    count: requests.filter(requestIsClosed).length,
                  },
                ]}
              />
              {loading && snapshot?.owner !== owner ? (
                <ListLoading label="Loading requests" />
              ) : visible.length ? (
                <CustomerRequestInbox requests={visible} onOpen={setSelectedId} />
              ) : (
                !error && (
                  <EmptyState
                    title={requests.length ? 'No matching requests' : 'No requests yet'}
                    message={
                      requests.length
                        ? 'Try another search or view all requests.'
                        : 'Find a service business and send a quote or consultation request.'
                    }
                  />
                )
              )}
            </>
          )}
          <MerchantButton
            label="Explore businesses"
            secondary
            onPress={() => router.push('/explore')}
          />
        </ScrollView>
        <MerchantSheet
          visible={!!selected}
          title={selected ? requestBusinessName(selected) : 'Request details'}
          blocked={!!savingId}
          onClose={() => setSelectedId(null)}
          footer={
            selected && canCancelCustomerRequest(selected) ? (
              <MerchantButton
                label="Cancel request"
                destructive
                loading={savingId === selected.id}
                disabled={!!savingId}
                onPress={() => confirmCancel(selected)}
              />
            ) : undefined
          }
        >
          {!!selected && <CustomerRequestDetails request={selected} />}
          {!!error && <StateNotice kind="error" message={error} />}
          {!!notice && <StateNotice kind="success" message={notice} />}
        </MerchantSheet>
      </SafeAreaView>
    </View>
  );
}
