'use server';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function inviteDestination(token: string, query: string) {
  return `/invite/staff?token=${encodeURIComponent(token)}&${query}`;
}

export async function acceptStaffInviteAction(formData: FormData) {
  const token = String(formData.get('token') ?? '').trim();
  if (!token) redirect('/invite/staff?error=This%20invite%20link%20is%20incomplete.');

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    redirect(`/auth?next=${encodeURIComponent(`/invite/staff?token=${token}`)}`);
  }

  const { data, error } = await supabase.rpc('accept_business_staff_invite', {
    p_token: token,
  });
  if (error) redirect(inviteDestination(token, `error=${encodeURIComponent(error.message)}`));

  const accepted = (Array.isArray(data) ? data[0] : data) as { business_name: string } | null;
  const businessName = accepted?.business_name ?? 'your business';
  redirect(`/account?staffInviteAccepted=${encodeURIComponent(businessName)}`);
}
