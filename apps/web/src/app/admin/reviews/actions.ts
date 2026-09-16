'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function destination(key: 'error' | 'saved', message: string) {
  return `/admin/reviews?${key}=${encodeURIComponent(message)}`;
}

async function adminClient() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: isAdmin } = await supabase.rpc('is_platform_admin');
  if (isAdmin !== true) redirect('/account');
  return supabase;
}

export async function approveBusinessAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const supabase = await adminClient();
  const { data: business } = await supabase
    .from('businesses')
    .select('slug')
    .eq('id', businessId)
    .maybeSingle();
  const { error } = await supabase.rpc('approve_business', { p_business_id: businessId });
  if (error) redirect(destination('error', error.message));
  if (business) revalidatePath(`/b/${business.slug}`);
  revalidatePath('/account');
  redirect(destination('saved', 'Business approved and published.'));
}

export async function rejectBusinessAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const feedback = String(formData.get('feedback') ?? '');
  const supabase = await adminClient();
  const { error } = await supabase.rpc('reject_business', {
    p_business_id: businessId,
    p_feedback: feedback,
  });
  if (error) redirect(destination('error', error.message));
  revalidatePath('/account');
  redirect(destination('saved', 'Business returned to draft with feedback.'));
}
