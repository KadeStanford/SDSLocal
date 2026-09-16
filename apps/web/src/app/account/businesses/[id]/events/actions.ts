'use server';

import { eventSchema, eventTimezoneSchema, type EventInput } from '@sds/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { localEventTimeToIso } from '@/lib/event-time';
import { createClient } from '@/lib/supabase/server';

function destination(businessId: string, key: 'error' | 'saved', message: string) {
  return `/account/businesses/${businessId}/events?${key}=${encodeURIComponent(message)}`;
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

function optional(value: FormDataEntryValue | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

function parseEvent(formData: FormData) {
  const timezoneResult = eventTimezoneSchema.safeParse(formData.get('timezone'));
  if (!timezoneResult.success) {
    return { success: false as const, message: 'Choose a valid time zone.' };
  }
  const startInput = String(formData.get('startsAt') ?? '').trim();
  if (!startInput) {
    return { success: false as const, message: 'Start date and time are required.' };
  }
  const startsAt = localEventTimeToIso(startInput, timezoneResult.data);
  if (!startsAt) {
    return {
      success: false as const,
      message: 'The start date and time are not valid in the selected time zone.',
    };
  }
  const endInput = String(formData.get('endsAt') ?? '').trim();
  const endsAt = endInput ? localEventTimeToIso(endInput, timezoneResult.data) : null;
  if (endInput && !endsAt) {
    return {
      success: false as const,
      message: 'The optional end date and time are not valid in the selected time zone.',
    };
  }

  const result = eventSchema.safeParse({
    title: formData.get('title'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    startsAt,
    endsAt,
    timezone: timezoneResult.data,
    locationMode: formData.get('locationMode'),
    addressText: String(formData.get('addressText') ?? ''),
    externalUrl: optional(formData.get('externalUrl')),
    ageNote: formData.get('ageNote'),
    capacityText: formData.get('capacityText'),
  });
  if (result.success) return result;

  const field = String(result.error.issues[0]?.path[0] ?? 'event');
  const messages: Record<string, string> = {
    title: 'Event title is required and must contain at least 2 characters.',
    slug: 'Public URL name is required and may use lowercase letters, numbers, and hyphens.',
    description: 'Description is required and must contain at least 10 characters.',
    endsAt: 'End date and time must be later than the start date and time.',
    locationMode: 'Choose where the event takes place.',
    addressText: 'Event address is required when “Different address” is selected.',
    externalUrl:
      'Enter a complete ticket or information URL, including https://, or leave it blank.',
    ageNote: 'Age note must be 120 characters or fewer.',
    capacityText: 'Capacity note must be 120 characters or fewer.',
  };
  return {
    success: false as const,
    message: messages[field] ?? result.error.issues[0]?.message ?? 'Check the event details.',
  };
}

function eventValues(data: EventInput) {
  return {
    title: data.title,
    slug: data.slug,
    description: data.description,
    starts_at: data.startsAt,
    ends_at: data.endsAt,
    timezone: data.timezone,
    location_mode: data.locationMode,
    address_text: data.locationMode === 'custom' ? (data.addressText ?? null) : null,
    external_url: data.externalUrl,
    age_note: data.ageNote ?? null,
    capacity_text: data.capacityText ?? null,
  };
}

function publicationValues(formData: FormData, timezone: EventInput['timezone']) {
  const mode = String(formData.get('publicationMode') ?? 'draft');
  if (mode === 'draft') {
    return {
      success: true as const,
      values: { is_published: false, publish_at: null },
      message: 'Event saved as a draft.',
    };
  }
  if (mode === 'publish') {
    return {
      success: true as const,
      values: { is_published: true, publish_at: null },
      message: 'Event published.',
    };
  }
  if (mode !== 'schedule') {
    return { success: false as const, message: 'Choose how this event should be published.' };
  }

  const publishInput = String(formData.get('publishAt') ?? '').trim();
  const publishAt = publishInput ? localEventTimeToIso(publishInput, timezone) : null;
  if (!publishAt) {
    return {
      success: false as const,
      message: 'Choose a valid date and time for scheduled publishing.',
    };
  }
  if (new Date(publishAt).getTime() <= Date.now()) {
    return {
      success: false as const,
      message: 'Scheduled publishing must be set to a future date and time.',
    };
  }
  return {
    success: true as const,
    values: { is_published: false, publish_at: publishAt },
    message: 'Event saved and scheduled for publishing.',
  };
}

export async function createEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const result = parseEvent(formData);
  if (!result.success) {
    redirect(destination(businessId, 'error', result.message));
  }
  const publication = publicationValues(formData, result.data.timezone);
  if (!publication.success) {
    redirect(destination(businessId, 'error', publication.message));
  }
  const { supabase } = await ownerClient(businessId);
  const { error } = await supabase.from('events').insert({
    business_id: businessId,
    ...eventValues(result.data),
    ...publication.values,
  });
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/account/businesses/${businessId}/events`);
  redirect(destination(businessId, 'saved', publication.message));
}

export async function updateEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const result = parseEvent(formData);
  if (!result.success) {
    redirect(destination(businessId, 'error', result.message));
  }
  const publication = publicationValues(formData, result.data.timezone);
  if (!publication.success) {
    redirect(destination(businessId, 'error', publication.message));
  }
  const { supabase, businessSlug } = await ownerClient(businessId);
  const { error } = await supabase
    .from('events')
    .update({ ...eventValues(result.data), ...publication.values })
    .eq('id', eventId)
    .eq('business_id', businessId)
    .is('archived_at', null);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/b/${businessSlug}`);
  revalidatePath('/events');
  redirect(destination(businessId, 'saved', publication.message));
}

export async function publishEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const { supabase, businessSlug } = await ownerClient(businessId);
  const { error } = await supabase
    .from('events')
    .update({ is_published: true, publish_at: null })
    .eq('id', eventId)
    .eq('business_id', businessId)
    .is('archived_at', null);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/b/${businessSlug}`);
  revalidatePath('/events');
  redirect(destination(businessId, 'saved', 'Event published.'));
}

export async function unpublishEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const { supabase, businessSlug } = await ownerClient(businessId);
  const { error } = await supabase
    .from('events')
    .update({ is_published: false, publish_at: null })
    .eq('id', eventId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/b/${businessSlug}`);
  revalidatePath('/events');
  redirect(destination(businessId, 'saved', 'Event returned to draft.'));
}

export async function archiveEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const { supabase, businessSlug } = await ownerClient(businessId);
  const { error } = await supabase
    .from('events')
    .update({ archived_at: new Date().toISOString(), is_published: false, publish_at: null })
    .eq('id', eventId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  revalidatePath(`/b/${businessSlug}`);
  revalidatePath('/events');
  redirect(destination(businessId, 'saved', 'Event archived.'));
}

export async function restoreEventAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const eventId = String(formData.get('eventId') ?? '');
  const { supabase } = await ownerClient(businessId);
  const { error } = await supabase
    .from('events')
    .update({ archived_at: null, is_published: false, publish_at: null })
    .eq('id', eventId)
    .eq('business_id', businessId);
  if (error) redirect(destination(businessId, 'error', error.message));
  redirect(destination(businessId, 'saved', 'Event restored as a draft.'));
}
