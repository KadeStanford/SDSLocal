/** Public outcome presentation contract. Ownership and current state come from the authenticated RPC. */
export interface ModerationOutcomeView {
  id: string;
  title: string;
  created_at: string;
  read_at: string | null;
  outcome: {
    schema_version: 1;
    kind: 'business' | 'content_report' | 'pickup_review' | 'event_review';
    action: string;
    business_id: string;
    resource_type: 'business' | 'event' | 'offering_item' | 'pickup_review' | 'event_review';
    resource_id: string;
    public_reason: string;
    summary: string;
    next_step: string;
    decision_sequence: number;
  };
  current_state: string;
  current_review_text: string | null;
  is_latest: boolean;
  quick_action: { label: string; app_path: string; web_path: string; mutates: false; requires_confirmation: false } | null;
}
export const isOutcomeId = (value: unknown): value is string =>
  typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function isSafeModerationAppPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.hash) return false;
    const keys = [...url.searchParams.keys()];
    if (new Set(keys).size !== keys.length) return false;
    if (url.pathname === '/business') return keys.every(k => ['id', 'section', 'itemId'].includes(k)) &&
      isOutcomeId(url.searchParams.get('id')) && ['review', 'events', 'offerings', 'profile'].includes(url.searchParams.get('section') ?? '') &&
      (!url.searchParams.has('itemId') || isOutcomeId(url.searchParams.get('itemId')));
    if (url.pathname === '/order') return keys.length === 1 && keys[0] === 'orderId' && isOutcomeId(url.searchParams.get('orderId'));
    if (url.pathname === '/my-event-reviews') return keys.length === 1 && keys[0] === 'eventId' && isOutcomeId(url.searchParams.get('eventId'));
    return false;
  } catch { return false; }
}
export function isSafeModerationWebPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
  try {
    const url = new URL(value, 'https://internal.invalid');
    if (url.origin !== 'https://internal.invalid' || url.search) return false;
    const business = url.pathname.match(/^\/account\/businesses\/([^/]+)\/settings$/);
    if (business) return isOutcomeId(business[1]) && url.hash === '#readiness';
    const detail = url.pathname.match(/^\/account\/moderation\/([^/]+)$/);
    return !!detail && isOutcomeId(detail[1]) && !url.hash;
  } catch { return false; }
}
export function parseModerationOutcome(value: unknown): ModerationOutcomeView | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>, o = v.outcome as Record<string, unknown> | null;
  const text = (s: unknown): s is string => typeof s === 'string' && s.length <= 10000;
  if (!isOutcomeId(v.id) || !text(v.title) || !text(v.created_at) || !o || o.schema_version !== 1 ||
      !['business','content_report','pickup_review','event_review'].includes(String(o.kind)) ||
      !['business','event','offering_item','pickup_review','event_review'].includes(String(o.resource_type)) ||
      !isOutcomeId(o.business_id) || !isOutcomeId(o.resource_id) || !text(o.action) ||
      !text(o.public_reason) || !text(o.summary) || !text(o.next_step) ||
      !Number.isInteger(o.decision_sequence) || !text(v.current_state) || typeof v.is_latest !== 'boolean' ||
      !(v.current_review_text == null || text(v.current_review_text))) return null;
  const q = v.quick_action as Record<string, unknown> | null;
  const quick = q && text(q.label) && q.mutates === false && q.requires_confirmation === false &&
    isSafeModerationAppPath(q.app_path) && isSafeModerationWebPath(q.web_path)
    ? {label:q.label,app_path:q.app_path,web_path:q.web_path,mutates:false as const,requires_confirmation:false as const} : null;
  return {id:v.id,title:v.title,created_at:v.created_at,read_at:text(v.read_at)?v.read_at:null,
    outcome:{schema_version:1,kind:o.kind as ModerationOutcomeView['outcome']['kind'],action:o.action,business_id:o.business_id,
      resource_type:o.resource_type as ModerationOutcomeView['outcome']['resource_type'],resource_id:o.resource_id,
      public_reason:o.public_reason,summary:o.summary,next_step:o.next_step,decision_sequence:o.decision_sequence as number},
    current_state:v.current_state,current_review_text:text(v.current_review_text)?v.current_review_text:null,is_latest:v.is_latest,quick_action:quick};
}
