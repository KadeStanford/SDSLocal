import { FlowSection } from '@/components/flow-layout';
import {
  MerchantButton,
  MerchantRow,
  MerchantSheet,
  MerchantStatus,
} from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { CommerceToggle } from './commerce-fields';
import { PickupSettingsEditor } from './pickup/pickup-settings-editor';
import { PickupLaunchGuide } from './pickup/pickup-launch-guide';
import { OrderNotificationSettings } from './pickup/order-notification-settings';
import { commerce, openCheckout } from '@/lib/square-commerce';
import {
  isStripeEmbeddedOnboardingAvailable,
  StripeEmbeddedOnboarding,
  type StripeOnboardingFailure,
} from './stripe-embedded-onboarding';
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
  onConnectSquare,
}: {
  readonly businessId: string;
  readonly isMobile: boolean;
  readonly onDirtyChange: (value: boolean) => void;
  readonly onConnectSquare: () => void;
}) {
  const colors = useTheme();
  const merchantColors = useMerchantTheme();
  const [pickupSettingsOpen, setPickupSettingsOpen] = useState(false);
  const [state, setState] = useState<any>(null);
  const [editor, setEditor] = useState(createPickupEditor);
  const editorRef = useRef(editor);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showEmbeddedOnboarding, setShowEmbeddedOnboarding] = useState(false);
  const [embeddedSetupFailed, setEmbeddedSetupFailed] = useState(false);
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
  const connected =
    state?.connection?.state === 'connected' &&
    state?.account?.chargesEnabled &&
    state?.account?.payoutsEnabled;
  const hasStripeAccount = Boolean(
    state?.account?.accountId || state?.connection?.provider === 'stripe',
  );
  const stripeSetupNeedsReview = hasStripeAccount && !connected;
  const stripeSetupCopy = state?.account?.detailsSubmitted
    ? 'Your payment details are saved. Verification or payout review is still in progress. You can return here to finish any remaining steps.'
    : 'Stripe asks for the information currently required to start accepting payments. It may ask for more later, and identity or bank verification can still be required before payouts are enabled.';
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
  const continueStripeInBrowser = () =>
    run(async () => {
      const result = await commerce<{ url: string }>('connect', { businessId, provider: 'stripe' });
      await openCheckout(result.url);
      await load();
    });
  const connect = () => {
    setError('');
    setMessage('');
    if (isStripeEmbeddedOnboardingAvailable()) {
      setEmbeddedSetupFailed(false);
      setShowEmbeddedOnboarding(true);
      return;
    }
    if (Platform.OS === 'web') {
      void continueStripeInBrowser();
      return;
    }
    setError(
      'In-app Stripe setup is not configured for this build. Update Parish Pass and try again.',
    );
  };
  const handleEmbeddedOnboardingError = useCallback(
    ({ reason, code, status, providerCode, providerRequestId }: StripeOnboardingFailure) => {
      setShowEmbeddedOnboarding(false);
      setEmbeddedSetupFailed(true);
      const diagnostic = [
        providerRequestId,
        providerCode ? `Stripe ${providerCode}` : undefined,
        code,
        status ? `HTTP ${status}` : undefined,
      ]
        .filter(Boolean)
        .join(' · ');
      setError(
        reason === 'session'
          ? `Parish Pass could not start Stripe’s secure in-app setup. Check your connection and retry.${
              diagnostic ? ` (${diagnostic})` : ''
            }`
          : `Stripe setup did not finish loading. Retry in Parish Pass.${diagnostic ? ` (${diagnostic})` : ''}`,
      );
    },
    [],
  );
  const closeEmbeddedOnboarding = () => {
    setShowEmbeddedOnboarding(false);
    void load()
      .then(() => setMessage('Payment setup status refreshed. You can resume anytime.'))
      .catch(() =>
        setError('Payment setup status could not be refreshed. Tap Retry to check again.'),
      );
  };
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
      <MerchantStatus label="Stripe · test mode" />
      <PickupLaunchGuide
        steps={[
          { label: 'Connect your Stripe account', complete: ready.connected },
          {
            label: 'Submit business details and enable payouts',
            complete: Boolean(state?.account?.detailsSubmitted && state.account.payoutsEnabled),
          },
          {
            label: 'Sync a menu with at least one item',
            complete: ready.synced && ready.variations > 0,
          },
          { label: 'Add pickup hours', complete: editor.draft.pickup_windows.length > 0 },
          {
            label: 'Turn on pickup and accept orders',
            complete: editor.draft.enabled && editor.draft.is_open,
          },
        ]}
      />
      {!connected ? (
        <View
          style={{
            gap: 12,
            padding: 18,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: merchantColors.border,
            backgroundColor: merchantColors.surface,
          }}
        >
          <ThemedText type="card">
            {stripeSetupNeedsReview ? 'Payment verification in progress' : 'Online payment setup'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {hasStripeAccount
              ? stripeSetupCopy
              : 'Stripe asks for the information currently required to start accepting payments. It may ask for more later, and identity or bank verification can still be required before payouts are enabled.'}
          </ThemedText>
          <AppButton
            label={
              embeddedSetupFailed
                ? 'Retry setup in Parish Pass'
                : hasStripeAccount
                  ? 'Continue payment setup'
                  : isStripeEmbeddedOnboardingAvailable()
                    ? 'Set up payments in Parish Pass'
                    : 'Continue secure payment setup'
            }
            onPress={connect}
            disabled={busy}
          />
          {!isStripeEmbeddedOnboardingAvailable() && (
            <ThemedText type="small" themeColor="textSecondary">
              {Platform.OS === 'web'
                ? 'Stripe will securely open its account setup page.'
                : 'In-app Stripe setup is unavailable in this build.'}
            </ThemedText>
          )}
          <ThemedText type="small" themeColor="textSecondary">
            Parish Pass adds no fee to Stripe orders. Stripe processing fees may apply to real
            payments.
          </ThemedText>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View
            style={{
              gap: 5,
              padding: 18,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: merchantColors.border,
              backgroundColor: merchantColors.surface,
            }}
          >
            <ThemedText type="card">Stripe is connected</ThemedText>
            <ThemedText themeColor="textSecondary">
              {state?.account?.detailsSubmitted
                ? 'Account details submitted'
                : 'Finish account details in Stripe'}{' '}
              · {state?.account?.payoutsEnabled ? 'Payouts enabled' : 'Payouts pending'}
            </ThemedText>
            <FlowSection
              title="Menu synchronization"
              description="Update checkout when your menu changes."
              collapsible
            >
              <AppButton
                label="Sync Parish Pass menu"
                onPress={() =>
                  void run(async () => {
                    await commerce('sync', { businessId, provider: 'stripe' });
                    await load();
                    setMessage('Menu synced from Parish Pass.');
                  })
                }
                disabled={busy}
              />
            </FlowSection>
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
                {isDirty
                  ? 'Availability changes are not applied yet. Save changes to update customer ordering.'
                  : !editor.draft.enabled
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
              {isDirty && <MerchantButton label="Save changes" loading={busy} onPress={save} />}
            </View>
          </View>
          <MerchantRow
            title="Pickup hours & rules"
            subtitle={
              editor.draft.pickup_windows.length +
              ' weekly windows · ' +
              editor.draft.preparation_minutes +
              ' min preparation'
            }
            status={
              <MerchantStatus
                label={isDirty ? 'Unsaved changes' : 'Saved'}
                tone={isDirty ? 'warning' : 'quiet'}
              />
            }
            onPress={() => setPickupSettingsOpen(true)}
          />
          <MerchantSheet
            visible={pickupSettingsOpen}
            title="Pickup hours & rules"
            blocked={busy}
            onClose={() => setPickupSettingsOpen(false)}
          >
            <ThemedText type="small" themeColor="textSecondary">
              Changes are retained while you browse. Save to apply them to customer orders.
            </ThemedText>
            {error && (
              <ThemedText accessibilityRole="alert" style={{ color: colors.errorText }}>
                {error}
              </ThemedText>
            )}
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
          </MerchantSheet>
        </View>
      )}
      {error ? <ThemedText style={{ color: colors.errorText }}>{error}</ThemedText> : null}
      {message ? <ThemedText themeColor="textSecondary">{message}</ThemedText> : null}
      <FlowSection
        title="Other payment options"
        description="Connect an existing Square account"
        collapsible
      >
        <ThemedText type="smallBold">Already use Square?</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Connect Square to sync an existing menu and use its checkout instead.
        </ThemedText>
        <AppButton
          label="Connect Square POS (optional)"
          variant="tertiary"
          onPress={onConnectSquare}
          disabled={busy || isDirty}
        />
      </FlowSection>
      {showEmbeddedOnboarding && (
        <StripeEmbeddedOnboarding
          businessId={businessId}
          onExit={closeEmbeddedOnboarding}
          onError={handleEmbeddedOnboardingError}
        />
      )}
      <OrderNotificationSettings />
    </View>
  );
}
