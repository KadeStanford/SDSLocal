import { ParishBusinessBrand } from '../business-screen-header';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { commerce } from '@/lib/square-commerce';
import { type PickupOrder } from '@/lib/square-commerce-core';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';
import { PickupScanEntry } from './pickup-manual-entry';
import { OrderReceipt } from './order-presentation';

type Confirmation = {
  completed: boolean;
  alreadyConfirmed: boolean;
  pointsAwarded: number;
  visitsAwarded: number;
};
export function PickupScanPanel({
  businessId,
  businessName,
  online,
}: {
  businessId: string;
  businessName: string;
  online: boolean;
}) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [manual, setManual] = useState(false);
  const [order, setOrder] = useState<PickupOrder | null>(null);
  const [result, setResult] = useState<Confirmation | null>(null);
  const [busy, setBusy] = useState(false);
  const flight = useRef(false);
  const captured = useRef(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => listener.remove();
  }, []);
  function reset() {
    captured.current = false;
    setCode('');
    setOrder(null);
    setResult(null);
    setError('');
  }
  async function preview(value: string) {
    if (flight.current || captured.current) return;
    captured.current = true;
    flight.current = true;
    setBusy(true);
    setError('');
    setCode(value);
    try {
      const response = await commerce<{ order: PickupOrder }>('pickup_scan', {
        businessId,
        code: value,
      });
      setOrder(response.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'This pickup code could not be checked.');
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  async function confirm() {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setError('');
    try {
      setResult(await commerce<Confirmation>('pickup_scan', { businessId, code, confirm: true }));
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : 'Confirmation could not be verified.'} You can retry safely; rewards will not be added twice.`,
      );
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <AppButton
        label="Scan pickup QR"
        disabled={!online}
        onPress={() => {
          reset();
          setOpen(true);
        }}
      />
      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: c.background }]} edges={[]}>
          <ScrollView
            contentContainerStyle={[
              styles.modalContent,
              {
                backgroundColor: c.background,
                paddingTop: Math.max(styles.modalContent.paddingTop, insets.top + 12),
                paddingBottom: Math.max(styles.modalContent.paddingBottom, insets.bottom + 40),
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <ParishBusinessBrand />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <ThemedText type="title">Confirm pickup</ThemedText>
              </View>
              <AppButton
                label="Close"
                accessibilityLabel="Close pickup scanner"
                variant="secondary"
                disabled={busy}
                onPress={() => setOpen(false)}
                style={styles.closeButton}
              />
            </View>
            <View style={{ gap: 6 }}>
              <ThemedText type="subtitle">{businessName}</ThemedText>
            </View>
            {result ? (
              <>
                <ThemedText type="card" accessibilityLiveRegion="polite">
                  {result.alreadyConfirmed ? 'Pickup already confirmed' : 'Pickup confirmed'}
                </ThemedText>
                <ThemedText>
                  {result.pointsAwarded > 0
                    ? `${result.pointsAwarded} reward points added.`
                    : result.visitsAwarded > 0
                      ? 'One rewards visit added.'
                      : 'No eligible membership reward was added.'}
                </ThemedText>
                {result.alreadyConfirmed && (
                  <ThemedText type="small">
                    The earlier confirmation is shown. No additional rewards were issued.
                  </ThemedText>
                )}
                <AppButton label="Scan next pickup" onPress={reset} />
              </>
            ) : order ? (
              <>
                <ThemedText type="card">Order #{order.number}</ThemedText>
                <ThemedText>{order.recipient?.display_name ?? 'Pickup customer'}</ThemedText>
                <OrderReceipt order={order} />
                <ThemedText type="small" themeColor="textSecondary">
                  Confirm only when you hand over this order. Eligible points or one visit will be
                  added automatically.
                </ThemedText>
                <AppButton
                  label="Confirm handoff & rewards"
                  loading={busy}
                  disabled={!online}
                  onPress={() => void confirm()}
                />
                <AppButton
                  label="Scan a different order"
                  variant="secondary"
                  disabled={busy}
                  onPress={reset}
                />
              </>
            ) : (
              <View style={{ gap: 16 }}>
                <PickupScanEntry
                  manual={manual}
                  code={code}
                  onChange={setCode}
                  busy={busy}
                  online={online}
                  onToggleMode={() => {
                    reset();
                    setManual(!manual);
                  }}
                  onCheck={() => {
                    captured.current = false;
                    void preview(code.trim());
                  }}
                  camera={
                    <>
                      {permission?.granted && open && active && focused && !code && !manual ? (
                        <View style={styles.cameraFrame}>
                          <CameraView
                            style={StyleSheet.absoluteFill}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onBarcodeScanned={online ? ({ data }) => void preview(data) : undefined}
                          />
                          <View pointerEvents="none" style={styles.scanTarget} />
                        </View>
                      ) : (
                        !permission?.granted &&
                        !manual && (
                          <AppButton
                            label={
                              permission?.canAskAgain === false
                                ? 'Open camera settings'
                                : 'Allow camera for pickup scanning'
                            }
                            onPress={() =>
                              void (permission?.canAskAgain === false
                                ? Linking.openSettings()
                                : requestPermission())
                            }
                          />
                        )
                      )}
                    </>
                  }
                />
                {!!error && !manual && (
                  <AppButton label="Try scanning again" disabled={busy} onPress={reset} />
                )}
              </View>
            )}
            {!online && <ThemedText>Connect to the internet to confirm pickup.</ThemedText>}
            {!!error && (
              <ThemedText accessibilityLiveRegion="polite" style={{ color: c.errorText }}>
                {error}
              </ThemedText>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalSafe: { flex: 1 },
  modalContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalHeaderCopy: { flex: 1, gap: 4 },
  closeButton: { minWidth: 72, paddingHorizontal: 8 },
  businessCard: { borderRadius: 16, padding: 16, gap: 4 },
  scanCard: { borderRadius: 20, padding: 16, gap: 12 },
  cameraFrame: {
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#102D25',
    position: 'relative',
  },
  scanTarget: {
    position: 'absolute',
    width: '68%',
    aspectRatio: 1,
    left: '16%',
    top: '16%',
    borderWidth: 2,
    borderColor: '#89C9A2',
    borderRadius: 16,
  },
  cameraHint: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    textAlign: 'center',
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.64)',
    borderRadius: 999,
    paddingVertical: 8,
  },
  manualArea: { gap: 12 },
});
