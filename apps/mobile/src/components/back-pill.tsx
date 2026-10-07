import { Pressable } from 'react-native';
import { ThemedText } from './themed-text';
import { useTheme } from '@/hooks/use-theme';

/** Navigation remains the caller's responsibility, including dirty-draft guards. */
export function BackPill({
  onPress,
  label = 'Back',
  disabled = false,
}: {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 0,
        borderColor: c.border,
        borderRadius: 14,
        backgroundColor: c.backgroundElement,
        opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
      })}
    >
      <ThemedText accessible={false} style={{ color: c.text, fontSize: 20, lineHeight: 22 }}>
        ‹
      </ThemedText>
    </Pressable>
  );
}
