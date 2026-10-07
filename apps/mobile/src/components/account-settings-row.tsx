import { AppIcon as SymbolView } from '@/components/app-icon';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { ThemedText } from './themed-text';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';

/** Clear labels stay compact; descriptions explain the less familiar account destinations. */
export function AccountSettingsRow({
  label,
  detail,
  onPress,
  variant = 'row',
}: {
  label: string;
  detail: string;
  onPress: () => void;
  variant?: 'row' | 'tile';
}) {
  const c = useMerchantTheme();
  const { width, fontScale } = useWindowDimensions();
  const singleColumn = width < 350 || fontScale > 1.2;
  const describe = [
    'Account & data',
    'My service requests',
    'My attended events',
    'Orders & requests',
    'Create a business',
    'Admin',
  ].includes(label);
  const icon =
    (
      {
        Profile: 'circle-user-round',
        Admin: 'shield-check',
        'Help & support': 'circle-question-mark',
        'Privacy policy': 'shield-check',
        'Terms of use': 'file-text',
        'My appointments': 'calendar-days',
        Following: 'heart',
        'Orders & requests': 'shopping-bag',
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
        minHeight: variant === 'tile' ? 132 : 56,
        flexBasis: variant === 'tile' ? (singleColumn ? '100%' : '47%') : undefined,
        flexGrow: variant === 'tile' ? 1 : undefined,
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: variant === 'tile' ? 'column' : 'row',
        alignItems: variant === 'tile' ? 'flex-start' : 'center',
        gap: 12,
        backgroundColor: pressed ? c.background : c.surface,
        borderWidth: variant === 'tile' ? 1 : 0,
        borderColor: c.border,
        borderRadius: variant === 'tile' ? 16 : 0,
        borderBottomWidth: variant === 'tile' ? 1 : 0.5,
        borderBottomColor: c.border,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: c.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SymbolView name={icon} tintColor={c.text} size={20} />
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          gap: 4,
          alignSelf: variant === 'tile' ? 'stretch' : undefined,
        }}
      >
        <ThemedText type="smallBold" style={{ color: c.text, fontSize: 16, lineHeight: 22 }}>
          {label}
        </ThemedText>
        {(describe || variant === 'tile') && (
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
      {variant !== 'tile' && <SymbolView name="chevron-right" size={18} tintColor={c.secondary} />}
    </Pressable>
  );
}
