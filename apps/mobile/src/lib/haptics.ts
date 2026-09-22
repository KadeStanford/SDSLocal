import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Small, best-effort feedback layer for interactions that benefit from a
 * physical confirmation. Haptics are intentionally non-blocking: unsupported
 * platforms (web, simulators, devices with haptics disabled) should never
 * prevent the underlying action from completing.
 */
async function safely(run: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try {
    await run();
  } catch {
    // Haptic feedback is an enhancement, not a reason to fail an action.
  }
}

export const haptics = {
  selection: () => safely(() => Haptics.selectionAsync()),
  light: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  medium: () => safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  success: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
