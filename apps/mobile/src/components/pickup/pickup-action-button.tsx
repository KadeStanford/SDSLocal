import { ActivityIndicator, Pressable, View } from 'react-native';
import { ThemedText } from '../themed-text';
import { useTheme } from '@/hooks/use-theme';

export function PickupActionButton({
  label,
  amount,
  count,
  disabled = false,
  loading = false,
  onPress,
}: {
  label: string;
  amount: string;
  count?: number;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const c = useTheme();
  const blocked = disabled || loading;
  const color = blocked ? c.textSecondary : c.onAction;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${count === undefined ? '' : `, ${count} items`} · ${amount}`}
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        paddingHorizontal: 17,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: blocked ? c.backgroundSelected : c.actionPrimary,
        borderWidth: 1,
        borderColor: blocked ? c.divider : c.actionPrimary,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        opacity: pressed ? 0.8 : 1,
        boxShadow: blocked ? undefined : '0 3px 7px rgba(6, 60, 38, 0.13)',
      })}
    >
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        count !== undefined && (
          <View
            style={{
              minWidth: 28,
              minHeight: 28,
              paddingHorizontal: 6,
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ThemedText type="smallBold" style={{ color }}>
              {count}
            </ThemedText>
          </View>
        )
      )}
      <ThemedText type="smallBold" style={{ flex: 1, color, minWidth: 0 }}>
        {label}
      </ThemedText>
      <View
        style={{
          paddingLeft: 15,
          borderLeftWidth: 1,
          borderLeftColor: blocked ? c.divider : 'rgba(255,255,255,0.22)',
          maxWidth: '42%',
        }}
      >
        <ThemedText type="smallBold" style={{ color, fontVariant: ['tabular-nums'] }}>
          {amount}
        </ThemedText>
      </View>
    </Pressable>
  );
}
