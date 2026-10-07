'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function resultUrl(key: 'saved' | 'error', message: string) {
  return `/admin/customer-reviews?${key}=${encodeURIComponent(message)}`;
}

async function adminClient() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) redirect('/account');
  return supabase;
}

export async function moderatePickupReviewAction(formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '').trim();
  const action = String(formData.get('action') ?? '').trim();
  const note = String(formData.get('resolutionNote') ?? '').trim();
  if (!reportId || !['hide', 'restore', 'remove', 'dismiss'].includes(action) || note.length > 1000)
    redirect(resultUrl('error', 'Choose a valid moderation action and note.'));

  const supabase = await adminClient();
  const { error } = await supabase.rpc('resolve_pickup_review_report', {
    p_report_id: reportId,
    p_action: action,
    p_resolution_note: note || null,
  });
  if (error) redirect(resultUrl('error', 'The review report could not be updated.'));

  revalidatePath('/admin');
  revalidatePath('/admin/customer-reviews');
  const resultMessage =
    action === 'dismiss'
      ? 'Report dismissed.'
      : action === 'hide'
        ? 'Review hidden.'
        : action === 'remove'
          ? 'Review removed.'
          : 'Review restored.';
  redirect(resultUrl('saved', resultMessage));
}
