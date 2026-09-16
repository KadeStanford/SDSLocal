'use server';

import { offeringSchema, offeringSectionSchema } from '@sds/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function destination(businessId: string, key: 'error' | 'saved', message: string) {
  return `/account/businesses/${businessId}/offerings?${key}=${encodeURIComponent(message)}`;
}

async function ownerClient(businessId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(businessId)) redirect('/account');
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { data: membership } = await supabase
    .from('business_members')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  if (!membership) redirect('/account');
  return supabase;
}

function parsePrice(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return Number.NaN;
  return Math.round(Number(text) * 100);
}

function parseItem(formData: FormData) {
  const priceKind = String(formData.get('priceKind') ?? 'fixed');
  const amount = parsePrice(formData.get('price'));
  const customPriceText = String(formData.get('priceText') ?? '').trim();
  const priceMinor = priceKind === 'fixed' || priceKind === 'starting_at' ? amount : null;
  const priceText =
    priceKind === 'starting_at' && typeof amount === 'number' && !Number.isNaN(amount)
      ? `Starting at $${(amount / 100).toFixed(2)}`
      : priceKind === 'contact'
        ? 'Contact for price'
        : priceKind === 'custom'
          ? customPriceText || null
          : null;

  return offeringSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description') ?? '',
    priceMinor,
    priceText,
    currency: 'USD',
    isAvailable: formData.get('isAvailable') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
  });
}

export async function createOfferingSectionAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const result = offeringSectionSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    isVisible: true,
  });
  if (!result.success) redirect(destination(businessId, 'error', 'Enter a valid category name.'));

  const supabase = await ownerClient(businessId);
  const { data: last } = await supabase
    .from('offering_sections')
    .select('display_order')
    .eq('business_id', businessId)
    .is('archived_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('offering_sections').insert({
    business_id: businessId,
    name: result.data.name,
    description: result.data.description ?? null,
    display_order: (last?.display_order ?? -1) + 1,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/account/businesses/${businessId}/offerings`);
  redirect(destination(businessId, 'saved', 'Category added.'));
}

export async function updateOfferingSectionAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const result = offeringSectionSchema.safeParse({
    name: formData.get('name'),
    description: formData.get('description'),
    isVisible: formData.get('isVisible') === 'on',
  });
  if (!result.success) redirect(destination(businessId, 'error', 'Enter valid category details.'));

  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_sections')
    .update({
      name: result.data.name,
      description: result.data.description ?? null,
      is_visible: result.data.isVisible,
    })
    .eq('id', sectionId)
    .eq('business_id', businessId)
    .is('archived_at', null);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Category saved.'));
}

export async function createOfferingItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const result = parseItem(formData);
  if (!result.success) {
    redirect(destination(businessId, 'error', 'Add a valid name and price or price text.'));
  }

  const supabase = await ownerClient(businessId);
  const { data: section } = await supabase
    .from('offering_sections')
    .select('id')
    .eq('id', sectionId)
    .eq('business_id', businessId)
    .is('archived_at', null)
    .maybeSingle();
  if (!section) redirect(destination(businessId, 'error', 'That category was not found.'));

  const { data: last } = await supabase
    .from('offering_items')
    .select('display_order')
    .eq('business_id', businessId)
    .eq('section_id', sectionId)
    .is('archived_at', null)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from('offering_items').insert({
    business_id: businessId,
    section_id: sectionId,
    name: result.data.name,
    description: result.data.description,
    price_minor: result.data.priceMinor,
    price_text: result.data.priceText,
    currency: result.data.currency,
    is_available: result.data.isAvailable,
    is_featured: result.data.isFeatured,
    display_order: (last?.display_order ?? -1) + 1,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Item added.'));
}

export async function updateOfferingItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const result = parseItem(formData);
  if (!result.success) {
    redirect(destination(businessId, 'error', 'Add a valid name and price or price text.'));
  }

  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_items')
    .update({
      name: result.data.name,
      description: result.data.description,
      price_minor: result.data.priceMinor,
      price_text: result.data.priceText,
      currency: result.data.currency,
      is_available: result.data.isAvailable,
      is_featured: result.data.isFeatured,
      is_visible: formData.get('isVisible') === 'on',
    })
    .eq('id', itemId)
    .eq('business_id', businessId)
    .is('archived_at', null);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Item saved.'));
}

export async function moveOfferingItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';
  const supabase = await ownerClient(businessId);
  const { error } = await supabase.rpc('move_offering_item', {
    p_business_id: businessId,
    p_item_id: itemId,
    p_direction: direction,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Item order updated.'));
}

export async function moveOfferingSectionAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';
  const supabase = await ownerClient(businessId);
  const { error } = await supabase.rpc('move_offering_section', {
    p_business_id: businessId,
    p_section_id: sectionId,
    p_direction: direction,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Section order updated.'));
}

export async function archiveOfferingSectionAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_sections')
    .update({ archived_at: new Date().toISOString(), is_visible: false })
    .eq('id', sectionId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Section archived. You can restore it below.'));
}

export async function restoreOfferingSectionAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const sectionId = String(formData.get('sectionId') ?? '');
  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_sections')
    .update({ archived_at: null })
    .eq('id', sectionId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Section restored.'));
}

export async function archiveOfferingItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_items')
    .update({ archived_at: new Date().toISOString(), is_visible: false })
    .eq('id', itemId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Item archived. You can restore it below.'));
}

export async function restoreOfferingItemAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const itemId = String(formData.get('itemId') ?? '');
  const supabase = await ownerClient(businessId);
  const { error } = await supabase
    .from('offering_items')
    .update({ archived_at: null })
    .eq('id', itemId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath('/b', 'layout');
  redirect(destination(businessId, 'saved', 'Item restored.'));
}
