'use server';

import { businessDetailsSchema } from '@sds/validation';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export interface BusinessDetailsFormState {
  readonly message?: string;
  readonly errors?: Record<string, string[]>;
}

const days = Array.from({ length: 7 }, (_, index) => index);

export async function updateBusinessDetailsAction(
  _state: BusinessDetailsFormState,
  formData: FormData,
): Promise<BusinessDetailsFormState> {
  const businessId = String(formData.get('businessId') ?? '');
  const hours = days.map((dayOfWeek) => {
    const isClosed = formData.get(`closed-${dayOfWeek}`) === 'on';
    return {
      dayOfWeek,
      intervalNumber: 1,
      opensAt: isClosed ? null : String(formData.get(`opens-${dayOfWeek}`) ?? ''),
      closesAt: isClosed ? null : String(formData.get(`closes-${dayOfWeek}`) ?? ''),
      isClosed,
    };
  });

  const result = businessDetailsSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    businessType: formData.get('businessType'),
    description: formData.get('description'),
    categoryIds: formData.getAll('categoryIds').map(Number),
    hours,
    phone: formData.get('phone'),
    email: formData.get('email'),
    websiteUrl: formData.get('websiteUrl'),
    addressLine1: formData.get('addressLine1'),
    addressLine2: formData.get('addressLine2'),
    city: formData.get('city'),
    regionCode: formData.get('regionCode'),
    postalCode: formData.get('postalCode'),
    countryCode: 'US',
    serviceAreaType: formData.get('serviceAreaType'),
    serviceAreaRegions: formData.getAll('serviceAreaRegions').map(String),
    serviceRadiusMiles: formData.get('serviceRadiusMiles')
      ? Number(formData.get('serviceRadiusMiles'))
      : undefined,
    serviceArea: formData.get('serviceArea') ?? '',
    primaryColor: formData.get('primaryColor'),
    accentColor: formData.get('accentColor'),
    pageTheme: formData.get('pageTheme'),
    fontPair: formData.get('fontPair'),
    buttonStyle: formData.get('buttonStyle'),
    timezone: formData.get('timezone'),
  });

  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { message: 'Please sign in again.' };

  const { data: membership } = await supabase
    .from('business_members')
    .select('businesses(slug)')
    .eq('business_id', businessId)
    .eq('user_id', authData.user.id)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle();
  const joined = membership?.businesses;
  const currentBusiness = Array.isArray(joined) ? joined[0] : joined;
  if (!currentBusiness) return { message: 'You do not have permission to edit this business.' };

  const input = result.data;
  const { error } = await supabase.rpc('update_business_details_v2', {
    p_business_id: businessId,
    p_name: input.name,
    p_slug: input.slug,
    p_business_type: input.businessType,
    p_description: input.description,
    p_category_ids: input.categoryIds,
    p_hours: input.hours.map((hour) => ({
      day_of_week: hour.dayOfWeek,
      interval_number: hour.intervalNumber,
      opens_at: hour.opensAt,
      closes_at: hour.closesAt,
      is_closed: hour.isClosed,
    })),
    p_phone: input.phone ?? null,
    p_email: input.email ?? null,
    p_website_url: input.websiteUrl ?? null,
    p_address_line_1: input.addressLine1 ?? null,
    p_address_line_2: input.addressLine2 ?? null,
    p_city: input.city ?? null,
    p_region_code: input.regionCode ?? null,
    p_postal_code: input.postalCode ?? null,
    p_country_code: input.countryCode,
    p_service_area_type: input.serviceAreaType,
    p_service_area_regions: input.serviceAreaRegions,
    p_service_radius_miles: input.serviceRadiusMiles ?? null,
    p_service_area: input.serviceArea ?? null,
    p_primary_color: input.primaryColor,
    p_accent_color: input.accentColor,
    p_page_theme: input.pageTheme,
    p_font_pair: input.fontPair,
    p_button_style: input.buttonStyle,
  });

  if (error) {
    if (error.code === '23505') return { message: 'That page address is already taken.' };
    return { message: error.message };
  }

  const { error: timezoneError } = await supabase
    .from('businesses')
    .update({ timezone: input.timezone })
    .eq('id', businessId);
  if (timezoneError) return { message: timezoneError.message };

  revalidatePath('/account');
  revalidatePath(`/b/${currentBusiness.slug}`);
  revalidatePath(`/b/${input.slug}`);
  redirect(`/account/businesses/${businessId}/settings?saved=Business+details+saved`);
}

export async function submitBusinessForReviewAction(formData: FormData) {
  const businessId = String(formData.get('businessId') ?? '');
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect('/auth');

  const { error } = await supabase.rpc('submit_business_for_review', {
    p_business_id: businessId,
  });
  if (error) {
    redirect(
      `/account/businesses/${businessId}/settings?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath('/account');
  revalidatePath('/admin/reviews');
  redirect(`/account/businesses/${businessId}/settings?saved=Submitted+for+SDS+review`);
}
