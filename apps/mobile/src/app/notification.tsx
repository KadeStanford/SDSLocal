import { buildDirectionsUrl } from '@/lib/external-actions';
import { EventDetailHeading } from '@/components/event-detail-heading';
import { FlowSection, FlowIdentity } from '@/components/flow-layout';
import { BusinessThemeProvider } from '@/components/business-theme';
import { AlertsInboxHeader, AlertsInboxList } from '@/components/alerts-inbox';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { IdentityPhoto } from '@/lib/business-identity';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  alertTypeLabel,
  formatAlertDate,
  orderAlertNextStep,
  orderAlertStatusLabel,
} from '@/components/dismissible-alert';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SwipeBackView } from '@/components/swipe-back-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { loadBlockedBusinessIds, removeBlockedCustomerAlerts } from '@/lib/customer-safety';
import { useAuth } from '@/providers/auth-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { isSafeNotificationUrl } from '@/lib/nearby-alerts-core';
import { MobileModerationOutcomeScreen } from '@/components/admin/moderation-outcome-screen';

interface EventRow {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_mode: 'business' | 'custom' | 'online';
  address_text: string | null;
  external_url: string | null;
  businesses:
    | {
        id: string;
        name: string;
        slug: string;
        business_photos?: readonly IdentityPhoto[] | null;
        address_line_1: string | null;
        city: string | null;
        region_code: string | null;
      }
    | {
        id: string;
        name: string;
        slug: string;
        business_photos?: readonly IdentityPhoto[] | null;
        address_line_1: string | null;
        city: string | null;
        region_code: string | null;
      }[];
}

