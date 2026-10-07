import { expect, it, vi } from 'vitest';
import {
  loadBusinessReviewSummaries,
  parseBusinessReviewSummary,
  businessRatingAccessibilityLabel,
} from './business-review-summary';

it('parses server numeric strings and represents a real zero separately from missing data', () => {
  expect(parseBusinessReviewSummary({ review_count: '3', average_rating: '4.7' })).toEqual({
    reviewCount: 3,
    averageRating: 4.7,
  });
  expect(parseBusinessReviewSummary({ review_count: '0', average_rating: '0' })).toEqual({
    reviewCount: 0,
    averageRating: 0,
  });
  for (const row of [
    null,
    {},
    { review_count: -1, average_rating: 4 },
    { review_count: 1, average_rating: 0 },
    { review_count: 0, average_rating: 5 },
    { review_count: 1.5, average_rating: 4 },
    { review_count: 1, average_rating: 6 },
  ])
    expect(parseBusinessReviewSummary(row)).toBeNull();
  expect(businessRatingAccessibilityLabel({ reviewCount: 3, averageRating: 4.7 })).toBe(
    '4.7 out of 5 stars, 3 reviews',
  );
  expect(businessRatingAccessibilityLabel({ reviewCount: 0, averageRating: 0 })).toBe(
    'No reviews yet',
  );
});
it('batches unique business IDs and ignores unrelated or malformed rows', async () => {
  const ids = Array.from({ length: 401 }, (_, i) => `business-${i}`);
  const fetch = vi.fn(async (batch: string[]) => ({
    data: [
      ...batch.map((business_id) => ({ business_id, review_count: '3', average_rating: '4.7' })),
      { business_id: 'unrequested', review_count: 5, average_rating: 5 },
      { business_id: batch[0], review_count: -1, average_rating: 2 },
    ],
    error: null,
  }));
  const summaries = await loadBusinessReviewSummaries([...ids, ids[0]!], fetch);
  expect(fetch.mock.calls.map(([batch]) => batch.length)).toEqual([200, 200, 1]);
  expect(summaries.size).toBe(401);
  expect(summaries.has('unrequested')).toBe(false);
  expect(summaries.get(ids[0]!)).toEqual({ reviewCount: 3, averageRating: 4.7 });
});
it('fails a summary read instead of producing fake zero ratings', async () => {
  await expect(
    loadBusinessReviewSummaries(['business'], async () => ({
      data: null,
      error: new Error('offline'),
    })),
  ).rejects.toThrow('Ratings unavailable');
  const fetch = vi.fn();
  expect((await loadBusinessReviewSummaries([], fetch)).size).toBe(0);
  expect(fetch).not.toHaveBeenCalled();
});
