import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import { DecisionAttempt } from '@/lib/admin/decision-attempt';
import {
  ModerationFailure,
  prepareDecision,
  type DecisionPayload,
} from '@/lib/admin/mobile-moderation-client';
import type {
  Decision,
  DecisionResult,
  ModerationRecord,
  QueueFilters,
  QueueKind,
  QueueSnapshot,
} from '@/lib/admin/moderation-types';
import { usePlatformAdminAccess, type PlatformAdminAccess } from './use-platform-admin-access';

function accessFailure(error: unknown, access: PlatformAdminAccess) {
  if (
    error instanceof ModerationFailure &&
    ['denied', 'signed_out', 'session_changed'].includes(error.kind)
  )
    access.invalidate(error);
}
function scopedAttempt(
  scope: string,
  decide: PlatformAdminAccess['client']['decide'],
  getAccount: () => string | null,
) {
  // The memoized scope changes on account or case navigation, retiring its retry payload.
  void scope;
  return new DecisionAttempt(decide, getAccount);
}
export function useMobileModerationQueue() {
  const access = usePlatformAdminAccess();
  const [filters, setFilters] = useState<QueueFilters>({
    kind: null,
    state: 'open',
    search: '',
    offset: 0,
  });
  const [snapshot, setSnapshot] = useState<QueueSnapshot | null>(null);
  const [loading, setLoading] = useState(false),
    [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const current = useRef(access);
  useLayoutEffect(() => {
    current.current = access;
  }, [access]);
  const invalidateLoad = useCallback(() => {
    sequence.current++;
  }, []);
  const load = useCallback(async () => {
    const request = ++sequence.current,
      owner = current.current.accountId;
    if (current.current.status !== 'allowed') {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    setError(null);
    setSnapshot(null);
    try {
      const value = await access.client.snapshot(owner, filters);
      if (
        request !== sequence.current ||
        current.current.accountId !== owner ||
        current.current.status !== 'allowed'
      )
        return;
      setSnapshot(value);
    } catch (cause) {
      if (request !== sequence.current || current.current.accountId !== owner) return;
      setSnapshot(null);
      accessFailure(cause, current.current);
      setError(cause instanceof Error ? cause.message : 'The queues could not load.');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [access.client, filters]);
  useEffect(() => {
    let task: ReturnType<typeof setTimeout> | undefined;
    if (access.status === 'allowed') void load();
    else {
      invalidateLoad();
      task = setTimeout(() => {
        setSnapshot(null);
        setError(null);
        setLoading(false);
      }, 0);
    }
    return () => {
      clearTimeout(task);
      invalidateLoad();
    };
  }, [access.status, access.accountId, load, invalidateLoad]);
  const filter = useCallback(
    (next: Partial<QueueFilters>) =>
      setFilters((before) => ({ ...before, ...next, offset: next.offset ?? 0 })),
    [],
  );
  return {
    access,
    filters,
    filter,
    snapshot: access.status === 'allowed' ? snapshot : null,
    loading,
    error,
    refresh: load,
  };
}
export function useMobileModerationCase(kind: QueueKind | null, id: string | null) {
  const access = usePlatformAdminAccess();
  const current = useRef(access);
  useLayoutEffect(() => {
    current.current = access;
  }, [access]);
  const getAccount = useCallback(() => current.current.accountId, []);
  const [record, setRecord] = useState<ModerationRecord | null>(null);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecisionResult | null>(null),
    [pending, setPending] = useState<DecisionPayload | null>(null);
  const sequence = useRef(0),
    decisionGeneration = useRef(0);
  const invalidateLoad = useCallback(() => {
    sequence.current++;
  }, []);
  const invalidateDecision = useCallback(() => {
    decisionGeneration.current++;
  }, []);
  const scope = `${access.accountId ?? ''}:${kind ?? ''}:${id ?? ''}`;
  const attempt = useMemo(
    // eslint-disable-next-line react-hooks/refs -- The controller stores this getter and checks identity only when submitting or retrying.
    () => scopedAttempt(scope, access.client.decide, getAccount),
    [scope, access.client, getAccount],
  );
  const load = useCallback(async () => {
    const request = ++sequence.current,
      owner = current.current.accountId;
    if (current.current.status !== 'allowed' || !kind || !id) {
      setRecord(null);
      return;
    }
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      const value = await access.client.record(owner, kind, id);
      if (
        request !== sequence.current ||
        current.current.accountId !== owner ||
        current.current.status !== 'allowed'
      )
        return;
      setRecord(value);
    } catch (cause) {
      if (request !== sequence.current || current.current.accountId !== owner) return;
      setRecord(null);
      accessFailure(cause, current.current);
      setError(cause instanceof Error ? cause.message : 'The case could not load.');
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [access.client, kind, id]);
  useEffect(() => {
    invalidateDecision();
    attempt.clear();
    const task = setTimeout(() => {
      setPending(null);
      setResult(null);
      setBusy(false);
    }, 0);
    return () => {
      clearTimeout(task);
      invalidateDecision();
      attempt.clear();
    };
  }, [attempt, invalidateDecision]);
  useEffect(() => {
    let task: ReturnType<typeof setTimeout> | undefined;
    if (access.status === 'allowed') void load();
    else {
      invalidateLoad();
      task = setTimeout(() => {
        setRecord(null);
        setError(null);
        setLoading(false);
      }, 0);
      if (access.status !== 'checking') {
        invalidateDecision();
        attempt.clear();
        const reset = () => {
          setPending(null);
          setResult(null);
          setBusy(false);
        };
        clearTimeout(task);
        task = setTimeout(() => {
          setRecord(null);
          setError(null);
          setLoading(false);
          reset();
        }, 0);
      }
    }
    return () => {
      clearTimeout(task);
      invalidateLoad();
    };
  }, [access.status, access.accountId, load, attempt, invalidateLoad, invalidateDecision]);
  const save = useCallback(
    async (action: Decision | null, reason: string, privateNote: string, retry = false) => {
      if (attempt.submitting) return;
      const owner = current.current.accountId,
        generation = decisionGeneration.current;
      if (
        current.current.status !== 'allowed' ||
        (!retry && (!record || !action || record.kind !== kind || record.id !== id))
      )
        return;
      let payload: DecisionPayload;
      try {
        payload = retry
          ? attempt.payload!
          : prepareDecision(record!, action!, reason, privateNote, Crypto.randomUUID());
        if (!payload) throw new ModerationFailure('invalid', 'There is no decision to retry.');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Check the public reason.');
        return;
      }
      setBusy(true);
      setError(null);
      setResult(null);
      try {
        const value = await (retry ? attempt.retry() : attempt.submit(payload));
        if (
          generation !== decisionGeneration.current ||
          current.current.accountId !== owner ||
          current.current.status !== 'allowed'
        )
          return;
        const refreshRequest = ++sequence.current;
        setRecord(value.record);
        setResult(value);
        setPending(null);
        try {
          const updated = await access.client.record(owner, value.record.kind, value.record.id);
          if (
            generation === decisionGeneration.current &&
            refreshRequest === sequence.current &&
            current.current.accountId === owner &&
            current.current.status === 'allowed'
          )
            setRecord(updated);
        } catch (historyError) {
          if (generation === decisionGeneration.current && current.current.accountId === owner) {
            accessFailure(historyError, current.current);
            setError('The decision was saved. Refresh the case to load its latest history.');
          }
        }
      } catch (cause) {
        if (generation !== decisionGeneration.current || current.current.accountId !== owner)
          return;
        accessFailure(cause, current.current);
        setPending(attempt.awaitingConfirmation ? attempt.payload : null);
        setError(cause instanceof Error ? cause.message : 'The decision could not be confirmed.');
        if (cause instanceof ModerationFailure && ['stale', 'invalid'].includes(cause.kind))
          setRecord(null);
      } finally {
        if (generation === decisionGeneration.current) setBusy(false);
      }
    },
    [attempt, record, access.client, kind, id],
  );
  return {
    access,
    record:
      access.status === 'allowed' && record?.kind === kind && record.id === id ? record : null,
    loading,
    busy,
    error,
    result: result?.record.kind === kind && result.record.id === id ? result : null,
    pending: pending?.kind === kind && pending.id === id ? pending : null,
    refresh: load,
    save,
  };
}
