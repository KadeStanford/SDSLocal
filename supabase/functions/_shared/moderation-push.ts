// Lock-screen payload deliberately excludes public reason, review text and private audit data.
export function moderationPushCopy(delivery: { id: string; moderation_outcome?: unknown }) {
  return delivery.moderation_outcome
    ? {
        title: 'Your Parish Pass moderation update',
        body: 'Open Alerts to read the outcome, reason and next steps.',
        url: `/notification?deliveryId=${delivery.id}`,
      }
    : null;
}
