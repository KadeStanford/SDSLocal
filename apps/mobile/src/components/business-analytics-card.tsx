import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

import { ThemedText } from './themed-text';

interface DailyAnalyticsRow {
  readonly page_views: number;
  readonly unique_visitors: number;
  readonly qr_scans: number;
  readonly offering_views: number;
  readonly event_views: number;
  readonly phone_clicks: number;
  readonly directions_clicks: number;
  readonly social_clicks: number;
}

const metricCopy = [
  { key: 'page_views', label: 'Page views' },
  { key: 'unique_visitors', label: 'Visitors' },
  { key: 'interest', label: 'Menu & event views' },
  { key: 'actions', label: 'Customer actions' },
] as const;

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function BusinessAnalyticsCard({ businessId }: { readonly businessId: string }) {
  const colors = useTheme();
  const [rows, setRows] = useState<DailyAnalyticsRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('analytics_daily')
      .select(
        'page_views, unique_visitors, qr_scans, offering_views, event_views, phone_clicks, directions_clicks, social_clicks',
      )
      .eq('business_id', businessId)
      .gte('metric_date', since);
    setRows(error ? [] : ((data ?? []) as DailyAnalyticsRow[]));
    setLoaded(true);
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const totals = rows.reduce(
    (sum, row) => ({
      page_views: sum.page_views + row.page_views,
      unique_visitors: sum.unique_visitors + row.unique_visitors,
      qr_scans: sum.qr_scans + row.qr_scans,
      offering_views: sum.offering_views + row.offering_views,
      event_views: sum.event_views + row.event_views,
      phone_clicks: sum.phone_clicks + row.phone_clicks,
      directions_clicks: sum.directions_clicks + row.directions_clicks,
      social_clicks: sum.social_clicks + row.social_clicks,
    }),
    {
      page_views: 0,
      unique_visitors: 0,
      qr_scans: 0,
      offering_views: 0,
      event_views: 0,
      phone_clicks: 0,
      directions_clicks: 0,
      social_clicks: 0,
    },
  );
  const values: Record<(typeof metricCopy)[number]['key'], number> = {
    page_views: totals.page_views,
    unique_visitors: totals.unique_visitors,
    interest: totals.offering_views + totals.event_views,
    actions:
      totals.offering_views +
      totals.event_views +
      totals.phone_clicks +
      totals.directions_clicks +
      totals.social_clicks,
  };

  return (
    <View
      style={{
        gap: Spacing.two,
        padding: Spacing.three,
        borderRadius: Radius.medium,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.backgroundElement,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.two }}>
        <View style={{ flex: 1, gap: Spacing.one }}>
          <ThemedText type="smallBold">Page performance</ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            Last 30 days
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          style={{ minHeight: 44, justifyContent: 'center' }}
          onPress={() => setExpanded((value) => !value)}
        >
          <ThemedText style={{ color: colors.accent }} type="smallBold">
            {expanded ? 'Hide details' : 'Details'}
          </ThemedText>
        </Pressable>
      </View>
      {!loaded ? (
        <ThemedText themeColor="textSecondary" type="small">
          Loading insights…
        </ThemedText>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three }}>
          {metricCopy
            .filter((_, index) => expanded || index < 2)
            .map((metric) => (
              <View key={metric.key} style={{ minWidth: '42%', gap: Spacing.one }}>
                <ThemedText type="subtitle">{formatCount(values[metric.key])}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {metric.label}
                </ThemedText>
              </View>
            ))}
          {expanded && (
            <ThemedText themeColor="textSecondary" type="small">
              Interest includes {formatCount(totals.offering_views)} offering views,{' '}
              {formatCount(totals.event_views)} event views, {formatCount(totals.phone_clicks)}{' '}
              calls, {formatCount(totals.directions_clicks)} direction requests, and{' '}
              {formatCount(totals.social_clicks)} social link taps.
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}
