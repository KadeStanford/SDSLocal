import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAppMode } from '@/providers/app-mode-provider';
import { AlertsButton } from './alerts-button';
import { ModeSwitch } from './mode-switch';

/** Shared utility actions for top-level customer and business screens. */
export function AppChrome() {
  const { mode } = useAppMode();
  const businessMode = mode === 'business';

  return (
    <View style={[styles.row, businessMode ? styles.rowBusiness : styles.rowCustomer]}>
      {businessMode ? <ModeSwitch /> : null}
      <AlertsButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  // Alerts float over the utility edge in customer mode so removing the mode
  // switch does not leave an empty 48px header band on every screen.
  rowCustomer: { position: 'absolute', top: 0, right: Spacing.four, zIndex: 2 },
  rowBusiness: { justifyContent: 'space-between' },
});
