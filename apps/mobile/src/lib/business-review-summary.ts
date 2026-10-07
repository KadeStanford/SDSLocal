export interface BusinessReviewSummary {
  readonly reviewCount: number;
  readonly averageRating: number;
}

export function businessRatingAccessibilityLabel(summary: BusinessReviewSummary) {
  return summary.reviewCount > 0
    ? `${summary.averageRating.toFixed(1)} out of 5 stars, ${summary.reviewCount} ${summary.reviewCount === 1 ? 'review' : 'reviews'}`
    : 'No reviews yet';
}

/** An unavailable/invalid response must not become an invented zero-review rating. */
export function parseBusinessReviewSummary(value: unknown): BusinessReviewSummary | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (row.review_count == null || row.average_rating == null) return null;
  const reviewCount = Number(row.review_count),
    averageRating = Number(row.average_rating);
  if (!Number.isSafeInteger(reviewCount) || reviewCount < 0 || !Number.isFinite(averageRating))
    return null;
  if (
    (reviewCount === 0 && averageRating !== 0) ||
    (reviewCount > 0 && (averageRating < 1 || averageRating > 5))
  )
    return null;
  return { reviewCount, averageRating };
}

export async function loadBusinessReviewSummaries(
  ids: readonly string[],
  fetchBatch: (ids: string[]) => Promise<{ data: unknown; error: unknown }>,
): Promise<Map<string, BusinessReviewSummary>> {
  const unique = [...new Set(ids)];
  const result = new Map<string, BusinessReviewSummary>();
  for (let offset = 0; offset < unique.length; offset += 200) {
    const batch = unique.slice(offset, offset + 200);
    const response = await fetchBatch(batch);
    if (response.error || !Array.isArray(response.data)) throw new Error('Ratings unavailable');
    for (const value of response.data) {
      const row = value as Record<string, unknown>;
      const summary = parseBusinessReviewSummary(row);
      if (summary && typeof row.business_id === 'string' && batch.includes(row.business_id))
        result.set(row.business_id, summary);
    }
  }
  return result;
}
