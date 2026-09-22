import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { businessOnboardingSchema } from '@sds/validation';
import * as Crypto from 'expo-crypto';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ChoicePicker } from '@/components/choice-picker';
import { SwipeBackView } from '@/components/swipe-back-view';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import {
  businessPageAddress,
  clearBusinessOnboardingDraft,
  loadBusinessOnboardingDraft,
  pageAddressError,
  saveBusinessOnboardingDraft,
  serviceAreaForModel,
  type BusinessOnboardingDraft,
  type OnboardingServiceModel,
  type OrderingProvider,
} from '@/lib/business-onboarding';
import { haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAppMode } from '@/providers/app-mode-provider';
import { useAuth } from '@/providers/auth-provider';

type BusinessType =
  'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
type ServiceAreaType = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';

const businessTypes: readonly {
  readonly value: BusinessType;
  readonly label: string;
  readonly detail: string;
}[] = [
  {
    value: 'food_drink',
    label: 'Food & drink',
    detail: 'Restaurants, cafés, bakers, and caterers',
  },
  { value: 'services', label: 'Services', detail: 'Professional, personal, and home services' },
  { value: 'retail', label: 'Retail', detail: 'Shops, makers, and local products' },
  {
    value: 'entertainment_venue',
    label: 'Entertainment or venue',
    detail: 'Activities, venues, and attractions',
  },
  { value: 'mobile', label: 'Mobile business', detail: 'Food trucks, pop-ups, and changing stops' },
  {
    value: 'general',
    label: 'Other local business',
    detail: 'A local business that fits another category',
  },
];

const serviceModels: readonly {
  readonly value: OnboardingServiceModel;
  readonly label: string;
  readonly detail: string;
}[] = [
  {
    value: 'fixed',
    label: 'Customers visit me',
    detail: 'A storefront, office, venue, or other fixed location',
  },
  {
    value: 'service_area',
    label: 'I travel or serve an area',
    detail: 'Serve a radius, selected cities, or a broader region',
  },
  {
    value: 'mobile',
    label: 'I use scheduled stops',
    detail: 'A mobile business that publishes where it will be',
  },
];

const serviceAreaTypes: readonly { readonly value: ServiceAreaType; readonly label: string }[] = [
  { value: 'at_location', label: 'At my location' },
  { value: 'radius', label: 'Mile radius' },
  { value: 'cities', label: 'Specific cities' },
  { value: 'statewide', label: 'Entire state' },
  { value: 'custom', label: 'Custom area' },
];

