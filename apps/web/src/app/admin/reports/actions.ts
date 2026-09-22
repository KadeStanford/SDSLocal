'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function resultUrl(key: 'saved' | 'error', message: string) {
  return `/admin/reports?${key}=${encodeURIComponent(message)}`;
}

async function adminClient() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) redirect('/account');
  return supabase;
}

export async function resolveReportAction(formData: FormData) {
  const reportId = String(formData.get('reportId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();
  const note = String(formData.get('resolutionNote') ?? '').trim();
  if (!reportId || !['resolved', 'dismissed'].includes(status)) {
    redirect(resultUrl('error', 'Choose a valid report resolution.'));
  }

  const supabase = await adminClient();
  const { error } = await supabase.rpc('resolve_platform_report', {
    p_report_id: reportId,
    p_status: status,
    p_resolution_note: note || null,
  });
  if (error) redirect(resultUrl('error', error.message));

  revalidatePath('/admin');
  revalidatePath('/admin/reports');
  redirect(resultUrl('saved', `Report ${status}.`));
}
