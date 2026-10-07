import { FlowSection, FlowIdentity } from '@/components/flow-layout';
import { RequestAnswers } from './request-question-fields';
import type { RequestAnswer } from '@/lib/service-request-schema';
import { Pressable, View } from 'react-native';
import { AppIcon } from './app-icon';
import { ThemedText } from './themed-text';
import { MerchantStatus } from './merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { requestStatusLabels } from '@/lib/merchant-inbox';

export interface CustomerRequest {
  readonly form_answers?: RequestAnswer[];
  readonly id: string;
  readonly business_id: string;
  readonly request_message: string;
  readonly preferred_timing: string | null;
  readonly status: string;
  readonly created_at: string;
  readonly businesses: { readonly name: string } | readonly { readonly name: string }[] | null;
}
export function requestBusinessName(request: CustomerRequest) {
  const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
  return (business as { readonly name: string } | null)?.name ?? 'Service business';
}
export function requestIsClosed(request: CustomerRequest) {
  return ['completed', 'cancelled'].includes(request.status);
}
export function canCancelCustomerRequest(request: CustomerRequest) {
  return ['new', 'in_review'].includes(request.status);
}
export function customerRequestStatus(request: CustomerRequest) {
  return requestStatusLabels[request.status] ?? 'Status unavailable';
}
export function customerRequestGuidance(request: CustomerRequest) {
  switch (request.status) {
    case 'new':
      return 'Your request has been sent. The business has not started reviewing it yet.';
    case 'in_review':
      return 'The business is reviewing your request and can contact you using your account email.';
    case 'contacted':
      return 'The business marked you as contacted. Check your account email for its reply.';
    case 'completed':
      return 'The business marked this request as completed.';
    case 'cancelled':
      return 'This request is cancelled. Send a new request if you still need help.';
    default:
      return 'Refresh to check the latest status of this request.';
  }
}
export function filterCustomerRequests(
  requests: readonly CustomerRequest[],
  filter: 'all' | 'active' | 'history',
  query: string,
) {
  const search = query.trim().toLocaleLowerCase();
  return requests.filter(
    (request) =>
      (filter === 'all' || requestIsClosed(request) === (filter === 'history')) &&
      (!search ||
        [
          requestBusinessName(request),
          request.request_message,
          request.preferred_timing ?? '',
          customerRequestStatus(request),
        ].some((value) => value.toLocaleLowerCase().includes(search))),
  );
}
export function CustomerRequestInbox({
  requests,
  onOpen,
}: {
  requests: readonly CustomerRequest[];
  onOpen: (id: string) => void;
}) {
  const c = useMerchantTheme();
  return (
    <View style={{ gap: 16 }}>
      {requests.map((request) => (
        <Pressable
          key={request.id}
          accessibilityRole="button"
          accessibilityLabel={`View request to ${requestBusinessName(request)}, ${customerRequestStatus(request)}`}
          onPress={() => onOpen(request.id)}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: c.surface,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ padding: 18, gap: 16 }}>
            <FlowIdentity
              name={requestBusinessName(request)}
              detail={
                'Sent ' +
                new Date(request.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              }
            />
            <MerchantStatus
              label={customerRequestStatus(request)}
              tone={request.status === 'completed' ? 'success' : 'quiet'}
            />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={3}>
              {request.request_message}
            </ThemedText>
          </View>
          <View
            style={{
              minHeight: 48,
              paddingHorizontal: 18,
              paddingVertical: 13,
              backgroundColor: c.success,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <ThemedText type="smallBold" style={{ color: c.onAction }}>
              View request
            </ThemedText>
            <AppIcon name="chevron-right" size={20} tintColor={c.onAction} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
export function CustomerRequestDetails({ request }: { request: CustomerRequest }) {
  return (
    <View style={{ gap: 20 }}>
      <FlowIdentity name={requestBusinessName(request)} detail="Private service request" />
      <FlowSection title="Request status">
        <MerchantStatus
          label={customerRequestStatus(request)}
          tone={request.status === 'completed' ? 'success' : 'quiet'}
        />
        <ThemedText>{customerRequestGuidance(request)}</ThemedText>
      </FlowSection>
      <FlowSection title="Your request">
        <ThemedText selectable>{request.request_message}</ThemedText>
      </FlowSection>
      <RequestAnswers answers={request.form_answers ?? []} />
      {!!request.preferred_timing && (
        <View style={{ gap: 6 }}>
          <ThemedText type="smallBold">Preferred timing</ThemedText>
          <ThemedText selectable>{request.preferred_timing}</ThemedText>
        </View>
      )}
      <ThemedText type="small" themeColor="textSecondary">
        Sent {new Date(request.created_at).toLocaleString()}
      </ThemedText>
    </View>
  );
}
