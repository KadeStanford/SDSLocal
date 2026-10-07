import { CustomerBrand } from '@/components/customer-brand';
import { FlowAvatar, FlowIdentity } from '@/components/flow-layout';
import { BackPill } from '@/components/back-pill';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MerchantButton,
  MerchantFilters,
  MerchantHeading,
  MerchantRow,
  MerchantRating,
  MerchantSheet,
  MerchantStatus,
  merchantStyles,
} from '@/components/merchant-ui';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { commerce } from '@/lib/square-commerce';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

interface EventReview {
  readonly id: string;
  readonly rating: number;
  readonly text: string;
  readonly merchantResponse: string | null;
  readonly moderationStatus: string;
  readonly createdAt: string;
}

interface AttendedEvent {
  readonly eventId: string;
  readonly businessId: string;
  readonly businessName: string;
  readonly title: string;
  readonly startsAt: string;
  readonly checkedInAt: string;
  readonly review: EventReview | null;
}

export default function MyEventReviewsScreen() {
  const { session } = useAuth();
  const colors = useMerchantTheme();
  const bottom = useScreenBottomPadding();
  const [events, setEvents] = useState<AttendedEvent[]>([]);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'reviewed'>('all');
  const generation = useRef(0),
    mutation = useRef(false);
  const activeScope = session?.user.id ?? '';
  const scopeRef = useRef(activeScope);
  scopeRef.current = activeScope;
  useEffect(() => {
    scopeRef.current = activeScope;
    return () => {
      scopeRef.current = '';
    };
  }, [activeScope]);
  useEffect(() => {
    setEvents([]);
    setRatings({});
    setTexts({});
    setSelectedId(null);
    return () => {
      generation.current++;
    };
  }, [session?.user.id]);

  const load = useCallback(async () => {
    const readGeneration = ++generation.current;
    if (!session) {
      setEvents([]);
      setError('Sign in to see events you attended.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await commerce<{ events: AttendedEvent[] }>('my_event_review_candidates', {});
      if (readGeneration !== generation.current) return;
      setEvents(result.events);
      setRatings((current) =>
        Object.fromEntries(
          result.events.map((event) => [event.eventId, current[event.eventId] ?? 5]),
        ),
      );
    } catch (cause) {
      if (readGeneration === generation.current)
        setError(userMessageFromError(cause, 'Your attended events could not load.'));
    } finally {
      if (readGeneration === generation.current) setLoading(false);
    }
  }, [session]);

  const pullRefresh = usePullRefresh(load);
  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        generation.current++;
      };
    }, [load]),
  );

  async function submit(event: AttendedEvent) {
    if (mutation.current || !session || event.review) return;
    const operationScope = scopeRef.current;
    mutation.current = true;
    setSavingId(event.eventId);
    setError('');
    setNotice('');
    try {
      await commerce('submit_event_review', {
        eventId: event.eventId,
        rating: ratings[event.eventId] ?? 5,
        text: texts[event.eventId] ?? '',
      });
      if (scopeRef.current !== operationScope) return;
      await load();
      if (scopeRef.current !== operationScope) return;
      setSelectedId(null);
      setNotice('Your verified event review was submitted.');
    } catch (cause) {
      if (scopeRef.current !== operationScope) return;
      setError(userMessageFromError(cause, 'Your event review could not be posted.'));
    } finally {
      mutation.current = false;
      if (scopeRef.current === operationScope) setSavingId(null);
    }
  }

  const selected = events.find((e) => e.eventId === selectedId);
  const visible = events.filter(
    (e) => filter === 'all' || (filter === 'needs-review' ? !e.review : !!e.review),
  );
  const options = (
    [
      { value: 'all', label: 'All' },
      { value: 'needs-review', label: 'To review' },
      { value: 'reviewed', label: 'Reviewed' },
    ] as const
  ).map((f) => ({
    ...f,
    count: events.filter(
      (e) => f.value === 'all' || (f.value === 'needs-review' ? !e.review : !!e.review),
    ).length,
  }));
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right']}
    >
      <FlatList
        data={visible}
        keyExtractor={(e) => e.eventId}
        contentContainerStyle={[merchantStyles.content, { paddingBottom: bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={colors.text}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <BackPill label="Back to Account" onPress={() => router.back()} />
            <CustomerBrand />
            <MerchantHeading title="Attended events" subtitle="Your verified event experiences" />
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton
                  label="Retry attended events"
                  secondary
                  onPress={() => void load()}
                />
              </>
            )}{' '}
            {!!notice && <StateNotice kind="success" message={notice} />}
            <MerchantFilters value={filter} options={options} onChange={setFilter} />
          </View>
        }
        renderItem={({ item }) => (
          <MerchantRow
            title={item.title}
            leading={<FlowAvatar name={item.businessName} />}
            subtitle={item.businessName + ' · ' + new Date(item.startsAt).toLocaleDateString()}
            detail={item.review?.text ?? ''}
            status={
              <MerchantStatus
                label={item.review ? 'Reviewed' : 'Ready to review'}
                tone={item.review ? 'success' : 'quiet'}
              />
            }
            onPress={() => setSelectedId(item.eventId)}
            label={(item.review ? 'Read review for ' : 'Review ') + item.title}
          />
        )}
        ListEmptyComponent={
          loading && !events.length ? (
            <ListLoading label="Loading attended events" rows={2} />
          ) : !error ? (
            <EmptyState
              title="No events here yet"
              message="Events appear after the business checks you in. Only verified attendees can review."
            />
          ) : null
        }
      />
      <MerchantSheet
        visible={!!selected}
        title={selected?.review ? 'Your event review' : 'Review your experience'}
        blocked={!!savingId}
        onClose={() => setSelectedId(null)}
        footer={
          selected && !selected.review ? (
            <MerchantButton
              label="Post verified review"
              loading={savingId === selected.eventId}
              disabled={loading || !!error || !session}
              onPress={() => void submit(selected)}
            />
          ) : undefined
        }
      >
        {selected && (
          <>
            <FlowIdentity name={selected.businessName} detail={selected.title} />
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton
                  label="Refresh review eligibility"
                  secondary
                  onPress={() => void load()}
                />
              </>
            )}
            {selected.review ? (
              <>
                <ThemedText accessibilityLabel={selected.review.rating + ' out of 5 stars'}>
                  {'★'.repeat(selected.review.rating)}
                  {'☆'.repeat(5 - selected.review.rating)}
                </ThemedText>
                {!!selected.review.text && <ThemedText>{selected.review.text}</ThemedText>}
                {selected.review.moderationStatus !== 'published' && (
                  <MerchantStatus label="Review is not currently public" tone="warning" />
                )}
                {!!selected.review.merchantResponse && (
                  <View
                    style={{
                      gap: 8,
                      paddingTop: 12,
                      borderTopWidth: 1,
                      borderTopColor: colors.border,
                    }}
                  >
                    <ThemedText type="smallBold">Business response</ThemedText>
                    <ThemedText>{selected.review.merchantResponse}</ThemedText>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={{ gap: 12 }}>
                  <ThemedText type="smallBold">How was your experience?</ThemedText>
                  <MerchantRating
                    value={ratings[selected.eventId] ?? 5}
                    disabled={!!savingId}
                    onChange={(rating) =>
                      setRatings((old) => ({ ...old, [selected.eventId]: rating }))
                    }
                  />
                </View>
                <View style={{ gap: 10 }}>
                  <ThemedText type="smallBold">Your review (optional)</ThemedText>
                  <TextInput
                    accessibilityLabel="Optional event review"
                    value={texts[selected.eventId] ?? ''}
                    onChangeText={(text) =>
                      setTexts((old) => ({ ...old, [selected.eventId]: text }))
                    }
                    placeholder="What would you like others to know?"
                    placeholderTextColor={colors.secondary}
                    editable={!savingId}
                    maxLength={1200}
                    multiline
                    textAlignVertical="top"
                    style={[
                      merchantStyles.input,
                      {
                        minHeight: 150,
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  />
                  <ThemedText type="small" style={{ color: colors.secondary }}>
                    Your review is public. Only verified attendance is shown.
                  </ThemedText>
                </View>
              </>
            )}
          </>
        )}
      </MerchantSheet>
    </SafeAreaView>
  );
}
