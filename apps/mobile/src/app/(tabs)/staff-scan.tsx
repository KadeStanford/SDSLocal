import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import NetInfo from '@react-native-community/netinfo';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { randomUUID } from 'expo-crypto';
import { SymbolView } from 'expo-symbols';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { PickupScanPanel } from '@/components/pickup/pickup-scan-panel';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChoicePicker } from '@/components/choice-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
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

export default function StaffScanScreen() {
  const { businessId: requestedBusinessId } = useLocalSearchParams<{ businessId?: string }>();
  const bottomPadding = useScreenBottomPadding();
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
  const [expiredQueuedCount, setExpiredQueuedCount] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [log, setLog] = useState<ScanLog[]>([]);
  const captured = useRef(false);
  const submitting = useRef(false);
  const business = businesses.find(({ id }) => id === selectedId) ?? null;
  const action = business?.programType ? actionFor(business.programType, redeeming) : null;
  const amountMinor = validPurchaseMinor(amount);
  const canScan = Boolean(
    session &&
    business?.programType &&
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
        .eq('status', 'active'),
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
    setActivityLoading(true);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const args = {
      p_business_id: selectedId,
      p_from: from.toISOString(),
      p_to: new Date().toISOString(),
    };
    const [sr, lr] = await Promise.all([
      supabase.rpc('get_business_scan_stats', args),
      supabase.rpc('list_business_scan_log', { ...args, p_limit: 20 }),
    ]);
    const row = Array.isArray(sr.data) ? sr.data[0] : sr.data;
    if (!sr.error)
      setStats({
        completedScans: num(row?.completed_scans),
        failedScans: num(row?.failed_scans),
        visitsAdded: num(row?.visits_added),
        pointsIssued: num(row?.points_issued),
        rewardsRedeemed: num(row?.rewards_redeemed),
      });
    if (!lr.error) setLog((lr.data ?? []) as ScanLog[]);
    setActivityLoading(false);
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
      <ThemedView style={styles.cameraPage}>
        {Platform.OS !== 'web' && (
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanner.stage === 'scanning' ? scanned : undefined}
            enableTorch={torch}
          />
        )}
        <SafeAreaView style={styles.cameraShade}>
          <View style={styles.cameraTop}>
            <CameraButton icon="xmark" label="Close scanner" onPress={reset} />
            <View style={styles.cameraContext}>
              <ThemedText type="smallBold" style={styles.white}>
                {business?.name}
              </ThemedText>
              <ThemedText type="small" style={styles.cameraMuted}>
                {action ? actionLabel(action) : ''}
                {action === 'earn_points' && amountMinor
                  ? ` · ${formatCurrencyMinor(amountMinor)}`
                  : ''}
              </ThemedText>
            </View>
            <CameraButton
              icon={torch ? 'bolt.fill' : 'bolt'}
              label={torch ? 'Turn flash off' : 'Turn flash on'}
              onPress={() => setTorch((x) => !x)}
            />
          </View>
          <View style={styles.cameraCenter}>
            <View style={styles.target} />
            {scanner.stage === 'validating' ? (
              <View style={styles.processing}>
                <ActivityIndicator color="#fff" />
                <ThemedText type="smallBold" style={styles.white}>
                  Checking customer…
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.hint}>Hold the customer’s QR inside the frame</ThemedText>
            )}
          </View>
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
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <ThemedText type="title">Scan & verify</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Confirm pickups or update a customer’s rewards in seconds.
              </ThemedText>
            </View>
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
                  { backgroundColor: online === false ? colors.warningText : Brand.primary },
                ]}
              />
              <ThemedText type="smallBold">{online === false ? 'Offline' : 'Online'}</ThemedText>
            </View>
          </View>
          {loading && <ActivityIndicator color={Brand.primary} />}
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
                Select the checkout workspace before scanning.
              </ThemedText>
              <ChoicePicker
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
                  { backgroundColor: colors.backgroundElement, borderColor: business.primaryColor },
                ]}
              >
                {businesses.length > 1 ? (
                  <ChoicePicker
                    label="Scanning for"
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
              <View style={[styles.actionCard, { backgroundColor: colors.backgroundElement }]}>
                <View style={styles.actionCopy}>
                  <ThemedText type="smallBold">Pickup handoff</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Scan the order QR at the counter. Rewards are added with the same confirmation.
                  </ThemedText>
                </View>
                <PickupScanPanel
                  key={business.id}
                  businessId={business.id}
                  businessName={business.name}
                  online={online !== false}
                />
              </View>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.actionCard, { backgroundColor: colors.backgroundElement }]}>
      <View style={styles.section}>
        <View style={styles.actionCopy}>
          <ThemedText type="smallBold">Rewards scan</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Choose what to apply, then scan the customer’s rewards QR.
          </ThemedText>
        </View>
        <View style={[styles.segment, { backgroundColor: colors.backgroundElement }]}>
          {[
            { label: p.program === 'points' ? 'Award points' : 'Add visit', value: false },
            { label: 'Redeem reward', value: true },
          ].map((x) => (
            <Pressable
              key={x.label}
              accessibilityRole="button"
              accessibilityState={{ selected: p.redeeming === x.value }}
              style={[styles.segmentButton, p.redeeming === x.value && styles.selected]}
              onPress={() => p.onMode(x.value)}
            >
              <ThemedText
                type="smallBold"
                style={p.redeeming === x.value ? styles.white : undefined}
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
                backgroundColor: colors.backgroundElement,
                borderColor: colors.border,
              },
            ]}
          />
          <ThemedText type="small" themeColor="textSecondary">
            Enter the sale total. Points are calculated securely before confirmation.
          </ThemedText>
        </View>
      )}
      {p.offline && (
        <Notice text="Secure reward updates need an internet connection. Reconnect before scanning a fresh customer code." />
      )}
      <Pressable
        accessibilityRole="button"
        disabled={!p.canScan}
        style={[styles.primary, !p.canScan && styles.disabled]}
        onPress={p.onScan}
      >
        <SymbolView name="qrcode.viewfinder" tintColor="#fff" style={styles.scanIcon} />
        <ThemedText type="subtitle" style={styles.white}>
          Scan rewards QR
        </ThemedText>
      </Pressable>
      {p.openSettings && (
        <Pressable style={styles.textButton} onPress={() => void Linking.openSettings()}>
          <ThemedText type="linkPrimary">Open camera settings</ThemedText>
        </Pressable>
      )}
      <View style={[styles.manual, { borderColor: colors.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: p.manualOpen }}
          style={styles.expand}
          onPress={p.onManual}
        >
          <View>
            <ThemedText type="smallBold">Use a code instead</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Backup when the camera cannot scan
            </ThemedText>
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
              value={p.manualCode}
              onChangeText={p.onManualCode}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
              placeholder="Paste the customer’s current code"
              placeholderTextColor={colors.textSecondary}
              style={[styles.manualInput, { color: colors.text, borderColor: colors.border }]}
            />
            <Pressable
              accessibilityRole="button"
              disabled={!p.canScan || !p.manualCode.trim()}
              style={[styles.secondary, (!p.canScan || !p.manualCode.trim()) && styles.disabled]}
              onPress={p.onManualSubmit}
            >
              <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                Review code
              </ThemedText>
            </Pressable>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
          borderColor: preview.action === 'redemption' ? colors.warningText : Brand.primary,
        },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: Brand.primary }}>
        CONFIRM CUSTOMER
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
      <Pressable
        disabled={busy}
        style={[
          styles.primary,
          preview.action === 'redemption' && { backgroundColor: colors.warningText },
        ]}
        onPress={onConfirm}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <ThemedText type="subtitle" style={styles.white}>
            {confirmationLabel(preview)}
          </ThemedText>
        )}
      </Pressable>
      <Pressable disabled={busy} style={styles.textButton} onPress={onCancel}>
        <ThemedText type="linkPrimary">Cancel</ThemedText>
      </Pressable>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
      <Pressable style={[styles.primary, styles.full]} onPress={onNext}>
        <ThemedText type="subtitle" style={styles.white}>
          Scan next customer
        </ThemedText>
      </Pressable>
      <Pressable style={styles.textButton} onPress={onDone}>
        <ThemedText type="linkPrimary">Done</ThemedText>
      </Pressable>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
      <Pressable style={styles.primary} onPress={onPress}>
        <ThemedText type="subtitle" style={styles.white}>
          {button}
        </ThemedText>
      </Pressable>
      <Pressable style={styles.textButton} onPress={onCancel}>
        <ThemedText type="linkPrimary">Cancel</ThemedText>
      </Pressable>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.activity, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.expand}
        onPress={onToggle}
      >
        <View>
          <ThemedText type="smallBold">Today at a glance</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {stats
              ? `${stats.completedScans} completed · ${stats.failedScans} need attention`
              : 'Operational activity'}
          </ThemedText>
        </View>
        {loading ? (
          <ActivityIndicator color={Brand.primary} />
        ) : (
          <SymbolView
            name={open ? 'chevron.up' : 'chevron.down'}
            tintColor={colors.textSecondary}
            style={styles.smallIcon}
          />
        )}
      </Pressable>
      {open && (
        <View style={styles.activityBody}>
          <View style={styles.stats}>
            {[
              ['Completed', stats?.completedScans],
              ['Visits', stats?.visitsAdded],
              ['Points', stats?.pointsIssued],
              ['Redeemed', stats?.rewardsRedeemed],
            ].map(([label, value]) => (
              <View key={String(label)}>
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
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
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
function CameraButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof SymbolView>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.cameraButton}
      onPress={onPress}
    >
      <SymbolView name={icon} tintColor="#fff" style={styles.cameraIcon} />
    </Pressable>
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
  notice: { borderRadius: Radius.medium, padding: Spacing.three },
  card: { padding: Spacing.four, borderRadius: Radius.large, gap: Spacing.three },
  business: {
    borderLeftWidth: 4,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  actionCard: { borderRadius: Radius.large, padding: Spacing.three, gap: Spacing.three },
  actionCopy: { gap: Spacing.one },
  section: { gap: Spacing.two },
  segment: { flexDirection: 'row', borderRadius: Radius.pill, padding: 4 },
  segmentButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selected: { backgroundColor: Brand.primary },
  amount: {
    minHeight: 74,
    borderWidth: 1,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.four,
    fontSize: 32,
    fontWeight: '700',
  },
  primary: {
    minHeight: 58,
    borderRadius: Radius.pill,
    backgroundColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  white: { color: '#fff' },
  disabled: { opacity: 0.45 },
  scanIcon: { width: 25, height: 25 },
  textButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  manual: { borderWidth: 1, borderRadius: Radius.large, padding: Spacing.three },
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
    borderRadius: Radius.medium,
    padding: Spacing.three,
    textAlignVertical: 'top',
  },
  secondary: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focus: { borderWidth: 1, borderRadius: Radius.hero, padding: Spacing.four, gap: Spacing.three },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.two,
    gap: Spacing.two,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  rowValue: { flex: 1, textAlign: 'right' },
  resultIcon: { width: 40, height: 40 },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  full: { width: '100%' },
  activity: { borderWidth: 1, borderRadius: Radius.large, paddingHorizontal: Spacing.three },
  activityBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two },
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
    borderRadius: Radius.small,
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
