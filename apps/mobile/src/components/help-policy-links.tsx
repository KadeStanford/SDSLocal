import { Linking, View } from 'react-native';
import { useState } from 'react';
import { subscriptionLegalUrl } from '@/lib/listing-billing-core';
import { AccountSettingsRow } from './account-settings-row';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';
export function HelpPolicyLinks() {
  const [error, setError] = useState('');
  const colors = useTheme();
  const links = [
    { label: 'Help & support', detail: 'Account, app and subscription help', url: process.env.EXPO_PUBLIC_SUPPORT_URL },
    { label: 'Privacy policy', detail: 'How your data is used', url: process.env.EXPO_PUBLIC_PRIVACY_URL },
    { label: 'Terms of use', detail: 'Using Parish Pass', url: process.env.EXPO_PUBLIC_TERMS_URL },
  ];
  return <View style={{ gap: 8 }}><ThemedText type="smallBold">Help & policies</ThemedText>
    <View style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: colors.divider, backgroundColor: colors.backgroundElement }}>{links.map(link => <AccountSettingsRow key={link.label} label={link.label} detail={link.detail} onPress={() => { const url = subscriptionLegalUrl(link.url); if (!url) { setError('This link is unavailable in this build. Please try again after updating the app.'); return; } void Linking.openURL(url).catch(() => setError('The page couldn’t open. Please retry.')); }} />)}</View>
    {!!error && <ThemedText accessibilityLiveRegion="polite">{error}</ThemedText>}
    <ThemedText type="small" themeColor="textSecondary">For an order or appointment, contact the business. For account or app issues, use Help & support.</ThemedText>
  </View>;
}
