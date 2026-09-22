import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppButton } from './app-button';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';

export function SignInGate({
  visible,
  message,
  onCancel,
  onContinue,
}: {
  readonly visible: boolean;
  readonly message: string;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
}) {
  const colors = Colors[useColorScheme() === 'dark' ? 'dark' : 'light'];
  return (
    <Modal animationType="fade" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close sign-in prompt"
          onPress={onCancel}
          style={styles.backdrop}
        />
        <View
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: colors.backgroundElement }]}
        >
          <ThemedText type="subtitle">Continue with an account</ThemedText>
          <ThemedText themeColor="textSecondary">{message}</ThemedText>
          <AppButton label="Sign in or create account" onPress={onContinue} />
          <AppButton label="Not now" onPress={onCancel} variant="tertiary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: Spacing.four },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  card: { borderRadius: Radius.large, gap: Spacing.three, padding: Spacing.four },
  primaryButton: {
    minHeight: 48,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: Spacing.four,
  },
  primaryText: { color: Brand.onPrimary },
  secondaryButton: {
    minHeight: 46,
    borderRadius: Radius.small,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});
