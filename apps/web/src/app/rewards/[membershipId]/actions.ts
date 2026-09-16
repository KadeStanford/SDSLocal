'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export async function leaveRewardsAction(membershipId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) redirect('/rewards');
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth?next=/rewards');
  const { error } = await supabase.rpc('leave_loyalty_program', {
    p_membership_id: membershipId,
  });
  if (error) redirect(`/rewards/${membershipId}?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/rewards');
  redirect('/rewards?left=1');
}
