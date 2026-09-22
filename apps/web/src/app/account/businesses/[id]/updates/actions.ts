'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function destination(businessId: string, key: 'saved' | 'error', message: string) {
  return `/account/businesses/${businessId}/updates?${key}=${encodeURIComponent(message)}`;
}

function text(value: FormDataEntryValue | null) {
  return String(value ?? '').trim();
}

export async function sendBusinessUpdateAction(formData: FormData) {
  const businessId = text(formData.get('businessId'));
  const updateType = text(formData.get('updateType'));
  const title = text(formData.get('title'));
  const body = text(formData.get('body'));
  const expiresAtInput = text(formData.get('expiresAt'));

  if (!/^[0-9a-f-]{36}$/i.test(businessId)) {
    redirect('/account');
  }
  if (!['announcement', 'deal'].includes(updateType)) {
    redirect(destination(businessId, 'error', 'Choose an announcement or special offer.'));
  }
  if (title.length < 2 || title.length > 120) {
    redirect(destination(businessId, 'error', 'The update title must be 2–120 characters.'));
  }
  if (body.length < 2 || body.length > 500) {
    redirect(destination(businessId, 'error', 'The update message must be 2–500 characters.'));
  }

  let expiresAt: string | null = null;
  if (expiresAtInput) {
    const parsed = new Date(expiresAtInput);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      redirect(destination(businessId, 'error', 'Expiration must be a future date and time.'));
    }
    expiresAt = parsed.toISOString();
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(slug)')
    .eq('business_id', businessId)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  if (!business) redirect('/account');

  const { error } = await supabase.rpc('send_business_update', {
    p_business_id: businessId,
    p_update_type: updateType,
    p_title: title,
    p_body: body,
    p_expires_at: expiresAt,
  });
  if (error) {
    redirect(destination(businessId, 'error', error.message));
  }

  revalidatePath(`/account/businesses/${businessId}/updates`);
  revalidatePath('/account/notifications');
  redirect(destination(businessId, 'saved', 'Update sent to eligible followers.'));
}
