import { PageHeader } from '@/components/page-header';
import * as Crypto from 'expo-crypto';
import {
  useNavigation,
  usePreventRemove,
  type NavigationAction,
} from 'expo-router/react-navigation';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RequestBusinessHeader } from '@/components/request-form-ui';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import {
  MerchantButton,
  MerchantHeading,
  MerchantSheet,
  merchantStyles,
} from '@/components/merchant-ui';
import {
  ServiceRequestForm,
  ServiceRequestReview,
  type RequestOffering,
} from '@/components/service-request-form';
import { ThemedText } from '@/components/themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import {
  serviceRequestArguments,
  serviceRequestCanEditAfterFailure,
  serviceRequestDraftError,
  type ServiceRequestDraft,
} from '@/lib/service-request-draft';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

export default function ServiceRequestScreen() {
  const params = useLocalSearchParams<{ businessId?: string }>();
  const { session, loading: authLoading } = useAuth();
  const businessId = typeof params.businessId === 'string' ? params.businessId : '';
  // A business/account change starts a fresh form and prevents late results from crossing contexts.
  return (
    <ServiceRequestContent
      key={`${session?.user.id ?? 'guest'}:${businessId}`}
      businessId={businessId}
      customerId={session?.user.id ?? null}
      email={session?.user.email}
      authLoading={authLoading}
    />
  );
}
function ServiceRequestContent({
  businessId,
  customerId,
  email,
  authLoading,
}: {
  businessId: string;
  customerId: string | null;
  email: string | undefined;
  authLoading: boolean;
}) {
  const c = useMerchantTheme();
  const navigation = useNavigation();
  const bottomPadding = useScreenBottomPadding();
  const alive = useRef(true),
    generation = useRef(0),
    pending = useRef(false),
    completed = useRef(false);
  const [business, setBusiness] = useState<{ id: string; name: string } | null>(null);
  const [offerings, setOfferings] = useState<RequestOffering[]>([]);
  const [draft, setDraft] = useState<ServiceRequestDraft>({
    businessId,
    offeringId: null,
    message: '',
    timing: '',
  });
  const [review, setReview] = useState<ServiceRequestDraft | null>(null);
  const [attempt, setAttempt] = useState<{ key: string; draft: ServiceRequestDraft } | null>(null);
  const attemptRef = useRef<typeof attempt>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false);
  const [leaveAction, setLeaveAction] = useState<NavigationAction | null>(null);
  const scroll = useRef<ScrollView>(null);
  const reviewVisible = useRef(false);
  useEffect(() => {
    const next = !!review;
    if (reviewVisible.current === next) return;
    reviewVisible.current = next;
    if (!scroll.current) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [review]);
  const dirty = !!(
    draft.message ||
    draft.timing ||
    draft.offeringId ||
    Object.values(draft.answers ?? {}).some(Boolean)
  );
  useEffect(() => {
    // Capture the request-version ref object used to invalidate pending reads.
    const generationForCleanup = generation;

    alive.current = true;
    return () => {
      alive.current = false;
      generationForCleanup.current++;
    };
  }, []);
  usePreventRemove(dirty || saving, ({ data }) => {
    if (completed.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (!pending.current) setLeaveAction(data.action);
  });
  const load = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true);
    setReadError(null);
    setBusiness(null);
    setOfferings([]);
    try {
      if (!businessId) throw new Error('Choose a service business before sending a request.');
      const [businessResult, offeringsResult, formResult] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, status, business_type')
          .eq('id', businessId)
          .eq('status', 'active')
          .eq('business_type', 'services')
          .maybeSingle(),
        supabase
          .from('offering_items')
          .select('id, name, description')
          .eq('business_id', businessId)
          .eq('is_visible', true)
          .eq('is_available', true)
          .is('archived_at', null)
          .order('display_order'),
        supabase
          .from('service_request_forms')
          .select('revision,fields')
          .eq('business_id', businessId)
          .maybeSingle(),
      ]);
      if (!alive.current || version !== generation.current) return;
      if (businessResult.error || offeringsResult.error || formResult.error)
        throw businessResult.error ?? offeringsResult.error ?? formResult.error;
      if (!businessResult.data) throw new Error('This service business is unavailable.');
      setDraft((current) => ({
        ...current,
        formRevision: formResult.data?.revision ?? 0,
        fields: formResult.data?.fields ?? [],
        answers: Object.fromEntries(
          (formResult.data?.fields ?? []).map((f: { id: string }) => [
            f.id,
            current.answers?.[f.id] ?? '',
          ]),
        ),
      }));
      setReview(null);
      setBusiness({ id: businessResult.data.id, name: businessResult.data.name });
      setOfferings((offeringsResult.data ?? []) as RequestOffering[]);
    } catch (cause) {
      if (alive.current && version === generation.current)
        setReadError(userMessageFromError(cause, 'The request form could not load. Please retry.'));
    } finally {
      if (alive.current && version === generation.current) setLoading(false);
    }
  }, [businessId]);
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) void load();
    });
    return () => {
      active = false;
    };
  }, [load]);
  function reviewRequest() {
    if (!business || !customerId || pending.current) return;
    const validation = serviceRequestDraftError(
      draft,
      offerings.map((offering) => offering.id),
    );
    setError(validation);
    if (!validation) setReview({ ...draft });
  }
  async function submit() {
    if (pending.current || !customerId || !business || !review) return;
    const validation = serviceRequestDraftError(
      review,
      offerings.map((offering) => offering.id),
    );
    if (validation) {
      setError(validation);
      return;
    }
    const submission = attemptRef.current ?? { key: Crypto.randomUUID(), draft: { ...review } };
    attemptRef.current = submission;
    setAttempt(submission);
    pending.current = true;
    setSaving(true);
    setError(null);
    try {
      const { data, error: submitError } = await supabase.rpc(
        'submit_service_request',
        serviceRequestArguments(submission.draft, submission.key),
      );
      if (!alive.current) return;
      if (submitError) throw submitError;
      if (typeof data !== 'string' || !data)
        throw new Error(
          'Your request has not been confirmed. Retry the same request or check your request history.',
        );
      completed.current = true;
      router.replace({ pathname: '/my-service-requests', params: { requestId: data } } as never);
    } catch (cause) {
      if (!alive.current) return;
      if (serviceRequestCanEditAfterFailure(cause)) {
        attemptRef.current = null;
        setAttempt(null);
      }
      setError(userMessageFromError(cause, 'Your request has not been confirmed. Please retry.'));
    } finally {
      pending.current = false;
      if (alive.current) setSaving(false);
    }
  }
  return (
    <View style={[merchantStyles.screen, { backgroundColor: c.background }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            ref={scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              merchantStyles.content,
              { padding: 20, gap: 24, paddingBottom: bottomPadding },
            ]}
          >
            <PageHeader onBack={() => router.back()} backDisabled={saving} />
            <MerchantHeading
              title={review ? 'Review request' : 'Request a quote'}
              subtitle={
                review ? 'Check the details before sending.' : 'Tell the business how it can help.'
              }
            />
            {authLoading || loading ? (
              <ListLoading label="Loading request form" rows={2} />
            ) : readError ? (
              <View style={{ gap: 12 }}>
                <StateNotice kind="error" message={readError} />
                <MerchantButton secondary label="Retry loading" onPress={() => void load()} />
              </View>
            ) : !customerId ? (
              <EmptyState
                title="Sign in to send a request"
                message="The business will reply using your account email."
                actionLabel="Open Account"
                onAction={() => router.push('/account')}
              />
            ) : (
              business && (
                <>
                  {!!error && (
                    <>
                      <StateNotice kind="error" message={error} />
                      {!attempt && !saving && (
                        <MerchantButton
                          brand
                          label="Refresh form questions"
                          secondary
                          onPress={() => void load()}
                        />
                      )}
                    </>
                  )}
                  {attempt && !saving && (
                    <StateNotice message="We have not confirmed whether this request was sent. Retrying uses the same request details to avoid a duplicate." />
                  )}
                  <RequestBusinessHeader name={business.name} review={!!review} />
                  {review ? (
                    <ServiceRequestReview
                      businessName={business.name}
                      offeringName={
                        offerings.find((offering) => offering.id === review.offeringId)?.name
                      }
                      draft={review}
                      email={email}
                      busy={saving}
                      locked={!!attempt}
                      onEdit={() => {
                        if (!pending.current && !attemptRef.current) {
                          setReview(null);
                          setError(null);
                        }
                      }}
                      onSend={() => void submit()}
                    />
                  ) : (
                    <>
                      <ServiceRequestForm
                        offerings={offerings}
                        draft={draft}
                        disabled={saving}
                        onChange={(next) => {
                          setDraft(next);
                          setError(null);
                        }}
                        onReview={reviewRequest}
                      />
                    </>
                  )}
                  {attempt && !saving && (
                    <MerchantButton
                      label="Check my requests"
                      secondary
                      onPress={() => router.push('/my-service-requests' as never)}
                    />
                  )}
                </>
              )
            )}
          </ScrollView>
        </KeyboardAvoidingView>
        <MerchantSheet
          visible={!!leaveAction}
          title={attempt ? 'Leave unconfirmed request?' : 'Discard request?'}
          onClose={() => setLeaveAction(null)}
          footer={
            <View style={{ gap: 10 }}>
              <MerchantButton label="Keep working" onPress={() => setLeaveAction(null)} />
              <MerchantButton
                label="Leave request"
                secondary
                destructive
                onPress={() => {
                  const action = leaveAction;
                  setLeaveAction(null);
                  if (action && !pending.current) navigation.dispatch(action);
                }}
              />
            </View>
          }
        >
          <ThemedText>
            {attempt
              ? 'This request may have been sent. Check your request history before starting another.'
              : 'Your request details have not been sent. Leaving will discard this draft.'}
          </ThemedText>
        </MerchantSheet>
      </SafeAreaView>
    </View>
  );
}
