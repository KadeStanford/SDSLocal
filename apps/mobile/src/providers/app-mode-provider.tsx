import {
  createContext,
  type PropsWithChildren,
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
  readonly hasBusinessAccess: boolean;
  readonly loading: boolean;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

export function AppModeProvider({ children }: PropsWithChildren) {
  const { session, loading: authLoading } = useAuth();
  const [mode, setModeState] = useState<AppMode>('customer');
  const [businessAccess, setBusinessAccess] = useState<{
    readonly userId: string;
    readonly hasAccess: boolean;
  } | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void supabase
      .from('business_members')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .limit(1)
      .then(({ data }) => {
        if (!active) return;
        const hasAccess = Boolean(data?.length);
        setBusinessAccess({ userId: session.user.id, hasAccess });
        if (!hasAccess) setModeState('customer');
      });
    return () => {
      active = false;
    };
  }, [session]);

  const hasBusinessAccess =
    businessAccess !== null &&
    businessAccess.userId === session?.user.id &&
    businessAccess.hasAccess;

  const value = useMemo<AppModeContextValue>(
    () => ({
      mode: hasBusinessAccess ? mode : 'customer',
      setMode: (nextMode) =>
        setModeState(nextMode === 'business' && !hasBusinessAccess ? 'customer' : nextMode),
      hasBusinessAccess,
      loading: authLoading || (Boolean(session) && businessAccess?.userId !== session?.user.id),
    }),
    [authLoading, businessAccess?.userId, hasBusinessAccess, mode, session],
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode() {
  const value = useContext(AppModeContext);
  if (!value) throw new Error('useAppMode must be used inside AppModeProvider.');
  return value;
}
