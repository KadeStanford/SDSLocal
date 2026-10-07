import { Platform } from 'react-native';
import { Fonts } from '@/constants/theme';
import { RatingLabel } from '@/components/rating-label';
import { FocusedHeader, ReviewStars } from '@/components/focused-page-ui';
import { AppIcon } from '@/components/app-icon';
import { Pressable } from 'react-native';
import { CustomerBrand } from '@/components/customer-brand';
import { FlowAvatar, FlowIdentity } from '@/components/flow-layout';
import { BackPill } from '@/components/back-pill';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { isOutcomeId } from '@sds/business-logic';
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

const focusedFont = Platform.OS === 'web' ? 'system-ui' : Fonts.sans;

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
  const params = useLocalSearchParams<{ eventId?: string }>();
  const initialEventId = isOutcomeId(params.eventId) ? params.eventId : null;
  const initialFocus = useRef<string | null>(null);
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
  useLayoutEffect(() => {
    scopeRef.current = activeScope;
    return () => {
      scopeRef.current = '';
    };
  }, [activeScope]);
  const [previousScope, setPreviousScope] = useState(activeScope);
  if (previousScope !== activeScope) {
    setPreviousScope(activeScope);
    setEvents([]);
    setRatings({});
    setTexts({});
    setSelectedId(null);
  }
  useEffect(
    () => () => {
      generation.current++;
    },
    [activeScope],
  );
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

  useEffect(() => {
    if (
      !session ||
      loading ||
      !initialEventId ||
      initialFocus.current === `${session.user.id}:${initialEventId}`
    )
      return;
    if (events.some((event) => event.eventId === initialEventId)) {
      setSelectedId(initialEventId);
      initialFocus.current = `${session.user.id}:${initialEventId}`;
    }
  }, [session?.user.id, loading, events, initialEventId]);
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
            <FocusedHeader
              title="Attended events"
              subtitle="Keep your experiences close. Share a review after your visit."
              onBack={() => (router.canGoBack() ? router.back() : router.replace('/account'))}
              backLabel="Back to Account"
            />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { label: 'To review', count: events.filter((e) => !e.review).length },
                { label: 'Reviewed', count: events.filter((e) => e.review).length },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    padding: 16,
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    gap: 4,
                  }}
                >
                  <ThemedText
                    style={{
                      fontFamily: focusedFont,
                      fontSize: 26,
                      lineHeight: 32,
                      fontWeight: '700',
                    }}
                  >
                    {stat.count}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {stat.label}
                  </ThemedText>
                </View>
              ))}
            </View>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={(item.review ? 'Read review for ' : 'Review ') + item.title}
            onPress={() => setSelectedId(item.eventId)}
            style={({ pressed }) => ({
              padding: 18,
              gap: 16,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              <View
                style={{
                  width: 58,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 14,
                  backgroundColor: colors.background,
                  gap: 2,
                }}
              >
                <ThemedText type="smallBold">
                  {new Date(item.startsAt).toLocaleDateString(undefined, { month: 'short' })}
                </ThemedText>
                <ThemedText
                  style={{
                    fontFamily: focusedFont,
                    fontSize: 24,
                    lineHeight: 29,
                    fontWeight: '700',
                  }}
                >
                  {new Date(item.startsAt).getDate()}
                </ThemedText>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
                <ThemedText
                  style={{
                    fontFamily: focusedFont,
                    fontSize: 19,
                    lineHeight: 25,
                    fontWeight: '700',
                  }}
                >
                  {item.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.businessName}
                </ThemedText>
                <MerchantStatus
                  label={item.review ? 'Reviewed' : 'Verified attendance'}
                  tone="success"
                />
              </View>
            </View>
            {item.review ? (
              <>
                <ReviewStars rating={item.review.rating} />
                {!!item.review.text && (
                  <ThemedText numberOfLines={3}>{item.review.text}</ThemedText>
                )}
              </>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                How was your experience? Your review helps other neighbors decide.
              </ThemedText>
            )}
            <View
              style={{
                paddingTop: 14,
                borderTopWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <ThemedText type="smallBold">
                {item.review ? 'View your review' : 'Write a review'}
              </ThemedText>
              <AppIcon name="chevron-right" size={20} />
            </View>
          </Pressable>
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
                <RatingLabel rating={selected.review.rating} />
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
