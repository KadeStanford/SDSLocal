import { useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { MerchantButton, MerchantSheet } from './merchant-ui';
import { StateNotice } from './data-state';
import { ThemedText } from './themed-text';
import { startRewardCodeRotation, type RewardCode } from '@/lib/rotating-reward-code';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';

export function RewardsCodeSheet({
  visible,
  membershipId,
  businessName,
  onClose,
}: {
  visible: boolean;
  membershipId: string;
  businessName: string;
  onClose: () => void;
}) {
  const [code, setCode] = useState<RewardCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setActive(state === 'active');
      if (state !== 'active') setCode(null);
    });
    return () => subscription.remove();
  }, []);
  const scope = JSON.stringify([visible, active, membershipId, retry]);
  const [previousScope, setPreviousScope] = useState(scope);
  if (previousScope !== scope) {
    setPreviousScope(scope);
    setCode(null);
    setError(null);
  }
  useEffect(() => {
    if (!visible || !active || !membershipId) return;
    return startRewardCodeRotation(
      async () => {
        const { data, error: requestError } = await supabase.functions.invoke('loyalty-token', {
          body: { membershipId },
        });
        if (requestError) throw requestError;
        return {
          token: typeof data?.token === 'string' ? data.token : '',
          expiresAt: typeof data?.expiresAt === 'string' ? data.expiresAt : '',
        };
      },
      (value) => {
        setCode(value);
        if (value) setError(null);
      },
      (cause) =>
        setError(userMessageFromError(cause, 'Could not create a rewards code. Please retry.')),
    );
  }, [visible, active, membershipId, retry]);
  return (
    <MerchantSheet
      visible={visible}
      title="Rewards code"
      onClose={onClose}
      footer={
        error ? (
          <MerchantButton
            secondary
            label="Retry code"
            onPress={() => setRetry((value) => value + 1)}
          />
        ) : undefined
      }
    >
      <ThemedText type="card">{businessName}</ThemedText>
      <ThemedText themeColor="textSecondary">
        Show this code to a staff member at checkout. Keep this screen open while they scan.
      </ThemedText>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          minHeight: 160,
        }}
      >
        {visible && active && code && width > 40 ? (
          <QRCode
            value={code.token}
            size={Math.min(280, width - 40)}
            color="#000000"
            backgroundColor="#FFFFFF"
          />
        ) : error ? (
          <ThemedText style={{ color: '#102D25' }}>Code unavailable</ThemedText>
        ) : (
          <ActivityIndicator accessibilityLabel="Preparing rewards code" color="#102D25" />
        )}
      </View>
      {!!error ? (
        <StateNotice kind="error" message={error} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {active
            ? code
              ? 'Code ready. It refreshes automatically.'
              : 'Preparing a fresh code…'
            : 'Return to the app to create a fresh code.'}
        </ThemedText>
      )}
    </MerchantSheet>
  );
}
