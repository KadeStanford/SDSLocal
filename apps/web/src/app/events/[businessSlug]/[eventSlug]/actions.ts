'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

function eventPath(businessSlug: string, eventSlug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(businessSlug)) redirect('/events');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(eventSlug)) redirect('/events');
  return `/events/${businessSlug}/${eventSlug}`;
}

async function eventAndUser(businessSlug: string, eventSlug: string) {
  const path = eventPath(businessSlug, eventSlug);
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect(`/auth?next=${encodeURIComponent(path)}`);
  const { data: event } = await supabase
    .from('events')
    .select('id, businesses!inner(slug)')
    .eq('slug', eventSlug)
    .eq('businesses.slug', businessSlug)
    .or(`is_published.eq.true,publish_at.lte.${new Date().toISOString()}`)
    .is('archived_at', null)
    .maybeSingle();
  if (!event) redirect('/events');
  return { supabase, userId: authData.user.id, eventId: event.id, path };
}

export async function saveEventAction(businessSlug: string, eventSlug: string) {
  const { supabase, userId, eventId, path } = await eventAndUser(businessSlug, eventSlug);
  const { error } = await supabase
    .from('event_saves')
    .upsert(
      { event_id: eventId, customer_id: userId, reminder_enabled: true },
      { onConflict: 'event_id,customer_id', ignoreDuplicates: true },
    );
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?saved=1`);
}

export async function removeEventSaveAction(businessSlug: string, eventSlug: string) {
  const { supabase, userId, eventId, path } = await eventAndUser(businessSlug, eventSlug);
  const { error } = await supabase
    .from('event_saves')
    .delete()
    .eq('event_id', eventId)
    .eq('customer_id', userId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(path);
}

export async function setEventReminderAction(
  businessSlug: string,
  eventSlug: string,
  formData: FormData,
) {
  const { supabase, userId, eventId, path } = await eventAndUser(businessSlug, eventSlug);
  const { error } = await supabase
    .from('event_saves')
    .update({ reminder_enabled: formData.get('reminderEnabled') === 'on' })
    .eq('event_id', eventId)
    .eq('customer_id', userId);
  if (error) redirect(`${path}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(path);
  redirect(`${path}?reminder=updated`);
}
