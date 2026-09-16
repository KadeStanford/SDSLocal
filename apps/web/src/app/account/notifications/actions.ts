'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

const allowedTypes = new Set(['events', 'loyalty', 'general_updates']);

export async function updateNotificationPreferenceAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const notificationType = String(formData.get('notificationType') ?? '');
  const setting = String(formData.get('setting') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(businessId) || !allowedTypes.has(notificationType)) {
    redirect('/account/notifications?error=Invalid%20notification%20preference');
  }
  if (setting !== 'enabled' && setting !== 'muted') {
    redirect('/account/notifications?error=Choose%20Enabled%20or%20Muted');
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=%2Faccount%2Fnotifications');
  const { error } = await supabase.rpc('set_notification_preference', {
    p_business_id: businessId,
    p_notification_type: notificationType,
    p_is_enabled: setting === 'enabled',
  });
  if (error) redirect(`/account/notifications?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/account/notifications');
  redirect('/account/notifications?saved=1');
}
