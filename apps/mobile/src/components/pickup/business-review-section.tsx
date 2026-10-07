import { RatingLabel } from '@/components/rating-label';
import { savePendingAuthIntent } from '@/lib/auth-intents';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { router } from 'expo-router';
import { AppButton } from '@/components/app-button';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';
import { supabase } from '@/lib/supabase';
import { BusinessRating } from '@/components/business-rating';
import type { BusinessReviewSummary } from '@/lib/business-review-summary';
import { BusinessPreviewCarousel, BusinessPreviewSection } from '../business-preview-section';

interface PublicPickupReview {
  id: string;
  source: 'order' | 'event';
  event_title?: string | null;
  reviewer_initials?: string | null;
  rating: number;
  review_text: string;
  merchant_response: string | null;
  created_at: string;
}

const reportReasons = [
  ['spam', 'Spam or copied content'],
  ['abusive', 'Abusive or inappropriate'],
  ['private_information', 'Private information'],
  ['inaccurate', 'Not about a real visit'],
  ['other', 'Something else'],
] as const;

export function BusinessReviewSection({
  businessId,
  preview = false,
  summary,
  summaryError = false,
  layout = 'full',
  onSeeAll,
  hideHeading = false,
  resumeReportId,
  businessName = 'this business',
}: {
  businessId: string;
  businessName?: string;
  resumeReportId?: string | undefined;
  preview?: boolean;
  summary?: BusinessReviewSummary | null;
  summaryError?: boolean;
  layout?: 'full' | 'carousel';
  hideHeading?: boolean;
  onSeeAll?: () => void;
}) {
  const c = useTheme();
  const { session } = useAuth();
  const [reviews, setReviews] = useState<PublicPickupReview[]>([]);
  const reviewCount = summary?.reviewCount ?? 0;
  const [loading, setLoading] = useState(true);
  const [reviewLimit, setReviewLimit] = useState(5);
  const [error, setError] = useState('');
  const [reportId, setReportId] = useState<string | null>(resumeReportId ?? null);
  const [reason, setReason] = useState<(typeof reportReasons)[number][0] | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    if (preview) {
      return () => {
        active = false;
      };
    }
    void (async () => {
      const loaded: PublicPickupReview[] = [];
      let missingRpc = false;
      for (let offset = 0; offset < reviewLimit; offset += 100) {
        const result = await supabase.rpc('get_public_business_reviews', {
          p_business_id: businessId,
          p_limit: Math.min(100, reviewLimit - offset),
          p_offset: offset,
        });
        if (result.error) {
          if (result.error.code !== 'PGRST202') throw result.error;
          missingRpc = true;
          break;
        }
        loaded.push(...(result.data as PublicPickupReview[]));
        if (!active || result.data.length < Math.min(100, reviewLimit - offset)) break;
      }
      if (!missingRpc) {
        if (active) {
          setReviews(loaded);
          setError('');
          setLoading(false);
        }
        return;
      }
      // Older backends retain the existing safe public projection during rollout.
      return Promise.all([
        supabase
          .from('pickup_order_reviews')
          .select('id,rating,review_text,merchant_response,created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(reviewLimit),
        supabase
          .from('verified_event_reviews')
          .select('id,event_id,rating,review_text,merchant_response,created_at,events(title)')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(reviewLimit),
      ]).then(([reviewResult, eventReviewResult]) => {
        if (!active) return;
        if (reviewResult.error || eventReviewResult.error) {
          setError('Reviews could not be loaded.');
        } else {
          const orderReviews = (reviewResult.data ?? []).map((review) => ({
            ...review,
            source: 'order' as const,
          }));
          const eventReviews = (eventReviewResult.data ?? []).map((review) => {
            const event = Array.isArray(review.events) ? review.events[0] : review.events;
            return { ...review, source: 'event' as const, event_title: event?.title ?? null };
          });
          setReviews(
            [...orderReviews, ...eventReviews]
              .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
              .slice(0, reviewLimit) as PublicPickupReview[],
          );
        }
        setLoading(false);
      });
    })().catch(() => {
      if (active) {
        setError('Reviews could not be loaded.');
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [businessId, preview, reviewLimit]);

  async function submitReport() {
    if (!reportId || !reason || !session || sending) return;
    setSending(true);
    setNotice('');
    try {
      const { data, error: reportError } = await supabase.rpc(
        reviews.find((review) => review.id === reportId)?.source === 'event'
          ? 'report_verified_event_review'
          : 'report_pickup_order_review',
        {
          p_review_id: reportId,
          p_reason: reason,
          p_details: details.trim() || null,
        },
      );
      if (reportError) throw reportError;
      setReportedIds((old) => new Set(old).add(reportId));
      setNotice(data === false ? 'You already reported this review.' : 'Report sent to Parish Pass.');
      setReportId(null);
      setReason(null);
      setDetails('');
    } catch {
      setNotice('The report could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  }

  if (
    preview ||
    (loading && !reviews.length) ||
    (!loading && !reviewCount && !reviews.length && !error && !summaryError)
  )
    return null;
  if (layout === 'carousel')
    return (
      <BusinessPreviewSection
        title="Customer reviews"
        action="See all"
        onSeeAll={onSeeAll ?? (() => {})}
      >
        {summary && <BusinessRating summary={summary} />}
        {!!error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
        <BusinessPreviewCarousel label="Customer reviews" count={reviews.length} width={280}>
          {reviews.map((review) => (
            <Pressable
              key={`${review.source}:${review.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Read review, ${review.rating} out of 5 stars`}
              onPress={onSeeAll}
              style={({ pressed }) => ({
                width: 280,
                minHeight: 210,
                padding: 16,
                gap: 12,
                borderWidth: 1,
                borderColor: c.divider,
                borderRadius: 18,
                backgroundColor: c.backgroundElement,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <ReviewIdentity review={review} />
              <ThemedText type="small" numberOfLines={4} style={{ flex: 1, lineHeight: 22 }}>
                {review.review_text || 'This customer left a rating.'}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                {review.source === 'event' ? 'Verified event guest' : 'Verified pickup order'}
                {review.merchant_response ? ' · Business replied' : ''}
              </ThemedText>
            </Pressable>
          ))}
        </BusinessPreviewCarousel>
      </BusinessPreviewSection>
    );
  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 3 }}>
        {!hideHeading && <ThemedText type="subtitle">Customer reviews</ThemedText>}
        {summary && <BusinessRating summary={summary} />}
        {summaryError && (
          <ThemedText type="small" themeColor="textSecondary">
            Rating summary is temporarily unavailable.
          </ThemedText>
        )}
      </View>
      {!!error && <ThemedText themeColor="textSecondary">{error}</ThemedText>}
      {reviews.map((review) => (
        <View
          key={review.id}
          style={{
            gap: 14,
            borderWidth: 1,
            borderColor: c.divider,
            padding: 16,
            borderRadius: 18,
            backgroundColor: c.background,
          }}
        >
          <ReviewIdentity review={review} />
          <View style={{ gap: 3, minWidth: 0 }}>
            <ThemedText type="caption" themeColor="textSecondary">
              {review.source === 'event' ? 'Verified event attendance' : 'Verified order'}
            </ThemedText>
            {review.source === 'event' && !!review.event_title && (
              <ThemedText type="small" style={{ flexShrink: 1 }}>
                {review.event_title}
              </ThemedText>
            )}
          </View>
          {!!review.review_text && <ThemedText>{review.review_text}</ThemedText>}
          {review.merchant_response && (
            <View
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: c.backgroundSelected,
                gap: 6,
              }}
            >
              <ThemedText type="smallBold">Business response</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {review.merchant_response}
              </ThemedText>
            </View>
          )}
          {session && (
            <AppButton
              label={reportedIds.has(review.id) ? 'Reported' : 'Report review'}
              variant="tertiary"
              disabled={reportedIds.has(review.id)}
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
              onPress={() => setReportId(review.id)}
            />
          )}
          {!session && (
            <AppButton
              label="Sign in to report"
              variant="tertiary"
              style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }}
              onPress={() => { savePendingAuthIntent({ kind: 'report_review', businessId, businessName, targetId: review.id }); router.push('/account' as never); }}
            />
          )}
        </View>
      ))}
      {reviews.length < reviewCount && (
        <AppButton
          label="Load more reviews"
          variant="secondary"
          loading={loading}
          disabled={loading}
          onPress={() => {
            setLoading(true);
            setReviewLimit((limit) => limit + 10);
          }}
        />
      )}
      {!!notice && (
        <ThemedText type="small" themeColor="textSecondary">
          {notice}
        </ThemedText>
      )}
      <Modal
        visible={Boolean(reportId)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setReportId(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, backgroundColor: c.background }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 14 }}
            keyboardShouldPersistTaps="handled"
          >
            <ThemedText type="title">Report this review</ThemedText>
            <ThemedText themeColor="textSecondary">
              Your report goes privately to Parish Pass for moderation.
            </ThemedText>
            {reportReasons.map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === key }}
                onPress={() => setReason(key)}
                style={{
                  minHeight: 48,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  borderWidth: 1,
                  borderColor: reason === key ? c.accent : c.divider,
                  borderRadius: 12,
                }}
              >
                <ThemedText type="smallBold">{label}</ThemedText>
              </Pressable>
            ))}
            <TextInput
              accessibilityLabel="Optional report details"
              value={details}
              onChangeText={setDetails}
              placeholder="Add context (optional)"
              placeholderTextColor={c.textSecondary}
              maxLength={500}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 84,
                padding: 12,
                borderRadius: 12,
                backgroundColor: c.backgroundElement,
                color: c.text,
                fontSize: 16,
              }}
            />
            <AppButton
              label="Send report"
              loading={sending}
              disabled={!reason || sending}
              onPress={() => void submitReport()}
            />
            <AppButton
              label="Cancel"
              variant="tertiary"
              disabled={sending}
              onPress={() => setReportId(null)}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function ReviewIdentity({ review }: { review: PublicPickupReview }) {
  const c = useTheme();
  const initials = review.reviewer_initials?.trim() || '';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        accessible={false}
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: c.backgroundSelected,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ThemedText type="smallBold" themeColor="accent">
          {initials || '•'}
        </ThemedText>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <ThemedText type="smallBold">
          {initials ? Array.from(initials).join('. ') + '.' : 'Customer'}
        </ThemedText>
        <ThemedText type="caption" themeColor="textSecondary">
          {new Date(review.created_at).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </ThemedText>
      </View>
      <View
        style={{
          borderRadius: 10,
          paddingVertical: 6,
          paddingHorizontal: 8,
          backgroundColor: c.backgroundSelected,
        }}
      >
        <RatingLabel rating={review.rating} />
      </View>
    </View>
  );
}
