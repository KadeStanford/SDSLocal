import { describe, expect, it } from 'vitest';

import {
  businessOnboardingDraftKey,
  businessPageAddress,
  clearBusinessOnboardingDraft,
  loadBusinessOnboardingDraft,
  normalizeBusinessOnboardingDraft,
  pageAddressError,
  saveBusinessOnboardingDraft,
  serviceAreaForModel,
  type BusinessOnboardingDraft,
} from './business-onboarding';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

const draft: BusinessOnboardingDraft = {
  version: 1,
  savedAt: 1_000,
  requestId: '11111111-1111-4111-8111-111111111111',
  step: 2,
  name: 'Café Déjà Vu!',
  pageAddress: 'cafe-deja-vu',
  pageAddressCustomized: false,
  businessType: 'food_drink',
  categoryIds: [1, 2],
  description: 'Coffee and pastries',
  serviceModel: 'fixed',
  addressLine1: '1 Main Street',
  city: 'Hammond',
  regionCode: 'LA',
  postalCode: '70401',
  serviceAreaType: 'at_location',
  serviceRadiusMiles: 25,
  serviceCities: [],
  customArea: '',
};

describe('business onboarding', () => {
  it.each([
    ['Café Déjà Vu!', 'cafe-deja-vu'],
    ['  Bayou   Bites  ', 'bayou-bites'],
    ['A', 'a-local'],
    ['🎉', 'local-business'],
  ])('generates a readable page address for %s', (name, expected) => {
    expect(businessPageAddress(name)).toBe(expected);
  });

  it('validates optional customized page addresses', () => {
    expect(pageAddressError('bayou-bites')).toBeNull();
    expect(pageAddressError('Bad Address')).toMatch(/lowercase/);
    expect(pageAddressError('ab')).toMatch(/3/);
  });

  it('maps fixed, service-area, and mobile models to compatible fields', () => {
    expect(serviceAreaForModel('fixed', 'cities')).toBe('at_location');
    expect(serviceAreaForModel('service_area', 'at_location')).toBe('radius');
    expect(serviceAreaForModel('mobile', 'radius')).toBe('at_location');
  });

  it('persists the current step and safely restores valid draft data', () => {
    const storage = memoryStorage();
    saveBusinessOnboardingDraft('user-a', draft, storage);
    expect(loadBusinessOnboardingDraft('user-a', storage, 2_000)).toEqual(draft);
  });

  it('isolates drafts by user and clears only the requested account', () => {
    const storage = memoryStorage();
    saveBusinessOnboardingDraft('user-a', draft, storage);
    saveBusinessOnboardingDraft('user-b', { ...draft, name: 'Other' }, storage);
    clearBusinessOnboardingDraft('user-a', storage);
    expect(loadBusinessOnboardingDraft('user-a', storage, 2_000)).toBeNull();
    expect(loadBusinessOnboardingDraft('user-b', storage, 2_000)?.name).toBe('Other');
  });

  it('expires abandoned drafts and normalizes incompatible values', () => {
    const storage = memoryStorage();
    saveBusinessOnboardingDraft('user-a', draft, storage);
    expect(loadBusinessOnboardingDraft('user-a', storage, 40 * 86_400_000)).toBeNull();
    expect(
      normalizeBusinessOnboardingDraft({ ...draft, step: 99, categoryIds: [1, 1, -2, 3] }, 2_000),
    ).toMatchObject({ step: 3, categoryIds: [1, 3] });
  });

  it('stores no credential fields in the draft', () => {
    expect(JSON.stringify(draft)).not.toMatch(/password|token|credential/i);
    expect(businessOnboardingDraftKey('user-a')).not.toContain('user-b');
  });
});