const stateCodes = [
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

const radiusChoices = [5, 10, 15, 25, 50, 100] as const;
const onboardingSteps = [
  { title: 'Business identity', hint: 'Name and categorize your business.' },
  { title: 'How you serve', hint: 'Choose how customers reach you.' },
  { title: 'Location or area', hint: 'Add only the details relevant to your business.' },
  { title: 'Review and create', hint: 'Confirm your private draft.' },
] as const;

export default function NewBusinessScreen() {
  const { refreshBusinessAccess, setMode } = useAppMode();

  return (
    <SwipeBackView onSwipeBack={() => router.back()}>
      <NewBusinessWorkspace
        onBack={() => router.back()}
        onCreated={async (businessId, initialSection, provider) => {
          // Refresh access before switching modes so the tab guard does not
          // send the owner back to Discover during the transition.
          await refreshBusinessAccess();
          setMode('business');
          router.replace({
            pathname: '/business',
            params: { id: businessId, ...(initialSection ? { section: initialSection } : {}), ...(provider && provider !== 'none' ? { provider } : {}) },
          });
        }}
      />
    </SwipeBackView>
  );
}

export function NewBusinessWorkspace({
  onBack,
  onCreated,
}: {
  readonly onBack: () => void;
  readonly onCreated: (businessId: string, initialSection?: 'ordering', provider?: OrderingProvider) => void;
}) {
  const bottomPadding = useScreenBottomPadding();
  const { session } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [customizingSlug, setCustomizingSlug] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('services');
  const [categories, setCategories] = useState<
    { readonly id: number; readonly name: string; readonly business_type: BusinessType | null }[]
  >([]);
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [description, setDescription] = useState('');
  const [serviceModel, setServiceModel] = useState<OnboardingServiceModel>('fixed');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [serviceAreaType, setServiceAreaType] = useState<ServiceAreaType>('at_location');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<(typeof radiusChoices)[number]>(25);
  const [serviceCities, setServiceCities] = useState<string[]>([]);
  const [cityDraft, setCityDraft] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [setupOrderingProvider, setSetupOrderingProvider] = useState<OrderingProvider>('none');
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const [pageAddressAvailability, setPageAddressAvailability] = useState<
    'idle' | 'checking' | 'available' | 'taken' | 'unknown'
  >('idle');
  const [draftReady, setDraftReady] = useState(false);
  const [requestId, setRequestId] = useState(() => Crypto.randomUUID());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const saved = loadBusinessOnboardingDraft(session.user.id);
      if (saved) {
        setName(saved.name);
        setSlug(saved.pageAddress);
        setSlugEdited(saved.pageAddressCustomized);
        setCustomizingSlug(saved.pageAddressCustomized);
        setBusinessType(saved.businessType);
        setCategoryIds([...saved.categoryIds]);
        setDescription(saved.description);
        setServiceModel(saved.serviceModel);
        setAddressLine1(saved.addressLine1);
        setCity(saved.city);
        setRegionCode(saved.regionCode);
        setPostalCode(saved.postalCode);
        setServiceAreaType(saved.serviceAreaType);
        setServiceRadiusMiles(saved.serviceRadiusMiles);
        setServiceCities([...saved.serviceCities]);
        setCustomArea(saved.customArea);
        setSetupOrderingProvider(saved.setupOrderingProvider ?? (saved.setupSquareOrdering ? 'square' : 'none'));
        setStep(saved.step);
        setRequestId(saved.requestId);
      }
      setDraftReady(true);
    });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !draftReady || busy) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const draft: BusinessOnboardingDraft = {
      version: 1,
      savedAt: Date.now(),
      requestId,
      step,
      name,
      pageAddress: slug || businessPageAddress(name),
      pageAddressCustomized: slugEdited,
      businessType,
      categoryIds,
      description,
      serviceModel,
      addressLine1,
      city,
      regionCode,
      postalCode,
      serviceAreaType,
      serviceRadiusMiles,
      serviceCities,
      customArea,
      setupSquareOrdering: setupOrderingProvider === 'square',
      setupOrderingProvider,
    };
    saveTimer.current = setTimeout(() => {
      try {
        saveBusinessOnboardingDraft(session.user.id, draft);
      } catch {
        setError('Your draft could not be saved on this device. You can still continue.');
      }
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    addressLine1,
    businessType,
    busy,
    categoryIds,
    city,
    customArea,
    description,
    draftReady,
    name,
    postalCode,
    regionCode,
    requestId,
    serviceAreaType,
    serviceCities,
    serviceModel,
    serviceRadiusMiles,
    setupOrderingProvider,
    session,
    slug,
    slugEdited,
    step,
  ]);

  useEffect(() => {
    let active = true;
    void supabase
      .from('categories')
      .select('id, name, business_type')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data, error: categoryError }) => {
        if (!active) return;
        if (categoryError) {
          setError('Categories are temporarily unavailable. You can add them later.');
          return;
        }
        setCategories((data ?? []) as typeof categories);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!customizingSlug || pageAddressError(slug)) {
      queueMicrotask(() => {
        if (active) setPageAddressAvailability('idle');
      });
      return () => {
        active = false;
      };
    }
    queueMicrotask(() => {
      if (active) setPageAddressAvailability('checking');
    });
    const timer = setTimeout(() => {
      void supabase
        .rpc('is_business_page_address_available', { p_requested_slug: slug })
        .then(({ data, error: availabilityError }) => {
          if (!active) return;
          setPageAddressAvailability(
            availabilityError ? 'unknown' : data === true ? 'available' : 'taken',
          );
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customizingSlug, slug]);

  const matchingCategories = categories.filter(
    (category) => category.business_type === null || category.business_type === businessType,
  );

  const selectedBusinessTypeLabel =
    businessTypes.find((choice) => choice.value === businessType)?.label ?? 'Other business';
  const selectedServiceAreaLabel =
    serviceAreaTypes.find((choice) => choice.value === serviceAreaType)?.label ?? 'At my location';
  const selectedCategoryLabel =
    categories.find((category) => category.id === categoryIds[0])?.name ?? 'Add later';
  const currentStep = onboardingSteps[step] ?? onboardingSteps[0];

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(businessPageAddress(value));
    if (fieldError?.field === 'name') setFieldError(null);
  }

  function addServiceCity() {
    const next = cityDraft.trim();
    if (!next) return;
    if (serviceCities.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setCityDraft('');
      return;
    }
    if (serviceCities.length >= 25) {
      setError('You can add up to 25 service cities.');
      return;
    }
    setServiceCities((current) => [...current, next]);
    setCityDraft('');
  }

  function continueToNextStep() {
    setError(null);
    setFieldError(null);
    if (step === 0) {
      if (name.trim().length < 2) {
        setFieldError({ field: 'name', message: 'Enter your business name to continue.' });
        return;
      }
      const slugError = pageAddressError(slug);
      if (slugError) {
        setFieldError({ field: 'slug', message: slugError });
        return;
      }
      if (slugEdited && pageAddressAvailability === 'taken') {
        setFieldError({
          field: 'slug',
          message: 'That page address is already in use. Choose another one.',
        });
        return;
      }
    }
    if (step === 2) {
      if (serviceModel === 'fixed' && (!addressLine1.trim() || !city.trim() || !regionCode)) {
        setFieldError({
          field: 'location',
          message: 'Add the street address, city, and state customers will visit.',
        });
        return;
      }
      if (serviceAreaType === 'cities' && serviceCities.length === 0) {
        setFieldError({ field: 'serviceCities', message: 'Add at least one city you serve.' });
        return;
      }
      if (serviceAreaType === 'statewide' && !regionCode) {
        setError('Select a state for statewide service.');
        return;
      }
      if (serviceAreaType === 'custom' && !customArea.trim()) {
        setError('Describe your custom service area.');
        return;
      }
    }
    setStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
    void haptics.selection();
  }

  function goBackStep() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  function discardDraft() {
    Alert.alert(
      'Discard this business draft?',
      'The information entered on this device will be removed.',
      [
        { text: 'Keep draft', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            if (session) clearBusinessOnboardingDraft(session.user.id);
            onBack();
          },
        },
      ],
    );
  }

  async function createBusiness() {
    try {
      if (!session || busy) return;
      setBusy(true);
      setError(null);
      const finalServiceAreaType = serviceAreaForModel(serviceModel, serviceAreaType);
      const input = businessOnboardingSchema.parse({
        name,
        slug,
        businessType,
        description,
        categoryIds,
        hours: [],
        city,
        regionCode,
        postalCode,
        countryCode: 'US',
        addressLine1: serviceModel === 'fixed' ? addressLine1 : undefined,
        serviceAreaType: finalServiceAreaType,
        serviceAreaRegions: finalServiceAreaType === 'cities' ? serviceCities : [],
        serviceRadiusMiles: finalServiceAreaType === 'radius' ? serviceRadiusMiles : undefined,
        serviceArea: finalServiceAreaType === 'custom' ? customArea : undefined,
        primaryColor: '#176B4D',
        accentColor: '#E99B45',
      });
      const { data, error: createError } = await supabase.rpc('create_business_with_owner_v3', {
        p_request_id: requestId,
        p_name: input.name,
        p_requested_slug: input.slug,
        p_slug_customized: slugEdited,
        p_business_type: input.businessType,
        p_description: input.description,
        p_category_ids: input.categoryIds,
        p_address_line_1: input.addressLine1 ?? null,
        p_city: input.city ?? null,
        p_region_code: input.regionCode ?? null,
        p_postal_code: input.postalCode ?? null,
        p_country_code: input.countryCode,
        p_service_area_type: input.serviceAreaType,
        p_service_area_regions: input.serviceAreaRegions,
        p_service_radius_miles: input.serviceRadiusMiles ?? null,
        p_service_area: input.serviceArea ?? null,
      });
      if (createError) throw createError;
      const result = data as { businessId?: unknown; pageAddress?: unknown } | null;
      if (!result || typeof result.businessId !== 'string')
        throw new Error('The business was created but could not be opened.');
      clearBusinessOnboardingDraft(session.user.id);
      void haptics.success();
      onCreated(result.businessId, setupOrderingProvider !== 'none' ? 'ordering' : undefined, setupOrderingProvider);
    } catch (caught) {
      const message =
        caught && typeof caught === 'object' && 'message' in caught
          ? String(caught.message)
          : String(caught);
      if (/page address.*already in use/i.test(message)) {
        setStep(0);
        setCustomizingSlug(true);
        setFieldError({
          field: 'slug',
          message: 'That page address is already in use. Choose another one.',
        });
        return;
      }
      setError(
        userMessageFromError(
          caught,
          'We could not create the business. Check the details and try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={onBack} style={styles.backButton}>
            <ThemedText type="smallBold">‹ Your businesses</ThemedText>
          </Pressable>
          <ThemedText type="title">Create a business</ThemedText>
          <ThemedText themeColor="textSecondary">
            Start privately, then finish and submit from your business workspace.
          </ThemedText>

          <Pressable accessibilityRole="button" onPress={discardDraft} style={styles.discardButton}>
            <ThemedText themeColor="textSecondary" type="smallBold">
              Discard draft
            </ThemedText>
          </Pressable>

          {error && (
            <View style={styles.errorNotice}>
              <ThemedText style={styles.errorText} type="smallBold">
                {error}
              </ThemedText>
            </View>
          )}

          <View style={styles.progressCard}>
            <View style={styles.progressHeading}>
              <ThemedText type="smallBold">
                Step {step + 1} of {onboardingSteps.length} · {currentStep.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {currentStep.hint}
              </ThemedText>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((step + 1) / onboardingSteps.length) * 100}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.formCard}>
            {step === 0 && (
              <>
                <Field
                  label="Business name (required)"
                  value={name}
                  onChangeText={updateName}
                  colors={colors}
                  returnKeyType="next"
                  error={fieldError?.field === 'name' ? fieldError.message : undefined}
                />
                <View style={styles.pageAddressBlock}>
                  <View style={styles.sectionHeading}>
                    <View style={styles.grow}>
                      <ThemedText type="smallBold">Page address</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
                        sdslocal.app/b/{slug || businessPageAddress(name)}
                      </ThemedText>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setCustomizingSlug((current) => !current)}
                      style={styles.textButton}
                    >
                      <ThemedText style={styles.linkText} type="smallBold">
                        {customizingSlug ? 'Done' : 'Customize'}
                      </ThemedText>
                    </Pressable>
                  </View>
                  {customizingSlug && (
                    <Field
                      label="Custom page address"
                      value={slug}
                      onChangeText={(value) => {
                        setSlugEdited(true);
                        setSlug(businessPageAddress(value));
                        if (fieldError?.field === 'slug') setFieldError(null);
                      }}
                      colors={colors}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="next"
                      error={fieldError?.field === 'slug' ? fieldError.message : undefined}
                    />
                  )}
                  {customizingSlug && pageAddressAvailability !== 'idle' && (
                    <ThemedText
                      accessibilityLiveRegion="polite"
                      style={
                        pageAddressAvailability === 'taken'
                          ? styles.helperError
                          : styles.helperStatus
                      }
                      type="small"
                    >
                      {pageAddressAvailability === 'checking'
                        ? 'Checking availability…'
                        : pageAddressAvailability === 'available'
                          ? 'This page address is available.'
                          : pageAddressAvailability === 'taken'
                            ? 'That page address is already in use.'
                            : 'Availability will be confirmed when you create the business.'}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.field} accessibilityRole="radiogroup">
                  <ThemedText type="smallBold">What kind of business is it?</ThemedText>
                  <View style={styles.cardChoices}>
                    {businessTypes.map((choice) => (
                      <SelectionCard
                        key={choice.value}
                        label={choice.label}
                        detail={choice.detail}
                        selected={businessType === choice.value}
                        colors={colors}
                        onPress={() => {
                          setBusinessType(choice.value);
                          if (choice.value === 'mobile') setServiceModel('mobile');
                          else if (serviceModel === 'mobile') setServiceModel('fixed');
                          setCategoryIds([]);
                        }}
                      />
                    ))}
                  </View>
                </View>
                {matchingCategories.length > 0 && (
                  <View style={styles.field}>
                    <View style={styles.sectionHeading}>
                      <ThemedText type="smallBold">Categories (optional)</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {categoryIds.length}/5 selected
                      </ThemedText>
                    </View>
                    <ThemedText themeColor="textSecondary" type="small">
                      Choose the labels customers will use to find you. The first selected is your
                      primary category.
                    </ThemedText>
                    <View style={styles.selectionList}>
                      {matchingCategories.map((category) => {
                        const selected = categoryIds.includes(category.id);
                        return (
                          <Pressable
                            key={category.id}
                            accessibilityRole="checkbox"
                            accessibilityLabel={category.name}
                            accessibilityState={{ checked: selected }}
                            onPress={() => {
                              if (!selected && categoryIds.length >= 5) {
                                setError('Choose up to five categories.');
                                return;
                              }
                              setError(null);
                              setCategoryIds((current) =>
                                current.includes(category.id)
                                  ? current.filter((id) => id !== category.id)
                                  : [...current, category.id],
                              );
                            }}
                            style={({ pressed }) => [
                              styles.selectionRow,
                              selected && { backgroundColor: colors.backgroundSelected },
                              pressed && styles.pressed,
                            ]}
                          >
                            <View
                              style={[
                                styles.selectionCheckbox,
                                selected && styles.selectionCheckboxSelected,
                              ]}
                            >
                              {selected && <ThemedText style={styles.selectionCheck}>✓</ThemedText>}
                            </View>
                            <ThemedText style={styles.selectionLabel}>{category.name}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
                <Field
                  label="Description (optional)"
                  value={description}
                  onChangeText={setDescription}
                  colors={colors}
                  multiline
                  style={styles.multiline}
                />
              </>
            )}

            {step === 1 && (
              <>
                <View style={styles.stepIntro}>
                  <ThemedText type="subtitle">How do you serve customers?</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Pick the closest match. You can change this later.
                  </ThemedText>
                </View>
                <View style={styles.cardChoices} accessibilityRole="radiogroup">
                  {serviceModels.map((choice) => (
                    <SelectionCard
                      key={choice.value}
                      label={choice.label}
                      detail={choice.detail}
                      selected={serviceModel === choice.value}
                      colors={colors}
                      onPress={() => {
                        setServiceModel(choice.value);
                        setServiceAreaType(serviceAreaForModel(choice.value, serviceAreaType));
                        if (choice.value === 'mobile') setBusinessType('mobile');
                        else if (businessType === 'mobile') setBusinessType('services');
                      }}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 2 && (
              <>
                <View style={styles.stepIntro}>
                  <ThemedText type="subtitle">
                    {serviceModel === 'fixed'
                      ? 'Where can customers visit?'
                      : serviceModel === 'mobile'
                        ? 'Where is your business based?'
                        : 'Where do you serve?'}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {serviceModel === 'mobile'
                      ? 'A home city helps discovery. Add your first scheduled stop after creation.'
                      : 'Customers will use this information to understand where you operate.'}
                  </ThemedText>
                </View>

                {serviceModel === 'fixed' && (
                  <Field
                    label="Street address"
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    colors={colors}
                    autoComplete="street-address"
                    returnKeyType="next"
                    error={fieldError?.field === 'location' ? fieldError.message : undefined}
                  />
                )}

                <Field
                  label={serviceModel === 'mobile' ? 'Home city (optional)' : 'City'}
                  value={city}
                  onChangeText={setCity}
                  colors={colors}
                  returnKeyType="next"
                />
                <ChoicePicker
                  label={serviceModel === 'mobile' ? 'State (optional)' : 'State'}
                  options={stateCodes.map((code) => ({ value: code, label: code }))}
                  placeholder="Choose a state"
                  value={regionCode || null}
                  onChange={setRegionCode}
                />
                {serviceModel === 'fixed' && (
                  <Field
                    label="ZIP code (optional)"
                    value={postalCode}
                    onChangeText={setPostalCode}
                    colors={colors}
                    autoComplete="postal-code"
                    keyboardType="numbers-and-punctuation"
                    returnKeyType="done"
                  />
                )}

                {serviceModel === 'service_area' && (
                  <ChoicePicker
                    label="Service area"
                    options={serviceAreaTypes.filter((item) => item.value !== 'at_location')}
                    value={serviceAreaType === 'at_location' ? 'radius' : serviceAreaType}
                    onChange={setServiceAreaType}
                  />
                )}

                {serviceModel === 'service_area' && serviceAreaType === 'radius' && (
                  <ChoicePicker
                    label="Radius from your location"
                    options={radiusChoices.map((miles) => ({
                      value: String(miles),
                      label: `${miles} miles`,
                    }))}
                    value={String(serviceRadiusMiles)}
                    onChange={(value) =>
                      setServiceRadiusMiles(Number(value) as (typeof radiusChoices)[number])
                    }
                  />
                )}

                {serviceModel === 'service_area' && serviceAreaType === 'cities' && (
                  <View style={styles.field}>
                    <ThemedText type="smallBold">Cities served</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      Add each city separately. Remove a city from the list below if needed.
                    </ThemedText>
                    <View style={styles.addRow}>
                      <TextInput
                        value={cityDraft}
                        onChangeText={setCityDraft}
                        onSubmitEditing={addServiceCity}
                        returnKeyType="done"
                        placeholder="Enter a city"
                        placeholderTextColor={colors.textSecondary}
                        style={[
                          styles.input,
                          styles.addInput,
                          {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: colors.backgroundElement,
                          },
                        ]}
                      />
                      <Pressable onPress={addServiceCity} style={styles.addButton}>
                        <ThemedText style={styles.primaryText} type="smallBold">
                          Add
                        </ThemedText>
                      </Pressable>
                    </View>
                    {serviceCities.length > 0 && (
                      <View style={styles.selectedList}>
                        {serviceCities.map((serviceCity) => (
                          <Pressable
                            key={serviceCity}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${serviceCity}`}
                            onPress={() =>
                              setServiceCities((current) =>
                                current.filter((item) => item !== serviceCity),
                              )
                            }
                            style={({ pressed }) => [styles.selectedRow, pressed && styles.pressed]}
                          >
                            <ThemedText type="smallBold">{serviceCity}</ThemedText>
                            <ThemedText themeColor="textSecondary" type="smallBold">
                              Remove
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {fieldError?.field === 'serviceCities' && (
                      <ThemedText
                        accessibilityLiveRegion="polite"
                        style={[styles.helperError, { color: colors.errorText }]}
                        type="small"
                      >
                        {fieldError.message}
                      </ThemedText>
                    )}
                  </View>
                )}

                {serviceModel === 'service_area' && serviceAreaType === 'custom' && (
                  <Field
                    label="Describe the custom service area (required)"
                    value={customArea}
                    onChangeText={setCustomArea}
                    colors={colors}
                    multiline
                    style={styles.multiline}
                  />
                )}

                {serviceModel === 'service_area' &&
                  serviceAreaType === 'statewide' &&
                  !regionCode && (
                    <ThemedText style={styles.helperError} type="small">
                      Select a state on the Location step for statewide service.
                    </ThemedText>
                  )}
                {serviceModel === 'mobile' && (
                  <View
                    style={[styles.mobileNextCard, { backgroundColor: colors.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold">Next: add your first stop</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      After creating the private business, the workspace will open so you can add a
                      place, date, and serving time.
                    </ThemedText>
                  </View>
                )}
              </>
            )}

            {step === 3 && (
              <View style={styles.reviewList}>
                <View style={styles.stepIntro}>
                  <ThemedText type="subtitle">Ready to create your private business?</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    It will not be public yet. You’ll finish setup and submit it from the workspace.
                  </ThemedText>
                </View>
                <SummaryRow
                  label="Business name"
                  value={name.trim() || 'Not entered'}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="Page address"
                  value={slug || 'Not entered'}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="Business type"
                  value={selectedBusinessTypeLabel}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="Primary category"
                  value={selectedCategoryLabel}
                  onEdit={() => setStep(0)}
                />
                <SummaryRow
                  label="How you serve"
                  value={serviceModels.find((choice) => choice.value === serviceModel)?.label ?? ''}
                  onEdit={() => setStep(1)}
                />
                <SummaryRow
                  label="Location"
                  value={
                    [addressLine1.trim(), city.trim(), regionCode, postalCode.trim()]
                      .filter(Boolean)
                      .join(', ') || 'Not added'
                  }
                  onEdit={() => setStep(2)}
                />
                {serviceModel === 'service_area' && (
                  <SummaryRow
                    label="Service area"
                    value={
                      serviceAreaType === 'cities'
                        ? `${selectedServiceAreaLabel}: ${serviceCities.join(', ') || 'No cities added'}`
                        : serviceAreaType === 'radius'
                          ? `${selectedServiceAreaLabel}: ${serviceRadiusMiles} miles`
                          : serviceAreaType === 'custom'
                            ? `${selectedServiceAreaLabel}: ${customArea.trim() || 'Not described'}`
                            : selectedServiceAreaLabel
                    }
                    onEdit={() => setStep(2)}
                  />
                )}
                <View style={styles.optionalSetupCard}>
                  <ThemedText type="smallBold">Optional: online ordering</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Choose a payment provider now, or skip it and finish setup later from your business workspace.
                  </ThemedText>
                  <View style={styles.cardChoices} accessibilityRole="radiogroup">
                    <SelectionCard
                      label="Connect Square"
                      detail="Use Square checkout and catalog tools."
                      selected={setupOrderingProvider === 'square'}
                      colors={colors}
                      onPress={() => setSetupOrderingProvider('square')}
                    />
                    <SelectionCard
                      label="Connect Stripe"
                      detail="Use Stripe checkout if you do not have Square."
                      selected={setupOrderingProvider === 'stripe'}
                      colors={colors}
                      onPress={() => setSetupOrderingProvider('stripe')}
                    />
                    <SelectionCard
                      label="Skip for now"
                      detail="Set up online ordering from your business workspace later."
                      selected={setupOrderingProvider === 'none'}
                      colors={colors}
                      onPress={() => setSetupOrderingProvider('none')}
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.footerActions}>
              {step > 0 && (
                <Pressable disabled={busy} onPress={goBackStep} style={styles.secondaryButton}>
                  <ThemedText type="smallBold">Back</ThemedText>
                </Pressable>
              )}
              {step < onboardingSteps.length - 1 ? (
                <Pressable
                  disabled={busy}
                  onPress={continueToNextStep}
                  style={styles.primaryButton}
                >
                  <ThemedText style={styles.primaryText} type="smallBold">
                    Continue
                  </ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  disabled={busy}
                  onPress={() => void createBusiness()}
                  style={[styles.primaryButton, busy && styles.disabled]}
                >
                  <ThemedText style={styles.primaryText} type="smallBold">
                    {busy ? 'Creating business…' : 'Create business'}
                  </ThemedText>
                  {busy && <ActivityIndicator color="#FFFFFF" size="small" />}
                </Pressable>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Field({
  label,
  colors,
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  readonly label: string;
  readonly colors: typeof Colors.light | typeof Colors.dark;
  readonly error?: string | undefined;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        {...props}
        accessibilityLabel={label}
        accessibilityHint={error}
        accessibilityState={{ disabled: props.editable === false }}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: error ? colors.destructive : colors.inputBorder,
          },
          props.style,
        ]}
      />
      {error && (
        <ThemedText accessibilityLiveRegion="polite" style={styles.helperError} type="small">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
}: {
  readonly label: string;
  readonly value: string;
  readonly onEdit: () => void;
}) {
  return (
    <View style={styles.summaryRow}>
      <View style={styles.grow}>
        <ThemedText themeColor="textSecondary" type="smallBold">
          {label}
        </ThemedText>
        <ThemedText style={styles.summaryValue}>{value}</ThemedText>
      </View>
      <Pressable
        accessibilityLabel={`Edit ${label}`}
        accessibilityRole="button"
        onPress={onEdit}
        style={styles.editButton}
      >
        <ThemedText style={styles.linkText} type="smallBold">
          Edit
        </ThemedText>
      </Pressable>
    </View>
  );
}

function SelectionCard({
  label,
  detail,
  selected,
  colors,
  onPress,
}: {
  readonly label: string;
  readonly detail: string;
  readonly selected: boolean;
  readonly colors: typeof Colors.light | typeof Colors.dark;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}. ${detail}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.selectionCard,
        {
          borderColor: selected ? Brand.primary : colors.border,
          backgroundColor: selected ? colors.backgroundSelected : colors.background,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.grow}>
        <ThemedText type="smallBold">{label}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {detail}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.three,
  },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  discardButton: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8A938E',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  progressCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  progressHeading: { gap: 4 },
  progressTrack: {
    height: 6,
    overflow: 'hidden',
    borderRadius: 3,
    backgroundColor: '#D6DED9',
  },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: '#176B4D' },
  stepIntro: { gap: Spacing.one },
  reviewList: { gap: Spacing.two },
  optionalSetupCard: {
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B7C0BB',
    paddingTop: Spacing.three,
    marginTop: Spacing.two,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#B7C0BB',
    paddingTop: Spacing.two,
  },
  summaryValue: { lineHeight: 22 },
  grow: { flex: 1, gap: 2 },
  editButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
  linkText: { color: Brand.primary },
  textButton: { minHeight: 44, justifyContent: 'center' },
  pageAddressBlock: { gap: Spacing.one },
  cardChoices: { gap: Spacing.two },
  selectionCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { backgroundColor: Brand.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  mobileNextCard: { gap: Spacing.one, borderRadius: Radius.medium, padding: Spacing.three },
  footerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two },
  field: { gap: Spacing.one },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  selectionList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8A938E',
    borderRadius: 14,
  },
  selectionRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8A938E',
    paddingHorizontal: 14,
  },
  selectionCheckbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#718078',
    borderRadius: 6,
  },
  selectionCheckboxSelected: { borderColor: '#176B4D', backgroundColor: '#176B4D' },
  selectionCheck: { color: '#FFFFFF', fontSize: 14, lineHeight: 18 },
  selectionLabel: { flex: 1 },
  selectedList: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#8A938E',
    borderRadius: 14,
  },
  selectedRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#8A938E',
    paddingHorizontal: 14,
  },
  pressed: { opacity: 0.72 },
  addRow: { flexDirection: 'row', gap: Spacing.two },
  addInput: { flex: 1 },
  addButton: {
    minWidth: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    backgroundColor: '#176B4D',
    paddingHorizontal: 18,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8A938E',
    paddingHorizontal: 18,
  },
  primaryText: { color: '#FFFFFF' },
  disabled: { opacity: 0.55 },
  errorNotice: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C86A6A',
    backgroundColor: '#F8E6E6',
    padding: Spacing.three,
  },
  errorText: { color: '#761F1F' },
  helperError: { color: '#A03434' },
  helperStatus: { color: Brand.primary },
});


