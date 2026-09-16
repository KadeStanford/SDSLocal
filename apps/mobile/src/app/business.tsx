import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { BottomTabInset, Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { storagePublicUrl } from '@/lib/storage-url';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

type Section = 'preview' | 'details' | 'offerings' | 'events' | 'rewards' | 'photos' | 'review';
type ServiceAreaType = 'at_location' | 'radius' | 'cities' | 'statewide' | 'custom';

interface BusinessRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly description: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website_url: string | null;
  readonly address_line_1: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly postal_code: string | null;
  readonly service_area_type: ServiceAreaType;
  readonly service_area_regions: readonly string[];
  readonly service_radius_miles: number | null;
  readonly service_area: string | null;
  readonly primary_color: string;
  readonly accent_color: string;
}

interface OfferingSection {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly is_visible: boolean;
}

interface OfferingItem {
  readonly id: string;
  readonly section_id: string;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly is_available: boolean;
  readonly is_visible: boolean;
}

interface EventRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly starts_at: string;
  readonly is_published: boolean;
  readonly publish_at: string | null;
}

interface ReadinessCheck {
  readonly key: string;
  readonly label: string;
  readonly complete: boolean;
}

interface ReadinessResult {
  readonly ready: boolean;
  readonly checks: readonly ReadinessCheck[];
}

interface RewardRecord {
  readonly id: string;
  readonly name: string;
  readonly reward_description: string;
  readonly stamps_required: number;
  readonly terms: string;
  readonly is_active: boolean;
}

interface PhotoRecord {
  readonly id: string;
  readonly role: string;
  readonly caption: string | null;
  readonly display_order: number;
  readonly media_assets:
    | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
      }[]
    | null;
}

