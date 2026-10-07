import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { supabase } from './supabase';

const visitorKey = 'sds-local:analytics-visitor:v1';
let visitorIdPromise: Promise<string> | null = null;

async function getVisitorId() {
  if (!visitorIdPromise) {
    visitorIdPromise = (async () => {
      try {
        const existing = await SecureStore.getItemAsync(visitorKey);
        if (existing) return existing;
        const created = Crypto.randomUUID();
        await SecureStore.setItemAsync(visitorKey, created);
        return created;
      } catch {
        // Analytics is optional. If secure storage is unavailable, use an
        // ephemeral token instead of writing an identifier to weaker storage.
        return Crypto.randomUUID();
      }
    })();
  }
  return visitorIdPromise;
}

export type PublicBusinessAnalyticsEvent =
  | 'page_view'
  | 'qr_scan'
  | 'offering_view'
  | 'event_view'
  | 'phone_click'
  | 'directions_click'
  | 'social_click';

export function recordBusinessAnalyticsEvent(
  businessId: string,
  eventName: PublicBusinessAnalyticsEvent,
  options: { source?: string | null; subjectId?: string | null } = {},
) {
  void getVisitorId()
    .then((visitorId) =>
      supabase.rpc('record_business_analytics_event', {
        p_business_id: businessId,
        p_event_name: eventName,
        p_visitor_id: visitorId,
        p_source: options.source ?? null,
        p_subject_id: options.subjectId ?? null,
      }),
    )
    .catch(() => {
      // Never interrupt browsing because optional aggregate analytics failed.
    });
}
