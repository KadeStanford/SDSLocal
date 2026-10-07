import { PageHeader } from '@/components/page-header';
import { withBusinessTheme } from '@/components/business-theme';
import { BusinessFeatureGate } from '@/components/business-feature-gate';
import { useBusinessFeatureAccess } from '@/hooks/use-business-feature-access';
import { businessOperationIncluded } from '@sds/business-logic';
import { BusinessScreenHeader, BusinessTabs } from '@/components/business-screen-header';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import NetInfo from '@react-native-community/netinfo';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { randomUUID } from 'expo-crypto';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PickupScanPanel } from '@/components/pickup/pickup-scan-panel';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChoicePicker } from '@/components/choice-picker';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { clearPendingScans, listPendingScans } from '@/lib/offline-scan-queue';
import {
  actionFor,
  actionLabel,
  confirmationLabel,
  errorRecovery,
  formatCurrencyMinor,
  initialBusinessSelection,
  initialScannerState,
  isNetworkUncertain,
  normalizeCurrencyDigits,
  safeOutcomeLabel,
  scannerReducer,
  shouldAcceptCameraCapture,
  validPurchaseMinor,
  type LoyaltyPreview,
  type LoyaltyProgramType,
  type LoyaltyResult,
  type ScannerAction,
  type ScannerSource,
} from '@/lib/staff-scanner-core';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

interface StaffBusiness {
  id: string;
  name: string;
  role: 'owner' | 'staff';
  primaryColor: string;
  programType: LoyaltyProgramType | null;
}
interface ScanLog {
  scan_id: string;
  action: ScannerAction;
  scan_source: ScannerSource;
  outcome: string;
  actor_name: string;
  customer_name: string;
  created_at: string;
}
interface Stats {
  completedScans: number;
  failedScans: number;
  visitsAdded: number;
  pointsIssued: number;
  rewardsRedeemed: number;
}
const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);

async function errorText(error: unknown) {
  const fallback = error instanceof Error ? error.message : String(error ?? '');
  try {
    const body = await (
      error as { context?: { json?: () => Promise<{ error?: string }> } }
    )?.context?.json?.();
    return body?.error ?? fallback;
  } catch {
    return fallback;
  }
}

