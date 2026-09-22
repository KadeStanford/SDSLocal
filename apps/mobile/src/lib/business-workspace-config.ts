import type { BusinessType } from '@sds/types';

export type BusinessSection =
  | 'preview'
  | 'profile'
  | 'contact'
  | 'hours'
  | 'ordering'
  | 'location'
  | 'mobile-location'
  | 'offerings'
  | 'events'
  | 'updates'
  | 'rewards'
  | 'photos'
  | 'staff'
  | 'qr'
  | 'sharing'
  | 'review';

export type BusinessHubGroup = 'CUSTOMER EXPERIENCE' | 'OPERATIONS' | 'MARKETING AND VISIBILITY';

export interface BusinessHubDestination {
  readonly key: BusinessSection;
  readonly group: BusinessHubGroup;
  readonly title: string;
  readonly icon:
    | 'person.crop.circle'
    | 'phone.fill'
    | 'list.bullet.rectangle'
    | 'photo.on.rectangle'
    | 'megaphone.fill'
    | 'calendar'
    | 'clock.fill'
    | 'map.fill'
    | 'mappin.and.ellipse'
    | 'gift.fill'
    | 'person.2.fill'
    | 'qrcode'
    | 'square.and.arrow.up'
    | 'checkmark.seal.fill';
  readonly mobileOnly?: true;
  readonly ownerOnly?: true;
}

/** The single source of truth for every row rendered in the Business Hub. */
export const businessHubDestinations: readonly BusinessHubDestination[] = [
  {
    key: 'profile',
    group: 'CUSTOMER EXPERIENCE',
    title: 'Profile and branding',
    icon: 'person.crop.circle',
  },
  {
    key: 'contact',
    group: 'CUSTOMER EXPERIENCE',
    title: 'Contact information',
    icon: 'phone.fill',
  },
  {
    key: 'offerings',
    group: 'CUSTOMER EXPERIENCE',
    title: 'Offerings or menu',
    icon: 'list.bullet.rectangle',
  },
  {
    key: 'photos',
    group: 'CUSTOMER EXPERIENCE',
    title: 'Photos and gallery',
    icon: 'photo.on.rectangle',
  },
  { key: 'updates', group: 'CUSTOMER EXPERIENCE', title: 'Updates', icon: 'megaphone.fill' },
  { key: 'events', group: 'CUSTOMER EXPERIENCE', title: 'Events', icon: 'calendar' },
  { key: 'hours', group: 'OPERATIONS', title: 'Hours', icon: 'clock.fill' },
  {
    key: 'ordering',
    group: 'OPERATIONS',
    title: 'Ordering & payments',
    icon: 'list.bullet.rectangle',
    ownerOnly: true,
  },
  { key: 'location', group: 'OPERATIONS', title: 'Locations and service area', icon: 'map.fill' },
  {
    key: 'mobile-location',
    group: 'OPERATIONS',
    title: 'Mobile-business location controls',
    icon: 'mappin.and.ellipse',
    mobileOnly: true,
  },
  { key: 'rewards', group: 'OPERATIONS', title: 'Rewards', icon: 'gift.fill' },
  {
    key: 'staff',
    group: 'OPERATIONS',
    title: 'Staff and scanner access',
    icon: 'person.2.fill',
    ownerOnly: true,
  },
  {
    key: 'qr',
    group: 'MARKETING AND VISIBILITY',
    title: 'QR and promotional materials',
    icon: 'qrcode',
  },
  {
    key: 'sharing',
    group: 'MARKETING AND VISIBILITY',
    title: 'Sharing',
    icon: 'square.and.arrow.up',
  },
  {
    key: 'review',
    group: 'MARKETING AND VISIBILITY',
    title: 'Publishing and visibility',
    icon: 'checkmark.seal.fill',
  },
] as const;

export const businessHubGroups: readonly BusinessHubGroup[] = [
  'CUSTOMER EXPERIENCE',
  'OPERATIONS',
  'MARKETING AND VISIBILITY',
];

export function visibleBusinessHubDestinations(input: {
  readonly isMobile: boolean;
  readonly canEdit: boolean;
}) {
  return businessHubDestinations.filter(
    (destination) =>
      (!destination.mobileOnly || input.isMobile) && (!destination.ownerOnly || input.canEdit),
  );
}

export function businessWorkspaceBackTarget(section: BusinessSection | null) {
  return section ? ('hub' as const) : ('businesses' as const);
}

