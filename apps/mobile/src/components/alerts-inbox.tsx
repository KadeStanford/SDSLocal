import { PageHeader } from './page-header';
import { BusinessSearch } from './business-screen-header';
import { useState } from 'react';

import { Pressable, Switch, View } from 'react-native';
import { EmptyState } from './data-state';
import { ThemedText } from './themed-text';
import { DismissibleAlert, type DismissibleAlertRow } from './dismissible-alert';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { splitNotificationAlerts } from '@/lib/notification-audience';

export function AlertsInboxHeader({
  count,
  unread,
  loading = false,
  failed = false,
  onClear,
  onClose,
}: {
  count: number;
  unread: number;
  loading?: boolean;
  failed?: boolean;
  onClear: () => void;
  onClose: () => void;
}) {
  const c = useMerchantTheme();
  return (
    <View style={{ gap: 16 }}>
      <PageHeader onBack={onClose} backLabel="Back" alerts="current" />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <ThemedText
          accessibilityRole="header"
          type="title"
          style={{ flex: 1, fontSize: 28, lineHeight: 34 }}
        >
          Alerts
        </ThemedText>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <ThemedText type="small" style={{ color: c.secondary }}>
          {loading
            ? 'Loading alerts…'
            : failed
              ? 'Refresh to check your alerts'
              : unread
                ? `${unread} unread · ${count} total`
                : 'You’re up to date'}
        </ThemedText>
        {!loading && !failed && count > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear all alerts"
            onPress={onClear}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
          >
            <ThemedText type="smallBold" style={{ color: c.secondary }}>
              Clear all alerts
            </ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Shared compact presentation for the page and native sheet; routing stays with the caller. */
export function AlertsInboxList<T extends DismissibleAlertRow>({
  alerts,
  audience,
  onAudience,
  onOpen,
  onDismiss,
}: {
  alerts: readonly T[];
  audience: 'customer' | 'business';
  onAudience: (value: 'customer' | 'business') => void;
  onOpen: (row: T) => void;
  onDismiss: (row: T) => void;
}) {
  const c = useMerchantTheme();
  const [search, setSearch] = useState('');
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const groups = splitNotificationAlerts(alerts);
  const active = groups[audience];
  const query = search.trim().toLocaleLowerCase();
  const visible = active.filter(
    (row) =>
      (readFilter === 'all' || !row.read_at) &&
      [row.title, row.body].join(' ').toLocaleLowerCase().includes(query),
  );
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          padding: 12,
          gap: 12,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 18,
          backgroundColor: c.surface,
        }}
      >
        <View
          accessibilityRole="tablist"
          style={{
            flexDirection: 'row',
            gap: 4,
            borderRadius: 12,
            padding: 4,
            backgroundColor: c.background,
          }}
        >
          {(['customer', 'business'] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="tab"
              accessibilityState={{ selected: audience === item }}
              onPress={() => onAudience(item)}
              style={{
                flex: 1,
                minHeight: 48,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 8,
                borderRadius: 9,
                backgroundColor: audience === item ? c.success : 'transparent',
              }}
            >
              <ThemedText
                type="smallBold"
                style={{ color: audience === item ? c.onAction : c.secondary }}
              >
                {item === 'customer' ? 'Customer' : 'Business'} · {groups[item].length}
              </ThemedText>
            </Pressable>
          ))}
        </View>
        <BusinessSearch value={search} onChange={setSearch} placeholder="Search alerts" />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <ThemedText type="small" style={{ color: c.secondary }}>
            {visible.length} {visible.length === 1 ? 'alert' : 'alerts'}
          </ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="small">Unread only</ThemedText>
            <Switch
              accessibilityLabel="Unread only"
              value={readFilter === 'unread'}
              onValueChange={(value) => setReadFilter(value ? 'unread' : 'all')}
              trackColor={{ true: c.success, false: c.border }}
            />
          </View>
        </View>
      </View>
      {!visible.length && (
        <EmptyState
          title={query || readFilter === 'unread' ? 'No matching alerts' : `No ${audience} alerts`}
          message={
            query
              ? 'Try another search.'
              : audience === 'business'
                ? 'New orders and customer requests appear here.'
                : 'Order updates, events and rewards appear here.'
          }
        />
      )}
      <View style={{ gap: 12, alignItems: 'stretch' }}>
        {visible.map((row) => (
          <DismissibleAlert
            key={row.id}
            alert={row}
            surfaceColor={c.surface}
            unreadSurfaceColor={c.surface}
            onOpen={() => onOpen(row)}
            onDismiss={() => onDismiss(row)}
          />
        ))}
      </View>
    </View>
  );
}
