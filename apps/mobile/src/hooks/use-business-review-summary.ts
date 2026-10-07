import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  parseBusinessReviewSummary,
  type BusinessReviewSummary,
} from '@/lib/business-review-summary';

export function useBusinessReviewSummary(businessId: string, enabled = true) {
  const [state, setState] = useState<{
    id: string;
    summary: BusinessReviewSummary | null;
    error: boolean;
  }>({ id: '', summary: null, error: false });
  useEffect(() => {
    let active = true;
    if (!enabled) return;
    void (async () => {
      try {
        const result = await supabase.rpc('pickup_order_review_summary', {
          p_business_id: businessId,
        });
        const summary = result.error
          ? null
          : parseBusinessReviewSummary(Array.isArray(result.data) ? result.data[0] : result.data);
        if (active) setState({ id: businessId, summary, error: !summary });
      } catch {
        if (active) setState({ id: businessId, summary: null, error: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [businessId, enabled]);
  return enabled && state.id === businessId
    ? state
    : { id: businessId, summary: null, error: false };
}
