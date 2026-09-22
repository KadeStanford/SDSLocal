import { useColorScheme } from '@/hooks/use-color-scheme';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { removeBlockedCustomerAlerts } from '@/lib/customer-safety';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';
import {
  DismissibleAlert,
  alertTypeLabel,
  formatAlertDate,
  orderAlertNextStep,
  orderAlertStatusLabel,
} from './dismissible-alert';
import type { DismissibleAlertRow } from './dismissible-alert';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { router } from 'expo-router';
import { useAppMode } from '@/providers/app-mode-provider';
import { isSafeNotificationUrl } from '@/lib/nearby-alerts-core';
import { AppButton } from './app-button';
import { splitNotificationAlerts } from '@/lib/notification-audience';

type AlertRow = DismissibleAlertRow & { url: string };

/** Compact native entry point for the alerts inbox without adding another tab. */
export function AlertsButton() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const { session } = useAuth();
  const { setMode } = useAppMode();
  const { unreadCount, refreshUnreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertAudience, setAlertAudience] = useState<'customer' | 'business'>('customer');
  const [selected, setSelected] = useState<AlertRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  const loadAlerts = useCallback(async () => {
    if (!session) {
      setAlerts([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('notification_deliveries')
      .select(
        'id, entity_type, entity_id, title, body, created_at, read_at, url, order_status, order_audience',
      )
      .eq('user_id', session.user.id)
      .or('status.eq.sent,entity_type.eq.pickup_order')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) {
      setError(userMessageFromError(queryError, 'We could not load your alerts.'));
    } else {
      try {
        setAlerts(await removeBlockedCustomerAlerts(session.user.id, (data ?? []) as AlertRow[]));
      } catch (filterError) {
        setError(userMessageFromError(filterError, 'We could not load your alerts.'));
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!open) return;
    const task = setTimeout(() => void loadAlerts(), 0);
    return () => clearTimeout(task);
  }, [loadAlerts, open]);

  async function markRead(row: AlertRow) {
    setSelected(row);
    if (row.read_at) return;
    void haptics.selection();
    const readAt = new Date().toISOString();
    setAlerts((current) =>
      current.map((item) => (item.id === row.id ? { ...item, read_at: readAt } : item)),
    );
    setSelected({ ...row, read_at: readAt });
    await supabase.from('notification_deliveries').update({ read_at: readAt }).eq('id', row.id);
    await refreshUnreadCount();
  }

  async function dismiss(row: AlertRow) {
    setAlerts((current) => current.filter((item) => item.id !== row.id));
    if (selected?.id === row.id) setSelected(null);
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) {
      void haptics.error();
      setError(userMessageFromError(updateError, 'We could not clear this alert.'));
      void loadAlerts();
    } else {
      void haptics.success();
      await refreshUnreadCount();
    }
  }

  async function clearAllAlerts() {
    if (!alerts.length) return;
    const dismissedAt = new Date().toISOString();
    const ids = alerts.map((row) => row.id);
    setAlerts([]);
    setSelected(null);
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({ dismissed_at: dismissedAt })
      .in('id', ids);
    if (updateError) {
      void haptics.error();
      setError(userMessageFromError(updateError, 'We could not clear your alerts.'));
      void loadAlerts();
      return;
    }
    void haptics.success();
    await refreshUnreadCount();
  }

  const alertGroups = splitNotificationAlerts(alerts);
  const activeAlerts = alertGroups[alertAudience];
  const activeAudienceLabel = alertAudience === 'customer' ? 'Customer alerts' : 'Business alerts';

  return (
    <>
      <Pressable
        accessibilityLabel={unreadCount ? `Alerts, ${unreadCount} unread` : 'Alerts'}
        accessibilityRole="button"
        onPress={() => {
          void haptics.selection();
          setSelected(null);
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.backgroundElement, borderColor: colors.backgroundSelected },
          pressed && styles.pressed,
        ]}
      >
        <View>
          <SymbolView
            name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
            tintColor={colors.text}
            style={styles.icon}
          />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText} type="smallBold">
                {badge}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
      <Modal
        animationType="slide"
        onRequestClose={() => setOpen(false)}
        presentationStyle="pageSheet"
        visible={open}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <ThemedView style={styles.modalRoot}>
            <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
              <ScrollView contentContainerStyle={styles.modalContent} directionalLockEnabled>
                <View style={styles.modalHeader}>
                  <View style={styles.headerCopy}>
                    <ThemedText style={styles.eyebrow} type="smallBold">
                      INBOX
                    </ThemedText>
                    <ThemedText type="title">Alerts</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      Updates from businesses you follow, event reminders, and rewards.
                    </ThemedText>
                  </View>
                  <View style={styles.headerActions}>
                    {alerts.length > 0 && (
                      <Pressable
                        accessibilityLabel="Clear all alerts"
                        accessibilityRole="button"
                        onPress={() => void clearAllAlerts()}
                        style={styles.clearButton}
                      >
                        <ThemedText style={styles.clearButtonText} type="smallBold">
                          Clear all
                        </ThemedText>
                      </Pressable>
                    )}
                    <Pressable
                      accessibilityLabel="Close alerts"
                      accessibilityRole="button"
                      onPress={() => setOpen(false)}
                      style={styles.doneButton}
                    >
                      <ThemedText type="smallBold">Done</ThemedText>
                    </Pressable>
                  </View>
                </View>
                {selected ? (
                  <View
                    style={[
                      styles.detailCard,
                      selected.entity_type === 'pickup_order' && styles.orderDetailCard,
                    ]}
                  >
                    <Pressable onPress={() => setSelected(null)} style={styles.backLink}>
                      <ThemedText style={styles.linkText} type="smallBold">
                        ‹ All alerts
                      </ThemedText>
                    </Pressable>
                    {selected.entity_type === 'pickup_order' ? (
                      <View style={styles.orderDetailCopy}>
                        <View style={styles.orderDetailEyebrow}>
                          <ThemedText style={styles.eyebrow} type="smallBold">
                            {selected.order_audience === 'business'
                              ? 'PICKUP QUEUE'
                              : 'ORDER UPDATE'}
                          </ThemedText>
                          <View style={styles.orderDetailStatus}>
                            <ThemedText style={{ color: colors.accent }} type="smallBold">
                              {orderAlertStatusLabel(
                                selected.order_status,
                                selected.order_audience ?? 'customer',
                              )}
                            </ThemedText>
                          </View>
                        </View>
                        <ThemedText type="card">{selected.title}</ThemedText>
                        <ThemedText themeColor="textSecondary">{selected.body}</ThemedText>
                        <View style={styles.orderNextStep}>
                          <ThemedText type="smallBold">
                            {selected.order_audience === 'business'
                              ? 'Staff action'
                              : 'What happens next'}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {orderAlertNextStep(
                              selected.order_status,
                              selected.order_audience ?? 'customer',
                            )}
                          </ThemedText>
                        </View>
                      </View>
                    ) : (
                      <>
                        <ThemedText style={styles.eyebrow} type="smallBold">
                          {alertTypeLabel(selected)}
                        </ThemedText>
                        <ThemedText type="subtitle">{selected.title}</ThemedText>
                        <ThemedText>{selected.body}</ThemedText>
                      </>
                    )}
                    {selected.entity_type === 'pickup_order' &&
                      isSafeNotificationUrl(selected.url) && (
                        <AppButton
                          label="View order"
                          onPress={() => {
                            if (selected.url.startsWith('/pickup-order?')) setMode('business');
                            setOpen(false);
                            router.push(selected.url as never);
                          }}
                        />
                      )}
                    <ThemedText themeColor="textSecondary" type="small">
                      {formatAlertDate(selected.created_at)}
                    </ThemedText>
                  </View>
                ) : loading ? (
                  <ActivityIndicator color={Brand.primary} />
                ) : error ? (
                  <View style={styles.emptyCard}>
                    <ThemedText type="subtitle">Alerts are unavailable</ThemedText>
                    <ThemedText themeColor="textSecondary">{error}</ThemedText>
                    <Pressable onPress={() => void loadAlerts()} style={styles.primaryButton}>
                      <ThemedText style={styles.primaryButtonText} type="smallBold">
                        Try again
                      </ThemedText>
                    </Pressable>
                  </View>
                ) : alerts.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <ThemedText type="subtitle">You’re all caught up</ThemedText>
                    <ThemedText themeColor="textSecondary">
                      New event, business, and rewards updates will appear here.
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.alertList}>
                    <ThemedText themeColor="textSecondary" type="small">
                      Tap an alert to read it. Swipe left to clear it.
                    </ThemedText>
                    <View style={styles.audienceSelector} accessibilityRole="tablist">
                      {(['customer', 'business'] as const).map((audience) => {
                        const count = alertGroups[audience].length;
                        const unread = alertGroups[audience].filter((row) => !row.read_at).length;
                        const selected = alertAudience === audience;
                        return (
                          <Pressable
                            key={audience}
                            accessibilityRole="tab"
                            accessibilityState={{ selected }}
                            accessibilityLabel={`${audience === 'customer' ? 'Customer' : 'Business'} alerts, ${unread} unread`}
                            onPress={() => setAlertAudience(audience)}
                            style={[
                              styles.audienceOption,
                              selected && { backgroundColor: colors.backgroundElement },
                            ]}
                          >
                            {unread > 0 && <View style={styles.unreadIndicator} />}
                            <ThemedText type="smallBold">
                              {audience === 'customer' ? 'Customer' : 'Business'}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" type="smallBold">
                              {count}
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.activeAlertHeading}>
                      <ThemedText type="subtitle">{activeAudienceLabel}</ThemedText>
                      {activeAlerts.length > 0 && (
                        <ThemedText themeColor="textSecondary" type="small">
                          {activeAlerts.filter((row) => !row.read_at).length} unread
                        </ThemedText>
                      )}
                    </View>
                    {activeAlerts.length === 0 ? (
                      <View style={styles.sectionEmptyCard}>
                        <ThemedText type="smallBold">No {alertAudience} alerts</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {alertAudience === 'customer'
                            ? 'Orders, rewards, events, and updates for you will appear here.'
                            : 'New orders and pickup activity for your team will appear here.'}
                        </ThemedText>
                      </View>
                    ) : (
                      activeAlerts.map((row) => (
                        <DismissibleAlert
                          key={row.id}
                          alert={row}
                          surfaceColor={colors.backgroundElement}
                          unreadSurfaceColor={colors.backgroundSelected}
                          onDismiss={() => void dismiss(row)}
                          onOpen={() => void markRead(row)}
                        />
                      ))
                    )}
                  </View>
                )}
              </ScrollView>
            </SafeAreaView>
          </ThemedView>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexShrink: 0,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
  },
  icon: { width: 23, height: 23 },
  pressed: { opacity: 0.68 },
  badge: {
    position: 'absolute',
    top: -5,
    right: -8,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: Brand.danger,
    paddingHorizontal: 4,
  },
  badgeText: { color: Brand.onPrimary, fontSize: 11, lineHeight: 16 },
  modalRoot: { flex: 1 },
  modalSafeArea: { flex: 1 },
  modalContent: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, minWidth: 0, gap: Spacing.one },
  headerActions: { alignItems: 'flex-end', gap: Spacing.two },
  eyebrow: { color: Brand.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  clearButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  clearButtonText: { color: Brand.primary },
  doneButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  alertList: { gap: Spacing.two },
  audienceSelector: {
    flexDirection: 'row',
    gap: Spacing.one,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: 4,
  },
  audienceOption: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
  },
  unreadIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: Brand.primary },
  activeAlertHeading: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionEmptyCard: {
    gap: Spacing.one,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.three,
  },
  alertSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderLeftWidth: 3,
    borderLeftColor: Brand.primary,
    paddingLeft: Spacing.two,
  },
  alertSectionCopy: { flex: 1, gap: Spacing.one },
  sectionEyebrow: { color: Brand.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  emptyCard: {
    gap: Spacing.two,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.four,
  },
  detailCard: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.four,
  },
  orderDetailCard: { borderLeftWidth: 4, borderLeftColor: Brand.primary },
  orderDetailCopy: { gap: Spacing.two },
  orderDetailEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  orderDetailStatus: {
    borderWidth: 1,
    borderColor: Brand.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  orderNextStep: {
    gap: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(113,128,120,0.35)',
    paddingTop: Spacing.two,
  },
  backLink: { alignSelf: 'flex-start' },
  linkText: { color: Brand.primary },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: 18,
    backgroundColor: Brand.primary,
  },
  primaryButtonText: { color: Brand.onPrimary },
});
