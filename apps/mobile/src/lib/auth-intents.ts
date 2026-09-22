export const authIntentKinds = [
  'follow',
  'join_rewards',
  'event_reminder',
  'report_business',
  'report_event',
  'report_offering',
  'block_business',
  'create_business',
] as const;

export type AuthIntentKind = (typeof authIntentKinds)[number];

export interface CustomerAuthIntent {
  readonly kind: Exclude<AuthIntentKind, 'create_business'>;
  readonly businessId: string;
  readonly businessName: string;
  readonly targetId?: string;
  readonly targetName?: string;
}

export interface BusinessCreationAuthIntent {
  readonly kind: 'create_business';
}

export type AuthIntent = CustomerAuthIntent | BusinessCreationAuthIntent;

interface StoredAuthIntent {
  readonly intent: AuthIntent;
  readonly expiresAt: number;
}

export interface AuthIntentDestination {
  readonly pathname: '/explore' | '/account';
  readonly params:
    | {
        readonly businessId: string;
        readonly resumeAction: AuthIntentKind;
        readonly targetId?: string;
      }
    | { readonly startBusiness: '1' };
}

const storageKey = 'sds-local:customer-auth-intent';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxIntentAgeMs = 30 * 60 * 1000;

export function clearPendingAuthIntent(
  storage: Pick<Storage, 'removeItem'> = globalThis.localStorage,
) {
  storage.removeItem(storageKey);
}

function cleanLabel(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 160
    ? value.trim()
    : null;
}

export function parseCustomerAuthIntent(value: unknown): AuthIntent | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind === 'create_business') return { kind: 'create_business' };
  if (
    typeof candidate.kind !== 'string' ||
    !authIntentKinds.includes(candidate.kind as AuthIntentKind) ||
    typeof candidate.businessId !== 'string' ||
    !uuidPattern.test(candidate.businessId)
  ) {
    return null;
  }
  const businessName = cleanLabel(candidate.businessName);
  if (!businessName) return null;
  const needsTarget = ['event_reminder', 'report_event', 'report_offering'].includes(
    candidate.kind,
  );
  const targetId =
    typeof candidate.targetId === 'string' && uuidPattern.test(candidate.targetId)
      ? candidate.targetId
      : undefined;
  if (needsTarget && !targetId) return null;
  const targetName = cleanLabel(candidate.targetName) ?? undefined;
  return {
    kind: candidate.kind as CustomerAuthIntent['kind'],
    businessId: candidate.businessId,
    businessName,
    ...(targetId ? { targetId } : {}),
    ...(targetName ? { targetName } : {}),
  };
}

export function authIntentDestination(intent: AuthIntent): AuthIntentDestination {
  if (intent.kind === 'create_business') {
    return { pathname: '/account', params: { startBusiness: '1' } };
  }
  return {
    pathname: '/explore',
    params: {
      businessId: intent.businessId,
      resumeAction: intent.kind,
      ...(intent.targetId ? { targetId: intent.targetId } : {}),
    },
  };
}

export function authIntentExplanation(intent: AuthIntent) {
  switch (intent.kind) {
    case 'follow':
      return `Sign in to follow ${intent.businessName} and receive its updates.`;
    case 'join_rewards':
      return `Sign in to join ${intent.businessName}'s rewards program.`;
    case 'event_reminder':
      return `Sign in to save ${intent.targetName ?? 'this event'} and set a reminder.`;
    case 'report_business':
    case 'report_event':
    case 'report_offering':
      return 'Sign in to send this report to SDS Local for review.';
    case 'block_business':
      return `Sign in to block ${intent.businessName} from your discovery results.`;
    case 'create_business':
      return 'Create or sign in to an account, then continue listing your business.';
  }
}

export function savePendingAuthIntent(
  intent: AuthIntent,
  storage: Pick<Storage, 'setItem'> = globalThis.localStorage,
  now = Date.now(),
) {
  const parsed = parseCustomerAuthIntent(intent);
  if (!parsed) throw new Error('Invalid customer authentication intent.');
  storage.setItem(
    storageKey,
    JSON.stringify({ intent: parsed, expiresAt: now + maxIntentAgeMs } satisfies StoredAuthIntent),
  );
}

export function consumePendingAuthIntent(
  storage: Pick<Storage, 'getItem' | 'removeItem'> = globalThis.localStorage,
  now = Date.now(),
) {
  const serialized = storage.getItem(storageKey);
  storage.removeItem(storageKey);
  if (!serialized) return null;
  try {
    const stored = JSON.parse(serialized) as Partial<StoredAuthIntent>;
    if (typeof stored.expiresAt !== 'number' || stored.expiresAt < now) return null;
    return parseCustomerAuthIntent(stored.intent);
  } catch {
    return null;
  }
}

export function parseResumeIntent(
  params: Record<string, string | string[] | undefined>,
  businessName: string,
) {
  const businessId = Array.isArray(params.businessId) ? params.businessId[0] : params.businessId;
  const kind = Array.isArray(params.resumeAction) ? params.resumeAction[0] : params.resumeAction;
  const targetId = Array.isArray(params.targetId) ? params.targetId[0] : params.targetId;
  if (kind === 'create_business') return null;
  return parseCustomerAuthIntent({ kind, businessId, businessName, targetId });
}
