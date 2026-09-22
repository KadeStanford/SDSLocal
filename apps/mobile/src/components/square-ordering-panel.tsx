import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import * as Linking from 'expo-linking';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';
import { CommerceToggle } from './commerce-fields';
import { PickupSettingsEditor } from './pickup/pickup-settings-editor';
import { OrderNotificationSettings } from './pickup/order-notification-settings';
import { commerce, openSquareOAuth, openSquareSandboxDashboard } from '@/lib/square-commerce';
import {
  isSquareConnectionReturn,
  performSquarePreparationStep,
  squareBrowserTimeout,
  squareConnectionReturnNotice,
  type SquarePreparationStep,
} from '@/lib/square-browser';
import { type OwnerConnection } from '@/lib/square-commerce-core';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  createPickupEditor,
  persistPickupSettings,
  pickupActivationIssue,
  pickupEditorDirty,
  pickupReadiness,
  updatePickupEditor,
  type PickupEditorEvent,
  type PickupSettings,
} from '@/lib/square-pickup-settings';

export function SquareOrderingPanel({
  businessId,
  isMobile,
  onDirtyChange,
}: {
  readonly businessId: string;
  readonly isMobile: boolean;
  readonly onDirtyChange: (value: boolean) => void;
}) {
  const colors = useTheme();
  const pickup = usePickupWorkspace();
  const [state, setState] = useState<OwnerConnection | null>(null);
  const [showConnection, setShowConnection] = useState(false);
  const [editor, setEditor] = useState(createPickupEditor);
  const editorRef = useRef(editor);
  const draft = editor.draft;
  const isDirty = pickupEditorDirty(editor);
  const settingsSaving = useRef(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [preparingSquare, setPreparingSquare] = useState(false);
  const [checkingReturn, setCheckingReturn] = useState(false);
  const oauthStarted = useRef<number | null>(null);
  const oauthCallback = useRef(false);
  const ownerLoadId = useRef(0);
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
    const requestId = ++ownerLoadId.current;
    const result = await squareBrowserTimeout(
      commerce<OwnerConnection>('owner_status', { businessId, provider: 'square' }),
    );
    if (requestId !== ownerLoadId.current || settingsSaving.current) return;
    setState(result);
    updateEditor({ type: 'refresh', settings: result.settings });
    if (oauthStarted.current !== null || oauthCallback.current) {
      const isConnected = result.connection?.state === 'connected';
      setMessage(
        squareConnectionReturnNotice(isConnected, oauthStarted.current, oauthCallback.current),
      );
      setPreparingSquare(!isConnected);
      oauthStarted.current = null;
      oauthCallback.current = false;
    }
  }, [businessId, updateEditor]);
  const refreshAfterBrowser = useCallback(async () => {
    setCheckingReturn(true);
    setError('');
    try {
      await load();
    } catch {
      setError('Your Square connection could not be checked. Tap Retry to refresh its status.');
    } finally {
      setCheckingReturn(false);
    }
  }, [load]);
  const run = useCallback(async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await operation();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Please retry.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void run(async () => {
        await load();
      });
    }, [load, run]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (value) => {
      if (value === 'active') void refreshAfterBrowser();
    });
    return () => sub.remove();
  }, [refreshAfterBrowser]);
  useEffect(() => {
    let active = true;
    const returned = (url: string | null) => {
      if (!active || !isSquareConnectionReturn(url, businessId)) return;
      oauthCallback.current = true;
      void refreshAfterBrowser();
    };
    // Listen to each event: repeated attempts return to the same app URL.
    const subscription = Linking.addEventListener('url', ({ url }) => returned(url));
    void Linking.getInitialURL()
      .then(returned)
      .catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, [businessId, refreshAfterBrowser]);
  useEffect(() => () => onDirtyChange(false), [onDirtyChange]);
  function edit(patch: Partial<PickupSettings>) {
    updateEditor({ type: 'edit', patch });
  }
  const readiness = pickupReadiness(state);
  const enableIssue = pickupActivationIssue(draft, readiness, 'enabled', true);
  const openIssue = pickupActivationIssue(draft, readiness, 'is_open', true);
  function activate(control: 'enabled' | 'is_open', value: boolean) {
    const issue = pickupActivationIssue(editorRef.current.draft, readiness, control, value);
    if (issue) {
      updateEditor({ type: 'error', message: issue });
      return;
    }
    // Turning pickup off explicitly closes orders too, visibly in the editor.
    edit(
      control === 'enabled' && !value ? { enabled: false, is_open: false } : { [control]: value },
    );
  }
  async function saveSettings() {
    if (busyRef.current) return;
    busyRef.current = true;
    settingsSaving.current = true;
    ++ownerLoadId.current;
    setBusy(true);
    updateEditor({ type: 'saving' });
    try {
      const owner = await persistPickupSettings(editorRef.current.draft, readiness, {
        write: (settings) =>
          squareBrowserTimeout(
            commerce<{ saved: boolean }>('settings', { businessId, provider: 'square', settings }),
          ),
        read: () =>
          squareBrowserTimeout(
            commerce<OwnerConnection>('owner_status', { businessId, provider: 'square' }),
          ),
      });
      setState(owner);
      updateEditor({ type: 'saved', settings: owner.settings! });
      await pickup.refresh();
    } catch (error) {
      updateEditor({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Pickup settings could not be saved. Your edits are still here; please retry.',
      });
    } finally {
      ++ownerLoadId.current;
      settingsSaving.current = false;
      busyRef.current = false;
      setBusy(false);
    }
  }
  async function ownerAction(action: string, body: Record<string, unknown> = {}) {
    await commerce(action, { businessId, ...body, provider: 'square' });
    await load();
    await pickup.refresh();
  }
  function preparationStep(step: SquarePreparationStep) {
    if (step === 'prepare' || step === 'cancel') {
      oauthStarted.current = null;
      oauthCallback.current = false;
      setPreparingSquare(step === 'prepare');
      setError('');
      setMessage(
        step === 'cancel' ? 'Square connection canceled. You can connect when you are ready.' : '',
      );
      return;
    }
    void run(async () => {
      try {
        await performSquarePreparationStep(step, {
          requestAuthorization: async () => {
            const result = await squareBrowserTimeout(
              commerce<{ url: string }>('connect', { businessId, provider: 'square' }),
            );
            oauthStarted.current = Date.now();
            return result;
          },
          openOAuth: openSquareOAuth,
          openDashboard: openSquareSandboxDashboard,
        });
        if (step === 'continue') {
          setPreparingSquare(false);
          setMessage(
            'Finish authorization in your browser, then return here to check the connection.',
          );
        }
      } catch {
        oauthStarted.current = null;
        setPreparingSquare(true);
        throw new Error(
          'Square authorization could not open. Check your connection and Sandbox seller dashboard, then tap Continue to try again.',
        );
      }
    });
  }
  const connected = state?.connection?.state === 'connected';
  return (
    <View style={{ gap: Spacing.four }}>
      {pickup.businesses.some((b) => b.id === businessId) && (
        <AppButton
          label="View pickup orders"
          variant="secondary"
          disabled={isDirty}
          onPress={() => router.navigate({ pathname: '/pickup-orders', params: { businessId } })}
        />
      )}
      {!!error && (
        <View accessibilityLiveRegion="polite" style={{ gap: Spacing.two }}>
          <ThemedText>{error}</ThemedText>
          <AppButton
            label="Retry"
            variant="secondary"
            loading={busy}
            onPress={() => {
              void run(async () => {
                await load();
              });
            }}
          />
        </View>
      )}
      {!!message && <ThemedText accessibilityLiveRegion="polite">{message}</ThemedText>}
      {checkingReturn && (
        <ThemedText accessibilityLiveRegion="polite">Checking Square connection…</ThemedText>
      )}
      {!state && busy && <ThemedText>Loading Square connection…</ThemedText>}
      <View style={{ gap: Spacing.three }}>
        <ThemedText type="card">{connected ? 'Square connection' : 'Connect Square'}</ThemedText>
        {state?.connection?.lastError && <ThemedText>{state.connection.lastError}</ThemedText>}
        {!connected && (
          <>
            <ThemedText themeColor="textSecondary">
              Connect your Square Sandbox seller account to set up pickup ordering.
            </ThemedText>
            {!preparingSquare && (
              <AppButton
                label={state?.connection ? 'Reconnect Square' : 'Connect Square'}
                loading={busy}
                onPress={() => {
                  preparationStep('prepare');
                }}
              />
            )}
            {preparingSquare && (
              <View
                style={{
                  gap: Spacing.three,
                  backgroundColor: colors.backgroundElement,
                  padding: Spacing.four,
                }}
              >
                <ThemedText type="smallBold">Square Sandbox testing only</ThemedText>
                <ThemedText themeColor="textSecondary">
                  This is test mode. It cannot move real money. Square Sandbox requires an open
                  seller dashboard before authorization.
                </ThemedText>
                <ThemedText type="smallBold">1. Prepare your test seller</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Sign in to Square in your regular browser. Open a non-default Sandbox seller
                  account’s Square Dashboard and leave it open. Then return here. This preparation
                  is only needed for Sandbox testing.
                </ThemedText>
                <AppButton
                  label="Open Sandbox seller dashboard"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => preparationStep('dashboard')}
                />
                <ThemedText type="smallBold">2. Authorize SDS Local</ThemedText>
                <ThemedText themeColor="textSecondary">
                  Use the same browser, outside private browsing. Continue when the seller dashboard
                  is open.
                </ThemedText>
                <AppButton
                  label="Continue to Square authorization"
                  loading={busy}
                  onPress={() => preparationStep('continue')}
                />
                <AppButton
                  label="Cancel"
                  variant="tertiary"
                  disabled={busy}
                  onPress={() => preparationStep('cancel')}
                />
              </View>
            )}
          </>
        )}
        {connected && (
          <View style={{ gap: 8 }}>
            <ThemedText type="small" themeColor="textSecondary">
              {state.connection?.merchantName ?? 'Square'} ·{' '}
              {state.settings?.sync_summary?.variations ?? 0} menu items
            </ThemedText>
            <AppButton
              label={showConnection ? 'Done with connection' : 'Connection details'}
              variant="secondary"
              onPress={() => setShowConnection((value) => !value)}
            />
          </View>
        )}
        {connected && readiness.ready && !showConnection && (
          <AppButton
            label="Sync menu from Square"
            variant="tertiary"
            loading={busy}
            onPress={() => {
              void run(async () => {
                await ownerAction('sync');
                setMessage('Menu updated from Square.');
              });
            }}
          />
        )}
        {connected && (showConnection || !readiness.ready) && (
          <>
            <ThemedText type="smallBold">Square location</ThemedText>
            <ThemedText>{state.connection?.location?.name ?? 'Choose a location'}</ThemedText>
            {state.connection?.location?.address && (
              <ThemedText themeColor="textSecondary">
                {state.connection.location.address}
              </ThemedText>
            )}
            {state.locations.map((location) => (
              <AppButton
                key={location.id}
                label={`${location.id === state.connection?.locationId ? 'Selected: ' : 'Use '}${location.name}`}
                variant="secondary"
                disabled={busy || location.id === state.connection?.locationId || isDirty}
                onPress={() => {
                  void run(() => ownerAction('location', { locationId: location.id }));
                }}
              />
            ))}
            <ThemedText type="smallBold">Catalog</ThemedText>
            <ThemedText>
              {state.settings?.synced_at
                ? `Last synchronized ${new Date(state.settings.synced_at).toLocaleString()}`
                : 'Not synchronized yet'}
            </ThemedText>
            {state.settings?.sync_summary && (
              <ThemedText themeColor="textSecondary">
                {state.settings.sync_summary.variations} purchasable variations ·{' '}
                {state.settings.sync_summary.excluded} unavailable or unsupported variations
                excluded
              </ThemedText>
            )}
            <AppButton
              label="Sync Square catalog"
              variant="secondary"
              loading={busy}
              disabled={!state.connection?.locationId}
              onPress={() => {
                void run(async () => {
                  await ownerAction('sync');
                  setMessage('Square catalog synchronized. Your SDS menu has not changed.');
                });
              }}
            />
          </>
        )}
      </View>
      {state?.settings && (
        <View style={{ gap: Spacing.three }}>
          <ThemedText type="card">Order availability</ThemedText>
          {!readiness.ready && (
            <ThemedText type="small" themeColor="textSecondary" accessibilityLiveRegion="polite">
              {readiness.reason}
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
              value={draft.enabled}
              disabled={busy || (!draft.enabled && Boolean(enableIssue))}
              hint={enableIssue ?? 'Let customers order ahead for pickup.'}
              onChange={(enabled) => activate('enabled', enabled)}
            />
            {draft.enabled && (
              <CommerceToggle
                label="Accept new orders"
                value={draft.is_open}
                disabled={busy || (!draft.is_open && Boolean(openIssue))}
                hint={openIssue ?? 'Pause when your team needs a break.'}
                onChange={(is_open) => activate('is_open', is_open)}
              />
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {!draft.enabled
                ? 'Pickup ordering is off.'
                : draft.is_open
                  ? 'Customers can order during your pickup hours.'
                  : 'New orders are paused. Existing orders can still be fulfilled.'}
            </ThemedText>
            {!!(draft.enabled ? openIssue : enableIssue) && (
              <ThemedText type="small" themeColor="textSecondary">
                {draft.enabled ? openIssue : enableIssue}
              </ThemedText>
            )}
          </View>
          <PickupSettingsEditor draft={draft} disabled={busy} isMobile={isMobile} onChange={edit} />
          <View style={{ gap: Spacing.two }}>
            {!!editor.error && (
              <ThemedText
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={{ color: colors.errorText }}
              >
                {editor.error}
              </ThemedText>
            )}
            {!!editor.message && (
              <ThemedText accessibilityLiveRegion="polite">{editor.message}</ThemedText>
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {isDirty
                ? 'You have unsaved changes.'
                : 'Changes are saved before they apply to customer orders.'}
            </ThemedText>
            {isDirty && (
              <AppButton
                label="Save changes"
                loading={busy}
                disabled={!isDirty}
                onPress={() => {
                  void saveSettings();
                }}
              />
            )}
          </View>
        </View>
      )}
      {connected && showConnection && (
        <AppButton
          label="Disconnect Square"
          variant="destructive"
          disabled={busy || isDirty}
          onPress={() =>
            Alert.alert(
              'Disconnect Square?',
              'Ordering will close. Settle active orders first. Past orders are retained; your Square account remains open.',
              [
                { text: 'Keep connected', style: 'cancel' },
                {
                  text: 'Disconnect',
                  style: 'destructive',
                  onPress: () => {
                    void run(() => ownerAction('disconnect', { confirmed: true }));
                  },
                },
              ],
            )
          }
        />
      )}
      {connected && <OrderNotificationSettings />}
    </View>
  );
}
