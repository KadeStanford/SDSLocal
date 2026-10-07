export type RequestFilter = 'new' | 'progress' | 'closed' | 'all';
export const requestStatusLabels: Record<string, string> = {
  new: 'New request',
  in_review: 'In review',
  contacted: 'Contacted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
export function requestMatches(status: string, filter: RequestFilter) {
  return (
    filter === 'all' ||
    (filter === 'new'
      ? status === 'new'
      : filter === 'progress'
        ? ['in_review', 'contacted'].includes(status)
        : ['completed', 'cancelled'].includes(status))
  );
}
export function requestActions(
  status: string,
): { label: string; status: 'in_review' | 'contacted' | 'completed' }[] {
  if (!['new', 'in_review', 'contacted'].includes(status)) return [];
  return [
    ...(status === 'new' ? [{ label: 'Start review', status: 'in_review' as const }] : []),
    ...(status !== 'contacted' ? [{ label: 'Mark contacted', status: 'contacted' as const }] : []),
    { label: 'Complete request', status: 'completed' as const },
  ];
}
export type ReviewFilter = 'all' | 'unanswered' | 'replied';
export function reviewKey(review: { id: string; source: string }) {
  return review.source + ':' + review.id;
}
export function reviewMatches(response: string | null, filter: ReviewFilter) {
  return filter === 'all' || (filter === 'unanswered' ? !response : !!response);
}
