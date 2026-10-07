import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { useNotifications } from '@/providers/notification-provider';
import { supabase } from '@/lib/supabase';
import { createMobileOutcomeClient } from '@/lib/admin/mobile-outcome-client';
import type { ModerationOutcomeView } from '@/lib/admin/moderation-outcome-contract';
import { AdminFrame, AdminSection, AdminText, formatAdminDate } from './admin-frame';

export function MobileModerationOutcomeScreen({ deliveryId }: { deliveryId: string }) {
  const { session } = useAuth(),
    { setMode } = useAppMode(),
    { refreshUnreadCount } = useNotifications();
  const account = useRef(session?.user.id ?? null);
  const identity = `${deliveryId}:${session?.user.id ?? ''}:${session?.access_token ?? ''}`;
  const identityRef = useRef(identity);
  useLayoutEffect(() => {
    account.current = session?.user.id ?? null;
    identityRef.current = identity;
  }, [identity, session?.user.id]);
  const getAccount = useCallback(() => account.current, []);
  const sequence = useRef(0),
    focused = useRef(false);
  const [state, setState] = useState<{
    identity: string;
    loading: boolean;
    result: ModerationOutcomeView | null;
    error: string | null;
  }>({ identity: '', loading: true, result: null, error: null });
  const client = useMemo(
    () =>
      createMobileOutcomeClient(
        {
          auth: { getUser: () => supabase.auth.getUser() },
          rpc: async (name, args) => await supabase.rpc(name, args),
        },
        // eslint-disable-next-line react-hooks/refs -- The factory captures this getter without invoking it during render.
        getAccount,
      ),
    [getAccount],
  );
  const clear = useCallback(() => {
    sequence.current++;
    setState({ identity: identityRef.current, loading: true, result: null, error: null });
  }, [setState]);
  const load = useCallback(
    async (navigate = false) => {
      const owner = account.current,
        expectedIdentity = identityRef.current,
        request = ++sequence.current;
      setState({ identity: expectedIdentity, loading: true, result: null, error: null });
      try {
        const result = await client.detail(owner, deliveryId);
        if (request !== sequence.current || expectedIdentity !== identityRef.current) return;
        setState({ identity: expectedIdentity, loading: false, result, error: null });
        if (result && navigate && result.quick_action) {
          // Refresh recipient/resource ownership again at the moment the CTA is pressed.
          if (result.quick_action.app_path.startsWith('/business?')) setMode('business');
          router.push(result.quick_action.app_path as never);
        } else if (result && !result.read_at && owner) {
          void supabase
            .from('notification_deliveries')
            .update({ read_at: new Date().toISOString() })
            .eq('id', deliveryId)
            .eq('user_id', owner)
            .then(({ error }) => {
              if (!error && expectedIdentity === identityRef.current) void refreshUnreadCount();
            });
        }
      } catch (error) {
        if (request === sequence.current && expectedIdentity === identityRef.current)
          setState({
            identity: expectedIdentity,
            loading: false,
            result: null,
            error: error instanceof Error ? error.message : 'This outcome could not be checked.',
          });
      }
    },
    [client, deliveryId, setMode, refreshUnreadCount],
  );
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void load();
      return () => {
        focused.current = false;
        clear();
      };
    }, [load, clear]),
  );
  useEffect(() => {
    clear();
    if (focused.current) void load();
  }, [identity, load, clear]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (!focused.current) return;
      if (next === 'active') void load();
      else clear();
    });
    return () => subscription.remove();
  }, [load, clear]);
  const result = state.identity === identity ? state.result : null;
  return (
    <AdminFrame
      title="Moderation outcome"
      backLabel="alerts"
      onBack={() => router.replace('/notification')}
    >
      {!session ? (
        <AdminSection title="Sign in to view this outcome">
          <AdminText>This alert belongs to the account that received it.</AdminText>
          <AppButton label="Sign in" onPress={() => router.push('/account')} />
        </AdminSection>
      ) : state.loading || state.identity !== identity ? (
        <View accessibilityLiveRegion="polite">
          <ActivityIndicator />
          <AdminText>Checking this outcome.</AdminText>
        </View>
      ) : state.error ? (
        <AdminSection title="Outcome unavailable">
          <AdminText>{state.error}</AdminText>
          <AppButton label="Try again" onPress={() => void load()} />
        </AdminSection>
      ) : !result ? (
        <AdminSection title="This outcome is no longer available">
          <AdminText>The item may have been removed or your access may have changed.</AdminText>
        </AdminSection>
      ) : (
        <>
          <AdminSection title={result.title}>
            <AdminText>{result.outcome.summary}</AdminText>
            {!result.is_latest && (
              <AdminText>
                This is an earlier outcome. The current status and action reflect the latest record.
              </AdminText>
            )}
          </AdminSection>
          <AdminSection title="Reason for this outcome">
            <AdminText>{result.outcome.public_reason}</AdminText>
          </AdminSection>
          <AdminSection title="What happens next">
            <AdminText>{result.outcome.next_step}</AdminText>
            <AdminText muted>Current status: {result.current_state.replaceAll('_', ' ')}</AdminText>
          </AdminSection>
          {result.current_review_text !== null && (
            <AdminSection title="Your current review">
              <AdminText>
                {result.current_review_text || 'Star rating only. No written review.'}
              </AdminText>
            </AdminSection>
          )}
          {result.quick_action !== null && (
            <AppButton label={result.quick_action.label} onPress={() => void load(true)} />
          )}
          <AdminText muted>
            Opening the item does not change it. Review edits before saving or submitting.
          </AdminText>
          <AdminText muted>{formatAdminDate(result.created_at)}</AdminText>
        </>
      )}
    </AdminFrame>
  );
}
