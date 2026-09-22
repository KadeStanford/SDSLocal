export type OnboardingBusinessType =
  'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
export type OnboardingServiceModel = 'fixed' | 'service_area' | 'mobile';
export type OnboardingServiceArea = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';
export type OrderingProvider = 'square' | 'stripe' | 'none';

export interface BusinessOnboardingDraft {
  readonly version: 1;
  readonly savedAt: number;
  readonly requestId: string;
  readonly step: number;
  readonly name: string;
  readonly pageAddress: string;
  readonly pageAddressCustomized: boolean;
  readonly businessType: OnboardingBusinessType;
  readonly categoryIds: readonly number[];
  readonly description: string;
  readonly serviceModel: OnboardingServiceModel;
  readonly addressLine1: string;
  readonly city: string;
  readonly regionCode: string;
  readonly postalCode: string;
  readonly serviceAreaType: OnboardingServiceArea;
  readonly serviceRadiusMiles: 5 | 10 | 15 | 25 | 50 | 100;
  readonly serviceCities: readonly string[];
  readonly customArea: string;
  readonly setupSquareOrdering?: boolean;
  readonly setupOrderingProvider?: OrderingProvider;
}

export const businessOnboardingDraftMaxAgeMs = 30 * 24 * 60 * 60 * 1000;
const businessTypes: readonly OnboardingBusinessType[] = [
  'food_drink',
  'services',
  'retail',
  'entertainment_venue',
  'mobile',
  'general',
];
const serviceModels: readonly OnboardingServiceModel[] = ['fixed', 'service_area', 'mobile'];
const serviceAreas: readonly OnboardingServiceArea[] = [
  'at_location',
  'radius',
  'cities',
  'statewide',
  'custom',
];
const radii = [5, 10, 15, 25, 50, 100] as const;
const pageAddressPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function businessOnboardingDraftKey(userId: string) {
  return `sds-local:business-onboarding:${userId}`;
}

export function businessPageAddress(value: string) {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (normalized.length >= 3) return normalized;
  if (normalized.length > 0) return `${normalized}-local`.slice(0, 80);
  return 'local-business';
}

export function pageAddressError(value: string) {
  if (value.length < 3) return 'Use at least 3 characters.';
  if (value.length > 80) return 'Use no more than 80 characters.';
  if (!pageAddressPattern.test(value)) return 'Use lowercase letters, numbers, and hyphens.';
  return null;
}

export function serviceAreaForModel(
  model: OnboardingServiceModel,
  selected: OnboardingServiceArea,
) {
  if (model === 'fixed') return 'at_location' as const;
  if (model === 'mobile') return 'at_location' as const;
  return selected === 'at_location' ? ('radius' as const) : selected;
}

function text(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.slice(0, maximum) : '';
}

export function normalizeBusinessOnboardingDraft(
  value: unknown,
  now = Date.now(),
): BusinessOnboardingDraft | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    item.version !== 1 ||
    typeof item.savedAt !== 'number' ||
    now - item.savedAt > businessOnboardingDraftMaxAgeMs ||
    typeof item.requestId !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(item.requestId)
  ) {
    return null;
  }
  const businessType = businessTypes.includes(item.businessType as OnboardingBusinessType)
    ? (item.businessType as OnboardingBusinessType)
    : 'services';
  const serviceModel = serviceModels.includes(item.serviceModel as OnboardingServiceModel)
    ? (item.serviceModel as OnboardingServiceModel)
    : businessType === 'mobile'
      ? 'mobile'
      : 'fixed';
  const serviceAreaType = serviceAreas.includes(item.serviceAreaType as OnboardingServiceArea)
    ? (item.serviceAreaType as OnboardingServiceArea)
    : 'at_location';
  const pageAddress = text(item.pageAddress, 80);
  return {
    version: 1,
    savedAt: item.savedAt,
    requestId: item.requestId,
    step: Math.min(3, Math.max(0, Number.isInteger(item.step) ? Number(item.step) : 0)),
    name: text(item.name, 120),
    pageAddress: pageAddressError(pageAddress)
      ? businessPageAddress(text(item.name, 120))
      : pageAddress,
    pageAddressCustomized: Boolean(item.pageAddressCustomized),
    businessType: serviceModel === 'mobile' ? 'mobile' : businessType,
    categoryIds: Array.isArray(item.categoryIds)
      ? [
          ...new Set(item.categoryIds.filter((id): id is number => Number.isInteger(id) && id > 0)),
        ].slice(0, 5)
      : [],
    description: text(item.description, 2_000),
    serviceModel,
    addressLine1: text(item.addressLine1, 160),
    city: text(item.city, 100),
    regionCode: /^[A-Z]{2}$/.test(String(item.regionCode ?? '')) ? String(item.regionCode) : '',
    postalCode: text(item.postalCode, 10),
    serviceAreaType: serviceAreaForModel(serviceModel, serviceAreaType),
    serviceRadiusMiles: radii.includes(item.serviceRadiusMiles as (typeof radii)[number])
      ? (item.serviceRadiusMiles as (typeof radii)[number])
      : 25,
    serviceCities: Array.isArray(item.serviceCities)
      ? item.serviceCities
          .filter((city): city is string => typeof city === 'string' && city.trim().length > 0)
          .map((city) => city.trim().slice(0, 100))
          .slice(0, 25)
      : [],
    customArea: text(item.customArea, 240),
    ...(item.setupSquareOrdering === true ? { setupSquareOrdering: true } : {}),
    ...(item.setupOrderingProvider === 'stripe' || item.setupOrderingProvider === 'square'
      ? { setupOrderingProvider: item.setupOrderingProvider }
      : item.setupSquareOrdering === true
        ? { setupOrderingProvider: 'square' as const }
        : {}),
  };
}

export function saveBusinessOnboardingDraft(
  userId: string,
  draft: BusinessOnboardingDraft,
  storage: Pick<Storage, 'setItem'> = globalThis.localStorage,
) {
  storage.setItem(businessOnboardingDraftKey(userId), JSON.stringify(draft));
}

export function loadBusinessOnboardingDraft(
  userId: string,
  storage: Pick<Storage, 'getItem' | 'removeItem'> = globalThis.localStorage,
  now = Date.now(),
) {
  const key = businessOnboardingDraftKey(userId);
  const serialized = storage.getItem(key);
  if (!serialized) return null;
  try {
    const draft = normalizeBusinessOnboardingDraft(JSON.parse(serialized), now);
    if (!draft) storage.removeItem(key);
    return draft;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function clearBusinessOnboardingDraft(
  userId: string,
  storage: Pick<Storage, 'removeItem'> = globalThis.localStorage,
) {
  storage.removeItem(businessOnboardingDraftKey(userId));
}