interface BusinessUpdateRow {
  id: string;
  update_type: 'announcement' | 'deal';
  title: string;
  body: string;
  expires_at: string | null;
  created_at: string;
  businesses:
    { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[];
}

interface AlertRow {
  id: string;
  notification_type: 'events' | 'loyalty' | 'general_updates' | 'operational' | 'orders';
  entity_type:
    | 'event'
    | 'loyalty_membership'
    | 'business_update'
    | 'account'
    | 'pickup_order'
    | 'service_request';
  entity_id: string;
  title: string;
  body: string;
  url: string;
  status: string;
  created_at: string;
  read_at: string | null;
  dismissed_at: string | null;
  moderation_outcome?: unknown;
  order_status?: string | null;
  order_audience?: 'customer' | 'business' | null;
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export default function NotificationTargetScreen() {
  const bottomPadding = useScreenBottomPadding(false);
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const params = useLocalSearchParams<{ type?: string; id?: string; deliveryId?: string }>();
  const { session } = useAuth();
  const { setMode } = useAppMode();
  const { refreshUnreadCount } = useNotifications();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [businessUpdate, setBusinessUpdate] = useState<BusinessUpdateRow | null>(null);
  const [delivery, setDelivery] = useState<AlertRow | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [alertAudience, setAlertAudience] = useState<'customer' | 'business'>('customer');
  const [loading, setLoading] = useState(true);
  const [inboxError, setInboxError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const deliveryId = typeof params.deliveryId === 'string' ? params.deliveryId : undefined;
  const targetId = typeof params.id === 'string' ? params.id : undefined;
  const targetType = typeof params.type === 'string' ? params.type : undefined;
  const hasValidId = Boolean(targetId && /^[0-9a-f-]{36}$/i.test(targetId));
  const hasValidTarget = hasValidId && (targetType === 'event' || targetType === 'business_update');
  const hasValidDeliveryId = Boolean(deliveryId && /^[0-9a-f-]{36}$/i.test(deliveryId));
  const isInbox = !hasValidTarget && !hasValidDeliveryId;

  const loadInbox = useCallback(async () => {
    if (!session) {
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setInboxError(null);
    const { data, error: queryError } = await supabase
      .from('notification_deliveries')
      .select(
        'id, notification_type, entity_type, entity_id, title, body, url, status, created_at, read_at, dismissed_at, order_status, order_audience, moderation_outcome',
      )
      .eq('user_id', session.user.id)
      .or('status.eq.sent,entity_type.eq.pickup_order,inbox_available_at.not.is.null')
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(100);
    if (queryError) {
      setInboxError(
        userMessageFromError(queryError, 'We could not load your alerts. Please try again.'),
      );
    } else {
      try {
        setAlerts(await removeBlockedCustomerAlerts(session.user.id, (data ?? []) as AlertRow[]));
      } catch (filterError) {
        setInboxError(
          userMessageFromError(filterError, 'We could not load your alerts. Please try again.'),
        );
      }
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (isInbox) {
      const task = setTimeout(() => void loadInbox(), 0);
      return () => clearTimeout(task);
    }
    if (hasValidDeliveryId && deliveryId) {
      void supabase
        .from('notification_deliveries')
        .select(
          'id, notification_type, entity_type, entity_id, title, body, url, status, created_at, read_at, dismissed_at, order_status, order_audience, moderation_outcome',
        )
        .eq('id', deliveryId)
        .maybeSingle()
        .then(async ({ data, error: queryError }) => {
          if (queryError) {
            setError(
              userMessageFromError(queryError, 'We could not load this alert. Please try again.'),
            );
          } else if (!data) {
            setError('This alert is no longer available.');
          } else {
            const row = data as AlertRow;
            if (session) {
              const visibleRows = await removeBlockedCustomerAlerts(session.user.id, [row]);
              if (!visibleRows.length) {
                setError('This alert is no longer available.');
                setLoading(false);
                return;
              }
            }
            setDelivery(row);
            if (!row.read_at && !row.moderation_outcome) {
              void supabase
                .from('notification_deliveries')
                .update({ read_at: new Date().toISOString() })
                .eq('id', row.id)
                .then(() => void refreshUnreadCount());
            }
          }
          setLoading(false);
        });
      return;
    }
    if (!hasValidTarget || !targetId) return;
    if (session) {
      const entityType = targetType === 'event' ? 'event' : 'business_update';
      const readAt = new Date().toISOString();
      void supabase
        .from('notification_deliveries')
        .update({ read_at: readAt })
        .eq('user_id', session.user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', targetId)
        .is('read_at', null)
        .then(() => void refreshUnreadCount());
    }
    const query =
      targetType === 'event'
        ? supabase
            .from('events')
            .select(
              'id, title, description, starts_at, ends_at, timezone, location_mode, address_text, external_url, businesses!inner(id, name, slug, address_line_1, city, region_code, business_photos(role, media_assets(storage_path, status)))',
            )
            .eq('id', targetId)
            .is('archived_at', null)
            .maybeSingle()
        : supabase
            .from('business_updates')
            .select(
              'id, update_type, title, body, expires_at, created_at, businesses!inner(id, name, slug)',
            )
            .eq('id', targetId)
            .maybeSingle();
    void query.then(async ({ data, error: queryError }) => {
      if (queryError) {
        setError(
          userMessageFromError(queryError, 'We could not load this alert. Please try again.'),
        );
      } else if (!data) {
        setError(
          targetType === 'event'
            ? 'This event is no longer available.'
            : 'This update is no longer available.',
        );
      } else {
        const row = data as EventRow | BusinessUpdateRow;
        const relation = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
        const blockedIds = session
          ? await loadBlockedBusinessIds(session.user.id)
          : new Set<string>();
        if (relation && blockedIds.has(relation.id)) {
          setError('This alert is no longer available.');
        } else if (targetType === 'event') {
          setEvent(data as EventRow);
        } else {
          setBusinessUpdate(data as BusinessUpdateRow);
        }
      }
      setLoading(false);
    });
  }, [
    deliveryId,
    hasValidDeliveryId,
    hasValidTarget,
    isInbox,
    loadInbox,
    refreshUnreadCount,
    session,
    targetId,
    targetType,
  ]);

  async function dismissAlert(row: AlertRow) {
    setAlerts((current) => current.filter((item) => item.id !== row.id));
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({ dismissed_at: new Date().toISOString() })
      .eq('id', row.id);
    if (updateError) {
      setInboxError(
        userMessageFromError(updateError, 'We could not clear this alert. Please try again.'),
      );
      void loadInbox();
      return;
    }
    await refreshUnreadCount();
  }

  async function clearAllAlerts() {
    if (!alerts.length) return;
    const dismissedAt = new Date().toISOString();
    const ids = alerts.map((row) => row.id);
    setAlerts([]);
    const { error: updateError } = await supabase
      .from('notification_deliveries')
      .update({ dismissed_at: dismissedAt })
      .in('id', ids);
    if (updateError) {
      setInboxError(
        userMessageFromError(updateError, 'We could not clear your alerts. Please try again.'),
      );
      void loadInbox();
      return;
    }
    await refreshUnreadCount();
  }

  async function openAlert(row: AlertRow) {
    if (row.moderation_outcome) {
      router.push(`/moderation-outcome?deliveryId=${encodeURIComponent(row.id)}` as never);
      return;
    }
    if (!row.read_at) {
      const readAt = new Date().toISOString();
      setAlerts((current) =>
        current.map((item) => (item.id === row.id ? { ...item, read_at: readAt } : item)),
      );
      await supabase.from('notification_deliveries').update({ read_at: readAt }).eq('id', row.id);
      await refreshUnreadCount();
    }
    if (isSafeNotificationUrl(row.url)) {
      if (row.url.startsWith('/pickup-order?') || row.url.startsWith('/service-requests?'))
        setMode('business');
      router.push(row.url as never);
    } else {
      router.push(`/notification?deliveryId=${encodeURIComponent(row.id)}` as never);
    }
  }

  if (isInbox) {
    return (
      <BusinessThemeProvider>
        <SwipeBackView onSwipeBack={() => router.back()}>
          <ThemedView style={styles.container}>
            <SafeAreaView style={styles.safeArea} edges={['top']}>
              <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
                directionalLockEnabled
              >
                <AlertsInboxHeader
                  count={alerts.length}
                  unread={alerts.filter((row) => !row.read_at).length}
                  onClear={() => void clearAllAlerts()}
                  onClose={() => router.back()}
                />
                {loading ? (
                  <ActivityIndicator color={colors.accent} />
                ) : inboxError ? (
                  <View style={styles.emptyCard}>
                    <ThemedText type="subtitle">Alerts are unavailable</ThemedText>
                    <ThemedText themeColor="textSecondary">{inboxError}</ThemedText>
                    <Pressable onPress={() => void loadInbox()} style={styles.primaryButton}>
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
                  <AlertsInboxList
                    alerts={alerts}
                    audience={alertAudience}
                    onAudience={setAlertAudience}
                    onOpen={(row) => void openAlert(row)}
                    onDismiss={(row) => void dismissAlert(row)}
                  />
                )}
              </ScrollView>
            </SafeAreaView>
          </ThemedView>
        </SwipeBackView>
      </BusinessThemeProvider>
    );
  }

  if (delivery?.moderation_outcome && deliveryId) {
    return <MobileModerationOutcomeScreen deliveryId={deliveryId} />;
  }

  if (loading) {
    return (
      <SwipeBackView onSwipeBack={() => router.back()}>
        <ThemedView style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </ThemedView>
      </SwipeBackView>
    );
  }

  if (delivery) {
    return (
      <SwipeBackView onSwipeBack={() => router.back()}>
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <ScrollView
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
            >
              <View
                style={[
                  styles.card,
                  delivery.entity_type === 'pickup_order' && styles.orderDetailCard,
                ]}
              >
                {delivery.entity_type === 'pickup_order' ? (
                  <>
                    <View style={styles.orderDetailEyebrow}>
                      <ThemedText
                        style={[styles.eyebrow, { color: colors.textSecondary }]}
                        type="smallBold"
                      >
                        {delivery.order_audience === 'business' ? 'PICKUP QUEUE' : 'ORDER UPDATE'}
                      </ThemedText>
                      <View style={styles.orderDetailStatus}>
                        <ThemedText style={{ color: colors.accent }} type="smallBold">
                          {orderAlertStatusLabel(
                            delivery.order_status,
                            delivery.order_audience ?? 'customer',
                          )}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText type="card">{delivery.title}</ThemedText>
                    <ThemedText themeColor="textSecondary">{delivery.body}</ThemedText>
                    <View style={styles.orderNextStep}>
                      <ThemedText type="smallBold">
                        {delivery.order_audience === 'business'
                          ? 'Staff action'
                          : 'What happens next'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {orderAlertNextStep(
                          delivery.order_status,
                          delivery.order_audience ?? 'customer',
                        )}
                      </ThemedText>
                    </View>
                  </>
                ) : (
                  <>
                    <ThemedText
                      style={[styles.eyebrow, { color: colors.textSecondary }]}
                      type="smallBold"
                    >
                      {alertTypeLabel(delivery)}
                    </ThemedText>
                    <ThemedText type="title">{delivery.title}</ThemedText>
                    <ThemedText>{delivery.body}</ThemedText>
                  </>
                )}
                <ThemedText themeColor="textSecondary" type="small">
                  {formatAlertDate(delivery.created_at)}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    if (
                      delivery.url.startsWith('/pickup-order?') ||
                      delivery.url.startsWith('/service-requests?')
                    )
                      setMode('business');
                    router.push(delivery.url as never);
                  }}
                  style={styles.primaryButton}
                >
                  <ThemedText style={styles.primaryButtonText} type="smallBold">
                    {delivery.entity_type === 'pickup_order' ? 'Open order' : 'Open details'}
                  </ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      </SwipeBackView>
    );
  }

  const eventBusiness = event
    ? Array.isArray(event.businesses)
      ? event.businesses[0]
      : event.businesses
    : null;
  const updateBusiness = businessUpdate
    ? Array.isArray(businessUpdate.businesses)
      ? businessUpdate.businesses[0]
      : businessUpdate.businesses
    : null;
  const address = event
    ? event.location_mode === 'online'
      ? 'Online event'
      : event.location_mode === 'custom'
        ? event.address_text
        : [eventBusiness?.address_line_1, eventBusiness?.city, eventBusiness?.region_code]
            .filter(Boolean)
            .join(', ')
    : null;
  return (
    <SwipeBackView onSwipeBack={() => router.back()}>
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          >
            {error ||
            (!event && !businessUpdate) ||
            (event && !eventBusiness) ||
            (businessUpdate && !updateBusiness) ? (
              <View style={styles.card}>
                <ThemedText type="subtitle">
                  {targetType === 'business_update' ? 'Update unavailable' : 'Event unavailable'}
                </ThemedText>
                <ThemedText themeColor="textSecondary">
                  {error ??
                    (targetType === 'business_update' ? 'Update not found.' : 'Event not found.')}
                </ThemedText>
                <Link href="/notification" style={[styles.link, { color: colors.accent }]}>
                  Back to alerts
                </Link>
              </View>
            ) : event && eventBusiness ? (
              <View style={styles.card}>
                <EventDetailHeading
                  title={event.title}
                  businessName={eventBusiness.name}
                  color="#102D25"
                  photos={eventBusiness.business_photos}
                  onDirections={
                    event.location_mode !== 'online' && address
                      ? () => {
                          const url = buildDirectionsUrl(
                            Platform.OS === 'ios'
                              ? 'ios'
                              : Platform.OS === 'android'
                                ? 'android'
                                : 'web',
                            { address, label: event.title },
                          );
                          if (url)
                            void Linking.openURL(url).catch(() =>
                              Alert.alert('Could not open maps', 'Please try again.'),
                            );
                        }
                      : undefined
                  }
                  when={formatDate(event.starts_at, event.timezone)}
                  where={address || 'At the business location'}
                />
                {event.ends_at && (
                  <ThemedText themeColor="textSecondary">
                    Ends {formatDate(event.ends_at, event.timezone)}
                  </ThemedText>
                )}
                <FlowSection title="About this event">
                  <ThemedText>{event.description}</ThemedText>
                </FlowSection>

                <Link
                  href={`/explore?businessId=${encodeURIComponent(eventBusiness.id)}` as never}
                  style={styles.primaryButton}
                  accessibilityRole="link"
                >
                  View business page
                </Link>
                {event.external_url && (
                  <Link href={event.external_url as never} style={styles.secondaryButton}>
                    Tickets / information
                  </Link>
                )}
              </View>
            ) : businessUpdate && updateBusiness ? (
              <View style={styles.card}>
                <ThemedText
                  type="smallBold"
                  style={[styles.eyebrow, { color: colors.textSecondary }]}
                >
                  {businessUpdate.update_type === 'deal' ? 'SPECIAL OFFER' : 'ANNOUNCEMENT'}
                </ThemedText>
                <ThemedText type="title">{businessUpdate.title}</ThemedText>
                <FlowIdentity name={updateBusiness.name} />
                <FlowSection title="From the business">
                  <ThemedText>{businessUpdate.body}</ThemedText>
                </FlowSection>
                <ThemedText themeColor="textSecondary" type="small">
                  Sent {new Date(businessUpdate.created_at).toLocaleString()}
                  {businessUpdate.expires_at
                    ? ` · Expires ${new Date(businessUpdate.expires_at).toLocaleString()}`
                    : ''}
                </ThemedText>
                <Link
                  href={`/explore?businessId=${encodeURIComponent(updateBusiness.id)}` as never}
                  style={styles.primaryButton}
                  accessibilityRole="link"
                >
                  View business page
                </Link>
              </View>
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  inboxHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  headerCopy: { flex: 1, gap: Spacing.one },
  headerActions: { alignItems: 'flex-end', gap: Spacing.two },
  eyebrow: { color: Brand.primary, letterSpacing: 1.5, textTransform: 'uppercase' },
  clearButton: { minHeight: 36, justifyContent: 'center', paddingHorizontal: 4 },
  clearButtonText: { color: Brand.primary },
  closeButton: {
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
  audienceOptionSelected: { backgroundColor: Colors.dark.backgroundElement },
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
  card: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: '#DCE2DE',
    padding: Spacing.four,
  },
  orderDetailCard: { borderLeftWidth: 4, borderLeftColor: Brand.primary },
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
  fact: { gap: Spacing.one },
  link: { color: Brand.primary, fontWeight: '700' },
  primaryButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
    backgroundColor: Brand.primary,
  },
  primaryButtonText: { color: '#FFFFFF' },
  secondaryButton: {
    minHeight: 48,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
    fontWeight: '700',
  },
});