function StaffScanScreen() {
  const { businessId: requestedBusinessId } = useLocalSearchParams<{ businessId?: string }>();
  const bottomPadding = useScreenBottomPadding();
  const colors = useTheme();
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanner, dispatch] = useReducer(scannerReducer, initialScannerState);
  const [businesses, setBusinesses] = useState<StaffBusiness[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [amount, setAmount] = useState('');
  const [online, setOnline] = useState<boolean | null>(null);
  const [torch, setTorch] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [storedActivityError, setActivityError] = useState<string | null>(null);
  const [expiredQueuedCount, setExpiredQueuedCount] = useState(0);
  const [storedStats, setStats] = useState<Stats | null>(null);
  const [storedLog, setLog] = useState<ScanLog[]>([]);
  const [activityContext, setActivityContext] = useState<string | null>(null);
  const currentActivityContext =
    session?.user.id && selectedId ? `${session.user.id}:${selectedId}` : null;
  const stats =
    currentActivityContext && activityContext === currentActivityContext ? storedStats : null;
  const log = currentActivityContext && activityContext === currentActivityContext ? storedLog : [];
  const activityError =
    currentActivityContext && activityContext === currentActivityContext
      ? storedActivityError
      : null;
  const [workflow, setWorkflow] = useState<'pickup' | 'rewards'>('pickup');
  const captured = useRef(false);
  const submitting = useRef(false);
  const activityIdentity = useRef(session?.user.id ?? null);
  const activityBusiness = useRef(selectedId);
  const activityVersion = useRef(0);
  useLayoutEffect(() => {
    activityIdentity.current = session?.user.id ?? null;
    activityBusiness.current = selectedId;
    activityVersion.current++;
    return () => {
      activityIdentity.current = null;
      activityBusiness.current = null;
    };
  }, [session?.user.id, selectedId]);
  const business = businesses.find(({ id }) => id === selectedId) ?? null;
  const action = business?.programType ? actionFor(business.programType, redeeming) : null;
  const featureAccess = useBusinessFeatureAccess(business?.id);
  const amountMinor = validPurchaseMinor(amount);
  const canScan = Boolean(
    session &&
    business?.programType &&
    (redeeming || businessOperationIncluded(featureAccess.access, 'scan_new_reward')) &&
    online !== false &&
    (action !== 'earn_points' || amountMinor),
  );

  const reset = useCallback(() => {
    captured.current = false;
    submitting.current = false;
    setTorch(false);
    setManualCode('');
    dispatch({ type: 'RESET' });
  }, []);

  const loadBusinesses = useCallback(async () => {
    if (!session) {
      setBusinesses([]);
      setSelectedId(null);
      setLoading(false);
      dispatch({ type: 'UNAVAILABLE', message: 'Sign in with an owner or staff account.' });
      return;
    }
    setLoading(true);
    setLoadError(null);
    const memberships = await supabase
      .from('business_members')
      .select('business_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .in('role', ['owner', 'staff']);
    if (memberships.error) {
      setLoadError('We could not load your business access.');
      setLoading(false);
      return;
    }
    const members = (memberships.data ?? []) as { business_id: string; role: 'owner' | 'staff' }[];
    const ids = [...new Set(members.map(({ business_id }) => business_id))];
    if (!ids.length) {
      setBusinesses([]);
      setSelectedId(null);
      setLoading(false);
      return;
    }
    const [br, pr] = await Promise.all([
      supabase
        .from('businesses')
        .select('id, name, primary_color')
        .in('id', ids)
        .or(
          'status.eq.active,and(status.eq.suspended,suspension_reason.eq.billing,billing_suspension_previous_status.eq.active,approved_at.not.is.null)',
        ),
      supabase
        .from('loyalty_programs')
        .select('business_id, program_type')
        .in('business_id', ids)
        .eq('is_active', true),
    ]);
    if (br.error || pr.error) {
      setLoadError('We could not load rewards programs.');
      setLoading(false);
      return;
    }
    const roles = new Map(members.map((x) => [x.business_id, x.role]));
    const programs = new Map(
      ((pr.data ?? []) as { business_id: string; program_type: LoyaltyProgramType }[]).map((x) => [
        x.business_id,
        x.program_type,
      ]),
    );
    const next = ((br.data ?? []) as { id: string; name: string; primary_color: string | null }[])
      .map((x) => ({
        id: x.id,
        name: x.name,
        role: roles.get(x.id) ?? 'staff',
        primaryColor: x.primary_color ?? Brand.primary,
        programType: programs.get(x.id) ?? null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setBusinesses(next);
    setSelectedId((old) =>
      initialBusinessSelection(
        next.map(({ id }) => id),
        requestedBusinessId ?? old,
      ),
    );
    setLoading(false);
    dispatch({ type: 'READY' });
  }, [session, requestedBusinessId]);

  const loadActivity = useCallback(async () => {
    if (!session || !selectedId) return;
    const request = ++activityVersion.current;
    const isCurrent = () =>
      request === activityVersion.current &&
      activityIdentity.current === session.user.id &&
      activityBusiness.current === selectedId;
    setActivityLoading(true);
    setActivityError(null);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const args = {
      p_business_id: selectedId,
      p_from: from.toISOString(),
      p_to: new Date().toISOString(),
    };
    try {
      const [sr, lr] = await Promise.all([
        supabase.rpc('get_business_scan_stats', args),
        supabase.rpc('list_business_scan_log', { ...args, p_limit: 20 }),
      ]);
      if (!isCurrent()) return;
      if (sr.error || lr.error) throw new Error('Activity unavailable');
      setActivityContext(`${session.user.id}:${selectedId}`);
      const row = Array.isArray(sr.data) ? sr.data[0] : sr.data;
      setStats({
        completedScans: num(row?.completed_scans),
        failedScans: num(row?.failed_scans),
        visitsAdded: num(row?.visits_added),
        pointsIssued: num(row?.points_issued),
        rewardsRedeemed: num(row?.rewards_redeemed),
      });
      setLog((lr.data ?? []) as ScanLog[]);
    } catch {
      if (isCurrent()) {
        setActivityContext(`${session.user.id}:${selectedId}`);
        setStats(null);
        setLog([]);
        setActivityError('Scan activity could not load. Reopen activity to retry.');
      }
    } finally {
      if (isCurrent()) setActivityLoading(false);
    }
  }, [selectedId, session]);

  useFocusEffect(
    useCallback(() => {
      void loadBusinesses();
    }, [loadBusinesses]),
  );
  useEffect(() => {
    const timer = selectedId ? setTimeout(() => void loadActivity(), 0) : undefined;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loadActivity, selectedId]);
  useEffect(() => {
    let live = true;
    void NetInfo.fetch().then((x) => {
      if (live) setOnline(x.isInternetReachable ?? x.isConnected ?? null);
    });
    const off = NetInfo.addEventListener((x) =>
      setOnline(x.isInternetReachable ?? x.isConnected ?? null),
    );
    return () => {
      live = false;
      off();
    };
  }, []);
  useEffect(() => {
    void listPendingScans()
      .then((pending) => {
        setExpiredQueuedCount(pending.length);
        return clearPendingScans();
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    const timer = !session ? setTimeout(reset, 0) : undefined;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [reset, session]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (
        state !== 'active' &&
        ['scanning', 'validating', 'awaiting_confirmation'].includes(scanner.stage)
      )
        reset();
    });
    return () => sub.remove();
  }, [reset, scanner.stage]);

  function changeBusiness(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    setRedeeming(false);
    setAmount('');
    setManualOpen(false);
    setActivityOpen(false);
    reset();
  }
  function changeMode(value: boolean) {
    if (value === redeeming) return;
    setRedeeming(value);
    setAmount('');
    reset();
  }
  async function openCamera() {
    if (!canScan) return;
    if (Platform.OS === 'web') {
      setManualOpen(true);
      dispatch({
        type: 'FAILED',
        message: 'Camera scanning is available in the native app. Enter the code manually.',
      });
      return;
    }
    dispatch({ type: 'REQUEST_PERMISSION' });
    const next = permission?.granted ? permission : await requestPermission();
    if (!next?.granted) {
      setManualOpen(true);
      dispatch({
        type: 'FAILED',
        message: 'Camera access is off. Manual entry is still available.',
      });
      return;
    }
    captured.current = false;
    dispatch({ type: 'START_SCAN' });
  }
  async function preview(token: string, source: ScannerSource) {
    if (!business || !action || !token.trim()) return;
    if (online === false) {
      dispatch({
        type: 'FAILED',
        message:
          'A secure rewards transaction requires an internet connection. Reconnect, then scan a fresh code.',
      });
      return;
    }
    dispatch({ type: 'CAPTURE', token: token.trim(), source });
    void haptics.selection();
    const { data, error } = await supabase.functions.invoke('loyalty-transact', {
      body: {
        operation: 'preview',
        token: token.trim(),
        action,
        purchaseAmountMinor: action === 'earn_points' ? amountMinor : undefined,
        expectedBusinessId: business.id,
        scanSource: source,
      },
    });
    if (error || !data?.preview) {
      void haptics.error();
      dispatch({ type: 'FAILED', message: errorRecovery(await errorText(error)) });
      return;
    }
    dispatch({ type: 'PREVIEWED', preview: data.preview as LoyaltyPreview });
  }
  function scanned(result: BarcodeScanningResult) {
    if (!shouldAcceptCameraCapture(captured.current, result.data)) return;
    captured.current = true;
    void preview(result.data, 'camera');
  }
  async function confirm(reconcile = false) {
    if (submitting.current || !business || !scanner.token || !scanner.preview) return;
    submitting.current = true;
    const key = scanner.idempotencyKey ?? randomUUID();
    dispatch({ type: 'SUBMIT', idempotencyKey: key });
    const body = reconcile
      ? { operation: 'reconcile', expectedBusinessId: business.id, idempotencyKey: key }
      : {
          operation: 'commit',
          token: scanner.token,
          action: scanner.preview.action,
          purchaseAmountMinor: scanner.preview.purchaseAmountMinor ?? undefined,
          expectedBusinessId: business.id,
          scanSource: scanner.source ?? 'camera',
          idempotencyKey: key,
        };
    const { data, error } = await supabase.functions.invoke('loyalty-transact', { body });
    submitting.current = false;
    if (error || !data?.loyalty) {
      const raw = await errorText(error);
      if (isNetworkUncertain(error)) {
        void haptics.warning();
        dispatch({
          type: 'UNCERTAIN',
          message:
            'The connection ended before we received the result. Check the confirmed transaction before scanning again.',
        });
      } else {
        void haptics.error();
        dispatch({ type: 'FAILED', message: errorRecovery(raw) });
      }
      return;
    }
    void haptics.success();
    dispatch({ type: 'SUCCEEDED', result: data.loyalty as LoyaltyResult });
    setManualCode('');
    if (scanner.preview.action === 'earn_points') setAmount('');
    void loadActivity();
  }

  if (scanner.stage === 'scanning' || scanner.stage === 'validating')
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container}>
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: bottomPadding }}
          >
            <PageHeader onBack={reset} backLabel="Back to scanner" />
            <View style={styles.cameraTop}>
              <ThemedText type="title" style={{ flex: 1 }}>
                Scan rewards
              </ThemedText>
            </View>
            <View style={{ gap: 6 }}>
              <ThemedText type="card">{business?.name}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {action ? actionLabel(action) : ''}
                {action === 'earn_points' && amountMinor
                  ? ` · ${formatCurrencyMinor(amountMinor)}`
                  : ''}
              </ThemedText>
            </View>
            <View
              style={{
                aspectRatio: 1,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: '#102D25',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {Platform.OS !== 'web' && (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={scanner.stage === 'scanning' ? scanned : undefined}
                  enableTorch={torch}
                />
              )}
              <View
                pointerEvents="none"
                style={[
                  styles.target,
                  { width: '68%', borderColor: '#89C9A2', borderRadius: 16, borderWidth: 2 },
                ]}
              />
            </View>
            {scanner.stage === 'validating' ? (
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <ActivityIndicator color={colors.accent} />
                <ThemedText accessibilityLiveRegion="polite">Checking customer…</ThemedText>
              </View>
            ) : (
              <ThemedText themeColor="textSecondary" style={{ textAlign: 'center' }}>
                Center the customer’s QR in the frame.
              </ThemedText>
            )}
            <AppButton
              label={torch ? 'Flash on' : 'Flash off'}
              accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
              variant="secondary"
              onPress={() => setTorch((x) => !x)}
              icon={
                <SymbolView
                  name={torch ? 'bolt.fill' : 'bolt'}
                  tintColor={colors.text}
                  style={styles.scanIcon}
                />
              }
            />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          keyboardShouldPersistTaps="handled"
        >
          <BusinessScreenHeader
            title="Scan & verify"
            subtitle="Choose a task, then scan the customer’s QR."
            action={
              <View
                style={[
                  styles.connection,
                  {
                    backgroundColor:
                      online === false ? colors.warningSurface : colors.backgroundSelected,
                  },
                ]}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: online === false ? colors.warningText : colors.successText },
                  ]}
                />
                <ThemedText type="smallBold">{online === false ? 'Offline' : 'Online'}</ThemedText>
              </View>
            }
          />
          {loading && <ActivityIndicator color={colors.accent} />}
          {loadError && <Notice text={loadError} error />}
          {expiredQueuedCount > 0 && (
            <Notice
              text={`${expiredQueuedCount} earlier offline scan${expiredQueuedCount === 1 ? '' : 's'} expired and need a fresh customer QR. No reward change was claimed.`}
            />
          )}
          {!loading && !session && (
            <Notice text="Sign in with an owner or staff account to scan rewards." />
          )}
          {!loading && session && !businesses.length && (
            <Notice text="Active owner or staff access is required before you can scan rewards." />
          )}
          {businesses.length > 1 && !business && (
            <View style={[styles.card, { backgroundColor: colors.backgroundElement }]}>
              <ThemedText type="subtitle">Choose a business</ThemedText>
              <ThemedText themeColor="textSecondary">
                Select the business before scanning.
              </ThemedText>
              <ChoicePicker
                businessStyle
                label="Business"
                value=""
                options={businesses.map((x) => ({ value: x.id, label: x.name }))}
                onChange={changeBusiness}
              />
            </View>
          )}
          {business && (
            <>
              <View
                style={[
                  styles.business,
                  { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
                ]}
              >
                {businesses.length > 1 ? (
                  <ChoicePicker
                    businessStyle
                    label="Business"
                    value={business.id}
                    options={businesses.map((x) => ({ value: x.id, label: x.name }))}
                    onChange={changeBusiness}
                    disabled={scanner.stage === 'submitting'}
                  />
                ) : (
                  <>
                    <ThemedText type="small" themeColor="textSecondary">
                      Scanning for
                    </ThemedText>
                    <ThemedText type="subtitle">{business.name}</ThemedText>
                  </>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  {business.role === 'owner' ? 'Owner' : 'Staff'} ·{' '}
                  {online === false ? 'Secure scans paused' : 'Ready'}
                </ThemedText>
              </View>
              <BusinessTabs
                value={workflow}
                onChange={setWorkflow}
                options={[
                  { value: 'pickup', label: 'Pickup' },
                  { value: 'rewards', label: 'Rewards' },
                ]}
              />
              <View style={{ display: workflow === 'pickup' ? 'flex' : 'none' }}>
                <View
                  style={[
                    styles.actionCard,
                    { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
                  ]}
                >
                  <View style={styles.actionCopy}>
                    <View style={styles.actionHeading}>
                      <View
                        style={[
                          styles.actionIconPlate,
                          { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <SymbolView
                          name="bag.fill"
                          tintColor={colors.accent}
                          style={styles.scanIcon}
                        />
                      </View>
                      <ThemedText type="card">Pickup handoff</ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      Confirm collection with the customer’s pickup QR.
                    </ThemedText>
                  </View>
                  <PickupScanPanel
                    key={business.id}
                    businessId={business.id}
                    businessName={business.name}
                    online={online !== false}
                  />
                </View>
              </View>
              <View style={{ display: workflow === 'rewards' ? 'flex' : 'none' }}>
                {!redeeming && business && (
                  <BusinessFeatureGate businessId={business.id} operation="scan_new_reward" />
                )}
                {!business.programType ? (
                  <Notice text="This business does not have an active rewards program. Configure rewards before scanning customers." />
                ) : scanner.stage === 'awaiting_confirmation' && scanner.preview ? (
                  <Confirmation
                    preview={scanner.preview}
                    busy={false}
                    onConfirm={() => void confirm()}
                    onCancel={reset}
                  />
                ) : scanner.stage === 'submitting' && scanner.preview ? (
                  <Confirmation
                    preview={scanner.preview}
                    busy
                    onConfirm={() => undefined}
                    onCancel={() => undefined}
                  />
                ) : scanner.stage === 'success' && scanner.result ? (
                  <Success
                    preview={scanner.preview}
                    result={scanner.result}
                    onNext={() => {
                      const camera = scanner.source === 'camera';
                      reset();
                      if (camera && Platform.OS !== 'web') dispatch({ type: 'START_SCAN' });
                    }}
                    onDone={reset}
                  />
                ) : scanner.stage === 'uncertain_result' ? (
                  <Recovery
                    title="Confirming the result"
                    message={scanner.message ?? ''}
                    button="Check confirmed transaction"
                    onPress={() => void confirm(true)}
                    onCancel={reset}
                    warning
                  />
                ) : scanner.stage === 'recoverable_error' ? (
                  <Recovery
                    title="Transaction not completed"
                    message={scanner.message ?? ''}
                    button="Scan again"
                    onPress={reset}
                    onCancel={reset}
                  />
                ) : (
                  <Controls
                    program={business.programType}
                    redeeming={redeeming}
                    amount={amount}
                    canScan={canScan}
                    offline={online === false}
                    manualOpen={manualOpen}
                    manualCode={manualCode}
                    openSettings={permission?.granted === false && permission.canAskAgain === false}
                    onMode={changeMode}
                    onAmount={(value) => {
                      const next = normalizeCurrencyDigits(value);
                      if (next !== null) setAmount(next);
                    }}
                    onScan={() => void openCamera()}
                    onManual={() => setManualOpen((x) => !x)}
                    onManualCode={setManualCode}
                    onManualSubmit={() => void preview(manualCode, 'manual')}
                  />
                )}
              </View>
              {!!activityError && (
                <ThemedText themeColor="textSecondary">{activityError}</ThemedText>
              )}
              <Activity
                open={activityOpen}
                loading={activityLoading}
                stats={stats}
                log={log}
                onToggle={() => {
                  setActivityOpen((x) => !x);
                  if (!activityOpen) void loadActivity();
                }}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Controls(p: {
  program: LoyaltyProgramType;
  redeeming: boolean;
  amount: string;
  canScan: boolean;
  offline: boolean;
  manualOpen: boolean;
  manualCode: string;
  openSettings: boolean;
  onMode: (x: boolean) => void;
  onAmount: (x: string) => void;
  onScan: () => void;
  onManual: () => void;
  onManualCode: (x: string) => void;
  onManualSubmit: () => void;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.actionCard,
        { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
      ]}
    >
      <View style={styles.section}>
        <View style={styles.actionCopy}>
          <View style={styles.actionHeading}>
            <View style={styles.actionIconPlate}>
              <SymbolView name="gift.fill" tintColor={colors.accent} style={styles.scanIcon} />
            </View>
            <ThemedText type="card">Rewards scan</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            Award points or redeem a customer reward.
          </ThemedText>
        </View>
        <View
          style={[
            styles.segment,
            { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
          ]}
        >
          {[
            { label: p.program === 'points' ? 'Award points' : 'Add visit', value: false },
            { label: 'Redeem reward', value: true },
          ].map((x) => (
            <Pressable
              key={x.label}
              accessibilityRole="button"
              accessibilityState={{ selected: p.redeeming === x.value }}
              style={[
                styles.segmentButton,
                p.redeeming === x.value && { backgroundColor: colors.backgroundSelected },
              ]}
              onPress={() => p.onMode(x.value)}
            >
              <ThemedText
                type="smallBold"
                style={{ color: p.redeeming === x.value ? colors.accent : colors.textSecondary }}
              >
                {x.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>
      {p.program === 'points' && !p.redeeming && (
        <View style={styles.section}>
          <ThemedText type="smallBold">Purchase total</ThemedText>
          <TextInput
            accessibilityLabel="Purchase total"
            value={formatCurrencyMinor(p.amount)}
            onChangeText={p.onAmount}
            keyboardType="number-pad"
            placeholder="$0.00"
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.amount,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: colors.inputBorder,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Review points before confirming.
          </ThemedText>
        </View>
      )}
      {p.offline && (
        <Notice text="Secure reward updates need an internet connection. Reconnect before scanning a fresh customer code." />
      )}
      <AppButton
        label="Scan rewards QR"
        disabled={!p.canScan}
        onPress={p.onScan}
        icon={
          <SymbolView
            name="qrcode.viewfinder"
            tintColor={p.canScan ? colors.onAction : colors.textSecondary}
            style={styles.scanIcon}
          />
        }
      />
      {p.openSettings && (
        <AppButton
          label="Open camera settings"
          variant="tertiary"
          onPress={() => void Linking.openSettings()}
        />
      )}
      <View style={[styles.manual, { borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: p.manualOpen }}
          style={styles.expand}
          onPress={p.onManual}
        >
          <View style={styles.actionCopyFlexible}>
            <ThemedText type="smallBold">Use a code instead</ThemedText>
          </View>
          <SymbolView
            name={p.manualOpen ? 'chevron.up' : 'chevron.down'}
            tintColor={colors.textSecondary}
            style={styles.smallIcon}
          />
        </Pressable>
        {p.manualOpen && (
          <View style={styles.section}>
            <TextInput
              accessibilityLabel="Customer rewards code"
              value={p.manualCode}
              onChangeText={p.onManualCode}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Paste the customer’s current code"
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.manualInput,
                {
                  color: colors.text,
                  borderColor: colors.inputBorder,
                  backgroundColor: colors.background,
                },
              ]}
            />
            <AppButton
              label="Review code"
              variant="secondary"
              disabled={!p.canScan || !p.manualCode.trim()}
              onPress={p.onManualSubmit}
            />
          </View>
        )}
      </View>
    </View>
  );
}

function Confirmation({
  preview,
  busy,
  onConfirm,
  onCancel,
}: {
  preview: LoyaltyPreview;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const colors = useTheme();
  const points = preview.programType === 'points';
  const before = points
    ? `${preview.currentAvailablePoints} points`
    : `${preview.currentProgressStamps} of ${preview.stampsRequired}`;
  const after = points
    ? `${preview.resultingAvailablePoints} points`
    : `${preview.resultingProgressStamps} of ${preview.stampsRequired}`;
  return (
    <View
      style={[
        styles.focus,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: preview.action === 'redemption' ? colors.warningText : colors.divider,
        },
      ]}
    >
      <ThemedText type="smallBold" themeColor="textSecondary">
        Confirm customer
      </ThemedText>
      <ThemedText type="title">{preview.customerName}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {preview.businessName} · {preview.programName}
      </ThemedText>
      <View style={[styles.summary, { borderColor: colors.border }]}>
        <Row label="Action" value={actionLabel(preview.action)} />
        {preview.purchaseAmountMinor ? (
          <Row label="Purchase" value={formatCurrencyMinor(preview.purchaseAmountMinor)} />
        ) : null}
        {preview.action === 'earn_points' && (
          <Row label="Points to award" value={String(preview.pointsAwarded)} />
        )}
        {preview.action === 'redemption' && (
          <Row label="Reward" value={preview.rewardDescription} />
        )}
        <Row label={points ? 'Available points' : 'Progress'} value={`${before} → ${after}`} />
        {preview.action === 'redemption' && (
          <Row label="Rewards remaining" value={String(preview.resultingRewardsReady)} />
        )}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Balances are checked again when you confirm.
      </ThemedText>
      <AppButton label={confirmationLabel(preview)} loading={busy} onPress={onConfirm} />
      <AppButton label="Cancel" variant="tertiary" disabled={busy} onPress={onCancel} />
    </View>
  );
}

function Success({
  preview,
  result,
  onNext,
  onDone,
}: {
  preview: LoyaltyPreview | null;
  result: LoyaltyResult;
  onNext: () => void;
  onDone: () => void;
}) {
  const colors = useTheme();
  const title =
    result.action === 'stamp'
      ? 'Visit added'
      : result.action === 'earn_points'
        ? 'Points awarded'
        : 'Reward redeemed';
  const detail =
    result.action === 'stamp'
      ? `${result.progressStamps ?? 0} of ${result.stampsRequired ?? preview?.stampsRequired ?? 0} visits`
      : result.action === 'earn_points'
        ? `${result.pointsAwarded ?? 0} points added · ${result.availablePoints ?? 0} available`
        : `${result.rewardsReady ?? 0} rewards ready`;
  return (
    <View
      style={[
        styles.focus,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.successText,
          alignItems: 'center',
        },
      ]}
    >
      <View style={[styles.successIcon, { backgroundColor: colors.successSurface }]}>
        <SymbolView name="checkmark" tintColor={colors.successText} style={styles.resultIcon} />
      </View>
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText type="subtitle">{preview?.customerName ?? 'Customer'}</ThemedText>
      <ThemedText themeColor="textSecondary">{detail}</ThemedText>
      <AppButton label="Scan next customer" style={styles.full} onPress={onNext} />
      <AppButton label="Done" variant="tertiary" style={styles.full} onPress={onDone} />
    </View>
  );
}

function Recovery({
  title,
  message,
  button,
  onPress,
  onCancel,
  warning = false,
}: {
  title: string;
  message: string;
  button: string;
  onPress: () => void;
  onCancel: () => void;
  warning?: boolean;
}) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.focus,
        {
          backgroundColor: warning ? colors.warningSurface : colors.errorSurface,
          borderColor: warning ? colors.warningText : colors.errorText,
        },
      ]}
    >
      <SymbolView
        name={warning ? 'exclamationmark.triangle.fill' : 'xmark.circle.fill'}
        tintColor={warning ? colors.warningText : colors.errorText}
        style={styles.resultIcon}
      />
      <ThemedText type="title">{title}</ThemedText>
      <ThemedText>{message}</ThemedText>
      <AppButton label={button} onPress={onPress} />
      <AppButton label="Cancel" variant="tertiary" onPress={onCancel} />
    </View>
  );
}

function Activity({
  open,
  loading,
  stats,
  log,
  onToggle,
}: {
  open: boolean;
  loading: boolean;
  stats: Stats | null;
  log: ScanLog[];
  onToggle: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.activity, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.expand}
        onPress={onToggle}
      >
        <View style={styles.actionCopyFlexible}>
          <ThemedText type="smallBold">Today at a glance</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stats
              ? `${stats.completedScans} completed · ${stats.failedScans} need attention`
              : 'Operational activity'}
          </ThemedText>
        </View>
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <SymbolView
            name={open ? 'chevron.up' : 'chevron.down'}
            tintColor={colors.textSecondary}
            style={styles.smallIcon}
          />
        )}
      </Pressable>
      {open && (
        <View style={[styles.activityBody, { borderTopColor: colors.divider }]}>
          <View style={styles.stats}>
            {[
              ['Completed', stats?.completedScans],
              ['Visits', stats?.visitsAdded],
              ['Points', stats?.pointsIssued],
              ['Redeemed', stats?.rewardsRedeemed],
            ].map(([label, value]) => (
              <View key={String(label)} style={styles.stat}>
                <ThemedText type="subtitle">{value ?? 0}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {label}
                </ThemedText>
              </View>
            ))}
          </View>
          <ThemedText type="smallBold">Recent activity</ThemedText>
          {log.length ? (
            log.slice(0, 10).map((x) => (
              <View key={x.scan_id} style={[styles.logRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="smallBold">
                    {x.customer_name} · {actionLabel(x.action)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {x.actor_name} ·{' '}
                    {new Intl.DateTimeFormat(undefined, {
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(new Date(x.created_at))}
                  </ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  style={{ color: x.outcome === 'success' ? colors.successText : colors.errorText }}
                >
                  {safeOutcomeLabel(x.outcome)}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              No scans recorded today.
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}
function Notice({ text, error = false }: { text: string; error?: boolean }) {
  const colors = useTheme();
  return (
    <View
      style={[
        styles.notice,
        { backgroundColor: error ? colors.errorSurface : colors.warningSurface },
      ]}
    >
      <ThemedText style={{ color: error ? colors.errorText : colors.warningText }}>
        {text}
      </ThemedText>
    </View>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText themeColor="textSecondary">{label}</ThemedText>
      <ThemedText type="smallBold" style={styles.rowValue}>
        {value}
      </ThemedText>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerCopy: { flex: 1, gap: 4 },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    minHeight: 36,
    borderRadius: Radius.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notice: { borderRadius: 8, padding: Spacing.three },
  card: { padding: Spacing.four, borderRadius: 8, gap: Spacing.three },
  business: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    gap: Spacing.three,
  },
  actionHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIconPlate: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { gap: 12 },
  actionCopyFlexible: { flex: 1, gap: Spacing.one },
  section: { gap: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: 8, padding: 4, borderWidth: 1 },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.two,
  },
  amount: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    fontWeight: '700',
  },
  white: { color: '#fff' },
  scanIcon: { width: 25, height: 25 },
  manual: { borderWidth: 1, borderRadius: 8, padding: Spacing.three },
  expand: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  smallIcon: { width: 18, height: 18 },
  manualInput: {
    minHeight: 92,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  focus: { borderWidth: 1, borderRadius: 8, padding: Spacing.three, gap: Spacing.three },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  rowValue: { flexGrow: 1, flexShrink: 1, textAlign: 'right' },
  resultIcon: { width: 40, height: 40 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  activity: { borderWidth: 1, borderRadius: 8, paddingHorizontal: Spacing.three },
  activityBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: { flexGrow: 1, flexBasis: '45%', gap: Spacing.one },
  logRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cameraPage: { flex: 1, backgroundColor: '#020706' },
  cameraShade: { flex: 1, backgroundColor: 'rgba(0,0,0,.3)', padding: Spacing.four },
  cameraTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { width: 22, height: 22 },
  cameraContext: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,.65)',
    borderRadius: Radius.pill,
    padding: Spacing.two,
  },
  cameraMuted: { color: '#dce8e2' },
  cameraCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four },
  target: {
    width: '78%',
    maxWidth: 360,
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: Brand.primaryBright,
    borderRadius: Radius.hero,
  },
  hint: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,.72)',
    padding: Spacing.three,
    borderRadius: Radius.pill,
    textAlign: 'center',
  },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: 'rgba(0,0,0,.76)',
    padding: Spacing.three,
    borderRadius: Radius.pill,
  },
});

function StaffScanRoute() {
  const { session } = useAuth();
  // Account changes discard scanner state, loaded customer names and pending results.
  return <StaffScanScreen key={session?.user.id ?? 'guest'} />;
}
export default withBusinessTheme(StaffScanRoute);