export type ServiceAreaType = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';
export type UploadRole = 'logo' | 'cover' | 'gallery' | 'offering' | 'event' | 'event_gallery';

export const sections: readonly { readonly key: BusinessSection; readonly label: string }[] = [
  { key: 'preview', label: 'Page preview' },
  { key: 'profile', label: 'Profile and branding' },
  { key: 'contact', label: 'Contact information' },
  { key: 'hours', label: 'Hours' },
  { key: 'ordering', label: 'Ordering & payments' },
  { key: 'location', label: 'Locations and service area' },
  { key: 'mobile-location', label: 'Mobile location' },
  { key: 'offerings', label: 'Services' },
  { key: 'photos', label: 'Photos' },
  { key: 'events', label: 'Events' },
  { key: 'updates', label: 'Updates' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'staff', label: 'Staff' },
  { key: 'qr', label: 'QR materials' },
  { key: 'sharing', label: 'Sharing' },
  { key: 'review', label: 'Publish' },
];

export const sectionDescriptions: Record<BusinessSection, string> = {
  preview: 'See the customer-facing page exactly as visitors will see it.',
  profile: 'Shape the identity customers see across SDS Local.',
  contact: 'Keep the ways customers reach you accurate.',
  hours: 'Set a normal weekly schedule customers can rely on.',
  ordering: 'Connect Square or Stripe, configure pickup, and manage customer orders.',
  location: 'Set the address and area where you serve customers.',
  'mobile-location': 'Publish where your mobile business will be and when.',
  offerings: 'Organize the products or services customers can browse.',
  events: 'Create events, add a cover and gallery, then publish or schedule them.',
  updates: 'Send a useful announcement or special offer to followers who opted in.',
  rewards: 'Set up the loyalty program customers can join.',
  photos: 'Add polished images, captions, and the order they appear in.',
  staff: 'Give trusted team members limited access to Staff Scan.',
  qr: 'Create branded materials customers can scan.',
  sharing: 'Share your customer page from the app.',
  review: 'Check your profile and submit it for SDS review.',
};

/** Labels used by the workspace so owners see language that matches their business. */
export function workspaceSectionLabel(
  section: BusinessSection,
  businessType?: BusinessType | null,
) {
  if (section === 'preview') return 'Page preview';
  if (section !== 'offerings')
    return sections.find((item) => item.key === section)?.label ?? section;
  return businessType === 'food_drink' || businessType === 'mobile' ? 'Menu' : 'Services';
}

export function workspaceOfferingTerminology(businessType?: BusinessType | null) {
  const menu = businessType === 'food_drink' || businessType === 'mobile';
  return menu
    ? { item: 'menu item', items: 'menu', section: 'menu category', sections: 'menu categories' }
    : {
        item: 'service',
        items: 'services',
        section: 'service category',
        sections: 'service categories',
      };
}

export const stateCodes = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
] as const;

export const radiusChoices = [5, 10, 15, 25, 50, 100] as const;
export const serviceAreaTypes: readonly {
  readonly value: ServiceAreaType;
  readonly label: string;
}[] = [
  { value: 'at_location', label: 'At my location' },
  { value: 'radius', label: 'Mile radius' },
  { value: 'cities', label: 'Specific cities' },
  { value: 'statewide', label: 'Entire state' },
  { value: 'custom', label: 'Custom area' },
];

export function isBusinessSection(value: string | string[] | undefined): value is BusinessSection {
  return typeof value === 'string' && sections.some((section) => section.key === value);
}

export function variantPlan(role: UploadRole) {
  if (role === 'logo') {
    return [
      { name: 'logo_small', maxDimension: 128, quality: 0.84 },
      { name: 'logo_standard', maxDimension: 256, quality: 0.86 },
      { name: 'logo_high_density', maxDimension: 512, quality: 0.88 },
    ] as const;
  }
  if (role === 'cover') {
    return [{ name: 'cover', maxDimension: 1920, quality: 0.84 }] as const;
  }
  if (role === 'event') {
    return [{ name: 'event_card', maxDimension: 1200, quality: 0.82 }] as const;
  }
  return [
    { name: 'thumbnail', maxDimension: 320, quality: 0.8 },
    { name: 'card', maxDimension: 800, quality: 0.82 },
    { name: 'full', maxDimension: 1600, quality: 0.84 },
  ] as const;
}
