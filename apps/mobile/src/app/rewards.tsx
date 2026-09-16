import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { readableTextColor } from '@/lib/color-contrast';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

interface WalletCard {
  membership_id: string;
  business_name: string;
  primary_color: string;
  program_name: string;
  reward_description: string;
  rewards_ready: number;
  progress_stamps: number;
  stamps_required: number;
}

interface SavedEvent {
  readonly id: string;
  readonly title: string;
  readonly starts_at: string;
  readonly address_text: string | null;
  readonly business: {
    readonly id: string;
    readonly name: string;
    readonly primary_color: string;
  };
}

export default function RewardsScreen() {
  const { session, loading: authLoading } = useAuth();
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [view, setView] = useState<'wallet' | 'events'>('wallet');
  const [selected, setSelected] = useState<WalletCard | null>(null);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSavedItems = useCallback(async () => {
    if (!session) {
      setCards([]);
      setSavedEvents([]);
      return;
    }
    setLoading(true);
    setMessage('');
    const [walletResult, eventsResult] = await Promise.all([
      supabase.rpc('get_loyalty_wallet'),
      supabase
        .from('event_saves')
        .select(
          'event_id, events!inner(id, title, starts_at, address_text, businesses!inner(id, name, primary_color))',
        )
        .eq('customer_id', session.user.id),
    ]);
    const firstError = walletResult.error ?? eventsResult.error;
    if (firstError) {
      setMessage(userMessageFromError(firstError, 'We could not load your saved items right now.'));
    } else {
      setCards((walletResult.data ?? []) as WalletCard[]);
      setSavedEvents(
        (eventsResult.data ?? []).flatMap((row) => {
          const event = Array.isArray(row.events) ? row.events[0] : row.events;
          if (!event) return [];
          const business = Array.isArray(event.businesses) ? event.businesses[0] : event.businesses;
          if (!business) return [];
          return [
            {
              id: event.id,
              title: event.title,
              starts_at: event.starts_at,
              address_text: event.address_text,
              business,
            } satisfies SavedEvent,
          ];
        }),
      );
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadSavedItems(), 0);
    return () => clearTimeout(timeout);
  }, [loadSavedItems]);

  async function removeSavedEvent(eventId: string) {
    if (!session) return;
    const previous = savedEvents;
    setSavedEvents((current) => current.filter((event) => event.id !== eventId));
    const { error } = await supabase
      .from('event_saves')
      .delete()
      .eq('event_id', eventId)
      .eq('customer_id', session.user.id);
    if (error) {
      setSavedEvents(previous);
      setMessage(userMessageFromError(error, 'We could not remove that saved event.'));
    }
  }

  useEffect(() => {
    if (!selected) return;
    let active = true;
    const refresh = async () => {
      const { data, error } = await supabase.functions.invoke('loyalty-token', {
        body: { membershipId: selected.membership_id },
      });
      if (!active) return;
      if (error || !data?.token) {
        setMessage(
          userMessageFromError(error, 'We could not create a rewards code. Please try again.'),
        );
      } else {
        setToken(data.token);
        setMessage('Show this rotating code to the staff member.');
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selected]);

  if (authLoading)
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  const selectedTextColor = selected ? readableTextColor(selected.primary_color) : '#FFFFFF';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadSavedItems} />}
        >
          <ThemedText type="title">Your saved items</ThemedText>
          <ThemedText themeColor="textSecondary">
            Rewards cards and upcoming events, together in one place.
          </ThemedText>
          {session && !selected && (
            <View accessibilityRole="radiogroup" style={styles.segmentedControl}>
              <SegmentButton
                label={`Rewards (${cards.length})`}
                selected={view === 'wallet'}
                onPress={() => setView('wallet')}
              />
              <SegmentButton
                label={`Saved events (${savedEvents.length})`}
                selected={view === 'events'}
                onPress={() => setView('events')}
              />
            </View>
          )}
          {!session ? (
            <View style={styles.notice}>
              <ThemedText style={styles.noticeText}>
                Sign in from Account to use rewards.
              </ThemedText>
            </View>
          ) : loading ? (
            <ActivityIndicator color={Brand.primary} />
          ) : view === 'events' && !selected ? (
            savedEvents.length ? (
              <View style={styles.cardList}>
                {savedEvents.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventDateBadge}>
                      <ThemedText style={styles.eventMonth} type="smallBold">
                        {new Date(event.starts_at).toLocaleDateString(undefined, {
                          month: 'short',
                        })}
                      </ThemedText>
                      <ThemedText style={styles.eventDay} type="subtitle">
                        {new Date(event.starts_at).getDate()}
                      </ThemedText>
                    </View>
                    <View style={styles.eventCopy}>
                      <ThemedText type="smallBold">{event.business.name}</ThemedText>
                      <ThemedText type="subtitle">{event.title}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {new Date(event.starts_at).toLocaleString()}
                      </ThemedText>
                      {!!event.address_text && (
                        <ThemedText themeColor="textSecondary" type="small">
                          {event.address_text}
                        </ThemedText>
                      )}
                      <Pressable onPress={() => void removeSavedEvent(event.id)}>
                        <ThemedText style={styles.removeText} type="smallBold">
                          Remove from saved
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.notice}>
                <ThemedText style={styles.noticeText} type="smallBold">
                  No saved events yet
                </ThemedText>
                <ThemedText style={styles.noticeText}>
                  Save an event from a business page and it will appear here.
                </ThemedText>
              </View>
            )
          ) : selected ? (
            <View style={[styles.detailCard, { backgroundColor: selected.primary_color }]}>
              <Pressable
                onPress={() => {
                  setSelected(null);
                  setToken('');
                }}
              >
                <ThemedText style={{ color: selectedTextColor }}>← All rewards</ThemedText>
              </Pressable>
              <ThemedText style={{ color: selectedTextColor }} type="subtitle">
                {selected.business_name}
              </ThemedText>
              <ThemedText style={{ color: selectedTextColor }} type="title">
                {selected.program_name}
              </ThemedText>
              <ThemedText style={{ color: selectedTextColor }}>
                {selected.reward_description}
              </ThemedText>
              <View style={styles.progressRow}>
                {Array.from({ length: selected.stamps_required }, (_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.stamp,
                      { borderColor: selectedTextColor },
                      index < selected.progress_stamps && {
                        backgroundColor: selectedTextColor,
                        opacity: 1,
                      },
                    ]}
                  />
                ))}
              </View>
              <ThemedText style={{ color: selectedTextColor }} type="smallBold">
                {selected.rewards_ready
                  ? `${selected.rewards_ready} reward ready`
                  : `${selected.progress_stamps} / ${selected.stamps_required} visits`}
              </ThemedText>
              <View style={styles.qrCard}>
                {token ? (
                  <QRCode value={token} size={245} />
                ) : (
                  <ActivityIndicator color="#176B4D" />
                )}
              </View>
              <ThemedText style={{ color: selectedTextColor }} type="small">
                {message}
              </ThemedText>
            </View>
          ) : cards.length ? (
            <View style={styles.cardList}>
              {cards.map((card) => {
                const textColor = readableTextColor(card.primary_color);
                return (
                  <Pressable
                    key={card.membership_id}
                    onPress={() => setSelected(card)}
                    style={[styles.walletCard, { backgroundColor: card.primary_color }]}
                  >
                    <ThemedText style={{ color: textColor }} type="smallBold">
                      {card.business_name}
                    </ThemedText>
                    <ThemedText style={{ color: textColor }} type="subtitle">
                      {card.program_name}
                    </ThemedText>
                    <ThemedText style={{ color: textColor }}>
                      {card.rewards_ready
                        ? 'Reward ready'
                        : `${card.progress_stamps} / ${card.stamps_required} visits`}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.notice}>
              <ThemedText style={styles.noticeText} type="smallBold">
                No rewards cards yet
              </ThemedText>
              <ThemedText style={styles.noticeText}>
                Join a program from a business page.
              </ThemedText>
            </View>
          )}
          {message && !selected && <ThemedText themeColor="textSecondary">{message}</ThemedText>}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}
    >
      <ThemedText style={selected ? styles.segmentTextSelected : undefined} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    padding: Spacing.four,
    paddingBottom: 130,
    gap: Spacing.two,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  notice: {
    marginTop: Spacing.three,
    borderRadius: 16,
    padding: Spacing.four,
    backgroundColor: '#E7F0EA',
    gap: Spacing.one,
  },
  noticeText: { color: '#164E38' },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(120,140,128,0.12)',
    padding: Spacing.one,
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
  },
  segmentButtonSelected: { backgroundColor: Brand.primary },
  segmentTextSelected: { color: Brand.onPrimary },
  cardList: { gap: Spacing.three, marginTop: Spacing.three },
  walletCard: { borderRadius: 22, padding: Spacing.four, minHeight: 150, gap: Spacing.two },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: Radius.large,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.10)',
  },
  eventDateBadge: {
    width: 58,
    minHeight: 68,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
    backgroundColor: Brand.primarySoft,
  },
  eventMonth: { color: Brand.primary, textTransform: 'uppercase' },
  eventDay: { color: Brand.primary },
  eventCopy: { flex: 1, gap: Spacing.one },
  removeText: { color: Brand.danger, paddingVertical: Spacing.one },
  detailCard: {
    borderRadius: 26,
    padding: Spacing.four,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  progressRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: Spacing.two },
  stamp: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    opacity: 0.45,
  },
  qrCard: {
    minHeight: 277,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: Spacing.two,
  },
});
