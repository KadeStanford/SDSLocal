import { z } from 'zod';

export const textLimits = {
  businessName: 120,
  businessDescription: 2_000,
  offeringName: 120,
  offeringDescription: 1_000,
  eventTitle: 160,
  eventDescription: 5_000,
  rewardDescription: 500,
  altText: 240,
} as const;

export const usRegionOptions = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
] as const;

const usRegionCodes = usRegionOptions.map(([code]) => code) as [
  (typeof usRegionOptions)[number][0],
  ...(typeof usRegionOptions)[number][0][],
];
const optionalUsRegion = z
  .union([z.literal(''), z.enum(usRegionCodes)])
  .optional()
  .transform((value) => value || undefined);
const optionalUsPostalCode = z
  .union([
    z.literal(''),
    z.string().regex(/^\d{5}(?:-\d{4})?$/, 'Enter a 5-digit ZIP code or ZIP+4.'),
  ])
  .optional()
  .transform((value) => value || undefined);

export const slugSchema = z
  .string()
  .min(3)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens.');

export const businessTypeSchema = z.enum([
  'food_drink',
  'services',
  'retail',
  'entertainment_venue',
  'mobile',
  'general',
]);

export const serviceAreaTypeSchema = z.enum([
  'at_location',
  'radius',
  'cities',
  'statewide',
  'custom',
]);

export const pageThemeSchema = z.enum(['light', 'dark']);
export const fontPairSchema = z.enum(['friendly_sans', 'modern_sans', 'classic_serif']);
export const buttonStyleSchema = z.enum(['rounded', 'soft', 'square']);

const serviceRadiusSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(25),
  z.literal(50),
  z.literal(100),
]);

const optionalTrimmedString = (maximum: number) =>
  z
    .string()
    .trim()
    .max(maximum)
    .optional()
    .transform((value) => value || undefined);

export const emailSchema = z
  .email('Enter a valid email address.')
  .max(254)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters.')
  .max(72, 'Use no more than 72 characters.')
  .regex(/[a-z]/, 'Include a lowercase letter.')
  .regex(/[A-Z]/, 'Include an uppercase letter.')
  .regex(/[0-9]/, 'Include a number.');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const magicLinkSchema = z.object({ email: emailSchema });

export const emailOtpSchema = z.object({
  email: emailSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit sign-in code.'),
});

export type EmailOtpInput = z.infer<typeof emailOtpSchema>;

export const passwordRecoverySchema = z
  .object({
    email: emailSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Enter the 6-digit reset code.'),
    password: passwordSchema,
    passwordConfirmation: z.string(),
  })
  .refine((value) => value.password === value.passwordConfirmation, {
    message: 'Passwords do not match.',
    path: ['passwordConfirmation'],
  });

export const customerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  city: optionalTrimmedString(100),
  regionCode: optionalUsRegion,
  postalCode: optionalUsPostalCode,
});

export const serviceAreaSchema = z
  .object({
    regionCode: optionalUsRegion,
    serviceAreaType: serviceAreaTypeSchema,
    serviceAreaRegions: z.array(z.string().trim().min(1).max(100)).max(25).default([]),
    serviceRadiusMiles: serviceRadiusSchema.optional(),
    serviceArea: optionalTrimmedString(240),
  })
  .superRefine((value, context) => {
    if (value.serviceAreaType === 'cities' && value.serviceAreaRegions.length === 0) {
      context.addIssue({
        code: 'custom',
        message: 'Add at least one city.',
        path: ['serviceAreaRegions'],
      });
    }
    if (value.serviceAreaType === 'statewide' && !value.regionCode) {
      context.addIssue({
        code: 'custom',
        message: 'Select a state for statewide service.',
        path: ['regionCode'],
      });
    }
    if (value.serviceAreaType === 'radius' && !value.serviceRadiusMiles) {
      context.addIssue({
        code: 'custom',
        message: 'Select a service radius.',
        path: ['serviceRadiusMiles'],
      });
    }
    if (value.serviceAreaType === 'custom' && !value.serviceArea) {
      context.addIssue({
        code: 'custom',
        message: 'Describe the custom service area.',
        path: ['serviceArea'],
      });
    }
  });

export const businessHourSchema = z
  .object({
    dayOfWeek: z.int().min(0).max(6),
    intervalNumber: z.int().min(1).max(2).default(1),
    opensAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    closesAt: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    isClosed: z.boolean(),
  })
  .refine(
    (value) =>
      value.isClosed
        ? value.opensAt === null && value.closesAt === null
        : value.opensAt !== null && value.closesAt !== null && value.opensAt !== value.closesAt,
    { message: 'Open days require different opening and closing times.' },
  );

