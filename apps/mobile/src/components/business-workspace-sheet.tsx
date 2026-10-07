import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { BottomTabInset, Brand, Radius, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';

export function BusinessWorkspaceSheet({
  visible,
  title,
  description,
  closeAccessibilityLabel,
  closeLabel = 'Done',
  backgroundColor,
  accentColor = Brand.primary,
  closeVariant = 'solid',
  headerCopyGap = 2,
  maxHeight,
  onClose,
  children,
}: {
  readonly visible: boolean;
  readonly title: string;
  readonly description: string;
  readonly closeAccessibilityLabel: string;
  readonly closeLabel?: string;
  readonly backgroundColor: string;
  readonly accentColor?: string;
  readonly closeVariant?: 'solid' | 'text';
  readonly headerCopyGap?: ViewStyle['gap'];
  readonly maxHeight?: ViewStyle['maxHeight'];
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const solidClose = closeVariant === 'solid';

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel={closeAccessibilityLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, maxHeight ? { maxHeight } : undefined, { backgroundColor }]}>
          <View style={styles.header}>
            <View style={[styles.headerCopy, { gap: headerCopyGap }]}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {description}
              </ThemedText>
            </View>
            <Pressable
              accessibilityLabel={closeLabel}
              accessibilityRole="button"
              onPress={onClose}
              style={[
                styles.closeButton,
                solidClose ? styles.solidCloseButton : styles.textCloseButton,
                solidClose ? { backgroundColor: accentColor } : undefined,
              ]}
            >
              <ThemedText
                style={{ color: solidClose ? Brand.onPrimary : accentColor }}
                type="smallBold"
              >
                {closeLabel}
              </ThemedText>
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(4,12,8,0.58)',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  headerCopy: { flex: 1 },
  closeButton: { minHeight: 44, justifyContent: 'center' },
  solidCloseButton: {
    borderRadius: Radius.small,
    paddingHorizontal: 18,
  },
  textCloseButton: { minWidth: 44 },
});
