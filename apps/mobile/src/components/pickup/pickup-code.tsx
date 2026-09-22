import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { commerce } from '@/lib/square-commerce';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';

export function PickupCode({
  orderId,
  statusToken,
}: {
  orderId: string;
  statusToken?: string | undefined;
}) {
  const c = useTheme();
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const valid = code && Date.parse(code.expiresAt) > now;
  async function copyPickupCode(value: string) {
    try {
      // Expo Clipboard's web adapter calls navigator.clipboard synchronously.
      // Some embedded browsers do not expose that API, so guard it before
      // invoking the adapter instead of allowing the order screen to crash.
      if (
        Platform.OS === 'web' &&
        (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function')
      ) {
        throw new Error('Clipboard unavailable');
      }
      await Clipboard.setStringAsync(value);
    } catch {
      setError('Copy is unavailable in this browser. Use the pickup QR instead.');
    }
  }
  async function refresh() {
    setBusy(true);
    setError('');
    setCode(null);
    try {
      setCode(await commerce('pickup_code', { orderId, statusToken }));
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pickup code could not load.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12, padding: 16, borderRadius: 16, backgroundColor: c.backgroundElement }}>
      <ThemedText type="card">Your pickup QR</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Show this to staff when collecting your order. One scan confirms pickup and adds eligible
        rewards to your membership.
      </ThemedText>
      {valid && (
        <View
          accessible
          accessibilityLabel="Pickup QR code. Show this to staff to confirm handoff."
          style={{ alignSelf: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12 }}
        >
          <QRCode value={code.code} size={210} color="#000" backgroundColor="#fff" />
        </View>
      )}
      {code && (
        <ThemedText type="small" themeColor="textSecondary">
          {valid
            ? 'Valid for five minutes. Keep this code private until pickup.'
            : 'This code expired. Refresh it when you are ready to collect.'}
        </ThemedText>
      )}
      {valid && (
        <AppButton
          label="Copy pickup code"
          variant="tertiary"
          onPress={() => void copyPickupCode(code.code)}
        />
      )}
      {!!error && (
        <ThemedText accessibilityLiveRegion="polite" style={{ color: c.errorText }}>
          {error}
        </ThemedText>
      )}
      {!valid && (
        <AppButton
          label={code ? 'Refresh pickup QR' : 'Show pickup QR'}
          loading={busy}
          onPress={() => void refresh()}
        />
      )}
    </View>
  );
}
