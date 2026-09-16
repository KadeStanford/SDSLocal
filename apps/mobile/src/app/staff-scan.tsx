import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

export default function StaffScanScreen() {
  const { session } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraOpen, setCameraOpen] = useState(false);
  const [action, setAction] = useState<'stamp' | 'redemption'>('stamp');
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function processToken(token: string) {
    if (busy || !token.trim()) return;
    setBusy(true);
    setCameraOpen(false);
    setMessage('Validating secure customer code…');
    const { data, error } = await supabase.functions.invoke('loyalty-transact', {
      body: { token: token.trim(), action, idempotencyKey: randomUUID() },
    });
    if (error) {
      setMessage(
        userMessageFromError(error, 'We could not process that rewards code. Please try again.'),
      );
    } else {
      const result = data?.loyalty;
      setMessage(
        action === 'stamp'
          ? `Stamp added · ${result?.progressStamps ?? 0}/${result?.stampsRequired ?? 0} visits.`
          : `Reward redeemed · ${result?.rewardsReady ?? 0} remain.`,
      );
      setManualCode('');
    }
    setBusy(false);
  }

  async function openCamera() {
    const status = permission?.granted ? permission : await requestPermission();
    if (status.granted) setCameraOpen(true);
    else setMessage('Camera permission was not granted. You can still paste a code below.');
  }

  function scanned(result: BarcodeScanningResult) {
    void processToken(result.data);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Staff scanner</ThemedText>
          <ThemedText themeColor="textSecondary">
            Securely add visits or redeem a ready reward. Camera access is requested only when you
            enable the scanner.
          </ThemedText>
          {!session && (
            <View style={styles.notice}>
              <ThemedText style={styles.noticeText}>
                Sign in with an owner or staff account first.
              </ThemedText>
            </View>
          )}
          <View style={styles.actionRow}>
            <ActionButton
              label="Add stamp"
              active={action === 'stamp'}
              onPress={() => setAction('stamp')}
            />
            <ActionButton
              label="Redeem reward"
              active={action === 'redemption'}
              onPress={() => setAction('redemption')}
            />
          </View>
          {cameraOpen && Platform.OS !== 'web' ? (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={busy ? undefined : scanned}
            />
          ) : (
            <Pressable
              disabled={!session || busy}
              style={styles.primaryButton}
              onPress={() => void openCamera()}
            >
              <ThemedText style={styles.buttonText} type="smallBold">
                Enable camera and scan
              </ThemedText>
            </Pressable>
          )}
          <ThemedText type="smallBold">Manual testing code</ThemedText>
          <TextInput
            multiline
            value={manualCode}
            onChangeText={setManualCode}
            style={styles.input}
            placeholder="Paste rotating customer code"
            placeholderTextColor="#626262"
            autoCapitalize="none"
          />
          <Pressable
            disabled={!session || busy || !manualCode.trim()}
            style={[styles.secondaryButton, busy && styles.disabled]}
            onPress={() => void processToken(manualCode)}
          >
            {busy ? (
              <ActivityIndicator />
            ) : (
              <ThemedText type="smallBold">Process pasted code</ThemedText>
            )}
          </Pressable>
          <View style={styles.status}>
            <ThemedText style={styles.statusText}>{message}</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function ActionButton({
  label,
  active,
  onPress,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.actionButton, active && styles.actionButtonActive]}>
      <ThemedText style={active ? styles.actionButtonActiveText : undefined} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: 130,
    gap: Spacing.three,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  notice: { borderRadius: 14, padding: Spacing.three, backgroundColor: '#FFF0C7' },
  noticeText: { color: '#3D3100' },
  actionRow: { flexDirection: 'row', gap: Spacing.two },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BCCBC2',
    borderRadius: 12,
    padding: 12,
  },
  actionButtonActive: { backgroundColor: '#DCEAE2', borderColor: '#176B4D' },
  actionButtonActiveText: { color: '#103D2D' },
  primaryButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
  },
  buttonText: { color: '#FFFFFF' },
  camera: { width: '100%', aspectRatio: 1, borderRadius: 20, overflow: 'hidden' },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#BCCBC2',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    color: '#111111',
    textAlignVertical: 'top',
  },
  secondaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BCCBC2',
    borderRadius: 24,
  },
  disabled: { opacity: 0.55 },
  status: { minHeight: 55, borderRadius: 14, padding: Spacing.three, backgroundColor: '#E7F0EA' },
  statusText: { color: '#164E38' },
});
