import { FlowSection, FlowIdentity } from '@/components/flow-layout';
import { ServiceRequestInboxControls } from '@/components/service-request-inbox-controls';
import { ServiceRequestSummaryCard } from '@/components/service-request-summary-card';
import { RequestAnswers } from '@/components/request-question-fields';
import type { RequestAnswer } from '@/lib/service-request-schema';
import { ParishBusinessBrand } from '@/components/business-screen-header';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Linking, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import {
  MerchantButton,
  MerchantHeading,
  MerchantSheet,
  MerchantStatus,
  merchantStyles,
} from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import {
  requestActions,
  requestMatches,
  requestStatusLabels,
  type RequestFilter,
} from '@/lib/merchant-inbox';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import type { ReactNode } from 'react';

interface ServiceRequestRow {
  readonly form_answers?: RequestAnswer[];
  readonly id: string;
  readonly business_id: string;
  readonly offering_item_id: string | null;
  readonly customer_name: string;
  readonly customer_email: string | null;
  readonly request_message: string;
  readonly preferred_timing: string | null;
  readonly status: string;
  readonly created_at: string;
}

interface BusinessRow {
  readonly id: string;
  readonly name: string;
  readonly business_type: string;
}

export default function ServiceRequestsScreen() {
  const { businessId, requestId } = useLocalSearchParams<{
    businessId?: string;
    requestId?: string;
  }>();
  return <ServiceRequestsContent businessId={businessId} requestId={requestId} />;
}
export function ServiceRequestsContent({
  businessId,
  requestId,
  header,
  embedded = false,
}: {
  businessId: string | undefined;
  requestId?: string | undefined;
  header?: ReactNode;
  embedded?: boolean;
}) {
  const { session } = useAuth();
  const colors = useMerchantTheme();
  const bottomPadding = useScreenBottomPadding();
  const [business, setBusiness] = useState<BusinessRow | null>(null);
  const [requests, setRequests] = useState<ServiceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<RequestFilter>('new');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const generation = useRef(0);
  const mutation = useRef(false);
  const activeScope = `${session?.user.id ?? ''}:${businessId ?? ''}`;
  const scopeRef = useRef(activeScope);
  useEffect(() => {
    scopeRef.current = activeScope;
    return () => {
      scopeRef.current = '';
    };
  }, [activeScope]);
  useEffect(() => {
    // Scope changes reset the inbox before its asynchronous refresh completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavingId(null);
    setNotice(null);
    setSelectedId(null);
    setRequests([]);
    setBusiness(null);
    setIsOwner(false);
    return () => {
      generation.current++;
    };
  }, [businessId, session?.user.id]);

  const load = useCallback(async () => {
    const readGeneration = ++generation.current;
    if (!session || !businessId) {
      setError('Choose a business and sign in to view its service requests.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [businessResult, requestResult, memberResult] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, business_type')
          .eq('id', businessId)
          .maybeSingle(),
        supabase
          .from('service_requests')
          .select(
            'id, business_id, offering_item_id, customer_name, customer_email, request_message, preferred_timing, status, created_at, form_answers',
          )
          .eq('business_id', businessId)
          .order('created_at', { ascending: false }),
        supabase
          .from('business_members')
          .select('role')
          .eq('business_id', businessId)
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .maybeSingle(),
      ]);
      if (readGeneration !== generation.current) return;
      setIsOwner(!memberResult.error && memberResult.data?.role === 'owner');
      if (businessResult.error || requestResult.error) {
        setError(
          userMessageFromError(
            businessResult.error ?? requestResult.error,
            'Service requests could not load.',
          ),
        );
        setBusiness(null);
        setRequests([]);
      } else if (!businessResult.data || businessResult.data.business_type !== 'services') {
        setError('This is not an active service business.');
        setBusiness(null);
        setRequests([]);
      } else {
        setBusiness(businessResult.data as BusinessRow);
        setRequests((requestResult.data ?? []) as ServiceRequestRow[]);
        if (requestId && requestResult.data?.some((r) => r.id === requestId))
          setSelectedId(requestId);
      }
    } catch (cause) {
      if (readGeneration === generation.current)
        setError(userMessageFromError(cause, 'Service requests could not load. Please retry.'));
    } finally {
      if (readGeneration === generation.current) setLoading(false);
    }
  }, [businessId, requestId, session]);

  const pullRefresh = usePullRefresh(load);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );

  async function updateStatus(requestId: string, status: 'in_review' | 'contacted' | 'completed') {
    if (mutation.current) return;
    const operationScope = scopeRef.current;
    mutation.current = true;
    setSavingId(requestId);
    setError(null);
    setNotice(null);
    try {
      const { data, error: updateError } = await supabase.rpc('update_service_request_status', {
        p_request_id: requestId,
        p_status: status,
      });
      if (scopeRef.current !== operationScope) return;
      if (updateError || data !== true) {
        setError(
          userMessageFromError(
            updateError,
            'This request could not be updated. Refresh and review its current status.',
          ),
        );
        return;
      }
      await load();
      if (scopeRef.current !== operationScope) return;
      setNotice('Request updated. The customer can see the new status.');
    } catch (cause) {
      if (scopeRef.current !== operationScope) return;
      setError(userMessageFromError(cause, 'The request could not be updated. Please retry.'));
    } finally {
      mutation.current = false;
      if (scopeRef.current === operationScope) setSavingId(null);
    }
  }
  const selected = requests.find((r) => r.id === selectedId);
  const query = search.trim().toLocaleLowerCase();
  const visible = requests.filter(
    (r) =>
      requestMatches(r.status, filter) &&
      [r.customer_name, r.request_message, r.customer_email ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
  );
  const filters = (
    [
      { value: 'new', label: 'New' },
      { value: 'progress', label: 'In progress' },
      { value: 'closed', label: 'Closed' },
      { value: 'all', label: 'All' },
    ] as const
  ).map((f) => ({ ...f, count: requests.filter((r) => requestMatches(r.status, f.value)).length }));
  const actions = selected ? requestActions(selected.status) : [];

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <FlatList
        data={visible}
        keyExtractor={(r) => r.id}
        contentContainerStyle={[merchantStyles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={colors.text}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            {header}
            {!embedded && (
              <>
                <ParishBusinessBrand />
                <MerchantHeading
                  title="Requests & estimates"
                  subtitle={business?.name ?? 'Your customer enquiries'}
                />
              </>
            )}
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton
                  brand
                  label="Refresh request status"
                  secondary
                  disabled={!!savingId}
                  onPress={() => void load()}
                />
              </>
            )}
            {!!notice && <StateNotice kind="success" message={notice} />}
            <ServiceRequestInboxControls
              isOwner={isOwner}
              onCustomize={() =>
                router.push({ pathname: '/request-form', params: { businessId } } as never)
              }
              filter={filter}
              setFilter={setFilter}
              filters={filters}
              search={search}
              setSearch={setSearch}
            />
          </View>
        }
        renderItem={({ item }) => (
          <ServiceRequestSummaryCard
            name={item.customer_name}
            message={item.request_message}
            status={requestStatusLabels[item.status] ?? 'Unknown status'}
            date={item.created_at}
            onPress={() => {
              setError(null);
              setNotice(null);
              setSelectedId(item.id);
            }}
          />
        )}
        ListEmptyComponent={
          loading && !requests.length ? (
            <ListLoading label="Loading service requests" />
          ) : !error ? (
            <EmptyState
              title={
                search
                  ? 'No matching requests'
                  : filter === 'new'
                    ? 'No new requests'
                    : 'No requests here'
              }
              message={
                search
                  ? 'Try another name or clear your search.'
                  : 'Quote and consultation requests will appear in this inbox.'
              }
            />
          ) : null
        }
        ListFooterComponent={
          embedded ? null : (
            <MerchantButton
              brand
              label="Back to business"
              secondary
              onPress={() => router.back()}
            />
          )
        }
      />
      <MerchantSheet
        visible={!!selected}
        title="Service request"
        blocked={!!savingId}
        onClose={() => setSelectedId(null)}
        footer={
          selected && actions[0] ? (
            <MerchantButton
              brand
              label={actions[0].label}
              loading={savingId === selected.id}
              disabled={loading || !!error}
              onPress={() => void updateStatus(selected.id, actions[0]!.status)}
            />
          ) : undefined
        }
      >
        {selected && (
          <>
            <FlowIdentity
              name={selected.customer_name}
              detail={
                'Received ' +
                new Date(selected.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <MerchantStatus
              label={requestStatusLabels[selected.status] ?? 'Unknown status'}
              tone={
                selected.status === 'new'
                  ? 'warning'
                  : selected.status === 'completed'
                    ? 'success'
                    : 'quiet'
              }
            />
            {!!error && <StateNotice kind="error" message={error} />}
            {!!notice && <StateNotice kind="success" message={notice} />}
            <FlowSection title="What they need">
              <ThemedText>{selected.request_message}</ThemedText>
            </FlowSection>
            {!!selected.form_answers?.length && (
              <FlowSection title="Additional details">
                <RequestAnswers answers={selected.form_answers ?? []} />
              </FlowSection>
            )}
            {!!selected.preferred_timing && (
              <FlowSection title="Preferred timing">
                <ThemedText>{selected.preferred_timing}</ThemedText>
              </FlowSection>
            )}
            {!!selected.customer_email && (
              <FlowSection title="Contact customer">
                <ThemedText type="small" style={{ color: colors.secondary }}>
                  {selected.customer_email}
                </ThemedText>
                <MerchantButton
                  brand
                  label="Reply by email"
                  secondary
                  disabled={!!savingId}
                  onPress={() =>
                    void Linking.openURL(
                      'mailto:' + encodeURIComponent(selected.customer_email!),
                    ).catch(() =>
                      setError(
                        'Your email app could not open. Use the address above to contact this customer.',
                      ),
                    )
                  }
                />
                <ThemedText type="small" style={{ color: colors.secondary }}>
                  Replies open in your email app. Mark the request contacted after you reach the
                  customer.
                </ThemedText>
              </FlowSection>
            )}
            {actions.length > 1 && (
              <FlowSection
                title="Update status"
                description="Choose the next step for this request."
              >
                {actions.slice(1).map((a) => (
                  <MerchantButton
                    brand
                    key={a.status}
                    label={a.label}
                    secondary
                    disabled={!!savingId || loading || !!error}
                    onPress={() => void updateStatus(selected.id, a.status)}
                  />
                ))}
              </FlowSection>
            )}
          </>
        )}
      </MerchantSheet>
    </SafeAreaView>
  );
}
