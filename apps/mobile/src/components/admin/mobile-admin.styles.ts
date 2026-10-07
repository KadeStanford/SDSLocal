import { StyleSheet } from 'react-native';
import { useMemo } from 'react';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
/** Presentation handoff: task5 may refine these styles without changing transport or state guards. */
type AdminTheme = { readonly [K in keyof ReturnType<typeof useTheme>]: string };
const createAdminStyles = (c: AdminTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: {
      padding: 20,
      paddingBottom: 40,
      gap: 20,
      width: '100%',
      maxWidth: 800,
      alignSelf: 'center',
    },
    top: { gap: 16 },
    brandRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    back: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      borderRadius: 10,
    },
    header: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5, color: c.text },
    section: {
      backgroundColor: c.backgroundElement,
      borderRadius: 20,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: c.divider,
    },
    title: { fontSize: 19, lineHeight: 25, fontWeight: '700', color: c.text },
    body: { fontSize: 16, lineHeight: 24, color: c.text },
    muted: { fontSize: 14, lineHeight: 21, color: c.textSecondary },
    notice: { padding: 16, borderRadius: 14, backgroundColor: c.successSurface, gap: 10 },
    error: { padding: 16, borderRadius: 14, backgroundColor: c.errorSurface, gap: 10 },
    emphasis: { padding: 16, borderRadius: 14, backgroundColor: c.backgroundSelected, gap: 12 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
    labelRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    flexible: { flex: 1, minWidth: 0 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    queueTile: { flexBasis: '47%', flexGrow: 1, gap: 10, padding: 14 },
    queueLabel: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: c.text },
    queueCount: { fontSize: 26, lineHeight: 32, fontWeight: '700', color: c.text },
    mintText: { color: '#102D25' },
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: c.backgroundSelected,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    badgeText: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: c.text },
    cardAction: {
      minHeight: 48,
      backgroundColor: c.actionPrimary,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 4,
    },
    actionText: {
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '600',
      color: c.onAction,
      flexShrink: 1,
    },
    fieldLabel: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: c.text },
    choice: {
      minHeight: 48,
      padding: 14,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      backgroundColor: c.backgroundElement,
      justifyContent: 'center',
    },
    selected: { backgroundColor: '#89C9A2', borderColor: '#176B4D' },
    disabled: { opacity: 0.5 },
    input: {
      minHeight: 50,
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: 12,
      padding: 14,
      fontSize: 16,
      lineHeight: 24,
      color: c.text,
      backgroundColor: (c as { inputSurface?: string }).inputSurface ?? c.backgroundElement,
    },
    multiline: { minHeight: 110, textAlignVertical: 'top' },
    item: { gap: 10, padding: 16 },
    separator: { borderTopWidth: 1, borderTopColor: c.divider, paddingTop: 14, gap: 8 },
  });
export const adminStyles = createAdminStyles(Colors.light);
export function useAdminStyles() {
  const c = useTheme();
  return useMemo(() => createAdminStyles(c), [c]);
}