const sections: readonly { readonly key: Section; readonly label: string }[] = [
  { key: 'preview', label: 'Preview' },
  { key: 'details', label: 'Details' },
  { key: 'offerings', label: 'Offerings' },
  { key: 'events', label: 'Events' },
  { key: 'rewards', label: 'Rewards' },
  { key: 'photos', label: 'Photos' },
  { key: 'review', label: 'Publish' },
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
const serviceAreaTypes: readonly { readonly value: ServiceAreaType; readonly label: string }[] = [
  { value: 'at_location', label: 'At my location' },
  { value: 'radius', label: 'Mile radius' },
  { value: 'cities', label: 'Specific cities' },
  { value: 'statewide', label: 'Entire state' },
  { value: 'custom', label: 'Custom area' },
];

function isSection(value: string | string[] | undefined): value is Section {
  return typeof value === 'string' && sections.some((section) => section.key === value);
}

export default function BusinessScreen() {
  const params = useLocalSearchParams<{ id?: string; section?: string }>();
  const businessId = typeof params.id === 'string' ? params.id : '';
  const initialSection = isSection(params.section) ? params.section : 'preview';

  return (
    <BusinessWorkspace
      businessId={businessId}
      initialSection={initialSection}
      onBack={() => router.back()}
    />
  );
}

export function BusinessWorkspace({
  businessId,
  initialSection,
  onBack,
}: {
  readonly businessId: string;
  readonly initialSection: Section;
  readonly onBack: () => void;
}) {
  const { session, loading: authLoading } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [section, setSection] = useState<Section>(initialSection);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [offerSections, setOfferSections] = useState<OfferingSection[]>([]);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [reward, setReward] = useState<RewardRecord | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [serviceAreaType, setServiceAreaType] = useState<ServiceAreaType>('at_location');
  const [serviceCities, setServiceCities] = useState<string[]>([]);
  const [serviceCityDraft, setServiceCityDraft] = useState('');
  const [serviceRadiusMiles, setServiceRadiusMiles] = useState(25);
  const [customServiceArea, setCustomServiceArea] = useState('');
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardTerms, setRewardTerms] = useState('');
  const [stampsRequired, setStampsRequired] = useState('10');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [newOfferingSectionId, setNewOfferingSectionId] = useState('');
  const [newOfferingName, setNewOfferingName] = useState('');
  const [newOfferingDescription, setNewOfferingDescription] = useState('');
  const [newOfferingPrice, setNewOfferingPrice] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [eventSaveMode, setEventSaveMode] = useState<'draft' | 'publish'>('draft');

  const canEdit = role === 'owner';

  const applyBusiness = useCallback((record: BusinessRecord) => {
    setBusiness(record);
    setName(record.name);
    setDescription(record.description ?? '');
    setPhone(record.phone ?? '');
    setEmail(record.email ?? '');
    setWebsite(record.website_url ?? '');
    setAddressLine1(record.address_line_1 ?? '');
    setCity(record.city ?? '');
    setRegion(record.region_code ?? '');
    setPostalCode(record.postal_code ?? '');
    setServiceAreaType(record.service_area_type);
    setServiceCities([...(record.service_area_regions ?? [])]);
    setServiceRadiusMiles(record.service_radius_miles ?? 25);
    setCustomServiceArea(record.service_area ?? '');
  }, []);

  const applyReward = useCallback((record: RewardRecord | null) => {
    setReward(record);
    setRewardName(record?.name ?? 'Local rewards');
    setRewardDescription(record?.reward_description ?? '');
    setRewardTerms(record?.terms ?? '');
    setStampsRequired(String(record?.stamps_required ?? 10));
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!session || !businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const [
      membershipResult,
      businessResult,
      sectionsResult,
      offeringsResult,
      eventsResult,
      rewardResult,
      photosResult,
      readinessResult,
    ] = await Promise.all([
      supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('businesses')
        .select(
          'id, name, slug, status, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
        )
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('offering_sections')
        .select('id, name, description, is_visible')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('offering_items')
        .select(
          'id, section_id, name, description, price_minor, price_text, is_available, is_visible',
        )
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('events')
        .select('id, title, description, starts_at, is_published, publish_at')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('starts_at'),
      supabase
        .from('loyalty_programs')
        .select('id, name, reward_description, stamps_required, terms, is_active')
        .eq('business_id', businessId)
        .maybeSingle(),
      supabase
        .from('business_photos')
        .select('id, role, caption, display_order, media_assets(storage_path, status, alt_text)')
        .eq('business_id', businessId)
        .order('display_order'),
      supabase.rpc('get_business_readiness', { p_business_id: businessId }),
    ]);

    const firstError = [
      membershipResult.error,
      businessResult.error,
      sectionsResult.error,
      offeringsResult.error,
      eventsResult.error,
      rewardResult.error,
      photosResult.error,
      readinessResult.error,
    ].find(Boolean);
    if (firstError) {
      setError(userMessageFromError(firstError, 'We could not load this business workspace.'));
      setLoading(false);
      return;
    }
    if (!membershipResult.data || !businessResult.data) {
      setError('You no longer have access to this business.');
      setLoading(false);
      return;
    }

    setRole(membershipResult.data.role as 'owner' | 'staff');
    applyBusiness(businessResult.data as BusinessRecord);
    setOfferSections((sectionsResult.data ?? []) as OfferingSection[]);
    setNewOfferingSectionId((current) => current || sectionsResult.data?.[0]?.id || '');
    setOfferings((offeringsResult.data ?? []) as OfferingItem[]);
    setEvents((eventsResult.data ?? []) as EventRecord[]);
    applyReward((rewardResult.data as RewardRecord | null) ?? null);
    setPhotos((photosResult.data ?? []) as PhotoRecord[]);
    setReadiness((readinessResult.data as ReadinessResult | null) ?? null);
    setLoading(false);
  }, [applyBusiness, applyReward, businessId, session]);

  useEffect(() => {
    const timeout = setTimeout(() => void loadWorkspace(), 0);
    return () => clearTimeout(timeout);
  }, [loadWorkspace]);

  const sectionTitle = useMemo(
    () => sections.find((item) => item.key === section)?.label ?? 'Business',
    [section],
  );

  async function saveDetails() {
    if (!business || !canEdit) return;
    if (name.trim().length < 2) {
      setError('Business name must be at least 2 characters.');
      return;
    }
    if (serviceAreaType === 'cities' && serviceCities.length === 0) {
      setError('Add at least one city to the service area.');
      return;
    }
    if (serviceAreaType === 'custom' && !customServiceArea.trim()) {
      setError('Describe the custom service area before saving.');
      return;
    }
    if (serviceAreaType === 'statewide' && !region) {
      setError('Choose the state this business serves.');
      return;
    }
    if (
      (serviceAreaType === 'at_location' || serviceAreaType === 'radius') &&
      (!addressLine1.trim() || !city.trim() || !region)
    ) {
      setError('Street address, city, and state are required for this service-area choice.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: updateError } = await supabase
      .from('businesses')
      .update({
        name: name.trim(),
        description: description.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        website_url: website.trim() || null,
        address_line_1: addressLine1.trim() || null,
        city: city.trim() || null,
        region_code: region.trim().toUpperCase() || null,
        postal_code: postalCode.trim() || null,
        service_area_type: serviceAreaType,
        service_area_regions: serviceAreaType === 'cities' ? serviceCities : [],
        service_radius_miles: serviceAreaType === 'radius' ? serviceRadiusMiles : null,
        service_area: serviceAreaType === 'custom' ? customServiceArea.trim() || null : null,
      })
      .eq('id', business.id)
      .select(
        'id, name, slug, status, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
      )
      .single();
    setSaving(false);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save the business details.'));
      return;
    }
    applyBusiness(data as BusinessRecord);
    setNotice('Business details saved.');
  }

  function addServiceCity() {
    const next = serviceCityDraft.trim();
    if (!next || serviceCities.some((item) => item.toLowerCase() === next.toLowerCase())) return;
    if (serviceCities.length >= 25) {
      setError('You can add up to 25 service cities.');
      return;
    }
    setServiceCities((current) => [...current, next]);
    setServiceCityDraft('');
  }

  async function createOfferingSection() {
    if (!canEdit || !newSectionName.trim()) {
      setError('Enter a section name first.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: insertError } = await supabase
      .from('offering_sections')
      .insert({
        business_id: businessId,
        name: newSectionName.trim(),
        description: newSectionDescription.trim() || null,
        display_order: offerSections.length,
      })
      .select('id, name, description, is_visible')
      .single();
    setSaving(false);
    if (insertError) {
      setError(userMessageFromError(insertError, 'We could not create that section.'));
      return;
    }
    const created = data as OfferingSection;
    setOfferSections((current) => [...current, created]);
    setNewOfferingSectionId(created.id);
    setNewSectionName('');
    setNewSectionDescription('');
    setNotice('Offering section created.');
  }

  async function createOffering() {
    if (!canEdit || !newOfferingSectionId || !newOfferingName.trim()) {
      setError('Choose a section and enter an offering name.');
      return;
    }
    const normalizedPrice = newOfferingPrice.trim().replace(/[$,]/g, '');
    const numericPrice = normalizedPrice ? Number(normalizedPrice) : null;
    if (numericPrice !== null && (!Number.isFinite(numericPrice) || numericPrice < 0)) {
      setError('Enter a valid price, or leave it blank to show “Contact for price.”');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: insertError } = await supabase
      .from('offering_items')
      .insert({
        business_id: businessId,
        section_id: newOfferingSectionId,
        name: newOfferingName.trim(),
        description: newOfferingDescription.trim(),
        price_minor: numericPrice === null ? null : Math.round(numericPrice * 100),
        price_text: numericPrice === null ? 'Contact for price' : null,
        display_order: offerings.filter((item) => item.section_id === newOfferingSectionId).length,
      })
      .select(
        'id, section_id, name, description, price_minor, price_text, is_available, is_visible',
      )
      .single();
    setSaving(false);
    if (insertError) {
      setError(userMessageFromError(insertError, 'We could not create that offering.'));
      return;
    }
    setOfferings((current) => [...current, data as OfferingItem]);
    setNewOfferingName('');
    setNewOfferingDescription('');
    setNewOfferingPrice('');
    setNotice('Offering created.');
  }

  async function archiveOffering(item: OfferingItem) {
    if (!canEdit) return;
    setError(null);
    const { error: archiveError } = await supabase
      .from('offering_items')
      .update({ archived_at: new Date().toISOString(), is_visible: false })
      .eq('id', item.id)
      .eq('business_id', businessId);
    if (archiveError) {
      setError(userMessageFromError(archiveError, 'We could not archive that offering.'));
      return;
    }
    setOfferings((current) => current.filter((candidate) => candidate.id !== item.id));
    setNotice('Offering archived.');
  }

  async function createEvent() {
    if (!canEdit || !newEventTitle.trim() || !newEventDate || !newEventTime) {
      setError('Event title, date, and start time are required.');
      return;
    }
    const startsAt = new Date(`${newEventDate}T${newEventTime}:00`);
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
      setError('Choose a valid event date and time in the future.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const slug = `${slugify(newEventTitle)}-${Date.now().toString(36)}`.slice(0, 100);
    const { data, error: insertError } = await supabase
      .from('events')
      .insert({
        business_id: businessId,
        slug,
        title: newEventTitle.trim(),
        description: newEventDescription.trim(),
        starts_at: startsAt.toISOString(),
        address_text: newEventLocation.trim() || null,
        is_published: eventSaveMode === 'publish',
        publish_at: null,
      })
      .select('id, title, description, starts_at, is_published, publish_at')
      .single();
    setSaving(false);
    if (insertError) {
      setError(userMessageFromError(insertError, 'We could not create that event.'));
      return;
    }
    setEvents((current) => [...current, data as EventRecord]);
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDate('');
    setNewEventTime('');
    setNewEventLocation('');
    setEventSaveMode('draft');
    setNotice(
      eventSaveMode === 'publish' ? 'Event created and published.' : 'Event saved as a draft.',
    );
  }

  async function submitForReview() {
    if (!canEdit || !business) return;
    if (!readiness?.ready) {
      setError('Complete every publishing checklist item before submitting.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { error: submitError } = await supabase.rpc('submit_business_for_review', {
      p_business_id: business.id,
    });
    setSaving(false);
    if (submitError) {
      setError(userMessageFromError(submitError, 'We could not submit this business for review.'));
      return;
    }
    setBusiness({ ...business, status: 'pending_review' });
    setNotice('Submitted for SDS review.');
  }

  async function updateOffering(
    item: OfferingItem,
    updates: Partial<Pick<OfferingItem, 'is_available' | 'is_visible'>>,
  ) {
    setError(null);
    const previous = offerings;
    setOfferings((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, ...updates } : candidate,
      ),
    );
    const { error: updateError } = await supabase
      .from('offering_items')
      .update(updates)
      .eq('id', item.id)
      .eq('business_id', businessId);
    if (updateError) {
      setOfferings(previous);
      setError(userMessageFromError(updateError, 'We could not update that offering.'));
    }
  }

  async function updateEvent(item: EventRecord, isPublished: boolean) {
    setError(null);
    const previous = events;
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === item.id
          ? { ...candidate, is_published: isPublished, publish_at: null }
          : candidate,
      ),
    );
    const { error: updateError } = await supabase
      .from('events')
      .update({ is_published: isPublished, publish_at: null })
      .eq('id', item.id)
      .eq('business_id', businessId);
    if (updateError) {
      setEvents(previous);
      setError(userMessageFromError(updateError, 'We could not update that event.'));
    }
  }

  async function saveReward() {
    if (!canEdit) return;
    const required = Number(stampsRequired);
    if (!rewardName.trim() || !rewardDescription.trim()) {
      setError('Reward name and reward description are required.');
      return;
    }
    if (!Number.isInteger(required) || required < 2 || required > 30) {
      setError('Stamps required must be a whole number from 2 to 30.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      business_id: businessId,
      name: rewardName.trim(),
      reward_description: rewardDescription.trim(),
      stamps_required: required,
      terms: rewardTerms.trim(),
      is_active: reward?.is_active ?? true,
    };
    const result = reward
      ? await supabase
          .from('loyalty_programs')
          .update(payload)
          .eq('id', reward.id)
          .select('id, name, reward_description, stamps_required, terms, is_active')
          .single()
      : await supabase
          .from('loyalty_programs')
          .insert(payload)
          .select('id, name, reward_description, stamps_required, terms, is_active')
          .single();
    setSaving(false);
    if (result.error) {
      setError(userMessageFromError(result.error, 'We could not save the rewards program.'));
      return;
    }
    applyReward(result.data as RewardRecord);
    setNotice('Rewards program saved.');
  }

  async function toggleReward(isActive: boolean) {
    if (!reward || !canEdit) return;
    const previous = reward;
    setReward({ ...reward, is_active: isActive });
    const { error: updateError } = await supabase
      .from('loyalty_programs')
      .update({ is_active: isActive })
      .eq('id', reward.id);
    if (updateError) {
      setReward(previous);
      setError(userMessageFromError(updateError, 'We could not update the rewards program.'));
    }
  }

  if (authLoading || loading) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator color={Brand.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadWorkspace} />}
        >
          <Pressable onPress={onBack} style={styles.backButton}>
            <ThemedText type="smallBold">‹ Your businesses</ThemedText>
          </Pressable>
          <ThemedText type="title">{business?.name ?? 'Business'}</ThemedText>
          <ThemedText themeColor="textSecondary">
            {canEdit ? 'Native owner workspace' : 'Staff workspace'} ·{' '}
            {business?.status.replaceAll('_', ' ')}
          </ThemedText>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sectionScroller}
          >
            <View style={styles.sectionRow}>
              {sections.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => setSection(item.key)}
                  style={[styles.sectionButton, section === item.key && styles.sectionButtonActive]}
                >
                  <ThemedText
                    style={section === item.key ? styles.sectionButtonTextActive : undefined}
                    type="smallBold"
                  >
                    {item.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          {error && <Notice kind="error" message={error} />}
          {notice && <Notice kind="success" message={notice} />}
          {!canEdit && section !== 'preview' && (
            <Notice
              kind="info"
              message="Staff access is view-only here. Owners can make changes."
            />
          )}

          <ThemedText type="subtitle">{sectionTitle}</ThemedText>

          {section === 'preview' && business && (
            <PublicBusinessPageContent businessId={business.id} preview />
          )}

          {section === 'details' && business && (
            <View style={styles.formCard}>
              <Field
                label="Business name"
                value={name}
                onChangeText={setName}
                colors={colors}
                editable={canEdit}
              />
              <Field
                label="Description"
                value={description}
                onChangeText={setDescription}
                colors={colors}
                editable={canEdit}
                multiline
                style={styles.multiline}
              />
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                colors={colors}
                editable={canEdit}
                keyboardType="phone-pad"
              />
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                colors={colors}
                editable={canEdit}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Field
                label="Website"
                value={website}
                onChangeText={setWebsite}
                colors={colors}
                editable={canEdit}
                autoCapitalize="none"
              />
              <ThemedText type="smallBold">How do you serve customers?</ThemedText>
              <View style={styles.choiceRow}>
                {serviceAreaTypes.map((item) => (
                  <ChoiceButton
                    key={item.value}
                    label={item.label}
                    selected={serviceAreaType === item.value}
                    onPress={() => canEdit && setServiceAreaType(item.value)}
                  />
                ))}
              </View>
              {(serviceAreaType === 'at_location' || serviceAreaType === 'radius') && (
                <Field
                  label="Street address (required)"
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  colors={colors}
                  editable={canEdit}
                />
              )}
              {serviceAreaType !== 'custom' && serviceAreaType !== 'cities' && (
                <Field
                  label={
                    serviceAreaType === 'statewide' ? 'Primary city (optional)' : 'City (required)'
                  }
                  value={city}
                  onChangeText={setCity}
                  colors={colors}
                  editable={canEdit}
                />
              )}
              <ThemedText type="smallBold">
                State{serviceAreaType === 'statewide' ? ' (required)' : ''}
              </ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.choiceRow}>
                  {stateCodes.map((code) => (
                    <ChoiceButton
                      key={code}
                      label={code}
                      selected={region === code}
                      onPress={() => canEdit && setRegion(code)}
                    />
                  ))}
                </View>
              </ScrollView>
              {(serviceAreaType === 'at_location' || serviceAreaType === 'radius') && (
                <Field
                  label="Postal code (optional)"
                  value={postalCode}
                  onChangeText={setPostalCode}
                  colors={colors}
                  editable={canEdit}
                />
              )}
              {serviceAreaType === 'radius' && (
                <>
                  <ThemedText type="smallBold">Service radius (required)</ThemedText>
                  <View style={styles.choiceRow}>
                    {radiusChoices.map((miles) => (
                      <ChoiceButton
                        key={miles}
                        label={`${miles} mi`}
                        selected={serviceRadiusMiles === miles}
                        onPress={() => canEdit && setServiceRadiusMiles(miles)}
                      />
                    ))}
                  </View>
                </>
              )}
              {serviceAreaType === 'cities' && (
                <View style={styles.field}>
                  <ThemedText type="smallBold">Service cities (at least one required)</ThemedText>
                  <View style={styles.addRow}>
                    <TextInput
                      editable={canEdit}
                      onChangeText={setServiceCityDraft}
                      onSubmitEditing={addServiceCity}
                      placeholder="Add a city"
                      placeholderTextColor={colors.textSecondary}
                      returnKeyType="done"
                      style={[
                        styles.input,
                        styles.addInput,
                        {
                          color: colors.text,
                          backgroundColor: colors.background,
                          borderColor: colors.backgroundElement,
                        },
                      ]}
                      value={serviceCityDraft}
                    />
                    <Pressable
                      disabled={!canEdit}
                      onPress={addServiceCity}
                      style={styles.addButton}
                    >
                      <ThemedText style={styles.primaryButtonText} type="smallBold">
                        Add
                      </ThemedText>
                    </Pressable>
                  </View>
                  <View style={styles.choiceRow}>
                    {serviceCities.map((serviceCity) => (
                      <Pressable
                        key={serviceCity}
                        disabled={!canEdit}
                        onPress={() =>
                          setServiceCities((current) =>
                            current.filter((item) => item !== serviceCity),
                          )
                        }
                        style={styles.cityChip}
                      >
                        <ThemedText type="smallBold">
                          {serviceCity}
                          {canEdit ? ' ×' : ''}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {serviceAreaType === 'custom' && (
                <Field
                  label="Describe the service area (required)"
                  value={customServiceArea}
                  onChangeText={setCustomServiceArea}
                  colors={colors}
                  editable={canEdit}
                  multiline
                  style={styles.multiline}
                />
              )}
              {canEdit && (
                <PrimaryButton
                  disabled={saving}
                  label={saving ? 'Saving…' : 'Save details'}
                  onPress={() => void saveDetails()}
                />
              )}
            </View>
          )}

          {section === 'offerings' && (
            <View style={styles.cardList}>
              {offerSections.map((group) => (
                <View key={group.id} style={styles.formCard}>
                  <ThemedText type="subtitle">{group.name}</ThemedText>
                  {!!group.description && (
                    <ThemedText themeColor="textSecondary">{group.description}</ThemedText>
                  )}
                  {offerings
                    .filter((item) => item.section_id === group.id)
                    .map((item) => (
                      <View key={item.id} style={styles.settingRow}>
                        <View style={styles.rowText}>
                          <ThemedText type="smallBold">{item.name}</ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            {formatPrice(item)}
                          </ThemedText>
                          {!!item.description && (
                            <ThemedText themeColor="textSecondary" type="small">
                              {item.description}
                            </ThemedText>
                          )}
                        </View>
                        <View style={styles.switches}>
                          <LabeledSwitch
                            label="Available"
                            disabled={!canEdit}
                            value={item.is_available}
                            onValueChange={(value) =>
                              void updateOffering(item, { is_available: value })
                            }
                          />
                          <LabeledSwitch
                            label="Visible"
                            disabled={!canEdit}
                            value={item.is_visible}
                            onValueChange={(value) =>
                              void updateOffering(item, { is_visible: value })
                            }
                          />
                        </View>
                        {canEdit && (
                          <Pressable onPress={() => void archiveOffering(item)}>
                            <ThemedText style={styles.destructiveText} type="smallBold">
                              Archive offering
                            </ThemedText>
                          </Pressable>
                        )}
                      </View>
                    ))}
                </View>
              ))}
              {canEdit && (
                <View style={styles.formCard}>
                  <ThemedText type="subtitle">Add a section</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Group similar products or services so customers can scan them quickly.
                  </ThemedText>
                  <Field
                    label="Section name (required)"
                    value={newSectionName}
                    onChangeText={setNewSectionName}
                    colors={colors}
                    returnKeyType="next"
                  />
                  <Field
                    label="Section description (optional)"
                    value={newSectionDescription}
                    onChangeText={setNewSectionDescription}
                    colors={colors}
                  />
                  <PrimaryButton
                    disabled={saving || !newSectionName.trim()}
                    label="Create section"
                    onPress={() => void createOfferingSection()}
                  />
                </View>
              )}
              {canEdit && offerSections.length > 0 && (
                <View style={styles.formCard}>
                  <ThemedText type="subtitle">Add an offering</ThemedText>
                  <ThemedText type="smallBold">Section (required)</ThemedText>
                  <View style={styles.choiceRow}>
                    {offerSections.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        label={item.name}
                        selected={newOfferingSectionId === item.id}
                        onPress={() => setNewOfferingSectionId(item.id)}
                      />
                    ))}
                  </View>
                  <Field
                    label="Name (required)"
                    value={newOfferingName}
                    onChangeText={setNewOfferingName}
                    colors={colors}
                  />
                  <Field
                    label="Description (optional)"
                    value={newOfferingDescription}
                    onChangeText={setNewOfferingDescription}
                    colors={colors}
                    multiline
                    style={styles.multiline}
                  />
                  <Field
                    label="Price in dollars (optional)"
                    value={newOfferingPrice}
                    onChangeText={setNewOfferingPrice}
                    colors={colors}
                    keyboardType="decimal-pad"
                    placeholder="Leave blank for Contact for price"
                  />
                  <PrimaryButton
                    disabled={saving || !newOfferingName.trim()}
                    label="Create offering"
                    onPress={() => void createOffering()}
                  />
                </View>
              )}
              {offerSections.length === 0 && !canEdit && (
                <EmptyState title="No offerings yet" message="The owner has not added offerings." />
              )}
            </View>
          )}

          {section === 'events' && (
            <View style={styles.cardList}>
              {events.length === 0 ? (
                <EmptyState
                  title="No events yet"
                  message="Event creation will live here; nothing opens a browser."
                />
              ) : (
                events.map((item) => (
                  <View key={item.id} style={styles.settingRowCard}>
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold">{item.title}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {new Date(item.starts_at).toLocaleString()}
                      </ThemedText>
                      {item.publish_at && (
                        <ThemedText themeColor="textSecondary" type="small">
                          Scheduled to publish {new Date(item.publish_at).toLocaleString()}
                        </ThemedText>
                      )}
                    </View>
                    <LabeledSwitch
                      label="Published"
                      disabled={!canEdit}
                      value={item.is_published}
                      onValueChange={(value) => void updateEvent(item, value)}
                    />
                  </View>
                ))
              )}
              {canEdit && (
                <View style={styles.formCard}>
                  <ThemedText type="subtitle">Create an event</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    Required fields are labeled. Choose whether this saves as a draft or publishes
                    now.
                  </ThemedText>
                  <Field
                    label="Event title (required)"
                    value={newEventTitle}
                    onChangeText={setNewEventTitle}
                    colors={colors}
                  />
                  <Field
                    label="Description (optional)"
                    value={newEventDescription}
                    onChangeText={setNewEventDescription}
                    colors={colors}
                    multiline
                    style={styles.multiline}
                  />
                  <View style={styles.inlineFields}>
                    <View style={styles.inlineField}>
                      <Field
                        label="Date (required)"
                        value={newEventDate}
                        onChangeText={setNewEventDate}
                        colors={colors}
                        placeholder="YYYY-MM-DD"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                    <View style={styles.inlineField}>
                      <Field
                        label="Start time (required)"
                        value={newEventTime}
                        onChangeText={setNewEventTime}
                        colors={colors}
                        placeholder="18:00"
                        keyboardType="numbers-and-punctuation"
                      />
                    </View>
                  </View>
                  <Field
                    label="Location (optional)"
                    value={newEventLocation}
                    onChangeText={setNewEventLocation}
                    colors={colors}
                  />
                  <ThemedText type="smallBold">When should customers see it?</ThemedText>
                  <View style={styles.choiceRow}>
                    <ChoiceButton
                      label="Save draft"
                      selected={eventSaveMode === 'draft'}
                      onPress={() => setEventSaveMode('draft')}
                    />
                    <ChoiceButton
                      label="Publish now"
                      selected={eventSaveMode === 'publish'}
                      onPress={() => setEventSaveMode('publish')}
                    />
                  </View>
                  <PrimaryButton
                    disabled={saving || !newEventTitle.trim() || !newEventDate || !newEventTime}
                    label={eventSaveMode === 'publish' ? 'Create and publish' : 'Save as draft'}
                    onPress={() => void createEvent()}
                  />
                </View>
              )}
            </View>
          )}

          {section === 'rewards' && (
            <View style={styles.formCard}>
              <Field
                label="Program name"
                value={rewardName}
                onChangeText={setRewardName}
                colors={colors}
                editable={canEdit}
              />
              <Field
                label="Reward description"
                value={rewardDescription}
                onChangeText={setRewardDescription}
                colors={colors}
                editable={canEdit}
                multiline
                style={styles.multiline}
              />
              <Field
                label="Stamps required (2–30)"
                value={stampsRequired}
                onChangeText={setStampsRequired}
                colors={colors}
                editable={canEdit}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Field
                label="Terms (optional)"
                value={rewardTerms}
                onChangeText={setRewardTerms}
                colors={colors}
                editable={canEdit}
                multiline
                style={styles.multiline}
              />
              {reward && (
                <LabeledSwitch
                  label="Program active"
                  disabled={!canEdit}
                  value={reward.is_active}
                  onValueChange={(value) => void toggleReward(value)}
                />
              )}
              {canEdit && (
                <PrimaryButton
                  disabled={saving}
                  label={
                    saving ? 'Saving…' : reward ? 'Save rewards program' : 'Create rewards program'
                  }
                  onPress={() => void saveReward()}
                />
              )}
            </View>
          )}

          {section === 'photos' && (
            <View style={styles.cardList}>
              {photos.length === 0 ? (
                <EmptyState
                  title="No photos yet"
                  message="No photos have been added to this business."
                />
              ) : (
                photos.map((photo) => {
                  const asset = Array.isArray(photo.media_assets)
                    ? photo.media_assets[0]
                    : photo.media_assets;
                  return (
                    <View key={photo.id} style={styles.settingRowCard}>
                      {asset?.status === 'ready' && (
                        <Image
                          accessibilityLabel={asset.alt_text ?? photo.caption ?? ''}
                          contentFit="cover"
                          source={{ uri: storagePublicUrl(asset.storage_path) }}
                          style={styles.photoPreview}
                          transition={180}
                        />
                      )}
                      <View style={styles.rowText}>
                        <ThemedText type="smallBold">{photo.role.replaceAll('_', ' ')}</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          {photo.caption || asset?.alt_text || 'No caption'}
                        </ThemedText>
                      </View>
                      <View style={styles.statusBadge}>
                        <ThemedText style={styles.statusText} type="smallBold">
                          {asset?.status ?? 'linked'}
                        </ThemedText>
                      </View>
                    </View>
                  );
                })
              )}
              <Notice
                kind="info"
                message="Existing photos now use the same native image pipeline as the customer page. Adding new photos will stay native too; it will be enabled with the device image picker in the next build-capability update."
              />
            </View>
          )}

          {section === 'review' && business && (
            <View style={styles.cardList}>
              <View style={styles.formCard}>
                <ThemedText type="subtitle">Publishing checklist</ThemedText>
                <ThemedText themeColor="textSecondary">
                  These items make sure customers see a complete, trustworthy business page.
                </ThemedText>
                {readiness?.checks.map((check) => (
                  <View key={check.key} style={styles.checkRow}>
                    <View style={[styles.checkDot, check.complete && styles.checkDotComplete]}>
                      <ThemedText style={styles.checkMark} type="smallBold">
                        {check.complete ? '✓' : '·'}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.checkLabel}>{check.label}</ThemedText>
                  </View>
                ))}
                {business.status === 'draft' && canEdit && (
                  <PrimaryButton
                    disabled={saving || !readiness?.ready}
                    label={
                      readiness?.ready ? 'Submit for SDS review' : 'Complete checklist to submit'
                    }
                    onPress={() => void submitForReview()}
                  />
                )}
                {business.status === 'pending_review' && (
                  <Notice kind="info" message="This page is waiting for SDS review." />
                )}
                {business.status === 'active' && (
                  <Notice kind="success" message="This business page is live." />
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatPrice(item: OfferingItem) {
  if (item.price_text) return item.price_text;
  if (item.price_minor === null) return 'Price not set';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    item.price_minor / 100,
  );
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

function LabeledSwitch({
  label,
  disabled,
  value,
  onValueChange,
}: {
  readonly label: string;
  readonly disabled: boolean;
  readonly value: boolean;
  readonly onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.switchRow}>
      <ThemedText type="small">{label}</ThemedText>
      <Switch disabled={disabled} onValueChange={onValueChange} value={value} />
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <ThemedText style={styles.primaryButtonText} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ChoiceButton({
  label,
  selected,
  onPress,
}: {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.choiceButton, selected && styles.choiceButtonSelected]}
    >
      <ThemedText style={selected ? styles.choiceButtonTextSelected : undefined} type="smallBold">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function Notice({
  kind,
  message,
}: {
  readonly kind: 'error' | 'success' | 'info';
  readonly message: string;
}) {
  return (
    <View
      style={[
        styles.notice,
        kind === 'error'
          ? styles.errorNotice
          : kind === 'success'
            ? styles.successNotice
            : styles.infoNotice,
      ]}
    >
      <ThemedText
        style={
          kind === 'error'
            ? styles.errorText
            : kind === 'success'
              ? styles.successText
              : styles.infoText
        }
        type="smallBold"
      >
        {message}
      </ThemedText>
    </View>
  );
}

function EmptyState({ title, message }: { readonly title: string; readonly message: string }) {
  return (
    <View style={styles.formCard}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
    </View>
  );
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event'
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.three,
  },
  backButton: { alignSelf: 'flex-start', paddingVertical: Spacing.one },
  sectionScroller: { marginHorizontal: -Spacing.four },
  sectionRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four },
  sectionButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#8A938E',
    paddingHorizontal: 16,
  },
  sectionButtonActive: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  sectionButtonTextActive: { color: Brand.onPrimary },
  formCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: '#8A938E',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  cardList: { gap: Spacing.three },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  choiceButtonSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  choiceButtonTextSelected: { color: Brand.onPrimary },
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
  inlineFields: { flexDirection: 'row', gap: Spacing.two },
  inlineField: { flex: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  addInput: { flex: 1 },
  addButton: {
    minHeight: 50,
    minWidth: 72,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
  },
  cityChip: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(120,140,128,0.16)',
    paddingHorizontal: 14,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: Brand.onPrimary },
  disabled: { opacity: 0.55 },
  settingRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#8A938E',
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  settingRowCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8A938E',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  rowText: { flex: 1, gap: Spacing.one },
  switches: { gap: Spacing.one },
  switchRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  notice: { borderRadius: 14, borderWidth: 1, padding: Spacing.three },
  errorNotice: { backgroundColor: '#F8E6E6', borderColor: '#C86A6A' },
  successNotice: { backgroundColor: '#E7F0EA', borderColor: '#8EB49F' },
  infoNotice: { backgroundColor: '#E8EFF7', borderColor: '#8BA8C7' },
  errorText: { color: '#761F1F' },
  successText: { color: '#164E38' },
  infoText: { color: '#153B62' },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E7F0EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusText: { color: '#164E38' },
  photoPreview: { width: '100%', aspectRatio: 1.8, borderRadius: 14 },
  destructiveText: { color: Brand.danger },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D8DED9',
  },
  checkDotComplete: { backgroundColor: Brand.primary },
  checkMark: { color: Brand.onPrimary },
  checkLabel: { flex: 1 },
});
