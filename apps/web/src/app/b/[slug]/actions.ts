'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function businessPath(slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) redirect('/explore');
  return `/b/${slug}`;
}

async function businessAndUser(slug: string) {
  const path = businessPath(slug);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect(`/auth?next=${encodeURIComponent(path)}`);
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();
  if (!business) redirect('/explore');
  return { supabase, userId: authData.user.id, businessId: business.id, path };
}

export async function followBusinessAction(slug: string) {
  const { supabase, userId, businessId, path } = await businessAndUser(slug);
  const { error } = await supabase
    .from('business_follows')
    .upsert(
      { business_id: businessId, customer_id: userId },
      { onConflict: 'business_id,customer_id', ignoreDuplicates: true },
    );
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  revalidatePath('/following');
  redirect(`${path}?followed=1`);
}

export async function unfollowBusinessAction(slug: string) {
  const { supabase, userId, businessId, path } = await businessAndUser(slug);
  const { error } = await supabase
    .from('business_follows')
    .delete()
    .eq('business_id', businessId)
    .eq('customer_id', userId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  revalidatePath('/following');
  redirect(path);
}

export async function joinRewardsAction(slug: string) {
  const { supabase, businessId, path } = await businessAndUser(slug);
  const { data: program } = await supabase
    .from('loyalty_programs')
    .select('id')
    .eq('business_id', businessId)
    .eq('is_active', true)
    .maybeSingle();
  if (!program) redirect(`${path}?error=${encodeURIComponent('Rewards are not available.')}`);
  const { data: membershipId, error } = await supabase.rpc('join_loyalty_program', {
    p_program_id: program.id,
  });
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath('/rewards');
  redirect(`/rewards/${membershipId}`);
}
