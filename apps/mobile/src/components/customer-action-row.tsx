import { AppButton } from './app-button';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Brand, Colors, Radius, Spacing } from '@/constants/theme';

export interface CustomerAction {
  readonly key: string;
  readonly label: string;
  readonly icon: React.ComponentProps<typeof SymbolView>['name'];
  readonly primary?: boolean;
  readonly onPress: () => void;
}

export function CustomerActionRow({
  actions,
  colorScheme,
}: {
  readonly actions: readonly CustomerAction[];
  readonly colorScheme: 'light' | 'dark';
}) {
  const colors = Colors[colorScheme];
  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <AppButton
          key={action.key}
          label={action.label}
          onPress={action.onPress}
          variant={action.primary ? 'primary' : 'secondary'}
          icon={
            <SymbolView
              name={action.icon}
              tintColor={action.primary ? colors.onAction : colors.text}
              style={styles.icon}
            />
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  action: {
    minHeight: 46,
    minWidth: 88,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
  },
  icon: { width: 18, height: 18 },
  primaryText: { color: Brand.onPrimary },
  pressed: { opacity: 0.72 },
});
