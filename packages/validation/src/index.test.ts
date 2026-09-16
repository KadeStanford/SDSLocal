import { describe, expect, it } from 'vitest';

import {
  businessHourSchema,
  businessDetailsSchema,
  businessOnboardingSchema,
  customerProfileSchema,
  emailOtpSchema,
  eventSchema,
  passwordRecoverySchema,
  serviceAreaSchema,
  signUpSchema,
} from './index';

describe('identity validation', () => {
  it('normalizes a valid account registration', () => {
    expect(
      signUpSchema.parse({
        displayName: '  Casey Local  ',
        email: 'CASEY@EXAMPLE.COM',
        password: 'Neighborhood9',
      }),
    ).toEqual({
      displayName: 'Casey Local',
      email: 'casey@example.com',
      password: 'Neighborhood9',
    });
  });

  it('rejects a weak password', () => {
    expect(
      signUpSchema.safeParse({
        displayName: 'Casey Local',
        email: 'casey@example.com',
        password: 'alllowercase',
      }).success,
    ).toBe(false);
  });

  it('validates matching passwords and a six-digit recovery code', () => {
    expect(
      passwordRecoverySchema.safeParse({
        email: 'casey@example.com',
        code: '123456',
        password: 'Neighborhood10',
        passwordConfirmation: 'Neighborhood10',
      }).success,
    ).toBe(true);
    expect(
      passwordRecoverySchema.safeParse({
        email: 'casey@example.com',
        code: '12345',
        password: 'Neighborhood10',
        passwordConfirmation: 'Different11',
      }).success,
    ).toBe(false);
  });

  it('validates and normalizes an email sign-in code', () => {
    expect(emailOtpSchema.parse({ email: 'CASEY@EXAMPLE.COM', code: '123456' })).toEqual({
      email: 'casey@example.com',
      code: '123456',
    });
    expect(emailOtpSchema.safeParse({ email: 'casey@example.com', code: '12345' }).success).toBe(
      false,
    );
  });

  it('normalizes blank optional profile fields', () => {
    expect(
      customerProfileSchema.parse({
        displayName: 'Casey Local',
        city: ' ',
        regionCode: '',
        postalCode: '',
      }),
    ).toEqual({ displayName: 'Casey Local' });
  });
});

describe('event validation', () => {
  const validEvent = {
    title: 'Main Street Music Night',
    slug: 'main-street-music-night',
    description: 'An evening of live local music and food.',
    startsAt: '2030-10-20T23:00:00.000Z',
    endsAt: '2030-10-21T01:00:00.000Z',
    timezone: 'America/Chicago',
    locationMode: 'business',
    externalUrl: null,
  } as const;

  it('accepts a structured event', () => {
    expect(eventSchema.safeParse(validEvent).success).toBe(true);
  });

  it('requires a different-address event to include its address', () => {
    expect(
      eventSchema.safeParse({ ...validEvent, locationMode: 'custom', addressText: '' }).success,
    ).toBe(false);
  });

  it('requires the end time to follow the start time', () => {
    expect(
      eventSchema.safeParse({ ...validEvent, endsAt: '2030-10-20T22:00:00.000Z' }).success,
    ).toBe(false);
  });
});

describe('business onboarding validation', () => {
  it('rejects unsupported appearance choices', () => {
    expect(
      businessDetailsSchema.safeParse({
        name: 'Main Street Coffee',
        slug: 'main-street-coffee',
        businessType: 'food_drink',
        description: '',
        categoryIds: [],
        hours: [],
        countryCode: 'US',
        serviceAreaType: 'at_location',
        serviceAreaRegions: [],
        primaryColor: '#176B4D',
        accentColor: '#E99B45',
        pageTheme: 'neon',
        fontPair: 'friendly_sans',
        buttonStyle: 'rounded',
      }).success,
    ).toBe(false);
  });

  it('requires a city when city-based service is selected', () => {
    expect(
      serviceAreaSchema.safeParse({
        regionCode: 'LA',
        serviceAreaType: 'cities',
        serviceAreaRegions: [],
      }).success,
    ).toBe(false);
  });

  it('accepts statewide service when a state is selected', () => {
    expect(
      serviceAreaSchema.safeParse({
        regionCode: 'LA',
        serviceAreaType: 'statewide',
        serviceAreaRegions: [],
      }).success,
    ).toBe(true);
  });

  it('accepts a closed day without times', () => {
    expect(
      businessHourSchema.safeParse({
        dayOfWeek: 0,
        intervalNumber: 1,
        opensAt: null,
        closesAt: null,
        isClosed: true,
      }).success,
    ).toBe(true);
  });

  it('requires latitude and longitude together', () => {
    expect(
      businessOnboardingSchema.safeParse({
        name: 'Main Street Coffee',
        slug: 'main-street-coffee',
        businessType: 'food_drink',
        description: '',
        categoryIds: [],
        hours: [],
        countryCode: 'US',
        latitude: 30.224,
        primaryColor: '#176B4D',
        accentColor: '#E99B45',
      }).success,
    ).toBe(false);
  });
});
