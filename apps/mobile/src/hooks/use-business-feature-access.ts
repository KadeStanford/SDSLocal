import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { type BusinessFeatureAccess } from '@sds/business-logic';
import {
  BusinessAccessRequestScope,
  parseBusinessFeatureAccess,
} from '@/lib/business-feature-access';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useListingBilling } from '@/providers/listing-billing-provider';

export function useBusinessFeatureAccess(businessId: string | null | undefined) {
  const { session } = useAuth();
  const { summary } = useListingBilling();
  const userId = session?.user.id;
  const identity = JSON.stringify([userId, businessId, summary]);
  const [scope] = useState(() => new BusinessAccessRequestScope());
  useLayoutEffect(() => {
    scope.select(identity);
    return () => scope.invalidate();
  }, [identity, scope]);
  const [result, setResult] = useState<{
    identity: string;
    access: BusinessFeatureAccess | null;
    owner: boolean;
    error: string | null;
  } | null>(null);
  const refresh = useCallback(async () => {
    if (!userId || !businessId) return;
    const next = await scope.run(identity, async () => {
      try {
        const [capabilities, membership] = await Promise.all([
          supabase.rpc('get_business_feature_access', { p_business_id: businessId }),
          supabase
            .from('business_members')
            .select('role')
            .eq('business_id', businessId)
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle(),
        ]);
        if (capabilities.error || membership.error || !membership.data)
          throw new Error('Access unavailable');
        return {
          identity,
          access: parseBusinessFeatureAccess(capabilities.data, businessId),
          owner: membership.data.role === 'owner',
          error: null,
        };
      } catch {
        return {
          identity,
          access: null,
          owner: false,
          error: 'We couldn’t check this business’s plan. Check your connection and try again.',
        };
      }
    });
    if (next) setResult(next);
  }, [businessId, userId, identity, scope]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => scope.invalidate();
    }, [refresh, scope]),
  );
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 30_000);
    return () => {
      listener.remove();
      clearInterval(timer);
      scope.invalidate();
    };
  }, [refresh, scope]);
  const current = result?.identity === identity ? result : null;
  return {
    access: current?.access ?? null,
    owner: current?.owner ?? false,
    loading: !!userId && !!businessId && !current,
    error: current?.error ?? null,
    refresh,
  };
}
