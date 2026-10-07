import { View } from 'react-native';
import type { ReactNode } from 'react';
import { CommerceField } from '../commerce-fields';
import { AppButton } from '../app-button';
import { ThemedText } from '../themed-text';

export function PickupScanEntry({
  manual,
  camera,
  onToggleMode,
  ...entry
}: {
  manual: boolean;
  camera: ReactNode;
  onToggleMode: () => void;
  code: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  busy?: boolean;
  online?: boolean;
}) {
  return (
    <View style={{ gap: 16 }}>
      <ThemedText type="small" themeColor="textSecondary">
        {manual
          ? 'Use the short code if the customer’s QR cannot be scanned.'
          : 'Scan the pickup QR, then review the order before handoff.'}
      </ThemedText>
      {!manual && camera}
      {entry.busy && (
        <ThemedText accessibilityLiveRegion="polite">Checking pickup code…</ThemedText>
      )}
      <AppButton
        label={manual ? 'Use camera' : 'Enter short code'}
        variant="secondary"
        disabled={Boolean(entry.busy)}
        onPress={onToggleMode}
      />
      {manual && <PickupManualEntry {...entry} />}
    </View>
  );
}
export function PickupManualEntry({
  code,
  onChange,
  onCheck,
  busy = false,
  online = true,
}: {
  code: string;
  onChange: (value: string) => void;
  onCheck: () => void;
  busy?: boolean;
  online?: boolean;
}) {
  return (
    <View style={{ gap: 16 }}>
      <CommerceField
        label="8-character pickup code"
        placeholder="ABCD 2345"
        value={code}
        onChangeText={onChange}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={9}
        editable={!busy}
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 3, fontWeight: '700' }}
      />
      <ThemedText type="small" themeColor="textSecondary">
        Ask the customer to read the code beneath their pickup QR. You’ll review the order before
        confirming.
      </ThemedText>
      <AppButton
        label="Find pickup order"
        loading={busy}
        disabled={busy || !online || code.replace(/[\s-]/g, '').length !== 8}
        onPress={onCheck}
      />
    </View>
  );
}
