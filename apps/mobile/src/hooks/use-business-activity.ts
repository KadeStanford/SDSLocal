import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useAppMode } from '@/providers/app-mode-provider';
import { useNotifications } from '@/providers/notification-provider';
import { useServiceOperations } from '@/providers/service-operations-provider';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import { hasNewBusinessActivity, type ActivitySnapshot } from '@/lib/business-activity';
const empty = { appointments: false, requests: false, orders: false };
export function useBusinessActivity() {
  const { session } = useAuth(),
    { mode } = useAppMode(),
    services = useServiceOperations(),
    pickup = usePickupWorkspace(),
    { businessChime } = useNotifications();
  const player = useAudioPlayer(require('../../assets/business-chime.wav'));
  const previous = useRef<ActivitySnapshot | null>(null);
  const [state, setState] = useState<{
    scope: string;
    appointments: boolean;
    requests: boolean;
    orders: boolean;
  } | null>(null);
  const ids = services.businesses
    .map((b) => b.id)
    .sort()
    .join(',');
  const orders = pickup.businesses.reduce((n, b) => n + (b.counts?.requests ?? 0), 0);
  const userId = session?.user.id;
  const scope = `${userId ?? ''}:${mode}:${ids}:${pickup.businesses
    .map((b) => b.id)
    .sort()
    .join(',')}`;
  useEffect(() => {
    let live = true,
      busy = false;
    async function refresh() {
      if (
        busy ||
        AppState.currentState === 'background' ||
        AppState.currentState === 'inactive' ||
        !userId ||
        mode !== 'business'
      )
        return;
      busy = true;
      try {
        const businesses = ids ? ids.split(',') : [];
        const [requests, appointments] = businesses.length
          ? await Promise.all([
              supabase
                .from('service_requests')
                .select('id')
                .in('business_id', businesses)
                .eq('status', 'new'),
              supabase
                .from('appointments')
                .select('id')
                .in('business_id', businesses)
                .eq('status', 'requested'),
            ])
          : [
              { data: [], error: null },
              { data: [], error: null },
            ];
        if (!live || requests.error || appointments.error) return;
        const next: ActivitySnapshot = {
          scope,
          keys: [
            ...(requests.data ?? []).map((r) => 'request:' + r.id),
            ...(appointments.data ?? []).map((r) => 'appointment:' + r.id),
          ],
          orders,
        };
        const play = businessChime && hasNewBusinessActivity(previous.current, next);
        previous.current = next;
        setState({
          scope,
          requests: !!requests.data?.length,
          appointments: !!appointments.data?.length,
          orders: orders > 0,
        });
        if (play) {
          try {
            await player.seekTo(0);
            if (live && AppState.currentState === 'active') player.play();
          } catch {
            /* Visual indicators remain available if audio cannot play. */
          }
        }
      } catch {
        /* A failed refresh retains the last successfully read indicators. */
      } finally {
        busy = false;
      }
    }
    const start = setTimeout(() => void refresh(), 0),
      poll = setInterval(() => void refresh(), 15000);
    const foreground = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => {
      live = false;
      clearTimeout(start);
      clearInterval(poll);
      foreground.remove();
    };
  }, [userId, mode, ids, scope, orders, businessChime, player]);
  return userId && mode === 'business' && state?.scope === scope ? state : empty;
}
