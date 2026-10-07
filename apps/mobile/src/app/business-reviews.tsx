import { BusinessScreenHeader } from '@/components/business-screen-header';
import { FlowIdentity, FlowSection } from '@/components/flow-layout';
import { BackPill } from '@/components/back-pill';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppChrome } from '@/components/app-chrome';
import { EmptyState, ListLoading, StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import {
  MerchantButton,
  MerchantFilters,
  MerchantSearch,
  MerchantSheet,
  MerchantStatus,
  merchantStyles,
} from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { reviewKey, reviewMatches, type ReviewFilter } from '@/lib/merchant-inbox';
import { saveBusinessReviewReply } from '@/lib/business-review-reply';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
interface MerchantReview {
  id: string;
  source: 'order' | 'event';
  orderId: string | null;
  eventId: string | null;
  eventTitle: string | null;
  rating: number;
  text: string;
  merchantResponse: string | null;
  moderationStatus: string;
  createdAt: string;
}

export default function BusinessReviewsScreen() {
  const { businessId } = useLocalSearchParams<{ businessId?: string }>();
  const { session, loading: authLoading } = useAuth();
  const { mode, loading: modeLoading } = useAppMode();
  const c = useMerchantTheme();
  const bottom = useScreenBottomPadding(false);
  const [reviews, setReviews] = useState<MerchantReview[]>([]),
    [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true),
    [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<ReviewFilter>('all'),
    [search, setSearch] = useState(''),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const generation = useRef(0),
    mutation = useRef(false);
  const activeScope = `${session?.user.id ?? ''}:${businessId ?? ''}:${mode}`;
  const scopeRef = useRef(activeScope);
  scopeRef.current = activeScope;
  useEffect(() => {
    scopeRef.current = activeScope;
    return () => {
      scopeRef.current = '';
    };
  }, [activeScope]);
  useEffect(() => {
    setSavingId(null);
    setNotice('');
    setSelectedId(null);
    setReviews([]);
    setDrafts({});
    return () => {
      generation.current++;
    };
  }, [businessId, session?.user.id, mode]);
  const load = useCallback(async () => {
    const readGeneration = ++generation.current;
    if (!businessId || !session || mode !== 'business') {
      setError('Sign in to the business workspace to view reviews.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data, error: readError } = await supabase.rpc('get_business_reviews', {
        p_business_id: businessId,
      });
      if (readError) throw readError;
      const result = data as { reviews: MerchantReview[] };
      if (!result || !Array.isArray(result.reviews)) throw new Error('Invalid review response');
      if (readGeneration !== generation.current) return;
      setReviews(result.reviews);
    } catch (cause) {
      if (readGeneration === generation.current)
        setError(userMessageFromError(cause, 'Customer reviews could not load.'));
    } finally {
      if (readGeneration === generation.current) setLoading(false);
    }
  }, [businessId, session, mode]);
  const pullRefresh = usePullRefresh(load);
  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !modeLoading) void load();
      return () => {
        generation.current++;
      };
    }, [authLoading, modeLoading, load]),
  );
  const selected = reviews.find((r) => reviewKey(r) === selectedId);
  const response = selected ? (drafts[reviewKey(selected)] ?? selected.merchantResponse ?? '') : '';
  async function saveReply(review: MerchantReview) {
    if (mutation.current || !businessId || !session || mode !== 'business') return;
    const key = reviewKey(review),
      text = (drafts[key] ?? review.merchantResponse ?? '').trim();
    if (text.length < 3 || text.length > 1500) return;
    const operationScope = scopeRef.current;
    mutation.current = true;
    setSavingId(key);
    setError('');
    setNotice('');
    try {
      const saved = await saveBusinessReviewReply({
        businessId,
        reviewId: review.id,
        source: review.source,
        response: text,
      });
      if (scopeRef.current !== operationScope) return;
      setReviews((old) =>
        old.map((r) =>
          reviewKey(r) === key ? { ...r, merchantResponse: saved.merchantResponse } : r,
        ),
      );
      setDrafts((old) => {
        const next = { ...old };
        delete next[key];
        return next;
      });
      setSelectedId(null);
      setNotice('Your public response was saved.');
      await load();
      if (scopeRef.current !== operationScope) return;
    } catch (cause) {
      if (scopeRef.current !== operationScope) return;
      setError(
        userMessageFromError(cause, 'Your response could not be saved. Your draft is still here.'),
      );
    } finally {
      mutation.current = false;
      if (scopeRef.current === operationScope) setSavingId(null);
    }
  }
  const query = search.trim().toLocaleLowerCase();
  const visible = reviews.filter(
    (r) =>
      reviewMatches(r.merchantResponse, filter) &&
      [r.text, r.eventTitle ?? '', r.merchantResponse ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(query),
  );
  const filters = (
    [
      { value: 'all', label: 'All' },
      { value: 'unanswered', label: 'Needs reply' },
      { value: 'replied', label: 'Replied' },
    ] as const
  ).map((f) => ({
    ...f,
    count: reviews.filter((r) => reviewMatches(r.merchantResponse, f.value)).length,
  }));
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: c.background }}
    >
      <FlatList
        data={visible}
        keyExtractor={reviewKey}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[merchantStyles.content, { paddingBottom: bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={pullRefresh.refreshing}
            onRefresh={pullRefresh.onRefresh}
            tintColor={c.text}
          />
        }
        ListHeaderComponent={
          <View style={{ gap: 20 }}>
            <AppChrome />
            <BackPill label="Back to business" onPress={() => router.back()} />
            <BusinessScreenHeader
              title="Customer reviews"
              subtitle="Verified orders and event attendance"
            />
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton label="Retry reviews" secondary onPress={() => void load()} />
              </>
            )}{' '}
            {!!notice && <StateNotice kind="success" message={notice} />}
            <MerchantSearch value={search} onChange={setSearch} placeholder="Search reviews" />
            <MerchantFilters value={filter} options={filters} onChange={setFilter} />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={'Open ' + item.rating + ' star ' + item.source + ' review'}
            onPress={() => {
              setNotice('');
              setSelectedId(reviewKey(item));
            }}
            style={({ pressed }) => ({
              padding: 18,
              gap: 14,
              marginTop: 14,
              borderRadius: 18,
              backgroundColor: c.surface,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <ThemedText
                accessibilityLabel={item.rating + ' out of 5 stars'}
                style={{ color: c.success, fontSize: 19 }}
              >
                {'★'.repeat(item.rating)}
                {'☆'.repeat(5 - item.rating)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </ThemedText>
            </View>
            <ThemedText type="smallBold">
              {item.source === 'event'
                ? item.eventTitle || 'Verified event attendance'
                : 'Verified order'}
            </ThemedText>
            <ThemedText numberOfLines={4}>{item.text || 'Rating only'}</ThemedText>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <MerchantStatus
                label={item.merchantResponse ? 'Replied' : 'Needs reply'}
                tone={item.merchantResponse ? 'success' : 'warning'}
              />
              <ThemedText type="smallBold">
                {item.merchantResponse ? 'View response ›' : 'Reply ›'}
              </ThemedText>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading && !reviews.length ? (
            <ListLoading label="Loading customer reviews" />
          ) : !error ? (
            <EmptyState
              title={
                search
                  ? 'No matching reviews'
                  : filter === 'unanswered'
                    ? 'No reviews awaiting a reply'
                    : 'No reviews here yet'
              }
              message="Verified reviews appear after completed orders and checked-in events."
            />
          ) : null
        }
      />
      <MerchantSheet
        visible={!!selected}
        title={selected?.merchantResponse ? 'Review & response' : 'Reply to review'}
        blocked={!!savingId}
        onClose={() => setSelectedId(null)}
        footer={
          selected ? (
            <MerchantButton
              label={selected.merchantResponse ? 'Update public response' : 'Post public response'}
              loading={savingId === selectedId}
              disabled={
                loading ||
                !!error ||
                response.trim().length < 3 ||
                response.trim() === selected.merchantResponse
              }
              onPress={() => void saveReply(selected)}
            />
          ) : undefined
        }
      >
        {selected && (
          <>
            <FlowSection title={'★ ' + selected.rating + ' / 5'}>
              <FlowIdentity
                name="Verified customer"
                detail={selected.source === 'event' ? 'Attended this event' : 'Completed an order'}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {new Date(selected.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </ThemedText>
            </FlowSection>
            {!!selected.eventTitle && (
              <ThemedText type="small" style={{ color: c.secondary }}>
                {selected.eventTitle}
              </ThemedText>
            )}
            <ThemedText>
              {selected.text || 'This customer left a rating without a written review.'}
            </ThemedText>
            {selected.moderationStatus !== 'published' && (
              <MerchantStatus label="Review is not currently public" tone="warning" />
            )}
            {!!error && (
              <>
                <StateNotice kind="error" message={error} />
                <MerchantButton
                  label="Refresh review status"
                  secondary
                  onPress={() => void load()}
                />
              </>
            )}
            <View style={{ gap: 10 }}>
              <ThemedText type="smallBold">Your public response</ThemedText>
              <ThemedText type="small" style={{ color: c.secondary }}>
                Customers can see this response. Keep personal and order details private.
              </ThemedText>
              <TextInput
                accessibilityLabel="Public business response"
                placeholder="Write a thoughtful response"
                placeholderTextColor={c.secondary}
                value={response}
                editable={!savingId}
                onChangeText={(value) =>
                  setDrafts((old) => ({ ...old, [reviewKey(selected)]: value }))
                }
                maxLength={1500}
                multiline
                textAlignVertical="top"
                style={[
                  merchantStyles.input,
                  {
                    minHeight: 150,
                    color: c.text,
                    backgroundColor: c.background,
                    borderColor: c.border,
                  },
                ]}
              />
              <ThemedText type="caption" style={{ color: c.secondary }}>
                {response.length}/1500 · Draft stays here until you post
              </ThemedText>
            </View>
          </>
        )}
      </MerchantSheet>
    </SafeAreaView>
  );
}
