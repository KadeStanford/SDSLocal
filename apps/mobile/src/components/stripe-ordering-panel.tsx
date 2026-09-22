import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { CommerceToggle } from './commerce-fields';
import { PickupSettingsEditor } from './pickup/pickup-settings-editor';
import { OrderNotificationSettings } from './pickup/order-notification-settings';
import { commerce, openCheckout } from '@/lib/square-commerce';
import {
  createPickupEditor,
  persistPickupSettings,
  pickupEditorDirty,
  pickupActivationIssue,
  pickupReadiness,
  updatePickupEditor,
  type PickupEditorEvent,
  type PickupSettings,
} from '@/lib/square-pickup-settings';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

export function StripeOrderingPanel({
  businessId,
  isMobile,
  onDirtyChange,
}: {
  readonly businessId: string;
  readonly isMobile: boolean;
  readonly onDirtyChange: (value: boolean) => void;
}) {
  const colors = useTheme();
  const [state, setState] = useState<any>(null);
  const [editor, setEditor] = useState(createPickupEditor);
  const editorRef = useRef(editor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const isDirty = pickupEditorDirty(editor);
  const updateEditor = useCallback(
    (event: PickupEditorEvent) => {
      const next = updatePickupEditor(editorRef.current, event);
      editorRef.current = next;
      setEditor(next);
      onDirtyChange(pickupEditorDirty(next));
    },
    [onDirtyChange],
  );
  const load = useCallback(async () => {
    const result = await commerce<any>('owner_status', { businessId, provider: 'stripe' });
    setState(result);
    updateEditor({ type: 'refresh', settings: result.settings });
  }, [businessId, updateEditor]);
  useFocusEffect(
    useCallback(() => {
      void load().catch((e) =>
        setError(e instanceof Error ? e.message : 'Stripe setup could not be loaded.'),
      );
    }, [load]),
  );
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  const run = async (operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please retry.');
    } finally {
      setBusy(false);
    }
  };
  const connected = state?.connection?.state === 'connected' && state?.account?.chargesEnabled;
  const hasStripeAccount = Boolean(
    state?.account?.accountId || state?.connection?.provider === 'stripe',
  );
  const stripeSetupNeedsReview = hasStripeAccount && !connected;
  const stripeSetupCopy = state?.account?.detailsSubmitted
    ? 'Your Stripe account is saved. Verification or payout review is still in progress. Continue only if Stripe asks for more information.'
    : 'Your Stripe test account is saved. Continue hosted setup to finish verification and payouts.';
  const ready = pickupReadiness(state as any, 'stripe');
  const enableIssue = pickupActivationIssue(editor.draft, ready, 'enabled', true);
  const openIssue = pickupActivationIssue(editor.draft, ready, 'is_open', true);
  const edit = (patch: Partial<PickupSettings>) => updateEditor({ type: 'edit', patch });
  const activate = (control: 'enabled' | 'is_open', value: boolean) => {
    const issue = pickupActivationIssue(editorRef.current.draft, ready, control, value);
    if (issue) {
      updateEditor({ type: 'error', message: issue });
      return;
    }
    edit(
      control === 'enabled' && !value ? { enabled: false, is_open: false } : { [control]: value },
    );
  };
  const connect = () =>
    void run(async () => {
      const result = await commerce<{ url: string }>('connect', { businessId, provider: 'stripe' });
      await openCheckout(result.url);
      await load();
    });
  const save = () =>
    void run(async () => {
      updateEditor({ type: 'saving' });
      const owner = await persistPickupSettings(
        editorRef.current.draft,
        ready,
        {
          write: (settings) => commerce('settings', { businessId, provider: 'stripe', settings }),
          read: () => commerce<any>('owner_status', { businessId, provider: 'stripe' }),
        },
        'stripe',
      );
      setState(owner);
      updateEditor({ type: 'saved', settings: owner.settings as PickupSettings });
      setMessage('Stripe pickup settings saved.');
    });
  return (
    <View style={{ gap: 16, paddingBottom: 40 }}>
      <View style={{ gap: 6 }}>
        <ThemedText type="title">Stripe online ordering</ThemedText>
        <ThemedText themeColor="textSecondary">
          Accept pickup payments directly into the business’s Stripe account. SDS never holds the
          customer’s payment.
        </ThemedText>
      </View>
      {!connected ? (
        <View
          style={{
            gap: 12,
            padding: 18,
            borderRadius: 18,
            backgroundColor: colors.surfaceElevated,
          }}
        >
          <ThemedText type="card">
            {stripeSetupNeedsReview ? 'Stripe verification in progress' : 'Connect Stripe'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {hasStripeAccount
              ? stripeSetupCopy
              : 'Create or finish a Stripe account in test mode before enabling pickup ordering.'}
          </ThemedText>
          <AppButton
            label={
              hasStripeAccount
                ? state?.account?.detailsSubmitted
                  ? 'Review Stripe verification'
                  : 'Continue Stripe setup'
                : 'Connect Stripe'
            }
            onPress={connect}
            disabled={busy}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View
            style={{
              gap: 5,
              padding: 18,
              borderRadius: 18,
              backgroundColor: colors.surfaceElevated,
            }}
          >
            <ThemedText type="card">Stripe is connected</ThemedText>
            <ThemedText themeColor="textSecondary">
              {state?.account?.detailsSubmitted
                ? 'Account details submitted'
                : 'Finish account details in Stripe'}{' '}
              · {state?.account?.payoutsEnabled ? 'Payouts enabled' : 'Payouts pending'}
            </ThemedText>
            <AppButton
              label="Sync SDS menu"
              onPress={() =>
                void run(async () => {
                  await commerce('sync', { businessId, provider: 'stripe' });
                  await load();
                  setMessage('Menu synced from SDS.');
                })
              }
              disabled={busy}
            />
          </View>
          <View style={{ gap: Spacing.three }}>
            <ThemedText type="card">Order availability</ThemedText>
            {!ready.ready && (
              <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
                {ready.reason}
              </ThemedText>
            )}
            <View
              style={{
                padding: 16,
                borderRadius: 16,
                gap: 12,
                backgroundColor: colors.backgroundElement,
              }}
            >
              <CommerceToggle
                label="Pickup ordering"
                value={editor.draft.enabled}
                disabled={busy || (!editor.draft.enabled && Boolean(enableIssue))}
                hint={enableIssue ?? 'Let customers order ahead and pay through Stripe.'}
                onChange={(enabled) => activate('enabled', enabled)}
              />
              {editor.draft.enabled && (
                <CommerceToggle
                  label="Accept new orders"
                  value={editor.draft.is_open}
                  disabled={busy || (!editor.draft.is_open && Boolean(openIssue))}
                  hint={
                    openIssue ?? 'Pause new Stripe orders while keeping existing orders visible.'
                  }
                  onChange={(is_open) => activate('is_open', is_open)}
                />
              )}
              <ThemedText type="small" themeColor="textSecondary">
                {!editor.draft.enabled
                  ? 'Pickup ordering is off.'
                  : editor.draft.is_open
                    ? 'Customers can order during your pickup hours.'
                    : 'New orders are paused. Existing orders can still be fulfilled.'}
              </ThemedText>
              {!!(editor.draft.enabled ? openIssue : enableIssue) && (
                <ThemedText type="small" themeColor="textSecondary">
                  {editor.draft.enabled ? openIssue : enableIssue}
                </ThemedText>
              )}
            </View>
          </View>
          <PickupSettingsEditor
            draft={editor.draft}
            disabled={busy}
            isMobile={isMobile}
            onChange={edit}
          />
          <AppButton
            label={isDirty ? 'Save pickup settings' : 'Pickup settings saved'}
            onPress={save}
            disabled={busy || !isDirty}
          />
        </View>
      )}
      {error ? <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText> : null}
      {message ? <ThemedText themeColor="textSecondary">{message}</ThemedText> : null}
      <OrderNotificationSettings />
    </View>
  );
}
