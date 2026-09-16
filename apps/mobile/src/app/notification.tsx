import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';

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
        name: string;
        slug: string;
        address_line_1: string | null;
        city: string | null;
        region_code: string | null;
      }
    | {
        name: string;
        slug: string;
        address_line_1: string | null;
        city: string | null;
        region_code: string | null;
      }[];
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value));
}

export default function NotificationTargetScreen() {
  const params = useLocalSearchParams<{ type?: string; id?: string }>();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasValidEventId =
    params.type === 'event' && Boolean(params.id && /^[0-9a-f-]{36}$/i.test(params.id));

  useEffect(() => {
    if (!hasValidEventId || !params.id) return;
    void supabase
      .from('events')
      .select(
        'id, title, description, starts_at, ends_at, timezone, location_mode, address_text, external_url, businesses!inner(name, slug, address_line_1, city, region_code)',
      )
      .eq('id', params.id)
      .is('archived_at', null)
      .maybeSingle()
      .then(({ data, error: queryError }) => {
        if (queryError) {
          setError(
            userMessageFromError(
              queryError,
              'We could not load this notification. Please try again.',
            ),
          );
        } else if (!data) setError('This event is no longer available.');
        else setEvent(data as EventRow);
        setLoading(false);
      });
  }, [hasValidEventId, params.id]);

  if (!hasValidEventId) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <View style={styles.card}>
              <ThemedText type="subtitle">Invalid notification link</ThemedText>
              <ThemedText themeColor="textSecondary">
                This notification link is not valid.
              </ThemedText>
              <Link href="/" style={styles.link}>
                Return home
              </Link>
            </View>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color="#176B4D" />
      </ThemedView>
    );
  }

  const business = event
    ? Array.isArray(event.businesses)
      ? event.businesses[0]
      : event.businesses
    : null;
  const address = event
    ? event.location_mode === 'online'
      ? 'Online event'
      : event.location_mode === 'custom'
        ? event.address_text
        : [business?.address_line_1, business?.city, business?.region_code]
            .filter(Boolean)
            .join(', ')
    : null;
  const siteUrl = process.env.EXPO_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          {error || !event || !business ? (
            <View style={styles.card}>
              <ThemedText type="subtitle">Event unavailable</ThemedText>
              <ThemedText themeColor="textSecondary">{error ?? 'Event not found.'}</ThemedText>
              <Link href="/" style={styles.link}>
                Return home
              </Link>
            </View>
          ) : (
            <View style={styles.card}>
              <ThemedText type="smallBold" style={styles.eyebrow}>
                {business.name}
              </ThemedText>
              <ThemedText type="title">{event.title}</ThemedText>
              <ThemedText type="smallBold">
                {formatDate(event.starts_at, event.timezone)}
              </ThemedText>
              {event.ends_at && (
                <ThemedText themeColor="textSecondary">
                  Ends {formatDate(event.ends_at, event.timezone)}
                </ThemedText>
              )}
              <ThemedText>{event.description}</ThemedText>
              <View style={styles.fact}>
                <ThemedText type="smallBold">Location</ThemedText>
                <ThemedText themeColor="textSecondary">
                  {address || 'Location details coming soon'}
                </ThemedText>
              </View>
              <Link
                href={`${siteUrl}/b/${business.slug}` as never}
                style={styles.button}
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
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
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
    paddingBottom: BottomTabInset + Spacing.six,
  },
  card: {
    gap: Spacing.three,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCE2DE',
    padding: Spacing.four,
  },
  eyebrow: { color: '#176B4D', textTransform: 'uppercase' },
  fact: { gap: Spacing.one },
  link: { color: '#176B4D', fontWeight: '700' },
  button: {
    minHeight: 48,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
    color: '#FFFFFF',
    backgroundColor: '#176B4D',
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#BFCAC3',
    paddingHorizontal: 18,
    paddingVertical: 14,
    textAlign: 'center',
    overflow: 'hidden',
    fontWeight: '700',
  },
});
