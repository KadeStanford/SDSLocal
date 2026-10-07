'use server';
import { revalidatePath } from 'next/cache';
import { makeDecision, moderationRecord, queueSnapshot } from '@/lib/admin/moderation-server';
import type { Decision, QueueFilters } from '@/lib/admin/moderation-types';
function message(error: unknown) {
  return error instanceof Error ? error.message : 'The request failed. Try again.';
}
export async function loadQueueAction(filters: QueueFilters) {
  try {
    return { data: await queueSnapshot(filters), error: null };
  } catch (error) {
    return { data: null, error: message(error) };
  }
}
export async function loadRecordAction(kind: string, id: string) {
  try {
    return { data: await moderationRecord(kind, id), error: null };
  } catch (error) {
    return { data: null, error: message(error) };
  }
}
export async function decideAction(input: {
  kind: string;
  id: string;
  action: Decision;
  reason: string;
  revision: string;
  requestId: string;
  privateNote?: string;
}) {
  try {
    const data = await makeDecision(input);
    revalidatePath('/admin');
    revalidatePath('/admin/operations');
    revalidatePath('/account');
    revalidatePath('/explore');
    if (data.record.context.slug) revalidatePath(`/b/${data.record.context.slug}`);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: message(error) };
  }
}
