'use server';

import { loyaltyProgramSchema } from '@sds/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function destination(businessId: string, key: 'error' | 'saved', message: string) {
  return `/account/businesses/${businessId}/loyalty?${key}=${encodeURIComponent(message)}`;
}

async function ownerClient(businessId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) redirect('/account');
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');
  const { data: membership } = await supabase
    .from('business_members')
    .select('id, businesses(slug)')
    .eq('business_id', businessId)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  if (!membership) redirect('/account');
  const joined = membership.businesses;
  const business = Array.isArray(joined) ? joined[0] : joined;
  return { supabase, businessSlug: business?.slug ?? '' };
}

export async function saveLoyaltyProgramAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const result = loyaltyProgramSchema.safeParse({
    name: formData.get('name'),
    rewardDescription: formData.get('rewardDescription'),
    stampsRequired: Number(formData.get('stampsRequired')),
    terms: formData.get('terms'),
  });
  if (!result.success) {
    redirect(
      destination(
        businessId,
        'error',
        result.error.issues[0]?.message ?? 'Check the program details.',
      ),
    );
  }
  const { supabase, businessSlug } = await ownerClient(businessId);
  const { error } = await supabase.from('loyalty_programs').upsert(
    {
      business_id: businessId,
      name: result.data.name,
      reward_description: result.data.rewardDescription,
      stamps_required: result.data.stampsRequired,
      terms: result.data.terms,
      is_active: formData.get('isActive') === 'on',
    },
    { onConflict: 'business_id' },
  );
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/b/${businessSlug}`);
  revalidatePath('/explore');
  revalidatePath('/rewards');
  redirect(destination(businessId, 'saved', 'Rewards program saved.'));
}

export async function addStaffAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const email = String(formData.get('email') ?? '').trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    redirect(destination(businessId, 'error', 'Enter the staff member’s account email.'));
  }
  const { supabase } = await ownerClient(businessId);
  const { error } = await supabase.rpc('add_business_staff', {
    p_business_id: businessId,
    p_email: email,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/account/businesses/${businessId}/loyalty`);
  redirect(destination(businessId, 'saved', 'Staff access added.'));
}

export async function removeStaffAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const memberId = String(formData.get('memberId') ?? '');
  const { supabase } = await ownerClient(businessId);
  const { error } = await supabase.rpc('remove_business_staff', {
    p_business_id: businessId,
    p_member_id: memberId,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/account/businesses/${businessId}/loyalty`);
  redirect(destination(businessId, 'saved', 'Staff access removed.'));
}

export async function reverseStampAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const transactionId = String(formData.get('transactionId') ?? '');
  const { supabase } = await ownerClient(businessId);
  const { error } = await supabase.rpc('reverse_loyalty_stamp', {
    p_transaction_id: transactionId,
    p_idempotency_key: crypto.randomUUID(),
    p_note: 'Reversed by owner from the loyalty dashboard',
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/account/businesses/${businessId}/loyalty`);
  revalidatePath('/rewards');
  redirect(destination(businessId, 'saved', 'Stamp reversed and recorded in the audit history.'));
}
