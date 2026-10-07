import { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { CustomerBrand } from './customer-brand';
import { MerchantButton } from './merchant-ui';
import { ThemedText } from './themed-text';
export function BusinessAccessRecovery({ onRetry }: { onRetry: () => void | Promise<unknown> }) {
  const c = useTheme(); const [busy, setBusy] = useState(false);
  return <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20, backgroundColor: c.background }}>
    <CustomerBrand /><ThemedText type="subtitle">Let’s reconnect your account</ThemedText>
    <ThemedText themeColor="textSecondary">We couldn’t check your business access. Your saved mode hasn’t changed.</ThemedText>
    <MerchantButton label={busy ? 'Checking access…' : 'Retry access check'} disabled={busy} onPress={() => { setBusy(true); Promise.resolve(onRetry()).finally(() => setBusy(false)); }} />
  </View>;
}
