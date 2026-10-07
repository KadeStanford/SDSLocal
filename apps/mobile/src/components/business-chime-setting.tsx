import { Switch, View } from 'react-native';
import { useNotifications } from '@/providers/notification-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { ThemedText } from './themed-text';
export function BusinessChimeSetting() {
  const { businessChime, setBusinessChime } = useNotifications();
  const { hasBusinessAccess } = useAppMode();
  if (!hasBusinessAccess) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 }}>
      <View style={{ flex: 1, gap: 5 }}>
        <ThemedText type="smallBold">Business activity chime</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Play a soft chime for new work while business mode is open. Dots remain until requests are
          handled.
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel="Business activity chime"
        value={businessChime}
        onValueChange={setBusinessChime}
      />
    </View>
  );
}
