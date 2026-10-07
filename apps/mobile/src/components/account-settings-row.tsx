import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';

/** Clear labels stay compact; descriptions explain the less familiar account destinations. */
export function AccountSettingsRow({
  label,
  detail,
  onPress,
}: {
  label: string;
  detail: string;
  onPress: () => void;
}) {
  const c = useMerchantTheme();
  const describe = [
    'Account & data',
    'My service requests',
    'My attended events',
    'Orders & requests',
    'Create a business',
  ].includes(label);
  const icon =
    (
      {
        Profile: 'person.crop.circle',
        Notifications: 'bell',
        'Privacy & Safety': 'hand.raised',
        'Sign-in methods': 'lock',
        'Account & data': 'externaldrive',
        'My service requests': 'calendar',
        'My attended events': 'ticket',
        'Business subscription': 'creditcard',
        'Your businesses': 'building.2',
        'Create a business': 'building.2',
      } as const
    )[label as 'Profile'] ?? 'square.grid.2x2';
  const unread = label === 'Notifications' ? detail.match(/^(\d+) unread/)?.[1] : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={detail}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 20,
        paddingVertical: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: pressed ? c.background : c.surface,
        borderBottomWidth: 0.5,
        borderBottomColor: c.border,
      })}
    >
      <SymbolView name={icon} tintColor={c.success} style={{ width: 21, height: 21 }} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <ThemedText type="smallBold" style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
          {label}
        </ThemedText>
        {describe && (
          <ThemedText type="small" style={{ color: c.secondary }}>
            {detail}
          </ThemedText>
        )}
      </View>
      {unread && (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 6,
            backgroundColor: c.background,
          }}
        >
          <ThemedText type="smallBold" style={{ color: c.text }}>
            {unread}
          </ThemedText>
        </View>
      )}
      <ThemedText style={{ color: c.secondary }}>›</ThemedText>
    </Pressable>
  );
}
