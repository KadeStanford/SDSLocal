import { fail } from './square-security.ts';

export type ReviewModerationStatus = 'published' | 'hidden' | 'removed';
const reportReasons = new Set(['spam', 'abusive', 'private_information', 'inaccurate', 'other']);

export function parsePickupReview(rating: unknown, text: unknown) {
  if (typeof rating !== 'number' || !Number.isSafeInteger(rating) || rating < 1 || rating > 5)
    fail('INVALID_REVIEW', 'Choose a rating from 1 to 5 stars.');
  if (typeof text !== 'string' || text.trim().length > 1200)
    fail('INVALID_REVIEW', 'Your review must be 1,200 characters or less.');
  return { rating, text: text.trim() };
}

export function parseMerchantReviewReply(value: unknown) {
  if (typeof value !== 'string') fail('INVALID_REVIEW', 'Add a short reply.');
  const reply = value.trim();
  if (reply.length < 3 || reply.length > 1500)
    fail('INVALID_REVIEW', 'Your reply must be between 3 and 1,500 characters.');
  return reply;
}

export function parseReviewReport(reason: unknown, details: unknown) {
  if (typeof reason !== 'string' || !reportReasons.has(reason))
    fail('INVALID_REPORT', 'Choose a reason for reporting this review.');
  if (details !== undefined && details !== null && typeof details !== 'string')
    fail('INVALID_REPORT', 'Check the report details.');
  const note = typeof details === 'string' ? details.trim() : '';
  if (note.length > 500 || (note.length > 0 && note.length < 5))
    fail('INVALID_REPORT', 'Report details must be between 5 and 500 characters.');
  return { reason, details: note || null };
}