export const businessOnboardingSchema = z
  .object({
    name: z.string().trim().min(2).max(textLimits.businessName),
    slug: slugSchema,
    businessType: businessTypeSchema,
    description: z.string().trim().max(textLimits.businessDescription).default(''),
    categoryIds: z.array(z.int().positive()).max(5).default([]),
    hours: z.array(businessHourSchema).max(14).default([]),
    phone: optionalTrimmedString(32),
    email: z
      .union([z.literal(''), emailSchema])
      .optional()
      .transform((value) => value || undefined),
    websiteUrl: z
      .union([z.literal(''), z.url().max(2_048)])
      .optional()
      .transform((value) => value || undefined),
    addressLine1: optionalTrimmedString(160),
    addressLine2: optionalTrimmedString(160),
    city: optionalTrimmedString(100),
    regionCode: optionalUsRegion,
    postalCode: optionalUsPostalCode,
    countryCode: z.string().trim().length(2).toUpperCase().default('US'),
    serviceAreaType: serviceAreaTypeSchema.default('at_location'),
    serviceAreaRegions: z.array(z.string().trim().min(1).max(100)).max(25).default([]),
    serviceRadiusMiles: serviceRadiusSchema.optional(),
    serviceArea: optionalTrimmedString(240),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#176B4D'),
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#E99B45'),
  })
  .refine((value) => (value.latitude === undefined) === (value.longitude === undefined), {
    message: 'Latitude and longitude must be provided together.',
    path: ['latitude'],
  })
  .superRefine((value, context) => {
    const serviceArea = serviceAreaSchema.safeParse(value);
    if (!serviceArea.success) {
      for (const issue of serviceArea.error.issues) {
        context.addIssue({
          code: 'custom',
          message: issue.message,
          path: issue.path,
        });
      }
    }
  });

export const businessProfileSchema = z.object({
  name: z.string().trim().min(2).max(textLimits.businessName),
  slug: slugSchema,
  type: businessTypeSchema,
  description: z.string().trim().max(textLimits.businessDescription),
  phone: z.string().trim().max(32).optional(),
  email: z.email().max(254).optional(),
  websiteUrl: z.url().max(2_048).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export const eventTimezoneSchema = z.enum([
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
]);

export const businessDetailsSchema = businessOnboardingSchema.and(
  z.object({
    pageTheme: pageThemeSchema,
    fontPair: fontPairSchema,
    buttonStyle: buttonStyleSchema,
    timezone: eventTimezoneSchema,
  }),
);

export const offeringSectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: optionalTrimmedString(500),
  isVisible: z.boolean().default(true),
});

export const offeringSchema = z
  .object({
    name: z.string().trim().min(1).max(textLimits.offeringName),
    description: z.string().trim().max(textLimits.offeringDescription),
    priceMinor: z.int().nonnegative().max(100_000_000).nullable(),
    priceText: z.string().trim().max(80).nullable(),
    currency: z.string().length(3).toUpperCase().default('USD'),
    isAvailable: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
  })
  .refine((value) => value.priceMinor !== null || Boolean(value.priceText), {
    message: 'Choose a price type and provide its required value.',
    path: ['priceMinor'],
  });

export const eventLocationModeSchema = z.enum(['business', 'custom', 'online']);

export const eventSchema = z
  .object({
    title: z.string().trim().min(2).max(textLimits.eventTitle),
    slug: slugSchema,
    description: z.string().trim().min(10).max(textLimits.eventDescription),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    timezone: eventTimezoneSchema,
    locationMode: eventLocationModeSchema,
    addressText: optionalTrimmedString(320),
    externalUrl: z.url().max(2_048).nullable(),
    ageNote: optionalTrimmedString(120),
    capacityText: optionalTrimmedString(120),
  })
  .superRefine((value, context) => {
    if (value.endsAt && Date.parse(value.endsAt) <= Date.parse(value.startsAt)) {
      context.addIssue({
        code: 'custom',
        message: 'End time must be after the start time.',
        path: ['endsAt'],
      });
    }
    if (value.locationMode === 'custom' && !value.addressText) {
      context.addIssue({
        code: 'custom',
        message: 'Enter the event address.',
        path: ['addressText'],
      });
    }
  });

export const loyaltyProgramSchema = z
  .object({
    programType: z.enum(['visits', 'points']).default('visits'),
    name: z.string().trim().min(2).max(120),
    rewardDescription: z.string().trim().min(2).max(textLimits.rewardDescription),
    stampsRequired: z.int().min(2).max(30).default(10),
    pointsPerDollar: z.number().positive().max(1_000).optional(),
    pointsRequired: z.int().min(1).max(1_000_000).optional(),
    terms: z.string().trim().max(2_000),
  })
  .superRefine((value, context) => {
    if (value.programType === 'points') {
      if (!value.pointsPerDollar) {
        context.addIssue({
          code: 'custom',
          message: 'Enter how many points each dollar earns.',
          path: ['pointsPerDollar'],
        });
      }
      if (!value.pointsRequired) {
        context.addIssue({
          code: 'custom',
          message: 'Enter the points needed to redeem a reward.',
          path: ['pointsRequired'],
        });
      }
    }
  });

export const publicClientEnvironmentSchema = z.object({
  appEnvironment: z.enum(['development', 'staging', 'production']),
  siteUrl: z.url(),
  supabaseUrl: z.url(),
  supabaseAnonKey: z.string().min(20),
});

export type BusinessProfileInput = z.infer<typeof businessProfileSchema>;
export type BusinessDetailsInput = z.infer<typeof businessDetailsSchema>;
export type OfferingSectionInput = z.infer<typeof offeringSectionSchema>;
export type OfferingInput = z.infer<typeof offeringSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type EventTimezone = z.infer<typeof eventTimezoneSchema>;
export type EventLocationMode = z.infer<typeof eventLocationModeSchema>;
export type LoyaltyProgramInput = z.infer<typeof loyaltyProgramSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type PasswordRecoveryInput = z.infer<typeof passwordRecoverySchema>;
export type CustomerProfileInput = z.infer<typeof customerProfileSchema>;
export type ServiceAreaInput = z.infer<typeof serviceAreaSchema>;
export type BusinessOnboardingInput = z.infer<typeof businessOnboardingSchema>;
