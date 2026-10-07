import { StyleSheet, View } from 'react-native';
import { AppIcon } from './app-icon';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppButton } from './app-button';
import { ThemedText } from './themed-text';

export function StateNotice({
  message,
  kind = 'info',
}: {
  readonly message: string;
  readonly kind?: 'info' | 'error' | 'success';
}) {
  const colors = useTheme();
  const backgroundColor =
    kind === 'error'
      ? colors.errorSurface
      : kind === 'success'
        ? colors.successSurface
        : colors.infoSurface;
  const color =
    kind === 'error' ? colors.errorText : kind === 'success' ? colors.successText : colors.infoText;
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      style={[styles.notice, { backgroundColor, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }]}
    >
      <AppIcon name={kind === 'error' ? 'circle-alert' : kind === 'success' ? 'circle-check' : 'info'} size={20} tintColor={color} /><ThemedText type="small" style={{ color, flex: 1 }}>
        {message}
      </ThemedText>
    </View>
  );
}

export function EmptyState({
  title,
  message,
  actionLabel,
  onAction,
}: {
  readonly title: string;
  readonly message: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}) {
  const colors = useTheme();
  return (
    <View style={[styles.empty, { backgroundColor: colors.backgroundElement, borderWidth: 1, borderColor: colors.divider }]}>
      <ThemedText type="card">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
      {actionLabel && onAction && (
        <AppButton label={actionLabel} onPress={onAction} variant="secondary" />
      )}
    </View>
  );
}

/** Static placeholders avoid decorative motion and reserve the actual list rhythm. */
export function ListLoading({
  label = 'Loading',
  rows = 3,
}: {
  readonly label?: string;
  readonly rows?: number;
}) {
  const colors = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={styles.loading}
    >
      <ThemedText themeColor="textSecondary" type="small">
        {label}…
      </ThemedText>
      {Array.from({ length: rows }, (_, index) => (
        <View
          key={index}
          style={[styles.placeholder, { backgroundColor: colors.backgroundElement }]}
        >
          <View style={[styles.square, { backgroundColor: colors.skeleton }]} />
          <View style={styles.lines}>
            <View style={[styles.line, { backgroundColor: colors.skeleton }]} />
            <View style={[styles.line, { width: '65%', backgroundColor: colors.skeleton }]} />
          </View>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  notice: { padding: Spacing.three, borderRadius: Radius.small },
  empty: { padding: 20, gap: 12, borderRadius: 18 },
  loading: { gap: Spacing.two },
  placeholder: {
    minHeight: 110,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  square: { width: 60, height: 70, borderRadius: Radius.small },
  lines: { flex: 1, gap: Spacing.two },
  line: { height: 16, borderRadius: 4 },
});
