import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import {
  createMobileModerationClient,
  ModerationFailure,
  type ModerationTransport,
} from '@/lib/admin/mobile-moderation-client';

export type AdminAccessStatus = 'checking' | 'allowed' | 'denied' | 'signed_out' | 'error';
export function usePlatformAdminAccess() {
  const { session, loading } = useAuth();
  const accountId = session?.user.id ?? null;
  const account = useRef(accountId);
  useLayoutEffect(() => {
    account.current = accountId;
  }, [accountId]);
  const getAccount = useCallback(() => account.current, []);
  const sequence = useRef(0);
  const focused = useRef(false);
  const [state, setState] = useState<{
    owner: string | null;
    status: AdminAccessStatus;
    message: string | null;
  }>({ owner: null, status: 'checking', message: null });
  const client = useMemo(() => {
    const transport: ModerationTransport = {
      auth: { getUser: () => supabase.auth.getUser() },
      rpc: async (name, args) => await supabase.rpc(name, args),
    };
    // eslint-disable-next-line react-hooks/refs -- This factory stores the getter; identity is read only during protected asynchronous requests.
    return createMobileModerationClient(transport, getAccount);
  }, [getAccount]);
  const invalidate = useCallback((error?: unknown) => {
    sequence.current++;
    const kind = error instanceof ModerationFailure ? error.kind : null;
    const status: AdminAccessStatus =
      !account.current || kind === 'signed_out'
        ? 'signed_out'
        : kind === 'denied'
          ? 'denied'
          : kind
            ? 'error'
            : 'checking';
    setState({
      owner: account.current,
      status,
      message: error instanceof Error ? error.message : null,
    });
  }, []);
  const verify = useCallback(
    async (strict = true): Promise<boolean> => {
      const expected = account.current,
        request = ++sequence.current;
      if (strict) setState({ owner: expected, status: 'checking', message: null });
      try {
        await client.checkAccess(expected);
        if (sequence.current !== request || account.current !== expected) return false;
        setState({ owner: expected, status: 'allowed', message: null });
        return true;
      } catch (error) {
        if (sequence.current !== request || account.current !== expected) return false;
        const kind = error instanceof ModerationFailure ? error.kind : 'unavailable';
        setState({
          owner: expected,
          status: kind === 'signed_out' ? 'signed_out' : kind === 'denied' ? 'denied' : 'error',
          message:
            error instanceof Error ? error.message : 'Administrator access could not be verified.',
        });
        return false;
      }
    },
    [client],
  );
  useEffect(() => {
    invalidate();
    if (!loading && focused.current) void verify();
  }, [accountId, session?.access_token, loading, invalidate, verify]);
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      if (!loading) void verify();
      const timer = setInterval(() => {
        if (!loading) void verify(false);
      }, 30000);
      return () => {
        focused.current = false;
        clearInterval(timer);
        invalidate();
      };
    }, [loading, verify, invalidate]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (!focused.current) return;
      if (next === 'active') void verify();
      else invalidate();
    });
    return () => subscription.remove();
  }, [verify, invalidate]);
  const status: AdminAccessStatus = loading
    ? 'checking'
    : !accountId
      ? 'signed_out'
      : state.owner !== accountId
        ? 'checking'
        : state.status;
  return {
    status,
    message: state.owner === accountId ? state.message : null,
    accountId,
    client,
    verify,
    invalidate,
  };
}
export type PlatformAdminAccess = ReturnType<typeof usePlatformAdminAccess>;
