import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export type AppMode = 'customer' | 'business';

interface AppModeContextValue {
  readonly mode: AppMode;
  readonly setMode: (mode: AppMode) => void;
  readonly refreshBusinessAccess: () => Promise<boolean>;
  readonly hasBusinessAccess: boolean;
  readonly loading: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);
const modeStoragePrefix = 'sds-local-app-mode:';
const businessAccessTimeoutMs = 5000;

export function AppModeProvider({ children }: PropsWithChildren) {
  const { session, loading: authLoading } = useAuth();
  const [mode, setModeState] = useState<AppMode>('customer');
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(null);
  const [businessAccess, setBusinessAccess] = useState<{
    readonly userId: string;
    readonly hasAccess: boolean;
  } | null>(null);

  const refreshBusinessAccess = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setBusinessAccess(null);
      setModeState('customer');
      return false;
    }
    let hasAccess = false;
    try {
      const result = await Promise.race([
        supabase
          .from('business_members')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), businessAccessTimeoutMs)),
      ]);
      hasAccess = Boolean(result && 'data' in result && result.data?.length);
    } catch {
      // A temporarily unreachable API should not leave AppTabs waiting
      // forever. The next auth refresh or explicit business refresh retries it.
      hasAccess = false;
    }
    setBusinessAccess({ userId, hasAccess });
    if (!hasAccess) setModeState('customer');
    return hasAccess;
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      const timer = setTimeout(() => {
        setModeState('customer');
        setHydratedUserId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
    let storedMode: string | null = null;
    try {
      storedMode = globalThis.localStorage.getItem(`${modeStoragePrefix}${userId}`);
    } catch {
      storedMode = null;
    }
    const timer = setTimeout(() => {
      setModeState(storedMode === 'business' ? 'business' : 'customer');
      setHydratedUserId(userId);
    }, 0);
    return () => clearTimeout(timer);
  }, [session?.user.id]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || hydratedUserId !== userId) return;
    try {
      globalThis.localStorage.setItem(`${modeStoragePrefix}${userId}`, mode);
    } catch {
      // Mode persistence is best effort; navigation still works if storage is unavailable.
    }
  }, [hydratedUserId, mode, session?.user.id]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const timer = setTimeout(() => {
      void refreshBusinessAccess();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshBusinessAccess, session]);

  const hasBusinessAccess =
    businessAccess !== null &&
    businessAccess.userId === session?.user.id &&
    businessAccess.hasAccess;

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode: hasBusinessAccess ? mode : 'customer',
      setMode: (nextMode) =>
        setModeState(nextMode === 'business' && !hasBusinessAccess ? 'customer' : nextMode),
      refreshBusinessAccess,
      hasBusinessAccess,
      loading:
        authLoading ||
        (Boolean(session) && businessAccess?.userId !== session?.user.id) ||
        (Boolean(session) && hydratedUserId !== session?.user.id),
    }),
    [
      authLoading,
      businessAccess?.userId,
      hasBusinessAccess,
      hydratedUserId,
      mode,
      refreshBusinessAccess,
      session,
    ],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const value = useContext(AppModeContext);
  if (!value) throw new Error('useAppMode must be used inside AppModeProvider.');
  return value;
}
