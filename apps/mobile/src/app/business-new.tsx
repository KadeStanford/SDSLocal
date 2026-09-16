import { businessOnboardingSchema } from '@sds/validation';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';

type BusinessType = 'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'general';
type ServiceAreaType = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';

const businessTypes: readonly { readonly value: BusinessType; readonly label: string }[] = [
  { value: 'food_drink', label: 'Food & drink' },
  { value: 'services', label: 'Services' },
  { value: 'retail', label: 'Retail' },
  { value: 'entertainment_venue', label: 'Entertainment / venue' },
  { value: 'general', label: 'Other business' },
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

export default function NewBusinessScreen() {
  return (
    <NewBusinessWorkspace
      onBack={() => router.back()}
      onCreated={(businessId) =>
        router.replace({ pathname: '/business', params: { id: businessId, section: 'details' } })
      }
    />
  );
}

export function NewBusinessWorkspace({
  onBack,
  onCreated,
}: {
  readonly onBack: () => void;
  readonly onCreated: (businessId: string) => void;
}) {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [businessType, setBusinessType] = useState<BusinessType>('services');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [regionCode, setRegionCode] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [serviceAreaType, setServiceAreaType] = useState<ServiceAreaType>('at_location');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState<(typeof radiusChoices)[number]>(25);
  const [serviceCities, setServiceCities] = useState<string[]>([]);
  const [cityDraft, setCityDraft] = useState('');
  const [customArea, setCustomArea] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStateLabel = useMemo(
    () => (regionCode ? `Selected state: ${regionCode}` : 'Select a state'),
    [regionCode],
  );

  function updateName(value: string) {
    setName(value);
    if (!slugEdited) setSlug(toSlug(value));
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

  async function createBusiness() {
    try {
      setBusy(true);
      setError(null);
      const input = businessOnboardingSchema.parse({
        name,
        slug,
        businessType,
        description,
        categoryIds: [],
        hours: [],
        city,
        regionCode,
        postalCode,
        countryCode: 'US',
        serviceAreaType,
        serviceAreaRegions: serviceAreaType === 'cities' ? serviceCities : [],
        serviceRadiusMiles: serviceAreaType === 'radius' ? serviceRadiusMiles : undefined,
        serviceArea: serviceAreaType === 'custom' ? customArea : undefined,
        primaryColor: '#176B4D',
        accentColor: '#E99B45',
      });
      const { data, error: createError } = await supabase.rpc('create_business_with_owner_v2', {
        p_name: input.name,
        p_slug: input.slug,
        p_business_type: input.businessType,
        p_description: input.description,
        p_category_ids: input.categoryIds,
        p_hours: input.hours,
        p_phone: null,
        p_email: null,
        p_website_url: null,
        p_address_line_1: null,
        p_address_line_2: null,
        p_city: input.city ?? null,
        p_region_code: input.regionCode ?? null,
        p_postal_code: input.postalCode ?? null,
        p_country_code: input.countryCode,
        p_service_area_type: input.serviceAreaType,
        p_service_area_regions: input.serviceAreaRegions,
        p_service_radius_miles: input.serviceRadiusMiles ?? null,
        p_service_area: input.serviceArea ?? null,
        p_latitude: null,
        p_longitude: null,
        p_primary_color: input.primaryColor,
        p_accent_color: input.accentColor,
      });
      if (createError) throw createError;
      if (typeof data !== 'string')
        throw new Error('The business was created but could not be opened.');
      onCreated(data);
    } catch (caught) {
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
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={onBack} style={styles.backButton}>
            <ThemedText type="smallBold">‹ Your businesses</ThemedText>
          </Pressable>
          <ThemedText type="title">Create a business</ThemedText>
          <ThemedText themeColor="textSecondary">
            Start a draft in the app. You can finish photos, offerings, events, and rewards from the
            native business workspace.
          </ThemedText>

          {error && (
            <View style={styles.errorNotice}>
              <ThemedText style={styles.errorText} type="smallBold">
                {error}
              </ThemedText>
            </View>
          )}

          <View style={styles.formCard}>
            <Field
              label="Business name (required)"
              value={name}
              onChangeText={updateName}
              colors={colors}
              returnKeyType="next"
            />
            <Field
              label="Page address (required)"
              value={slug}
              onChangeText={(value) => {
                setSlugEdited(true);
                setSlug(toSlug(value));
              }}
              colors={colors}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <ChoiceGroup
              title="Business type (required)"
              choices={businessTypes}
              value={businessType}
              onChange={setBusinessType}
            />
            <Field
              label="Description (optional)"
              value={description}
              onChangeText={setDescription}
              colors={colors}
              multiline
              style={styles.multiline}
            />
            <Field
              label="Home city (optional)"
              value={city}
              onChangeText={setCity}
              colors={colors}
            />

            <ThemedText type="smallBold">{selectedStateLabel}</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.choiceRow}>
                {stateCodes.map((code) => (
                  <ChoiceButton
                    key={code}
                    active={regionCode === code}
                    label={code}
                    onPress={() => setRegionCode(code)}
                  />
                ))}
              </View>
            </ScrollView>
            <Field
              label="Postal code (optional)"
              value={postalCode}
              onChangeText={setPostalCode}
              colors={colors}
              keyboardType="numbers-and-punctuation"
            />

            <ChoiceGroup
              title="Service area (required)"
              choices={serviceAreaTypes}
              value={serviceAreaType}
              onChange={setServiceAreaType}
            />

            {serviceAreaType === 'radius' && (
              <View style={styles.field}>
                <ThemedText type="smallBold">Radius from your location</ThemedText>
                <View style={styles.choiceWrap}>
                  {radiusChoices.map((miles) => (
                    <ChoiceButton
                      key={miles}
                      active={serviceRadiusMiles === miles}
                      label={`${miles} miles`}
                      onPress={() => setServiceRadiusMiles(miles)}
                    />
                  ))}
                </View>
              </View>
            )}

            {serviceAreaType === 'cities' && (
              <View style={styles.field}>
                <ThemedText type="smallBold">Cities served (add one at a time)</ThemedText>
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
                <View style={styles.choiceWrap}>
                  {serviceCities.map((serviceCity) => (
                    <Pressable
                      key={serviceCity}
                      onPress={() =>
                        setServiceCities((current) =>
                          current.filter((item) => item !== serviceCity),
                        )
                      }
                      style={styles.cityChip}
                    >
                      <ThemedText type="smallBold">{serviceCity} ×</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {serviceAreaType === 'custom' && (
              <Field
                label="Describe the custom service area (required)"
                value={customArea}
                onChangeText={setCustomArea}
                colors={colors}
                multiline
                style={styles.multiline}
              />
            )}

            {serviceAreaType === 'statewide' && !regionCode && (
              <ThemedText style={styles.helperError} type="small">
                Select a state above for statewide service.
              </ThemedText>
            )}

            <Pressable
              disabled={busy}
              onPress={() => void createBusiness()}
              style={[styles.primaryButton, busy && styles.disabled]}
            >
              <ThemedText style={styles.primaryText} type="smallBold">
                {busy ? 'Creating…' : 'Create draft business'}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function Field({
  label,
  colors,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  readonly label: string;
  readonly colors: typeof Colors.light | typeof Colors.dark;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        {...props}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.backgroundElement,
          },
          props.style,
        ]}
      />
    </View>
  );
}

function ChoiceGroup<T extends string>({
  title,
  choices,
  value,
  onChange,
}: {
  readonly title: string;
  readonly choices: readonly { readonly value: T; readonly label: string }[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <View style={styles.choiceWrap}>
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.value}
            active={value === choice.value}
            label={choice.label}
            onPress={() => onChange(choice.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ChoiceButton({
  active,
  label,
  onPress,
}: {
  readonly active: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.choiceButton, active && styles.choiceButtonActive]}
    >
      <ThemedText style={active ? styles.choiceTextActive : undefined} type="smallBold">
        {label}
      </ThemedText>
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
    paddingBottom: 110,
    gap: Spacing.three,
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#8A938E',
    padding: Spacing.three,
    gap: Spacing.three,
  },
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
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceRow: { flexDirection: 'row', gap: Spacing.two, paddingVertical: Spacing.one },
  choiceButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#8A938E',
    paddingHorizontal: 14,
  },
  choiceButtonActive: { backgroundColor: '#176B4D', borderColor: '#176B4D' },
  choiceTextActive: { color: '#FFFFFF' },
  addRow: { flexDirection: 'row', gap: Spacing.two },
  addInput: { flex: 1 },
  addButton: {
    minWidth: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
  },
  cityChip: {
    borderRadius: 999,
    backgroundColor: '#E7F0EA',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#176B4D',
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
});
