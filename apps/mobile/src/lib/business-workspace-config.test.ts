import { describe, expect, it } from 'vitest';

import {
  businessHubDestinations,
  businessWorkspaceBackTarget,
  isBusinessSection,
  publishingCheckSection,
  sections,
  visibleBusinessHubDestinations,
} from './business-workspace-config';
import {
  contactEditorPatch,
  locationEditorPatch,
  profileEditorPatch,
} from './business-editor-patches';

it('opens the editor that can resolve each publication requirement', () => {
  for (const key of ['description', 'category'])
    expect(publishingCheckSection(key, false)).toBe('profile');
  expect(publishingCheckSection('contact', false)).toBe('contact');
  expect(publishingCheckSection('hours', false)).toBe('hours');
  expect(publishingCheckSection('location', false)).toBe('location');
  expect(publishingCheckSection('location', true)).toBe('mobile-location');
  for (const key of ['logo', 'cover']) expect(publishingCheckSection(key, false)).toBe('photos');
  expect(publishingCheckSection('future-server-check', false)).toBeNull();
});

describe('Business Hub destination registration', () => {
  it.each(['food_drink', 'retail', 'entertainment_venue', 'mobile', 'general'] as const)(
    'does not offer appointment booking for a %s business',
    (businessType) => {
      expect(
        visibleBusinessHubDestinations({
          isMobile: businessType === 'mobile',
          canEdit: true,
          businessType,
        }).some(({ key }) => key === 'appointments'),
      ).toBe(false);
    },
  );
  it('offers appointments to service owners, but not staff or unknown business types', () => {
    expect(
      visibleBusinessHubDestinations({
        isMobile: false,
        canEdit: true,
        businessType: 'services',
      }).some(({ key }) => key === 'appointments'),
    ).toBe(true);
    expect(
      visibleBusinessHubDestinations({
        isMobile: false,
        canEdit: false,
        businessType: 'services',
      }).some(({ key }) => key === 'appointments'),
    ).toBe(false);
    expect(
      visibleBusinessHubDestinations({ isMobile: false, canEdit: true }).some(
        ({ key }) => key === 'appointments',
      ),
    ).toBe(false);
  });
  it('returns editor gestures to the Hub before leaving the business workspace', () => {
    expect(businessWorkspaceBackTarget('rewards')).toBe('hub');
    expect(businessWorkspaceBackTarget('staff')).toBe('hub');
    expect(businessWorkspaceBackTarget(null)).toBe('businesses');
  });

  it('registers every visible Hub destination as a real editor', () => {
    for (const destination of businessHubDestinations) {
      expect(isBusinessSection(destination.key)).toBe(true);
      expect(sections.some((section) => section.key === destination.key)).toBe(true);
    }
  });

  it('uses one unique destination for every user-facing row', () => {
    expect(new Set(businessHubDestinations.map(({ key }) => key)).size).toBe(
      businessHubDestinations.length,
    );
    expect(new Set(businessHubDestinations.map(({ title }) => title)).size).toBe(
      businessHubDestinations.length,
    );
    expect(businessHubDestinations.some(({ key }) => String(key) === 'details')).toBe(false);
    expect(businessHubDestinations.some(({ key }) => String(key) === 'overview')).toBe(false);
    expect(businessHubDestinations.some(({ key }) => String(key) === 'manage')).toBe(false);
  });

  it('shows mobile controls only to mobile businesses and staff controls only to owners', () => {
    const fixedOwner = visibleBusinessHubDestinations({ isMobile: false, canEdit: true });
    const mobileOwner = visibleBusinessHubDestinations({ isMobile: true, canEdit: true });
    const mobileStaff = visibleBusinessHubDestinations({ isMobile: true, canEdit: false });
    expect(fixedOwner.some(({ key }) => key === 'mobile-location')).toBe(false);
    expect(mobileOwner.some(({ key }) => key === 'mobile-location')).toBe(true);
    expect(mobileOwner.some(({ key }) => key === 'staff')).toBe(true);
    expect(mobileStaff.some(({ key }) => key === 'staff')).toBe(false);
  });
});

describe('focused business editor patches', () => {
  it('profile save changes only profile and branding fields', () => {
    expect(
      profileEditorPatch({
        name: ' Corner Cafe ',
        businessType: 'food_drink',
        description: ' Coffee ',
        primaryColor: '#176b4d',
        accentColor: '#f2b84b',
      }),
    ).toEqual({
      name: 'Corner Cafe',
      business_type: 'food_drink',
      description: 'Coffee',
      primary_color: '#176B4D',
      accent_color: '#F2B84B',
    });
  });

  it('contact save changes only customer contact fields', () => {
    expect(
      contactEditorPatch({
        phone: ' 555-0100 ',
        email: ' hi@example.com ',
        website: 'example.com',
      }),
    ).toEqual({
      phone: '555-0100',
      email: 'hi@example.com',
      website_url: 'https://example.com',
    });
  });

  it('location save changes only location and service-area fields', () => {
    const patch = locationEditorPatch({
      addressLine1: ' 10 Main ',
      city: ' Madison ',
      region: 'wi',
      postalCode: '53703',
      serviceAreaType: 'radius',
      serviceCities: ['Madison'],
      serviceRadiusMiles: 25,
      customServiceArea: 'ignored',
    });
    expect(patch).toMatchObject({
      address_line_1: '10 Main',
      city: 'Madison',
      region_code: 'WI',
      service_radius_miles: 25,
      service_area: null,
    });
    expect(patch).not.toHaveProperty('name');
    expect(patch).not.toHaveProperty('phone');
  });
});
