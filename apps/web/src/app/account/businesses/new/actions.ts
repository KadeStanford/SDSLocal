'use server';

import { businessOnboardingSchema } from '@sds/validation';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export interface BusinessFormState {
  readonly message?: string;
  readonly errors?: Record<string, string[]>;
}

const days = Array.from({ length: 7 }, (_, index) => index);

export async function createBusinessAction(
  _state: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  const hours = days.map((dayOfWeek) => {
    const isClosed = formData.get(`closed-${dayOfWeek}`) === 'on';
    return {
      dayOfWeek,
      intervalNumber: 1,
      opensAt: isClosed ? null : String(formData.get(`opens-${dayOfWeek}`) ?? '09:00'),
      closesAt: isClosed ? null : String(formData.get(`closes-${dayOfWeek}`) ?? '17:00'),
      isClosed,
    };
  });

  const result = businessOnboardingSchema.safeParse({
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
  });

  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { message: 'Please sign in again.' };

  const input = result.data;
  const { error } = await supabase.rpc('create_business_with_owner_v2', {
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
    p_phone: input.phone,
    p_email: input.email,
    p_website_url: input.websiteUrl,
    p_address_line_1: input.addressLine1,
    p_address_line_2: input.addressLine2,
    p_city: input.city,
    p_region_code: input.regionCode,
    p_postal_code: input.postalCode,
    p_country_code: input.countryCode,
    p_service_area: input.serviceArea,
    p_service_area_type: input.serviceAreaType,
    p_service_area_regions: input.serviceAreaRegions,
    p_service_radius_miles: input.serviceRadiusMiles,
    p_primary_color: input.primaryColor,
    p_accent_color: input.accentColor,
  });

  if (error) {
    if (error.code === '23505') return { message: 'That web address is already taken.' };
    return { message: error.message };
  }

  redirect('/account?created=1');
}
