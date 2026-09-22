import type { BusinessType } from '@sds/types';

import type { ServiceAreaType } from './business-workspace-config';

export function profileEditorPatch(input: {
  readonly name: string;
  readonly businessType: BusinessType;
  readonly description: string;
  readonly primaryColor: string;
  readonly accentColor: string;
}) {
  return {
    name: input.name.trim(),
    business_type: input.businessType,
    description: input.description.trim(),
    primary_color: input.primaryColor.toUpperCase(),
    accent_color: input.accentColor.toUpperCase(),
  } as const;
}

export function contactEditorPatch(input: {
  readonly phone: string;
  readonly email: string;
  readonly website: string;
}) {
  const website = input.website.trim();
  return {
    phone: input.phone.trim() || null,
    email: input.email.trim() || null,
    website_url: website ? (/^https?:\/\//i.test(website) ? website : `https://${website}`) : null,
  } as const;
}

export function locationEditorPatch(input: {
  readonly addressLine1: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
  readonly serviceAreaType: ServiceAreaType;
  readonly serviceCities: readonly string[];
  readonly serviceRadiusMiles: number;
  readonly customServiceArea: string;
}) {
  return {
    address_line_1: input.addressLine1.trim() || null,
    city: input.city.trim() || null,
    region_code: input.region.trim().toUpperCase() || null,
    postal_code: input.postalCode.trim() || null,
    service_area_type: input.serviceAreaType,
    service_area_regions: input.serviceAreaType === 'cities' ? [...input.serviceCities] : [],
    service_radius_miles: input.serviceAreaType === 'radius' ? input.serviceRadiusMiles : null,
    service_area:
      input.serviceAreaType === 'custom' ? input.customServiceArea.trim() || null : null,
  } as const;
}
