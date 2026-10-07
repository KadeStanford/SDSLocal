import { useEffect, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { commerce } from '@/lib/square-commerce';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';

export type PickupCodeValue = { code: string; manualCode?: string; expiresAt: string };

export function PickupCodeContent({
  code,
  now,
  busy,
  error,
  onRefresh,
  qr,
}: {
  code: PickupCodeValue | null;
  now: number;
  busy: boolean;
  error: string;
  onRefresh: () => void;
  qr?: ReactNode;
}) {
  const c = useTheme();
  const valid = code && Date.parse(code.expiresAt) > now;
  const shortCode = valid && code.manualCode?.match(/.{1,4}/g)?.join(' ');
  return (
    <View
      style={{
        gap: 16,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.backgroundElement,
      }}
    >
      <ThemedText type="card">Ready to collect</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Show your QR to staff when they hand over your order.
      </ThemedText>
      {valid && (
        <View
          accessible
          accessibilityLabel="Pickup QR code. Show this to staff to confirm handoff."
          style={{ alignSelf: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 12 }}
        >
          {qr}
        </View>
      )}
      {shortCode && (
        <View style={{ gap: 8, padding: 16, borderRadius: 12, backgroundColor: c.background }}>
          <ThemedText type="smallBold" style={{ textAlign: 'center' }}>
            Can’t scan? Tell staff this code
          </ThemedText>
          <ThemedText
            selectable
            accessibilityLabel={`Pickup code: ${code.manualCode?.split('').join(' ')}`}
            style={{
              fontSize: 28,
              lineHeight: 36,
              fontWeight: '700',
              letterSpacing: 3,
              textAlign: 'center',
              fontVariant: ['tabular-nums'],
            }}
          >
            {shortCode}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
            Staff can enter it to find and confirm your pickup.
          </ThemedText>
        </View>
      )}
      {code && (
        <ThemedText type="small" themeColor="textSecondary" style={{ textAlign: 'center' }}>
          {valid
            ? 'Valid for 5 minutes. Share only with pickup staff.'
            : 'Your pickup code expired. Get a new code when you’re ready.'}
        </ThemedText>
      )}
      {!!error && (
        <ThemedText accessibilityLiveRegion="polite" style={{ color: c.errorText }}>
          {error}
        </ThemedText>
      )}
      {!valid && (
        <AppButton
          label={code ? 'Get a new pickup code' : 'Show pickup code'}
          loading={busy}
          onPress={onRefresh}
        />
      )}
    </View>
  );
}

export function PickupCode({
  orderId,
  statusToken,
}: {
  orderId: string;
  statusToken?: string | undefined;
}) {
  return <PickupCodeSession key={orderId} orderId={orderId} statusToken={statusToken} />;
}

function PickupCodeSession({
  orderId,
  statusToken,
}: {
  orderId: string;
  statusToken?: string | undefined;
}) {
  const [code, setCode] = useState<PickupCodeValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  async function refresh() {
    if (busy) return;
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
    <PickupCodeContent
      code={code}
      now={now}
      busy={busy}
      error={error}
      onRefresh={() => void refresh()}
      qr={code ? <QRCode value={code.code} size={210} color="#000" backgroundColor="#fff" /> : null}
    />
  );
}
