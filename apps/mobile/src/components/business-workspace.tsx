import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import { AppButton } from '@/components/app-button';
import { OrderingPanel } from '@/components/ordering-panel';
import { StateNotice } from '@/components/data-state';
import { Image } from 'expo-image';
import { router, useFocusEffect, type Href } from 'expo-router';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLinking from 'expo-linking';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Share,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { BusinessLocationMap } from '@/components/business-location-map';
import { BusinessQrPoster } from '@/components/business-qr-poster';
import { BusinessHub } from '@/components/business-hub';
import { HoursEditor, type WorkspaceHour } from '@/components/business-workspace-panels';
import { ChoicePicker } from '@/components/choice-picker';
import { SwipeBackView } from '@/components/swipe-back-view';
import {
  businessWorkspaceBackTarget,
  radiusChoices,
  sectionDescriptions,
  serviceAreaTypes,
  stateCodes,
  variantPlan,
  workspaceOfferingTerminology,
  workspaceSectionLabel,
  type BusinessSection,
  type ServiceAreaType,
  type UploadRole,
} from '@/lib/business-workspace-config';
import { BottomTabInset, Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { readableTextColor } from '@/lib/color-contrast';
import { haptics } from '@/lib/haptics';
import { businessPublicUrl } from '@/lib/share-links';
import {
  contactEditorPatch,
  locationEditorPatch,
  profileEditorPatch,
} from '@/lib/business-editor-patches';
import { supabase } from '@/lib/supabase';
import { storagePublicUrl } from '@/lib/storage-url';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';
import { usePickupWorkspace } from '@/providers/pickup-workspace-provider';
import {
  calculateBusinessProfileCompleteness,
  formatMinorCurrency,
  getBusinessStatusLabel,
  hasUnsavedChanges,
  parseCurrencyToMinor,
  selectBusinessAttentionItem,
  toDateInputValue as sharedDateInputValue,
  toTimeInputValue as sharedTimeInputValue,
  type BusinessAttentionItem,
} from '@sds/business-logic';
import { mediaLimits } from '@sds/image-processing-config';

type Section = BusinessSection;
type StopPickerTarget = 'date' | 'start' | 'end';
type EventPickerTarget =
  | 'new-date'
  | 'new-time'
  | 'new-publish-date'
  | 'new-publish-time'
  | 'edit-date'
  | 'edit-time'
  | 'edit-publish-date'
  | 'edit-publish-time';

interface BusinessRecord {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly business_type:
    'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
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

interface LocationStopRecord {
  readonly id: string;
  readonly title: string;
  readonly address_text: string | null;
  readonly latitude: number;
  readonly longitude: number;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly timezone: string;
  readonly is_published: boolean;
}

interface OfferingSection {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly display_order: number;
  readonly is_visible: boolean;
}

interface OfferingItem {
  readonly id: string;
  readonly section_id: string;
  readonly media_asset_id: string | null;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly is_available: boolean;
  readonly is_featured: boolean;
  readonly is_visible: boolean;
  readonly display_order: number;
  readonly media_assets:
    | {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
        readonly width: number;
        readonly height: number;
      }[]
    | null;
}

interface MenuImportRow {
  readonly category: string;
  readonly name: string;
  readonly description: string;
  readonly price: string;
  readonly priceText: string;
  readonly featured: boolean;
  readonly visible: boolean;
}

interface EventPhotoRecord {
  readonly id: string;
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

interface EventRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly starts_at: string;
  readonly address_text: string | null;
  readonly is_published: boolean;
  readonly publish_at: string | null;
  readonly media_assets:
    | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
    | readonly {
        readonly storage_path: string;
        readonly status: string;
        readonly alt_text: string | null;
      }[]
    | null;
  readonly event_photos: readonly EventPhotoRecord[] | null;
}

type BusinessUpdateType = 'announcement' | 'deal';

interface BusinessUpdateRecord {
  readonly id: string;
  readonly update_type: BusinessUpdateType;
  readonly title: string;
  readonly body: string;
  readonly expires_at: string | null;
  readonly created_at: string;
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
  readonly program_type: 'visits' | 'points';
  readonly stamps_required: number;
  readonly points_per_dollar: number | null;
  readonly points_required: number | null;
  readonly checkout_reward_type: 'free_item' | 'bogo' | 'percent_discount';
  readonly checkout_reward_variation_id: string | null;
  readonly checkout_reward_percent: number | null;
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

interface StaffMember {
  readonly member_id: string;
  readonly user_id: string;
  readonly display_name: string;
  readonly role: 'staff';
  readonly is_active: boolean;
  readonly created_at: string;
}

interface StaffInvite {
  readonly invite_id: string;
  readonly invited_email: string;
  readonly status: 'pending' | 'accepted' | 'revoked' | 'expired';
  readonly expires_at: string;
  readonly created_at: string;
  readonly accepted_at: string | null;
}

type MediaAssetRelation =
  | { readonly storage_path: string; readonly status: string; readonly alt_text: string | null }
  | readonly {
      readonly storage_path: string;
      readonly status: string;
      readonly alt_text: string | null;
    }[]
  | null
  | undefined;

function firstMediaAsset(value: MediaAssetRelation) {
  return Array.isArray(value) ? value[0] : value;
}

function offeringImageUrl(item: OfferingItem) {
  const asset = firstMediaAsset(item.media_assets);
  return asset?.status === 'ready' ? storagePublicUrl(asset.storage_path) : null;
}

export function BusinessWorkspace({
  businessId,
  initialSection,
  initialOrderingProvider,
  onBack,
  exitUnderlay,
}: {
  readonly businessId: string;
  readonly initialSection: Section | null;
  readonly initialOrderingProvider?: 'square' | 'stripe';
  readonly onBack: () => void;
  readonly exitUnderlay?: React.ReactNode;
}) {
  const bottomPadding = useScreenBottomPadding();
  const { session, loading: authLoading } = useAuth();
  const pickupWorkspace = usePickupWorkspace();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [section, setSection] = useState<Section | null>(initialSection);
  const [orderingDirty, setOrderingDirty] = useState(false);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [offerSections, setOfferSections] = useState<OfferingSection[]>([]);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [updates, setUpdates] = useState<BusinessUpdateRecord[]>([]);
  const [reward, setReward] = useState<RewardRecord | null>(null);
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [hours, setHours] = useState<WorkspaceHour[]>([]);
  const [locationStops, setLocationStops] = useState<LocationStopRecord[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffInvites, setStaffInvites] = useState<StaffInvite[]>([]);
  const [latestInviteLink, setLatestInviteLink] = useState<{
    readonly email: string;
    readonly url: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockNow] = useState(() => Date.now());
  const [clockDay] = useState(() => new Date().getDay());
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [businessViewerOpen, setBusinessViewerOpen] = useState(false);
  const [qrPosterOpen, setQrPosterOpen] = useState(false);
  const [mapInteractionActive, setMapInteractionActive] = useState(false);
  const [eventPhotoCaption, setEventPhotoCaption] = useState('');
  const [eventPhotoAltText, setEventPhotoAltText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const hubScrollOffset = useRef(0);
  const [hubReturnOffset, setHubReturnOffset] = useState(0);

  const [name, setName] = useState('');
  const [businessType, setBusinessType] = useState<BusinessRecord['business_type']>('general');
  const [description, setDescription] = useState('');
  const [primaryColor, setPrimaryColor] = useState<string>(Brand.primary);
  const [accentColor, setAccentColor] = useState<string>('#F2B84B');
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
  const [newStopTitle, setNewStopTitle] = useState('');
  const [newStopAddress, setNewStopAddress] = useState('');
  const [newStopDate, setNewStopDate] = useState('');
  const [newStopStart, setNewStopStart] = useState('');
  const [newStopEnd, setNewStopEnd] = useState('');
  const [stopPickerTarget, setStopPickerTarget] = useState<StopPickerTarget | null>(null);
  const [newStopLatitude, setNewStopLatitude] = useState('');
  const [newStopLongitude, setNewStopLongitude] = useState('');
  const [stopGeocoding, setStopGeocoding] = useState(false);
  const stopLookupRequest = useRef(0);
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardTerms, setRewardTerms] = useState('');
  const [rewardProgramType, setRewardProgramType] = useState<'visits' | 'points'>('visits');
  const [stampsRequired, setStampsRequired] = useState('10');
  const [pointsPerDollar, setPointsPerDollar] = useState('1');
  const [pointsRequired, setPointsRequired] = useState('100');
  const [checkoutRewardType, setCheckoutRewardType] = useState<
    'free_item' | 'bogo' | 'percent_discount'
  >('free_item');
  const [checkoutRewardVariationId, setCheckoutRewardVariationId] = useState('');
  const [checkoutRewardPercent, setCheckoutRewardPercent] = useState('20');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [newOfferingSectionId, setNewOfferingSectionId] = useState('');
  const [newOfferingName, setNewOfferingName] = useState('');
  const [newOfferingDescription, setNewOfferingDescription] = useState('');
  const [newOfferingPrice, setNewOfferingPrice] = useState('');
  const [newOfferingPriceText, setNewOfferingPriceText] = useState('');
  const [newOfferingAddImage, setNewOfferingAddImage] = useState(false);
  const [menuEditorPanel, setMenuEditorPanel] = useState<'section' | 'item' | null>(null);
  const [menuImportOpen, setMenuImportOpen] = useState(false);
  const [menuImportFileName, setMenuImportFileName] = useState('');
  const [menuImportRows, setMenuImportRows] = useState<MenuImportRow[]>([]);
  const [menuImportError, setMenuImportError] = useState<string | null>(null);
  const [editingOfferingId, setEditingOfferingId] = useState<string | null>(null);
  const [editOfferingName, setEditOfferingName] = useState('');
  const [editOfferingDescription, setEditOfferingDescription] = useState('');
  const [editOfferingPrice, setEditOfferingPrice] = useState('');
  const [editOfferingPriceText, setEditOfferingPriceText] = useState('');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [eventSaveMode, setEventSaveMode] = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [newEventPublishDate, setNewEventPublishDate] = useState('');
  const [newEventPublishTime, setNewEventPublishTime] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventTime, setEditEventTime] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventSaveMode, setEditEventSaveMode] = useState<'draft' | 'publish' | 'schedule'>(
    'draft',
  );
  const [editEventPublishDate, setEditEventPublishDate] = useState('');
  const [editEventPublishTime, setEditEventPublishTime] = useState('');
  const [eventPickerTarget, setEventPickerTarget] = useState<EventPickerTarget | null>(null);
  const [newUpdateType, setNewUpdateType] = useState<BusinessUpdateType>('announcement');
  const [newUpdateTitle, setNewUpdateTitle] = useState('');
  const [newUpdateBody, setNewUpdateBody] = useState('');
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [photoCaptionDraft, setPhotoCaptionDraft] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [photoAltText, setPhotoAltText] = useState('');

  const canEdit = role === 'owner';

  const applyBusiness = useCallback((record: BusinessRecord) => {
    setBusiness(record);
    setName(record.name);
    setBusinessType(record.business_type);
    setDescription(record.description ?? '');
    setPrimaryColor(record.primary_color);
    setAccentColor(record.accent_color);
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
    setRewardProgramType(record?.program_type ?? 'visits');
    setStampsRequired(String(record?.stamps_required ?? 10));
    setPointsPerDollar(String(record?.points_per_dollar ?? 1));
    setPointsRequired(String(record?.points_required ?? 100));
    setCheckoutRewardType(record?.checkout_reward_type ?? 'free_item');
    setCheckoutRewardVariationId(record?.checkout_reward_variation_id ?? '');
    setCheckoutRewardPercent(String(record?.checkout_reward_percent ?? 20));
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
      updatesResult,
      readinessResult,
      hoursResult,
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
          'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
        )
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('offering_sections')
        .select('id, name, description, display_order, is_visible')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('offering_items')
        .select(
          'id, section_id, media_asset_id, name, description, price_minor, price_text, is_available, is_featured, is_visible, display_order, media_assets(storage_path, status, alt_text, width, height)',
        )
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('events')
        .select(
          'id, title, description, starts_at, address_text, is_published, publish_at, media_assets(storage_path, status, alt_text), event_photos(id, caption, display_order, media_assets(storage_path, status, alt_text))',
        )
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('starts_at'),
      supabase
        .from('loyalty_programs')
        .select(
          'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_percent, terms, is_active',
        )
        .eq('business_id', businessId)
        .maybeSingle(),
      supabase
        .from('business_photos')
        .select('id, role, caption, display_order, media_assets(storage_path, status, alt_text)')
        .eq('business_id', businessId)
        .order('display_order'),
      supabase
        .from('business_updates')
        .select('id, update_type, title, body, expires_at, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.rpc('get_business_readiness', { p_business_id: businessId }),
      supabase
        .from('business_hours')
        .select('id, day_of_week, interval_number, opens_at, closes_at, is_closed')
        .eq('business_id', businessId)
        .order('day_of_week')
        .order('interval_number'),
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
      hoursResult.error,
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
    // Follower updates are an optional capability. If an older local schema
    // has not applied its migration yet, keep the core workspace usable and
    // show an empty updates section until the migration is available.
    setUpdates((updatesResult.data ?? []) as BusinessUpdateRecord[]);
    setReadiness((readinessResult.data as ReadinessResult | null) ?? null);
    setHours((hoursResult.data ?? []) as WorkspaceHour[]);
    setLoading(false);
  }, [applyBusiness, applyReward, businessId, session]);

  const loadLocationStops = useCallback(async () => {
    if (!businessId) return;
    const { data, error: stopsError } = await supabase
      .from('business_location_stops')
      .select(
        'id, title, address_text, latitude, longitude, starts_at, ends_at, timezone, is_published',
      )
      .eq('business_id', businessId)
      .order('starts_at');
    if (stopsError) {
      // Keep older local databases usable until the feature migration is applied.
      if (!/relation .*business_location_stops.*does not exist/i.test(stopsError.message)) {
        setError(userMessageFromError(stopsError, 'We could not load scheduled locations.'));
      }
      return;
    }
    setLocationStops((data ?? []) as LocationStopRecord[]);
  }, [businessId]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkspace();
      void loadLocationStops();
    }, [loadLocationStops, loadWorkspace]),
  );

  const loadStaff = useCallback(async () => {
    if (!session || !businessId || role !== 'owner') return;
    const [staffResult, inviteResult] = await Promise.all([
      supabase.rpc('list_business_staff', { p_business_id: businessId }),
      supabase.rpc('list_business_staff_invites', { p_business_id: businessId }),
    ]);
    if (staffResult.error) {
      setError(userMessageFromError(staffResult.error, 'We could not load staff members.'));
      return;
    }
    if (inviteResult.error) {
      setError(userMessageFromError(inviteResult.error, 'We could not load staff invites.'));
      return;
    }
    setStaff((staffResult.data ?? []) as StaffMember[]);
    setStaffInvites((inviteResult.data ?? []) as StaffInvite[]);
  }, [businessId, role, session]);

  useFocusEffect(
    useCallback(() => {
      if (role === 'owner') void loadStaff();
    }, [loadStaff, role]),
  );

  const isMenuBusiness =
    business?.business_type === 'food_drink' || business?.business_type === 'mobile';
  const sectionTitle = useMemo(
    () => (section ? workspaceSectionLabel(section, business?.business_type) : 'Business Hub'),
    [business?.business_type, section],
  );
  const workspaceAccent = business?.primary_color || Brand.primary;
  const logoUri = useMemo(() => {
    const photo = photos.find((candidate) => candidate.role === 'logo');
    const asset = firstMediaAsset(photo?.media_assets);
    return asset?.status === 'ready' ? storagePublicUrl(asset.storage_path) : null;
  }, [photos]);
  const offeringTerminology = workspaceOfferingTerminology(business?.business_type);
  const visibleOfferingCount = offerings.filter((item) => item.is_visible).length;
  const featuredOfferingCount = offerings.filter(
    (item) => item.is_featured && item.is_visible,
  ).length;
  const weeklyHoursComplete =
    hours.length > 0 &&
    Array.from({ length: 7 }, (_, day) =>
      hours.find((row) => row.day_of_week === day && row.interval_number === 1),
    ).every((row) => Boolean(row && (row.is_closed || (row.opens_at && row.closes_at))));
  const currentLocation = useMemo(() => {
    return locationStops.find((stop) => {
      const starts = new Date(stop.starts_at).getTime();
      const ends = new Date(stop.ends_at).getTime();
      return stop.is_published && starts <= clockNow && ends >= clockNow;
    });
  }, [clockNow, locationStops]);
  const profileCompletion = useMemo(
    () =>
      calculateBusinessProfileCompleteness({
        name: business?.name ?? null,
        description: business?.description ?? null,
        contact: business?.phone || business?.email || null,
        location:
          business?.business_type === 'mobile'
            ? currentLocation?.title || business?.city || business?.service_area
            : [business?.address_line_1, business?.city, business?.region_code]
                .filter(Boolean)
                .join(', ') ||
              business?.service_area ||
              null,
        offeringsCount: visibleOfferingCount,
        photosCount: photos.length,
        hoursComplete: weeklyHoursComplete,
      }),
    [business, currentLocation, photos.length, visibleOfferingCount, weeklyHoursComplete],
  );
  const attention = useMemo<BusinessAttentionItem | null>(() => {
    if (!business) return null;
    return selectBusinessAttentionItem({
      status: business.status,
      profile: profileCompletion,
      readinessMissing: readiness?.checks.find((check) => !check.complete)?.label ?? null,
      hoursComplete: weeklyHoursComplete,
      offeringsCount: visibleOfferingCount,
      photosCount: photos.length,
      isMobile: business.business_type === 'mobile',
      hasCurrentLocation: Boolean(currentLocation),
    });
  }, [
    business,
    currentLocation,
    photos.length,
    profileCompletion,
    readiness,
    visibleOfferingCount,
    weeklyHoursComplete,
  ]);
  const setupItems = useMemo(() => {
    if (!business) return [];
    const check = (key: string) =>
      readiness?.checks.find((item) => item.key === key)?.complete ?? false;
    const hasReadyPhoto = (role: 'logo' | 'cover') =>
      photos.some(
        (photo) => photo.role === role && firstMediaAsset(photo.media_assets)?.status === 'ready',
      );
    const locationComplete =
      serviceAreaType === 'cities'
        ? serviceCities.length > 0
        : serviceAreaType === 'statewide'
          ? Boolean(region)
          : serviceAreaType === 'custom'
            ? Boolean(customServiceArea.trim())
            : Boolean(addressLine1.trim() && city.trim() && region);
    return [
      {
        key: 'profile' as const,
        label: 'Complete your business profile',
        complete: Boolean(description.trim()) && check('category'),
      },
      {
        key: 'contact' as const,
        label: 'Add contact information',
        complete: Boolean(business.phone || business.email || business.website_url),
      },
      {
        key:
          business.business_type === 'mobile'
            ? ('mobile-location' as const)
            : ('location' as const),
        label:
          business.business_type === 'mobile'
            ? 'Add your first scheduled stop'
            : 'Complete location or service area',
        complete: business.business_type === 'mobile' ? locationStops.length > 0 : locationComplete,
      },
      { key: 'hours' as const, label: 'Add weekly hours', complete: weeklyHoursComplete },
      {
        key: 'photos' as const,
        label: 'Add a logo and cover image',
        complete: hasReadyPhoto('logo') && hasReadyPhoto('cover'),
      },
      {
        key: 'offerings' as const,
        label: isMenuBusiness ? 'Add your first menu item' : 'Add your first service',
        complete: visibleOfferingCount > 0,
      },
    ];
  }, [
    addressLine1,
    business,
    city,
    customServiceArea,
    description,
    isMenuBusiness,
    locationStops.length,
    photos,
    readiness,
    region,
    serviceAreaType,
    serviceCities.length,
    visibleOfferingCount,
    weeklyHoursComplete,
  ]);
  const todayHoursLabel = useMemo(() => {
    const row = hours.find(
      (candidate) => candidate.day_of_week === clockDay && candidate.interval_number === 1,
    );
    return row
      ? row.is_closed
        ? 'Closed today'
        : `${formatTime(row.opens_at)}–${formatTime(row.closes_at)}`
      : 'Hours not set';
  }, [clockDay, hours]);

  function openEditor(nextSection: Section) {
    setHubReturnOffset(hubScrollOffset.current);
    setSection(nextSection);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }

  function leaveEditor() {
    const returnToHub = () => {
      setSection(null);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollTo({ y: hubScrollOffset.current, animated: false }),
      );
    };
    if (focusedEditorIsDirty()) {
      Alert.alert('Discard unsaved changes?', 'Your changes in this editor have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: returnToHub },
      ]);
      return;
    }
    returnToHub();
  }

  function focusedEditorIsDirty() {
    if (section === 'ordering') return orderingDirty;
    if (!business) return false;
    if (section === 'profile') {
      return hasUnsavedChanges(
        {
          name: business.name,
          businessType: business.business_type,
          description: business.description,
          primaryColor: business.primary_color,
          accentColor: business.accent_color,
        },
        { name, businessType, description, primaryColor, accentColor },
      );
    }
    if (section === 'contact') {
      return hasUnsavedChanges(
        {
          phone: business.phone ?? '',
          email: business.email ?? '',
          website: business.website_url ?? '',
        },
        { phone, email, website },
      );
    }
    if (section === 'location') {
      return hasUnsavedChanges(
        {
          addressLine1: business.address_line_1 ?? '',
          city: business.city ?? '',
          region: business.region_code ?? '',
          postalCode: business.postal_code ?? '',
          serviceAreaType: business.service_area_type,
          serviceCities: business.service_area_regions,
          serviceRadiusMiles: business.service_radius_miles ?? 25,
          customServiceArea: business.service_area ?? '',
        },
        {
          addressLine1,
          city,
          region,
          postalCode,
          serviceAreaType,
          serviceCities,
          serviceRadiusMiles,
          customServiceArea,
        },
      );
    }
    return false;
  }

  function rememberHubScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!section) hubScrollOffset.current = event.nativeEvent.contentOffset.y;
  }

  function handleWorkspaceAction(key: BusinessSection) {
    openEditor(key);
  }

  function hubSummary(destination: BusinessSection) {
    if (destination === 'profile')
      return profileCompletion.percent === 100
        ? 'Identity and brand are complete'
        : `${profileCompletion.percent}% of the customer profile is complete`;
    if (destination === 'contact')
      return business?.phone || business?.email || business?.website_url
        ? 'Customer contact options are available'
        : 'Add a phone, email, or website';
    if (destination === 'hours') return todayHoursLabel;
    if (destination === 'location')
      return business?.service_area_type === 'at_location'
        ? [business.address_line_1, business.city].filter(Boolean).join(', ') ||
            'Add the business address'
        : business?.service_area ||
            business?.service_area_regions.join(', ') ||
            'Set the area you serve';
    if (destination === 'mobile-location')
      return (
        currentLocation?.title ??
        `${locationStops.length} scheduled ${locationStops.length === 1 ? 'stop' : 'stops'}`
      );
    if (destination === 'offerings')
      return `${visibleOfferingCount} visible of ${offerings.length}`;
    if (destination === 'photos')
      return `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`;
    if (destination === 'updates')
      return `${updates.length} recent ${updates.length === 1 ? 'update' : 'updates'}`;
    if (destination === 'events')
      return `${events.length} ${events.length === 1 ? 'event' : 'events'}`;
    if (destination === 'rewards')
      return reward?.is_active
        ? reward.name
        : reward
          ? 'Program is paused'
          : 'Set up a loyalty program';
    if (destination === 'staff')
      return `${staff.length} active ${staff.length === 1 ? 'staff member' : 'staff members'}`;
    if (destination === 'qr') return 'Print or save a branded QR poster';
    if (destination === 'sharing') return 'Share the customer page';
    if (destination === 'review') return getBusinessStatusLabel(business?.status ?? 'draft');
    return 'See the customer-facing page';
  }

  async function saveHours(nextHours: readonly WorkspaceHour[]) {
    if (!business || !canEdit) return false;
    setSaving(true);
    setError(null);
    setNotice(null);
    const { error: hoursError } = await supabase.from('business_hours').upsert(
      nextHours.map((row) => ({
        business_id: business.id,
        day_of_week: row.day_of_week,
        interval_number: row.interval_number,
        opens_at: row.is_closed ? null : row.opens_at,
        closes_at: row.is_closed ? null : row.closes_at,
        is_closed: row.is_closed,
      })),
      { onConflict: 'business_id,day_of_week,interval_number' },
    );
    setSaving(false);
    if (hoursError) {
      setError(userMessageFromError(hoursError, 'We could not save the weekly hours.'));
      return false;
    }
    setHours(nextHours.map((row) => ({ ...row })));
    setNotice('Weekly hours saved.');
    return true;
  }

  async function saveProfile() {
    if (!business || !canEdit) return;
    if (name.trim().length < 2) {
      setError('Business name must be at least 2 characters.');
      return;
    }
    if (!/^#[0-9a-f]{6}$/i.test(primaryColor) || !/^#[0-9a-f]{6}$/i.test(accentColor)) {
      setError('Brand colors must be six-digit hex colors, such as #176B4D.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: updateError } = await supabase
      .from('businesses')
      .update(
        profileEditorPatch({
          name,
          businessType,
          description,
          primaryColor,
          accentColor,
        }),
      )
      .eq('id', business.id)
      .select(
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
      )
      .single();
    setSaving(false);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save the profile and branding.'));
      return;
    }
    applyBusiness(data as BusinessRecord);
    setNotice('Profile and branding saved.');
  }

  async function saveContact() {
    if (!business || !canEdit) return;
    const cleanEmail = email.trim();
    const cleanWebsite = website.trim();
    if (cleanEmail && !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setError('Enter a valid customer email address.');
      return;
    }
    if (cleanWebsite) {
      try {
        new URL(/^https?:\/\//i.test(cleanWebsite) ? cleanWebsite : `https://${cleanWebsite}`);
      } catch {
        setError('Enter a valid website address.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: updateError } = await supabase
      .from('businesses')
      .update(contactEditorPatch({ phone, email, website }))
      .eq('id', business.id)
      .select(
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
      )
      .single();
    setSaving(false);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save the contact information.'));
      return;
    }
    applyBusiness(data as BusinessRecord);
    setNotice('Contact information saved.');
  }

  async function saveLocation() {
    if (!business || !canEdit) return;
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
      business.business_type !== 'mobile' &&
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
      .update(
        locationEditorPatch({
          addressLine1,
          city,
          region,
          postalCode,
          serviceAreaType,
          serviceCities,
          serviceRadiusMiles,
          customServiceArea,
        }),
      )
      .eq('id', business.id)
      .select(
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color',
      )
      .single();
    setSaving(false);
    if (updateError) {
      setError(
        userMessageFromError(updateError, 'We could not save the location and service area.'),
      );
      return;
    }
    applyBusiness(data as BusinessRecord);
    setNotice('Location and service area saved.');
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

  function parseStopDate(value: string, label: string) {
    const parsed = new Date(value);
    if (!value || Number.isNaN(parsed.getTime())) throw new Error(`Enter a valid ${label}.`);
    return parsed.toISOString();
  }

  function stopPickerValue(target: StopPickerTarget) {
    const date =
      newStopDate && /^\d{4}-\d{2}-\d{2}$/.test(newStopDate)
        ? new Date(`${newStopDate}T12:00:00`)
        : new Date();
    if (target === 'date') return date;
    const time = target === 'start' ? newStopStart : newStopEnd;
    const [hours = Number.NaN, minutes = Number.NaN] = time.split(':').map(Number);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      date.setHours(hours, minutes, 0, 0);
    } else {
      date.setSeconds(0, 0);
    }
    return date;
  }

  function handleStopPickerChange(target: StopPickerTarget, value: Date) {
    if (target === 'date') setNewStopDate(toDateInputValue(value));
    if (target === 'start') setNewStopStart(toTimeInputValue(value));
    if (target === 'end') setNewStopEnd(toTimeInputValue(value));
  }

  function eventPickerValue(target: EventPickerTarget) {
    const editing = target.startsWith('edit-');
    const publishing = target.includes('publish');
    const dateValue = editing
      ? publishing
        ? editEventPublishDate
        : editEventDate
      : publishing
        ? newEventPublishDate
        : newEventDate;
    const timeValue = editing
      ? publishing
        ? editEventPublishTime
        : editEventTime
      : publishing
        ? newEventPublishTime
        : newEventTime;
    const value = dateValue ? new Date(`${dateValue}T${timeValue || '12:00'}:00`) : new Date();
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }

  function handleEventPickerChange(target: EventPickerTarget, value: Date) {
    const formatted = target.endsWith('date') ? toDateInputValue(value) : toTimeInputValue(value);
    const setters: Record<EventPickerTarget, (next: string) => void> = {
      'new-date': setNewEventDate,
      'new-time': setNewEventTime,
      'new-publish-date': setNewEventPublishDate,
      'new-publish-time': setNewEventPublishTime,
      'edit-date': setEditEventDate,
      'edit-time': setEditEventTime,
      'edit-publish-date': setEditEventPublishDate,
      'edit-publish-time': setEditEventPublishTime,
    };
    setters[target](formatted);
  }

  async function geocodeAddress(address: string) {
    if (Platform.OS === 'android') {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        const requested = await Location.requestForegroundPermissionsAsync();
        if (!requested.granted) {
          throw new Error(
            'Location access is needed to place an address on the map. You can tap the map instead.',
          );
        }
      }
    }
    const query = [address, business?.city, business?.region_code].filter(Boolean).join(', ');
    let matches: Location.LocationGeocodedLocation[];
    try {
      matches = await Location.geocodeAsync(query);
    } catch {
      throw new Error(
        'We could not look up that address right now. Check it and try again, or tap the map.',
      );
    }
    const match = matches[0];
    if (!match || !Number.isFinite(match.latitude) || !Number.isFinite(match.longitude)) {
      throw new Error('We could not find that address. Check it and try again, or tap the map.');
    }
    return { latitude: match.latitude, longitude: match.longitude };
  }

  function formatReverseGeocodedAddress(address: {
    readonly name?: string | null;
    readonly streetNumber?: string | null;
    readonly street?: string | null;
    readonly city?: string | null;
    readonly region?: string | null;
    readonly postalCode?: string | null;
    readonly formattedAddress?: string | null;
  }) {
    if (address.formattedAddress?.trim()) return address.formattedAddress.trim();
    const street = [address.streetNumber, address.street].filter(Boolean).join(' ').trim();
    const locality = [address.city, address.region, address.postalCode]
      .filter(Boolean)
      .join(', ')
      .trim();
    return [street || address.name, locality].filter(Boolean).join(', ').trim();
  }

  function handleNewStopAddressChange(value: string) {
    ++stopLookupRequest.current;
    setNewStopAddress(value);
    // A changed address must be placed again so a stale pin can never be
    // saved for the new text.
    if (value.trim() !== newStopAddress.trim()) {
      setNewStopLatitude('');
      setNewStopLongitude('');
    }
  }

  async function placeAddressOnMap() {
    const address = newStopAddress.trim();
    if (!address || stopGeocoding) return;
    const requestId = ++stopLookupRequest.current;
    setStopGeocoding(true);
    setError(null);
    setNotice(null);
    try {
      const coordinate = await geocodeAddress(address);
      if (requestId !== stopLookupRequest.current) return;
      setNewStopLatitude(coordinate.latitude.toFixed(6));
      setNewStopLongitude(coordinate.longitude.toFixed(6));
      setMapInteractionActive(false);
      setNotice('Address placed on the map. Confirm the stop details, then add it.');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'We could not place that address on the map.',
      );
    } finally {
      setStopGeocoding(false);
    }
  }

  async function handleStopMapCoordinate(coordinate: { latitude: number; longitude: number }) {
    const requestId = ++stopLookupRequest.current;
    setMapInteractionActive(false);
    setNewStopLatitude(coordinate.latitude.toFixed(6));
    setNewStopLongitude(coordinate.longitude.toFixed(6));
    // Clear any previous address immediately; it belongs to the old pin until
    // reverse geocoding confirms the newly selected location.
    setNewStopAddress('');
    setStopGeocoding(true);
    setError(null);
    setNotice('Map pin selected. Looking up the address…');
    try {
      if (Platform.OS === 'android') {
        const permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) {
          const requested = await Location.requestForegroundPermissionsAsync();
          if (!requested.granted) throw new Error('');
        }
      }
      const [address] = await Location.reverseGeocodeAsync(coordinate);
      if (requestId !== stopLookupRequest.current) return;
      const formatted = address ? formatReverseGeocodedAddress(address) : '';
      if (formatted) {
        setNewStopAddress(formatted);
        setNotice('Map pin selected and address filled in. Confirm the stop details, then add it.');
      } else {
        setNotice('Map pin selected. Add an address if you want to label this stop.');
      }
    } catch {
      setNotice(
        'Map pin selected. We could not look up the address, but the pin is ready to save.',
      );
    } finally {
      setStopGeocoding(false);
    }
  }

  async function createLocationStop() {
    if (!canEdit || !business || business.business_type !== 'mobile') return;
    if (saving || (stopGeocoding && !(newStopLatitude.trim() && newStopLongitude.trim()))) return;
    ++stopLookupRequest.current;
    setError(null);
    setNotice(null);
    if (!newStopTitle.trim() || !newStopDate.trim() || !newStopStart.trim() || !newStopEnd.trim()) {
      setError('Add a stop name, date, start time, and end time.');
      return;
    }
    let latitude = Number(newStopLatitude);
    let longitude = Number(newStopLongitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      if (!newStopAddress.trim()) {
        setError('Enter an address or tap the map to place this stop.');
        return;
      }
      setStopGeocoding(true);
      try {
        const coordinate = await geocodeAddress(newStopAddress.trim());
        latitude = coordinate.latitude;
        longitude = coordinate.longitude;
        setNewStopLatitude(latitude.toFixed(6));
        setNewStopLongitude(longitude.toFixed(6));
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : 'We could not place that address on the map.',
        );
        setStopGeocoding(false);
        return;
      }
      setStopGeocoding(false);
    }
    let startsAt: string;
    let endsAt: string;
    try {
      startsAt = parseStopDate(
        `${newStopDate.trim()}T${newStopStart.trim()}:00`,
        'start date and time',
      );
      endsAt = parseStopDate(`${newStopDate.trim()}T${newStopEnd.trim()}:00`, 'end date and time');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enter a valid stop date and time.');
      return;
    }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      setError('Stop end time must be after its start time.');
      return;
    }
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('business_location_stops')
      .insert({
        business_id: business.id,
        title: newStopTitle.trim(),
        address_text: newStopAddress.trim() || null,
        latitude,
        longitude,
        starts_at: startsAt,
        ends_at: endsAt,
        timezone: 'America/Chicago',
        is_published: false,
      })
      .select(
        'id, title, address_text, latitude, longitude, starts_at, ends_at, timezone, is_published',
      )
      .single();
    setSaving(false);
    if (insertError) {
      setError(userMessageFromError(insertError, 'We could not add that scheduled location.'));
      return;
    }
    setLocationStops((current) =>
      [...current, data as LocationStopRecord].sort((a, b) =>
        a.starts_at.localeCompare(b.starts_at),
      ),
    );
    setNewStopTitle('');
    setNewStopAddress('');
    setNewStopDate('');
    setNewStopStart('');
    setNewStopEnd('');
    setNewStopLatitude('');
    setNewStopLongitude('');
    setNotice('Scheduled location added as a draft. Publish it when ready.');
  }

  async function toggleLocationStop(stop: LocationStopRecord, isPublished: boolean) {
    if (!canEdit) return;
    const { error: updateError } = await supabase
      .from('business_location_stops')
      .update({ is_published: isPublished })
      .eq('id', stop.id);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not update that scheduled location.'));
      return;
    }
    setLocationStops((current) =>
      current.map((item) => (item.id === stop.id ? { ...item, is_published: isPublished } : item)),
    );
    setNotice(
      isPublished
        ? 'Scheduled location is now visible to customers.'
        : 'Scheduled location unpublished.',
    );
  }

  function removeLocationStop(stop: LocationStopRecord) {
    Alert.alert('Remove scheduled location?', stop.title, [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          void (async () => {
            const { error: removeError } = await supabase
              .from('business_location_stops')
              .delete()
              .eq('id', stop.id);
            if (removeError) {
              setError(
                userMessageFromError(removeError, 'We could not remove that scheduled location.'),
              );
              return;
            }
            setLocationStops((current) => current.filter((item) => item.id !== stop.id));
            setNotice('Scheduled location removed.');
          })(),
      },
    ]);
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
    setMenuEditorPanel(null);
    setNotice('Offering section created.');
  }

  async function createOffering() {
    if (!canEdit || !newOfferingSectionId || !newOfferingName.trim()) {
      setError('Choose a section and enter an offering name.');
      return;
    }
    const hasPrice = Boolean(newOfferingPrice.trim());
    const priceMinor = hasPrice ? parseCurrencyToMinor(newOfferingPrice) : null;
    const customPriceText = newOfferingPriceText.trim();
    if (hasPrice && priceMinor === null) {
      setError('Enter a price such as $25.00, or leave it blank for “Contact for price.”');
      return;
    }
    if (priceMinor !== null && customPriceText) {
      setError('Use a numeric price or a display label, not both.');
      return;
    }
    const shouldAddImage = newOfferingAddImage;
    const createdName = newOfferingName.trim();
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
        price_minor: priceMinor,
        price_text: priceMinor === null ? customPriceText || 'Contact for price' : null,
        display_order: offerings.filter((item) => item.section_id === newOfferingSectionId).length,
      })
      .select(
        'id, section_id, media_asset_id, name, description, price_minor, price_text, is_available, is_featured, is_visible, display_order, media_assets(storage_path, status, alt_text, width, height)',
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
    setNewOfferingPriceText('');
    setNewOfferingAddImage(false);
    setMenuEditorPanel(null);
    setNotice('Offering created.');
    if (shouldAddImage) {
      await pickAndUploadPhoto('offering', (data as OfferingItem).id, createdName);
    }
  }

  function splitCsvLine(line: string) {
    const cells: string[] = [];
    let current = '';
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === ',' && !quoted) {
        cells.push(current.trim());
        current = '';
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function parseMenuImport(text: string, extension: string): MenuImportRow[] {
    if (extension === 'json') {
      const parsed: unknown = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error('JSON must contain an array of menu items.');
      return parsed.map((value, index) => {
        if (!value || typeof value !== 'object')
          throw new Error(`Menu item ${index + 1} is invalid.`);
        const row = value as Record<string, unknown>;
        const name = String(row.name ?? '').trim();
        if (!name) throw new Error(`Menu item ${index + 1} needs a name.`);
        return {
          category: String(row.category ?? row.section ?? 'General').trim() || 'General',
          name,
          description: String(row.description ?? '').trim(),
          price: String(row.price ?? '').trim(),
          priceText: String(row.price_text ?? row.priceText ?? '').trim(),
          featured: row.featured === true || String(row.featured).toLowerCase() === 'true',
          visible: row.visible !== false && String(row.visible).toLowerCase() !== 'false',
        } satisfies MenuImportRow;
      });
    }
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new Error('CSV needs a header row and at least one menu item.');
    const headers = splitCsvLine(lines[0] ?? '').map((header) =>
      header.toLowerCase().replace(/\s+/g, '_'),
    );
    const read = (cells: string[], ...names: string[]) => {
      const index = names.map((name) => headers.indexOf(name)).find((candidate) => candidate >= 0);
      return index === undefined ? '' : (cells[index] ?? '').trim();
    };
    return lines.slice(1).map((line, index) => {
      const cells = splitCsvLine(line);
      const name = read(cells, 'name', 'item', 'title');
      if (!name) throw new Error(`CSV row ${index + 2} needs a name.`);
      const featured = read(cells, 'featured', 'highlight').toLowerCase();
      const visible = read(cells, 'visible', 'published', 'is_visible').toLowerCase();
      return {
        category: read(cells, 'category', 'section', 'group') || 'General',
        name,
        description: read(cells, 'description', 'details'),
        price: read(cells, 'price', 'price_dollars'),
        priceText: read(cells, 'price_text', 'price_label'),
        featured: featured === 'true' || featured === 'yes' || featured === '1',
        visible: !['false', 'no', '0'].includes(visible),
      } satisfies MenuImportRow;
    });
  }

  async function pickMenuImport() {
    if (!canEdit || !isMenuBusiness) return;
    setMenuImportError(null);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
      type: [
        'text/csv',
        'application/json',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setMenuImportFileName(asset.name);
    const extension = asset.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['csv', 'json'].includes(extension)) {
      setMenuImportRows([]);
      setMenuImportError(
        'PDF and spreadsheet files can be used as a reference, but CSV or JSON is required for direct import.',
      );
      setMenuImportOpen(true);
      return;
    }
    try {
      const text = await new File(asset.uri).text();
      const rows = parseMenuImport(text, extension);
      if (!rows.length || rows.length > 100) {
        throw new Error('Choose a file with 1–100 menu items.');
      }
      setMenuImportRows(rows);
      setMenuImportOpen(true);
    } catch (importError) {
      setMenuImportRows([]);
      setMenuImportError(
        importError instanceof Error ? importError.message : 'We could not read that menu file.',
      );
      setMenuImportOpen(true);
    }
  }

  async function importMenuRows() {
    if (!canEdit || !business || !menuImportRows.length) return;
    setSaving(true);
    setMenuImportError(null);
    try {
      const nextSections = [...offerSections];
      const sectionByName = new Map(
        nextSections.map((item) => [item.name.trim().toLowerCase(), item]),
      );
      for (const row of menuImportRows) {
        const key = row.category.trim().toLowerCase() || 'general';
        if (sectionByName.has(key)) continue;
        const { data, error: sectionError } = await supabase
          .from('offering_sections')
          .insert({
            business_id: business.id,
            name: row.category.trim() || 'General',
            display_order: nextSections.length,
          })
          .select('id, name, description, display_order, is_visible')
          .single();
        if (sectionError) throw sectionError;
        const createdSection = data as OfferingSection;
        nextSections.push(createdSection);
        sectionByName.set(key, createdSection);
      }
      const sectionItemCounts = new Map(
        nextSections.map((item) => [
          item.id,
          offerings.filter((offering) => offering.section_id === item.id).length,
        ]),
      );
      for (const row of menuImportRows) {
        const section = sectionByName.get(row.category.trim().toLowerCase() || 'general');
        if (!section) throw new Error(`Could not create category ${row.category}.`);
        const hasPrice = Boolean(row.price.trim());
        const priceMinor = hasPrice ? parseCurrencyToMinor(row.price) : null;
        if (hasPrice && priceMinor === null) {
          throw new Error(`Invalid price for ${row.name}.`);
        }
        const { error: itemError } = await supabase.from('offering_items').insert({
          business_id: business.id,
          section_id: section.id,
          name: row.name,
          description: row.description,
          price_minor: priceMinor,
          price_text: priceMinor === null ? row.priceText || 'Contact for price' : null,
          is_featured: row.featured,
          is_visible: row.visible,
          display_order: sectionItemCounts.get(section.id) ?? 0,
        });
        if (itemError) throw itemError;
        sectionItemCounts.set(section.id, (sectionItemCounts.get(section.id) ?? 0) + 1);
      }
      setMenuImportOpen(false);
      setMenuImportFileName('');
      setMenuImportRows([]);
      setNotice(
        `Imported ${menuImportRows.length} menu ${menuImportRows.length === 1 ? 'item' : 'items'}.`,
      );
      await loadWorkspace();
    } catch (importError) {
      setMenuImportError(
        userMessageFromError(
          importError,
          'We could not import that menu. No further rows were added.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function beginOfferingEdit(item: OfferingItem) {
    setEditingOfferingId(item.id);
    setEditOfferingName(item.name);
    setEditOfferingDescription(item.description);
    setEditOfferingPrice(item.price_minor === null ? '' : formatMinorCurrency(item.price_minor));
    setEditOfferingPriceText(item.price_minor === null ? (item.price_text ?? '') : '');
    setError(null);
  }

  async function saveOfferingEdit(item: OfferingItem) {
    if (!canEdit || !editOfferingName.trim()) {
      setError('Enter an offering name before saving.');
      return;
    }
    const hasPrice = Boolean(editOfferingPrice.trim());
    const priceMinor = hasPrice ? parseCurrencyToMinor(editOfferingPrice) : null;
    const customPriceText = editOfferingPriceText.trim();
    if (hasPrice && priceMinor === null) {
      setError('Enter a price such as $25.00, or leave it blank for “Contact for price.”');
      return;
    }
    if (priceMinor !== null && customPriceText) {
      setError('Use a numeric price or a display label, not both.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const updates = {
      name: editOfferingName.trim(),
      description: editOfferingDescription.trim(),
      price_minor: priceMinor,
      price_text: priceMinor === null ? customPriceText || 'Contact for price' : null,
    };
    const { error: updateError } = await supabase
      .from('offering_items')
      .update(updates)
      .eq('id', item.id)
      .eq('business_id', businessId);
    setSaving(false);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save that offering.'));
      return;
    }
    setOfferings((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, ...updates } : candidate,
      ),
    );
    setEditingOfferingId(null);
    setNotice('Offering changes saved.');
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

  async function moveOfferingSection(group: OfferingSection, direction: 'up' | 'down') {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const { error: moveError } = await supabase.rpc('move_offering_section', {
      p_business_id: businessId,
      p_section_id: group.id,
      p_direction: direction,
    });
    setSaving(false);
    if (moveError) {
      setError(userMessageFromError(moveError, 'We could not reorder your menu categories.'));
      return;
    }
    setNotice('Menu category order saved.');
    await loadWorkspace();
  }

  async function moveOfferingItem(item: OfferingItem, direction: 'up' | 'down') {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    const { error: moveError } = await supabase.rpc('move_offering_item', {
      p_business_id: businessId,
      p_item_id: item.id,
      p_direction: direction,
    });
    setSaving(false);
    if (moveError) {
      setError(userMessageFromError(moveError, 'We could not reorder that menu item.'));
      return;
    }
    setNotice('Menu item order saved.');
    await loadWorkspace();
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
    let publishAt: Date | null = null;
    if (eventSaveMode === 'schedule') {
      publishAt = parseLocalDateTime(newEventPublishDate, newEventPublishTime);
      if (!publishAt || publishAt.getTime() <= Date.now()) {
        setError('Choose a future date and time for scheduled publishing.');
        return;
      }
      if (publishAt.getTime() >= startsAt.getTime()) {
        setError('Schedule publishing before the event starts.');
        return;
      }
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
        publish_at: publishAt?.toISOString() ?? null,
      })
      .select('id, title, description, starts_at, address_text, is_published, publish_at')
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
    setNewEventPublishDate('');
    setNewEventPublishTime('');
    setEventSaveMode('draft');
    setNotice(
      eventSaveMode === 'publish'
        ? 'Event created and published.'
        : eventSaveMode === 'schedule'
          ? 'Event created and scheduled.'
          : 'Event saved as a draft.',
    );
  }

  function beginEventEdit(item: EventRecord) {
    const start = new Date(item.starts_at);
    const publish = item.publish_at ? new Date(item.publish_at) : null;
    setEditingEventId(item.id);
    setEditEventTitle(item.title);
    setEditEventDescription(item.description);
    setEditEventDate(toDateInputValue(start));
    setEditEventTime(toTimeInputValue(start));
    setEditEventLocation(item.address_text ?? '');
    setEditEventSaveMode(item.is_published ? 'publish' : publish ? 'schedule' : 'draft');
    setEditEventPublishDate(publish ? toDateInputValue(publish) : '');
    setEditEventPublishTime(publish ? toTimeInputValue(publish) : '');
    setEventPhotoCaption('');
    setEventPhotoAltText('');
    setError(null);
  }

  async function saveEventEdit(item: EventRecord) {
    if (!canEdit || !editEventTitle.trim() || !editEventDate || !editEventTime) {
      setError('Event title, date, and start time are required.');
      return;
    }
    const startsAt = parseLocalDateTime(editEventDate, editEventTime);
    const now = new Date().getTime();
    if (!startsAt || startsAt.getTime() <= now) {
      setError('Choose a valid event date and time in the future.');
      return;
    }
    let publishAt: Date | null = null;
    if (editEventSaveMode === 'schedule') {
      publishAt = parseLocalDateTime(editEventPublishDate, editEventPublishTime);
      if (!publishAt || publishAt.getTime() <= now) {
        setError('Choose a future date and time for scheduled publishing.');
        return;
      }
      if (publishAt.getTime() >= startsAt.getTime()) {
        setError('Schedule publishing before the event starts.');
        return;
      }
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const updates = {
      title: editEventTitle.trim(),
      description: editEventDescription.trim(),
      starts_at: startsAt.toISOString(),
      address_text: editEventLocation.trim() || null,
      is_published: editEventSaveMode === 'publish',
      publish_at: publishAt?.toISOString() ?? null,
    };
    const { error: updateError } = await supabase
      .from('events')
      .update(updates)
      .eq('id', item.id)
      .eq('business_id', businessId);
    setSaving(false);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save that event.'));
      return;
    }
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === item.id ? { ...candidate, ...updates } : candidate,
      ),
    );
    setEditingEventId(null);
    setNotice(
      editEventSaveMode === 'publish'
        ? 'Event changes saved and published.'
        : editEventSaveMode === 'schedule'
          ? 'Event changes saved and scheduled.'
          : 'Event changes saved as a draft.',
    );
  }

  function beginEventPhotoEdit(photo: EventPhotoRecord) {
    setEditingPhotoId(photo.id);
    setEventPhotoCaption(photo.caption ?? '');
    setError(null);
  }

  async function saveEventPhotoCaption(event: EventRecord, photo: EventPhotoRecord) {
    if (!canEdit) return;
    const caption = eventPhotoCaption.trim() || null;
    const { error: updateError } = await supabase
      .from('event_photos')
      .update({ caption })
      .eq('id', photo.id)
      .eq('event_id', event.id);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save that event photo caption.'));
      return;
    }
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === event.id
          ? {
              ...candidate,
              event_photos: (candidate.event_photos ?? []).map((item) =>
                item.id === photo.id ? { ...item, caption } : item,
              ),
            }
          : candidate,
      ),
    );
    setEditingPhotoId(null);
    setEventPhotoCaption('');
    setNotice('Event photo caption saved.');
  }

  function removeEventPhoto(event: EventRecord, photo: EventPhotoRecord) {
    Alert.alert('Remove event photo?', 'This removes the image from the event gallery.', [
      { text: 'Keep photo', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => void removeEventPhotoConfirmed(event, photo),
      },
    ]);
  }

  async function removeEventPhotoConfirmed(event: EventRecord, photo: EventPhotoRecord) {
    if (!canEdit) return;
    const { error: deleteError } = await supabase
      .from('event_photos')
      .delete()
      .eq('id', photo.id)
      .eq('event_id', event.id);
    if (deleteError) {
      setError(userMessageFromError(deleteError, 'We could not remove that event photo.'));
      return;
    }
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === event.id
          ? {
              ...candidate,
              event_photos: (candidate.event_photos ?? []).filter((item) => item.id !== photo.id),
            }
          : candidate,
      ),
    );
    setNotice('Event photo removed.');
  }

  async function moveEventPhoto(event: EventRecord, photo: EventPhotoRecord, direction: -1 | 1) {
    if (!canEdit) return;
    const ordered = [...(event.event_photos ?? [])].sort(
      (a, b) => a.display_order - b.display_order,
    );
    const index = ordered.findIndex((candidate) => candidate.id === photo.id);
    const neighbor = ordered[index + direction];
    if (!neighbor) return;
    const { error: updateError } = await Promise.all([
      supabase
        .from('event_photos')
        .update({ display_order: neighbor.display_order })
        .eq('id', photo.id),
      supabase
        .from('event_photos')
        .update({ display_order: photo.display_order })
        .eq('id', neighbor.id),
    ]).then((results) => ({ error: results.find((result) => result.error)?.error ?? null }));
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not reorder the event gallery.'));
      return;
    }
    setEvents((current) =>
      current.map((candidate) =>
        candidate.id === event.id
          ? {
              ...candidate,
              event_photos: (candidate.event_photos ?? []).map((item) =>
                item.id === photo.id
                  ? { ...item, display_order: neighbor.display_order }
                  : item.id === neighbor.id
                    ? { ...item, display_order: photo.display_order }
                    : item,
              ),
            }
          : candidate,
      ),
    );
    setNotice('Event gallery order saved.');
  }

  function archiveEvent(item: EventRecord) {
    Alert.alert(
      'Archive event?',
      'It will be removed from this business workspace and customer listings.',
      [
        { text: 'Keep event', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => void archiveEventConfirmed(item) },
      ],
    );
  }

  async function archiveEventConfirmed(item: EventRecord) {
    if (!canEdit) return;
    setError(null);
    const { error: archiveError } = await supabase
      .from('events')
      .update({ archived_at: new Date().toISOString(), is_published: false, publish_at: null })
      .eq('id', item.id)
      .eq('business_id', businessId);
    if (archiveError) {
      setError(userMessageFromError(archiveError, 'We could not archive that event.'));
      return;
    }
    setEvents((current) => current.filter((candidate) => candidate.id !== item.id));
    setNotice('Event archived.');
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
    updates: Partial<Pick<OfferingItem, 'is_available' | 'is_visible' | 'is_featured'>>,
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

  function beginPhotoEdit(photo: PhotoRecord) {
    setEditingPhotoId(photo.id);
    setPhotoCaptionDraft(photo.caption ?? '');
    setError(null);
  }

  async function savePhotoCaption(photo: PhotoRecord) {
    if (!canEdit) return;
    const caption = photoCaptionDraft.trim() || null;
    const { error: updateError } = await supabase
      .from('business_photos')
      .update({ caption })
      .eq('id', photo.id)
      .eq('business_id', businessId);
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not save that photo caption.'));
      return;
    }
    setPhotos((current) =>
      current.map((candidate) =>
        candidate.id === photo.id ? { ...candidate, caption } : candidate,
      ),
    );
    setEditingPhotoId(null);
    setNotice('Photo caption saved.');
  }

  async function movePhoto(photo: PhotoRecord, direction: -1 | 1) {
    if (!canEdit) return;
    const ordered = [...photos].sort((a, b) => a.display_order - b.display_order);
    const index = ordered.findIndex((candidate) => candidate.id === photo.id);
    const neighbor = ordered[index + direction];
    if (!neighbor) return;
    const currentOrder = photo.display_order;
    const neighborOrder = neighbor.display_order;
    const { error: updateError } = await Promise.all([
      supabase.from('business_photos').update({ display_order: neighborOrder }).eq('id', photo.id),
      supabase
        .from('business_photos')
        .update({ display_order: currentOrder })
        .eq('id', neighbor.id),
    ]).then((results) => ({ error: results.find((result) => result.error)?.error ?? null }));
    if (updateError) {
      setError(userMessageFromError(updateError, 'We could not reorder the photos.'));
      return;
    }
    setPhotos((current) =>
      current.map((candidate) => {
        if (candidate.id === photo.id) return { ...candidate, display_order: neighborOrder };
        if (candidate.id === neighbor.id) return { ...candidate, display_order: currentOrder };
        return candidate;
      }),
    );
    setNotice('Photo order saved.');
  }

  function removePhoto(photo: PhotoRecord) {
    Alert.alert('Remove photo?', 'This removes the photo from the business page.', [
      { text: 'Keep photo', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removePhotoConfirmed(photo) },
    ]);
  }

  async function removePhotoConfirmed(photo: PhotoRecord) {
    if (!canEdit) return;
    const { error: deleteError } = await supabase
      .from('business_photos')
      .delete()
      .eq('id', photo.id)
      .eq('business_id', businessId);
    if (deleteError) {
      setError(userMessageFromError(deleteError, 'We could not remove that photo.'));
      return;
    }
    setPhotos((current) => current.filter((candidate) => candidate.id !== photo.id));
    setNotice('Photo removed.');
  }

  async function pickAndUploadPhoto(role: UploadRole, eventId?: string, altTextOverride?: string) {
    if (!canEdit || photoUploading || !session || !business) return;
    if (
      role === 'gallery' &&
      photos.filter((photo) => photo.role === 'gallery').length >= mediaLimits.maxGalleryImages
    ) {
      setError(`You can add up to ${mediaLimits.maxGalleryImages} gallery photos.`);
      return;
    }
    if (role === 'event_gallery') {
      const event = events.find((candidate) => candidate.id === eventId);
      const galleryCount = event?.event_photos?.length ?? 0;
      if (!eventId || galleryCount >= mediaLimits.maxGalleryImages) {
        setError(`You can add up to ${mediaLimits.maxGalleryImages} photos to an event gallery.`);
        return;
      }
    }
    setError(null);
    setNotice(null);
    let result: ImagePicker.ImagePickerResult;
    try {
      // Opening the native library is the permission request on current iOS and Android.
      // Calling the older explicit permission helper first can be undefined in an older
      // development client, so keep this path compatible with both clients.
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
    } catch (caught) {
      setError(
        userMessageFromError(
          caught,
          'We could not open your photo library. Check photo access in Settings and try again.',
        ),
      );
      return;
    }
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const sourceMime = asset.mimeType?.toLowerCase() ?? 'image/jpeg';
    if (
      !mediaLimits.acceptedRasterMimeTypes.includes(
        sourceMime as (typeof mediaLimits.acceptedRasterMimeTypes)[number],
      )
    ) {
      setError('Choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
      return;
    }
    if (asset.fileSize && asset.fileSize > mediaLimits.maxSourceBytes) {
      setError('Choose an image smaller than 15 MB.');
      return;
    }
    if (asset.width * asset.height > mediaLimits.maxSourcePixels) {
      setError('Choose an image smaller than 48 megapixels.');
      return;
    }

    setPhotoUploading(true);
    setError(null);
    setNotice('Preparing image variants…');
    const assetGroupId = Crypto.randomUUID();
    const stagedPaths: string[] = [];
    try {
      const variants: { path: string; variant: string }[] = [];
      for (const plan of variantPlan(role)) {
        const scale = Math.min(1, plan.maxDimension / Math.max(asset.width, asset.height));
        const width = Math.max(1, Math.round(asset.width * scale));
        const height = Math.max(1, Math.round(asset.height * scale));
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width, height } }],
          { compress: plan.quality, format: ImageManipulator.SaveFormat.WEBP },
        );
        const response = await fetch(manipulated.uri);
        if (!response.ok) throw new Error('The selected image could not be read.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!bytes.byteLength) throw new Error('The selected image was empty.');
        const path = `${session.user.id}/${business.id}/${assetGroupId}/${plan.name}.webp`;
        const { error: uploadError } = await supabase.storage
          .from('media-staging')
          .upload(path, bytes.buffer as ArrayBuffer, {
            cacheControl: '3600',
            contentType: 'image/webp',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        stagedPaths.push(path);
        variants.push({ path, variant: plan.name });
      }

      setNotice('Verifying and publishing photo…');
      const { data, error: invokeError } = await supabase.functions.invoke(
        'finalize-business-image',
        {
          body: {
            businessId: business.id,
            assetGroupId,
            role,
            targetId: eventId,
            altText:
              (
                altTextOverride ??
                (role === 'event' || role === 'event_gallery' ? eventPhotoAltText : photoAltText)
              ).trim() || `${business.name} ${role} photo`,
            caption: role === 'event_gallery' ? eventPhotoCaption.trim() || undefined : undefined,
            variants,
          },
        },
      );
      if (invokeError) {
        const details =
          typeof data === 'object' && data && 'error' in data
            ? String(data.error)
            : invokeError.message;
        throw new Error(details);
      }
      setPhotoAltText('');
      setEventPhotoAltText('');
      setEventPhotoCaption('');
      setNotice('Photo published.');
      await loadWorkspace();
    } catch (caught) {
      if (stagedPaths.length) await supabase.storage.from('media-staging').remove(stagedPaths);
      setNotice(null);
      setError(caught instanceof Error ? caught.message : 'The photo could not be uploaded.');
    } finally {
      setPhotoUploading(false);
    }
  }

  function inviteUrl(token: string) {
    const candidates = [process.env.EXPO_PUBLIC_SHARE_BASE_URL, process.env.EXPO_PUBLIC_SITE_URL];
    const configuredSiteUrl = candidates.find((value) => {
      if (!value) return false;
      try {
        const parsed = new URL(value);
        return (
          (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
          !/^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|\[::1\])$/i.test(parsed.hostname)
        );
      } catch {
        return false;
      }
    });
    if (configuredSiteUrl) {
      return `${configuredSiteUrl.replace(/\/$/, '')}/staff-invite?token=${encodeURIComponent(token)}`;
    }

    // In a LAN development build Expo exposes the same host used by Metro.
    // Use it for the web invite rather than ever handing a phone localhost.
    const hostUri = Constants.expoConfig?.hostUri?.split(':')[0];
    if (hostUri && !/^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0)$/i.test(hostUri)) {
      return `http://${hostUri}:3000/staff-invite?token=${encodeURIComponent(token)}`;
    }
    return ExpoLinking.createURL('staff-invite', { queryParams: { token } });
  }

  async function createStaffInvite() {
    if (!canEdit || !staffEmail.trim()) {
      setError('Enter an email address for the person you want to invite.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: inviteError } = await supabase.rpc('create_business_staff_invite', {
      p_business_id: businessId,
      p_email: staffEmail.trim(),
    });
    setSaving(false);
    if (inviteError) {
      setError(userMessageFromError(inviteError, 'We could not create that staff invite.'));
      return;
    }
    const created = (Array.isArray(data) ? data[0] : data) as {
      invited_email: string;
      token: string;
    } | null;
    if (!created?.token) {
      setError('The invite was created without a share link. Please try again.');
      return;
    }
    const url = inviteUrl(created.token);
    setLatestInviteLink({ email: created.invited_email, url });
    setStaffEmail('');
    void haptics.success();
    setNotice(
      'Invite ready. Share the link with your staff member; they can join before installing the app.',
    );
    await loadStaff();
  }

  function revokeStaffInvite(invite: StaffInvite) {
    Alert.alert('Revoke invite?', `The link for ${invite.invited_email} will stop working.`, [
      { text: 'Keep invite', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: () => void revokeStaffInviteConfirmed(invite),
      },
    ]);
  }

  async function revokeStaffInviteConfirmed(invite: StaffInvite) {
    if (!canEdit) return;
    const { error: revokeError } = await supabase.rpc('revoke_business_staff_invite', {
      p_invite_id: invite.invite_id,
    });
    if (revokeError) {
      setError(userMessageFromError(revokeError, 'We could not revoke that invite.'));
      return;
    }
    setStaffInvites((current) =>
      current.map((candidate) =>
        candidate.invite_id === invite.invite_id
          ? { ...candidate, status: 'revoked' as const }
          : candidate,
      ),
    );
    setNotice('Invite revoked.');
  }

  async function shareStaffInvite() {
    if (!latestInviteLink) return;
    void haptics.selection();
    await Share.share({
      title: 'SDS Local staff invite',
      message: `Join ${business?.name ?? 'this business'} on SDS Local as a staff member:\n${latestInviteLink.url}`,
      url: latestInviteLink.url,
    });
  }

  async function shareBusinessPage() {
    if (!business) return;
    const url = businessPublicUrl(business.slug);
    if (!url) {
      setError('A public staging share URL is not configured for this preview.');
      return;
    }
    void haptics.selection();
    await Share.share({
      title: business.name,
      message: `Find ${business.name} on SDS Local:\n${url}`,
      url,
    });
  }

  function removeStaffMember(member: StaffMember) {
    Alert.alert(
      'Remove staff member?',
      `${member.display_name} will no longer have access to this business.`,
      [
        { text: 'Keep member', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => void removeStaffMemberConfirmed(member),
        },
      ],
    );
  }

  async function removeStaffMemberConfirmed(member: StaffMember) {
    if (!canEdit) return;
    setError(null);
    const { error: removeError } = await supabase.rpc('remove_business_staff', {
      p_business_id: businessId,
      p_member_id: member.member_id,
    });
    if (removeError) {
      setError(userMessageFromError(removeError, 'We could not remove that staff member.'));
      return;
    }
    setStaff((current) => current.filter((candidate) => candidate.member_id !== member.member_id));
    setNotice('Staff member removed.');
  }

  async function saveReward() {
    if (!canEdit) return;
    const required = Number(stampsRequired);
    const pointsRate = Number(pointsPerDollar);
    const pointsThreshold = Number(pointsRequired);
    const rewardPercent = Number(checkoutRewardPercent);
    if (!rewardName.trim() || !rewardDescription.trim()) {
      setError('Reward name and reward description are required.');
      return;
    }
    if (
      rewardProgramType === 'visits' &&
      (!Number.isInteger(required) || required < 2 || required > 30)
    ) {
      setError('Stamps required must be a whole number from 2 to 30.');
      return;
    }
    if (
      rewardProgramType === 'points' &&
      (!Number.isFinite(pointsRate) ||
        pointsRate <= 0 ||
        pointsRate > 1000 ||
        !Number.isInteger(pointsThreshold) ||
        pointsThreshold < 1 ||
        pointsThreshold > 1000000)
    ) {
      setError('Enter a positive points rate and a whole-number redemption threshold.');
      return;
    }
    if (
      checkoutRewardType === 'percent_discount' &&
      (!Number.isInteger(rewardPercent) || rewardPercent < 1 || rewardPercent > 100)
    ) {
      setError('Checkout discount must be a whole percentage from 1 to 100.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const payload = {
      business_id: businessId,
      name: rewardName.trim(),
      reward_description: rewardDescription.trim(),
      program_type: rewardProgramType,
      stamps_required: rewardProgramType === 'visits' ? required : 10,
      points_per_dollar: rewardProgramType === 'points' ? pointsRate : null,
      points_required: rewardProgramType === 'points' ? pointsThreshold : null,
      terms: rewardTerms.trim(),
      is_active: reward?.is_active ?? true,
      checkout_reward_type: checkoutRewardType,
      checkout_reward_variation_id: checkoutRewardVariationId.trim() || null,
      checkout_reward_percent:
        checkoutRewardType === 'percent_discount' ? Number(checkoutRewardPercent) : null,
    };
    const result = reward
      ? await supabase
          .from('loyalty_programs')
          .update(payload)
          .eq('id', reward.id)
          .select(
            'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_percent, terms, is_active',
          )
          .single()
      : await supabase
          .from('loyalty_programs')
          .insert(payload)
          .select(
            'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_percent, terms, is_active',
          )
          .single();
    setSaving(false);
    if (result.error) {
      setError(userMessageFromError(result.error, 'We could not save the rewards program.'));
      return;
    }
    applyReward(result.data as RewardRecord);
    setNotice('Rewards program saved.');
  }

  async function sendBusinessUpdate() {
    if (!canEdit || !business) return;
    const title = newUpdateTitle.trim();
    const body = newUpdateBody.trim();
    if (business.status !== 'active') {
      setError('Your business must be approved before you can alert followers.');
      return;
    }
    if (title.length < 2 || title.length > 120) {
      setError('Update title must be between 2 and 120 characters.');
      return;
    }
    if (body.length < 2 || body.length > 500) {
      setError('Update message must be between 2 and 500 characters.');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    const { data, error: sendError } = await supabase.rpc('send_business_update', {
      p_business_id: business.id,
      p_update_type: newUpdateType,
      p_title: title,
      p_body: body,
      p_expires_at: null,
    });
    setSaving(false);
    if (sendError) {
      setError(userMessageFromError(sendError, 'We could not send that follower update.'));
      return;
    }
    setUpdates((current) => [
      {
        id: data as string,
        update_type: newUpdateType,
        title,
        body,
        expires_at: null,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
    setNewUpdateTitle('');
    setNewUpdateBody('');
    setNotice('Update sent to followers who enabled general updates.');
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
      <SwipeBackView onSwipeBack={onBack}>
        <ThemedView style={styles.center}>
          <ActivityIndicator color={Brand.primary} />
        </ThemedView>
      </SwipeBackView>
    );
  }

  return (
    <SwipeBackView
      enabled={!businessViewerOpen && !mapInteractionActive}
      onSwipeBack={businessWorkspaceBackTarget(section) === 'hub' ? leaveEditor : onBack}
      underlay={
        section && business ? (
          <BusinessDestinationUnderlay
            accent={workspaceAccent}
            attention={attention}
            business={business}
            canEdit={canEdit}
            colors={colors}
            logoUri={logoUri}
            scrollOffset={hubReturnOffset}
            setupItems={setupItems}
            summaryFor={hubSummary}
          />
        ) : (
          exitUnderlay
        )
      }
    >
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            ref={scrollRef}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!businessViewerOpen && !mapInteractionActive}
            scrollEventThrottle={16}
            onScroll={rememberHubScroll}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadWorkspace} />}
          >
            {section ? (
              <View style={[styles.editorHeader, { borderBottomColor: colors.border }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={leaveEditor}
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                >
                  <ThemedText style={{ color: workspaceAccent }} type="smallBold">
                    ‹ Business Hub
                  </ThemedText>
                </Pressable>
                <ThemedText type="title">{sectionTitle}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small" numberOfLines={2}>
                  {section === 'offerings'
                    ? isMenuBusiness
                      ? 'Build your menu, prices, photos, and availability.'
                      : 'Manage services, pricing, photos, and availability.'
                    : sectionDescriptions[section]}
                </ThemedText>
              </View>
            ) : (
              <View style={styles.compactWorkspaceHeader}>
                <Pressable
                  accessibilityRole="button"
                  onPress={onBack}
                  style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                >
                  <ThemedText style={{ color: workspaceAccent }} type="smallBold">
                    ‹ All businesses
                  </ThemedText>
                </Pressable>
                <ThemedText themeColor="textSecondary" type="small">
                  {canEdit ? 'Owner workspace' : 'Staff workspace'}
                </ThemedText>
              </View>
            )}

            {error && <Notice kind="error" message={error} />}
            {notice && <Notice kind="success" message={notice} />}
            {!canEdit && section && section !== 'preview' && (
              <Notice
                kind="info"
                message="Staff access is view-only here. Owners can make changes."
              />
            )}

            {!section && business && (
              <BusinessHub
                accent={workspaceAccent}
                attention={attention}
                setupItems={setupItems}
                business={business}
                canEdit={canEdit}
                colors={colors}
                logoUri={logoUri}
                onOpen={handleWorkspaceAction}
                onOrders={
                  pickupWorkspace.businesses.some((b) => b.id === business.id)
                    ? () =>
                        router.navigate({
                          pathname: '/pickup-orders',
                          params: { businessId: business.id },
                        })
                    : undefined
                }
                onPreview={() => openEditor('preview')}
                summaryFor={(destination) => hubSummary(destination)}
              />
            )}

            {section && (
              <>
                {section === 'preview' && business && (
                  <View style={styles.cardList}>
                    {canEdit && (
                      <View style={styles.shareCard}>
                        <View style={styles.shareCardCopy}>
                          <ThemedText type="smallBold">Bring customers to this page</ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            Print a branded QR sign for your counter, storefront, or food truck.
                            Anyone can scan it; existing users open the page and new visitors are
                            guided to create an account.
                          </ThemedText>
                        </View>
                        <SecondaryButton
                          label="Print branded QR poster"
                          onPress={() => setQrPosterOpen(true)}
                        />
                      </View>
                    )}
                    <PublicBusinessPageContent
                      businessId={business.id}
                      onViewerChange={setBusinessViewerOpen}
                      onMapInteractionChange={setMapInteractionActive}
                      preview
                    />
                    <BusinessQrPoster
                      business={{
                        name: business.name,
                        slug: business.slug,
                        primaryColor: business.primary_color,
                        accentColor: business.accent_color,
                      }}
                      logoUri={logoUri}
                      onClose={() => setQrPosterOpen(false)}
                      visible={qrPosterOpen}
                    />
                  </View>
                )}

                {section === 'qr' && business && (
                  <View style={styles.cardList}>
                    <View style={styles.formCard}>
                      <FormSectionHeading
                        title="QR and promotional materials"
                        description="Create a branded poster customers can scan at your counter, storefront, or vehicle."
                      />
                      <PrimaryButton
                        loading={saving}
                        disabled={false}
                        label="Open branded QR poster"
                        onPress={() => setQrPosterOpen(true)}
                      />
                    </View>
                    <BusinessQrPoster
                      business={{
                        name: business.name,
                        slug: business.slug,
                        primaryColor: business.primary_color,
                        accentColor: business.accent_color,
                      }}
                      logoUri={logoUri}
                      onClose={() => setQrPosterOpen(false)}
                      visible={qrPosterOpen}
                    />
                  </View>
                )}

                {section === 'sharing' && business && (
                  <View style={styles.formCard}>
                    <FormSectionHeading
                      title="Share your customer page"
                      description="Send customers a direct link to your SDS Local page from this phone."
                    />
                    <PrimaryButton
                      loading={saving}
                      disabled={false}
                      label="Share customer page"
                      onPress={() => void shareBusinessPage()}
                    />
                  </View>
                )}

                {(section === 'profile' ||
                  section === 'contact' ||
                  section === 'location' ||
                  section === 'mobile-location') &&
                  business && (
                    <View style={styles.cardList}>
                      {section === 'profile' && (
                        <View style={styles.formCard}>
                          <FormSectionHeading
                            title="Profile and branding"
                            description="The business identity customers recognize across SDS Local."
                          />
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
                          <ChoicePicker
                            disabled={!canEdit}
                            label="Business type"
                            options={[
                              { value: 'food_drink', label: 'Food & drink' },
                              { value: 'services', label: 'Services' },
                              { value: 'retail', label: 'Retail' },
                              { value: 'entertainment_venue', label: 'Entertainment & venue' },
                              { value: 'mobile', label: 'Mobile business' },
                              { value: 'general', label: 'Other local business' },
                            ]}
                            value={businessType}
                            onChange={setBusinessType}
                          />
                          <Field
                            label="Primary brand color"
                            value={primaryColor}
                            onChangeText={setPrimaryColor}
                            colors={colors}
                            editable={canEdit}
                            autoCapitalize="characters"
                          />
                          <Field
                            label="Accent brand color"
                            value={accentColor}
                            onChangeText={setAccentColor}
                            colors={colors}
                            editable={canEdit}
                            autoCapitalize="characters"
                          />
                          {canEdit && (
                            <View style={styles.inlineActions}>
                              <SecondaryButton
                                disabled={photoUploading}
                                label={logoUri ? 'Replace logo' : 'Add logo'}
                                onPress={() => void pickAndUploadPhoto('logo')}
                              />
                              <SecondaryButton
                                disabled={photoUploading}
                                label={
                                  photos.some((photo) => photo.role === 'cover')
                                    ? 'Replace cover'
                                    : 'Add cover'
                                }
                                onPress={() => void pickAndUploadPhoto('cover')}
                              />
                            </View>
                          )}
                          {canEdit && (
                            <PrimaryButton
                              loading={saving}
                              disabled={saving}
                              label={saving ? 'Saving…' : 'Save profile'}
                              onPress={() => void saveProfile()}
                            />
                          )}
                        </View>
                      )}
                      {section === 'contact' && (
                        <View style={styles.formCard}>
                          <FormSectionHeading
                            title="Contact information"
                            description="Give customers a reliable way to reach you."
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
                          {canEdit && (
                            <PrimaryButton
                              loading={saving}
                              disabled={saving}
                              label={saving ? 'Saving…' : 'Save contact information'}
                              onPress={() => void saveContact()}
                            />
                          )}
                        </View>
                      )}
                      {section === 'location' && (
                        <View style={styles.formCard}>
                          <FormSectionHeading
                            title="Service area"
                            description="Tell customers where you work. Choose one clear coverage option."
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
                          {business.business_type !== 'mobile' &&
                            (serviceAreaType === 'at_location' || serviceAreaType === 'radius') && (
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
                                serviceAreaType === 'statewide'
                                  ? 'Primary city (optional)'
                                  : business.business_type === 'mobile'
                                    ? 'Home base city (optional)'
                                    : 'City (required)'
                              }
                              value={city}
                              onChangeText={setCity}
                              colors={colors}
                              editable={canEdit}
                            />
                          )}
                          <ChoicePicker
                            disabled={!canEdit}
                            label={`State${serviceAreaType === 'statewide' ? ' (required)' : ' (optional)'}`}
                            options={stateCodes.map((code) => ({ value: code, label: code }))}
                            placeholder="Choose a state"
                            value={region || null}
                            onChange={setRegion}
                          />
                          {business.business_type !== 'mobile' &&
                            (serviceAreaType === 'at_location' || serviceAreaType === 'radius') && (
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
                              <ThemedText type="smallBold">
                                Service cities (at least one required)
                              </ThemedText>
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
                                      borderColor: colors.inputBorder,
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
                              loading={saving}
                              disabled={saving}
                              label={saving ? 'Saving…' : 'Save location'}
                              onPress={() => void saveLocation()}
                            />
                          )}
                        </View>
                      )}
                      {section === 'mobile-location' && business.business_type === 'mobile' && (
                        <View style={styles.formCard}>
                          <FormSectionHeading
                            title="Scheduled map stops"
                            description="Add where you will be and when. Publish a stop only after the pin and hours are correct. Customers can open the pin in their map app."
                          />
                          {locationStops.map((stop) => (
                            <View key={stop.id} style={styles.locationStopCard}>
                              <View style={styles.rowText}>
                                <ThemedText type="smallBold">{stop.title}</ThemedText>
                                <ThemedText themeColor="textSecondary" type="small">
                                  {new Date(stop.starts_at).toLocaleString()} –{' '}
                                  {new Date(stop.ends_at).toLocaleTimeString([], {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </ThemedText>
                                <ThemedText themeColor="textSecondary" type="small">
                                  {stop.address_text || 'Map pin set'}
                                </ThemedText>
                              </View>
                              <View style={styles.inlineActions}>
                                <LabeledSwitch
                                  label={stop.is_published ? 'Published' : 'Draft'}
                                  disabled={!canEdit}
                                  value={stop.is_published}
                                  onValueChange={(value) => void toggleLocationStop(stop, value)}
                                />
                                {canEdit && (
                                  <Pressable
                                    onPress={() => removeLocationStop(stop)}
                                    style={{
                                      minHeight: 44,
                                      minWidth: 44,
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <ThemedText style={styles.destructiveText} type="smallBold">
                                      Remove
                                    </ThemedText>
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          ))}
                          {canEdit && (
                            <>
                              <Field
                                label="Stop name (required)"
                                value={newStopTitle}
                                onChangeText={setNewStopTitle}
                                colors={colors}
                                placeholder="Downtown lunch service"
                              />
                              <Field
                                label="Address or landmark"
                                value={newStopAddress}
                                onChangeText={handleNewStopAddressChange}
                                colors={colors}
                                placeholder="Market Square"
                              />
                              <SecondaryButton
                                disabled={stopGeocoding || !newStopAddress.trim()}
                                label={stopGeocoding ? 'Placing address…' : 'Place address on map'}
                                onPress={() => void placeAddressOnMap()}
                              />
                              <ThemedText themeColor="textSecondary" type="small">
                                An address is optional when you drop a pin directly on the map.
                              </ThemedText>
                              <StopPickerField
                                label="Date (required)"
                                value={newStopDate ? formatStopDateForDisplay(newStopDate) : ''}
                                placeholder="Choose a date"
                                colors={colors}
                                onPress={() => setStopPickerTarget('date')}
                              />
                              <View style={styles.stackFields}>
                                <StopPickerField
                                  label="Starts (required)"
                                  value={newStopStart ? formatStopTimeForDisplay(newStopStart) : ''}
                                  placeholder="Choose start time"
                                  colors={colors}
                                  onPress={() => setStopPickerTarget('start')}
                                />
                                <StopPickerField
                                  label="Ends (required)"
                                  value={newStopEnd ? formatStopTimeForDisplay(newStopEnd) : ''}
                                  placeholder="Choose end time"
                                  colors={colors}
                                  onPress={() => setStopPickerTarget('end')}
                                />
                              </View>
                              <BusinessLocationMap
                                stops={locationStops}
                                draftTitle={newStopTitle.trim() || 'New stop'}
                                {...(newStopLatitude.trim() && newStopLongitude.trim()
                                  ? {
                                      draftCoordinate: {
                                        latitude: Number(newStopLatitude),
                                        longitude: Number(newStopLongitude),
                                      },
                                    }
                                  : {})}
                                onCoordinateSelect={(coordinate) =>
                                  void handleStopMapCoordinate(coordinate)
                                }
                                onInteractionChange={setMapInteractionActive}
                              />
                              <ThemedText themeColor="textSecondary" type="small">
                                Enter an address and place it on the map, or tap the map to drop a
                                pin. The address and pin stay together when you save the stop.
                              </ThemedText>
                              <PrimaryButton
                                loading={saving}
                                disabled={
                                  saving ||
                                  (stopGeocoding &&
                                    !(newStopLatitude.trim() && newStopLongitude.trim()))
                                }
                                label={saving ? 'Saving…' : 'Save scheduled stop'}
                                onPress={() => void createLocationStop()}
                              />
                            </>
                          )}
                          {!canEdit && locationStops.length === 0 && (
                            <EmptyState
                              title="No stops published"
                              message="The owner has not scheduled a mobile location yet."
                            />
                          )}
                        </View>
                      )}
                      {section === 'mobile-location' && stopPickerTarget && (
                        <Modal
                          animationType="slide"
                          transparent
                          visible
                          onRequestClose={() => setStopPickerTarget(null)}
                        >
                          <View style={styles.stopPickerModalRoot}>
                            <Pressable
                              accessibilityLabel="Close date and time picker"
                              accessibilityRole="button"
                              onPress={() => setStopPickerTarget(null)}
                              style={styles.stopPickerBackdrop}
                            />
                            <View
                              style={[
                                styles.stopPickerSheet,
                                { backgroundColor: colors.backgroundElement },
                              ]}
                            >
                              <View style={styles.stopPickerHeader}>
                                <View style={styles.rowText}>
                                  <ThemedText type="subtitle">
                                    {stopPickerTarget === 'date'
                                      ? 'Choose a date'
                                      : stopPickerTarget === 'start'
                                        ? 'Choose a start time'
                                        : 'Choose an end time'}
                                  </ThemedText>
                                  <ThemedText themeColor="textSecondary" type="small">
                                    {stopPickerTarget === 'date'
                                      ? 'Use the calendar to schedule this stop.'
                                      : 'Use the native time picker for the stop hours.'}
                                  </ThemedText>
                                </View>
                                <Pressable
                                  accessibilityRole="button"
                                  onPress={() => setStopPickerTarget(null)}
                                  style={styles.stopPickerDoneButton}
                                >
                                  <ThemedText style={styles.primaryButtonText} type="smallBold">
                                    Done
                                  </ThemedText>
                                </Pressable>
                              </View>
                              <DateTimePicker
                                value={stopPickerValue(stopPickerTarget)}
                                mode={stopPickerTarget === 'date' ? 'date' : 'time'}
                                display={
                                  stopPickerTarget === 'date'
                                    ? 'inline'
                                    : Platform.OS === 'ios'
                                      ? 'spinner'
                                      : 'default'
                                }
                                presentation="inline"
                                is24Hour={false}
                                accentColor={Brand.primary}
                                themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                                timeZoneName="America/Chicago"
                                onValueChange={(_, value) =>
                                  handleStopPickerChange(stopPickerTarget, value)
                                }
                              />
                            </View>
                          </View>
                        </Modal>
                      )}
                    </View>
                  )}

                {section === 'ordering' && canEdit && business && (
                  <OrderingPanel
                    businessId={businessId}
                    {...(initialOrderingProvider
                      ? { initialProvider: initialOrderingProvider }
                      : {})}
                    isMobile={business.business_type === 'mobile'}
                    onDirtyChange={setOrderingDirty}
                  />
                )}
                {section === 'hours' && (
                  <HoursEditor
                    accent={workspaceAccent}
                    canEdit={canEdit}
                    colors={colors}
                    hours={hours}
                    onSave={saveHours}
                    saving={saving}
                  />
                )}

                {section === 'offerings' && (
                  <View style={styles.cardList}>
                    {isMenuBusiness && business && (
                      <View style={[styles.menuIntroCard, { borderColor: business.primary_color }]}>
                        <View style={styles.menuIntroHeader}>
                          <View style={styles.rowText}>
                            <ThemedText style={{ color: business.primary_color }} type="smallBold">
                              {business.business_type === 'mobile' ? 'MOBILE MENU' : 'MENU BUILDER'}
                            </ThemedText>
                            <ThemedText type="title">Build a menu customers can scan</ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              Organize categories, highlight favorites, and keep availability
                              current while you build.
                            </ThemedText>
                          </View>
                          <View
                            style={[
                              styles.menuItemCount,
                              { backgroundColor: business.primary_color },
                            ]}
                          >
                            <ThemedText
                              style={{ color: readableTextColor(business.primary_color) }}
                              type="subtitle"
                            >
                              {visibleOfferingCount}
                            </ThemedText>
                            <ThemedText
                              style={{ color: readableTextColor(business.primary_color) }}
                              type="small"
                            >
                              visible items
                            </ThemedText>
                          </View>
                        </View>
                        <View style={styles.menuStatsRow}>
                          <MenuStat label="Categories" value={offerSections.length} />
                          <MenuStat label="Featured" value={featuredOfferingCount} />
                          <MenuStat
                            label="Hidden"
                            value={offerings.filter((item) => !item.is_visible).length}
                          />
                        </View>
                        {canEdit && (
                          <SecondaryButton
                            label="Import menu file"
                            onPress={() => void pickMenuImport()}
                          />
                        )}
                      </View>
                    )}
                    <Modal
                      animationType="slide"
                      onRequestClose={() => setMenuImportOpen(false)}
                      transparent
                      visible={menuImportOpen}
                    >
                      <View style={styles.stopPickerModalRoot}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setMenuImportOpen(false)}
                          style={styles.stopPickerBackdrop}
                        />
                        <View
                          style={[
                            styles.stopPickerSheet,
                            { backgroundColor: colors.backgroundElement },
                          ]}
                        >
                          <View style={styles.stopPickerHeader}>
                            <View style={styles.rowText}>
                              <ThemedText type="subtitle">Import menu</ThemedText>
                              <ThemedText themeColor="textSecondary" type="small">
                                {menuImportFileName || 'Choose a CSV or JSON file'}
                              </ThemedText>
                            </View>
                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setMenuImportOpen(false)}
                              style={styles.stopPickerDoneButton}
                            >
                              <ThemedText style={styles.primaryButtonText} type="smallBold">
                                Close
                              </ThemedText>
                            </Pressable>
                          </View>
                          {menuImportError ? (
                            <Notice kind="error" message={menuImportError} />
                          ) : menuImportRows.length ? (
                            <>
                              <ThemedText themeColor="textSecondary" type="small">
                                Ready to add {menuImportRows.length} item
                                {menuImportRows.length === 1 ? '' : 's'} across{' '}
                                {new Set(menuImportRows.map((row) => row.category)).size} categor
                                {new Set(menuImportRows.map((row) => row.category)).size === 1
                                  ? 'y'
                                  : 'ies'}
                                .
                              </ThemedText>
                              <ScrollView style={styles.menuImportPreview}>
                                {menuImportRows.slice(0, 12).map((row, index) => (
                                  <View key={`${row.name}-${index}`} style={styles.menuImportRow}>
                                    <View style={styles.rowText}>
                                      <ThemedText type="smallBold">{row.name}</ThemedText>
                                      <ThemedText themeColor="textSecondary" type="small">
                                        {row.category} · {row.priceText || row.price || 'No price'}
                                      </ThemedText>
                                    </View>
                                    <ThemedText themeColor="textSecondary" type="small">
                                      {row.visible ? 'Visible' : 'Hidden'}
                                    </ThemedText>
                                  </View>
                                ))}
                                {menuImportRows.length > 12 && (
                                  <ThemedText themeColor="textSecondary" type="small">
                                    + {menuImportRows.length - 12} more items
                                  </ThemedText>
                                )}
                              </ScrollView>
                              <PrimaryButton
                                loading={saving}
                                disabled={saving}
                                label={saving ? 'Importing…' : 'Add items to menu'}
                                onPress={() => void importMenuRows()}
                              />
                            </>
                          ) : (
                            <>
                              <ThemedText themeColor="textSecondary">
                                CSV columns: category, name, description, price, price_text,
                                featured, visible. JSON accepts the same field names. PDF and
                                spreadsheet files can be kept as references, but are not imported
                                automatically.
                              </ThemedText>
                              <SecondaryButton
                                label="Choose another file"
                                onPress={() => void pickMenuImport()}
                              />
                            </>
                          )}
                        </View>
                      </View>
                    </Modal>
                    {offerSections.map((group, groupIndex) => (
                      <View key={group.id} style={styles.formCard}>
                        <View style={styles.menuGroupHeader}>
                          <View style={styles.rowText}>
                            <ThemedText type="subtitle">{group.name}</ThemedText>
                            {!!group.description && (
                              <ThemedText themeColor="textSecondary">
                                {group.description}
                              </ThemedText>
                            )}
                          </View>
                          {canEdit && (
                            <View style={styles.reorderActions}>
                              <Pressable
                                accessibilityLabel={`Move ${group.name} up`}
                                disabled={saving || groupIndex === 0}
                                onPress={() => void moveOfferingSection(group, 'up')}
                                style={[styles.reorderButton, groupIndex === 0 && styles.disabled]}
                              >
                                <ThemedText type="smallBold">↑</ThemedText>
                              </Pressable>
                              <Pressable
                                accessibilityLabel={`Move ${group.name} down`}
                                disabled={saving || groupIndex === offerSections.length - 1}
                                onPress={() => void moveOfferingSection(group, 'down')}
                                style={[
                                  styles.reorderButton,
                                  groupIndex === offerSections.length - 1 && styles.disabled,
                                ]}
                              >
                                <ThemedText type="smallBold">↓</ThemedText>
                              </Pressable>
                            </View>
                          )}
                        </View>
                        {offerings
                          .filter((item) => item.section_id === group.id)
                          .map((item, itemIndex, groupItems) => (
                            <View key={item.id} style={styles.settingRow}>
                              {editingOfferingId === item.id ? (
                                <View style={styles.editForm}>
                                  <Field
                                    label="Name (required)"
                                    value={editOfferingName}
                                    onChangeText={setEditOfferingName}
                                    colors={colors}
                                  />
                                  <Field
                                    label="Description (optional)"
                                    value={editOfferingDescription}
                                    onChangeText={setEditOfferingDescription}
                                    colors={colors}
                                    multiline
                                    style={styles.multiline}
                                  />
                                  <Field
                                    label="Price (optional)"
                                    value={editOfferingPrice}
                                    onChangeText={setEditOfferingPrice}
                                    colors={colors}
                                    keyboardType="decimal-pad"
                                    placeholder="$25.00"
                                  />
                                  {isMenuBusiness && (
                                    <Field
                                      label="Menu price label (optional)"
                                      value={editOfferingPriceText}
                                      onChangeText={setEditOfferingPriceText}
                                      colors={colors}
                                      placeholder="Market price, From $8, or 2 for $10"
                                    />
                                  )}
                                  {isMenuBusiness && (
                                    <View style={styles.menuPhotoField}>
                                      <View style={styles.menuPhotoPreview}>
                                        {offeringImageUrl(item) ? (
                                          <Image
                                            accessibilityLabel={`${item.name} image preview`}
                                            contentFit="cover"
                                            source={{ uri: offeringImageUrl(item)! }}
                                            style={styles.menuPhotoImage}
                                            transition={180}
                                          />
                                        ) : (
                                          <ThemedText themeColor="textSecondary" type="smallBold">
                                            No image
                                          </ThemedText>
                                        )}
                                      </View>
                                      <View style={styles.rowText}>
                                        <ThemedText type="smallBold">Item image</ThemedText>
                                        <ThemedText themeColor="textSecondary" type="small">
                                          Optional. Shown beside this item on your public menu.
                                        </ThemedText>
                                        <SecondaryButton
                                          disabled={photoUploading}
                                          label={
                                            photoUploading
                                              ? 'Uploading…'
                                              : item.media_asset_id
                                                ? 'Replace image'
                                                : 'Add image'
                                          }
                                          onPress={() =>
                                            void pickAndUploadPhoto('offering', item.id, item.name)
                                          }
                                        />
                                      </View>
                                    </View>
                                  )}
                                  <View style={styles.inlineActions}>
                                    <PrimaryButton
                                      loading={saving}
                                      disabled={saving || !editOfferingName.trim()}
                                      label="Save changes"
                                      onPress={() => void saveOfferingEdit(item)}
                                    />
                                    <SecondaryButton
                                      label="Cancel"
                                      onPress={() => setEditingOfferingId(null)}
                                    />
                                  </View>
                                </View>
                              ) : (
                                <>
                                  <View style={styles.menuItemSummary}>
                                    <View style={styles.menuItemImageFrame}>
                                      {offeringImageUrl(item) ? (
                                        <Image
                                          accessibilityLabel={`${item.name} photo`}
                                          contentFit="cover"
                                          source={{ uri: offeringImageUrl(item)! }}
                                          style={styles.menuItemImage}
                                          transition={180}
                                        />
                                      ) : (
                                        <ThemedText themeColor="textSecondary" type="smallBold">
                                          No image
                                        </ThemedText>
                                      )}
                                    </View>
                                    <View style={styles.rowText}>
                                      <View style={styles.menuItemTitleRow}>
                                        <ThemedText type="smallBold">{item.name}</ThemedText>
                                        {item.is_featured && (
                                          <View style={styles.featuredBadge}>
                                            <ThemedText
                                              style={styles.featuredBadgeText}
                                              type="smallBold"
                                            >
                                              Featured
                                            </ThemedText>
                                          </View>
                                        )}
                                      </View>
                                      <ThemedText style={styles.menuPrice} type="smallBold">
                                        {formatPrice(item)}
                                      </ThemedText>
                                      {!!item.description && (
                                        <ThemedText themeColor="textSecondary" type="small">
                                          {item.description}
                                        </ThemedText>
                                      )}
                                    </View>
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
                                    {isMenuBusiness && (
                                      <LabeledSwitch
                                        label="Featured"
                                        disabled={!canEdit}
                                        value={item.is_featured}
                                        onValueChange={(value) =>
                                          void updateOffering(item, { is_featured: value })
                                        }
                                      />
                                    )}
                                  </View>
                                  {canEdit && (
                                    <View style={styles.inlineActions}>
                                      <Pressable
                                        accessibilityLabel={`Move ${item.name} up`}
                                        disabled={saving || itemIndex === 0}
                                        onPress={() => void moveOfferingItem(item, 'up')}
                                        style={[
                                          styles.reorderButton,
                                          itemIndex === 0 && styles.disabled,
                                        ]}
                                      >
                                        <ThemedText type="smallBold">↑</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        accessibilityLabel={`Move ${item.name} down`}
                                        disabled={saving || itemIndex === groupItems.length - 1}
                                        onPress={() => void moveOfferingItem(item, 'down')}
                                        style={[
                                          styles.reorderButton,
                                          itemIndex === groupItems.length - 1 && styles.disabled,
                                        ]}
                                      >
                                        <ThemedText type="smallBold">↓</ThemedText>
                                      </Pressable>
                                      {isMenuBusiness && (
                                        <Pressable
                                          disabled={photoUploading}
                                          onPress={() =>
                                            void pickAndUploadPhoto('offering', item.id, item.name)
                                          }
                                          style={{
                                            minHeight: 44,
                                            minWidth: 44,
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <ThemedText type="smallBold">
                                            {item.media_asset_id ? 'Photo' : 'Add photo'}
                                          </ThemedText>
                                        </Pressable>
                                      )}
                                      <Pressable
                                        onPress={() => beginOfferingEdit(item)}
                                        style={{
                                          minHeight: 44,
                                          minWidth: 44,
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <ThemedText type="smallBold">Edit</ThemedText>
                                      </Pressable>
                                      <Pressable
                                        onPress={() => void archiveOffering(item)}
                                        style={{
                                          minHeight: 44,
                                          minWidth: 44,
                                          justifyContent: 'center',
                                        }}
                                      >
                                        <ThemedText style={styles.destructiveText} type="smallBold">
                                          Archive
                                        </ThemedText>
                                      </Pressable>
                                    </View>
                                  )}
                                </>
                              )}
                            </View>
                          ))}
                      </View>
                    ))}
                    {canEdit && (
                      <View style={styles.formCard}>
                        <View style={styles.menuActionHeader}>
                          <View style={styles.rowText}>
                            <ThemedText type="subtitle">
                              Add a {offeringTerminology.section}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              {isMenuBusiness
                                ? 'Use categories to keep the menu easy to browse.'
                                : 'Group similar products or services.'}
                            </ThemedText>
                          </View>
                          <SecondaryButton
                            label={menuEditorPanel === 'section' ? 'Close' : 'Add category'}
                            onPress={() =>
                              setMenuEditorPanel((current) =>
                                current === 'section' ? null : 'section',
                              )
                            }
                          />
                        </View>
                        {menuEditorPanel === 'section' && (
                          <View style={styles.menuEditorForm}>
                            {isMenuBusiness && (
                              <View style={styles.menuPresetRow}>
                                {['Breakfast', 'Lunch', 'Drinks', 'Desserts'].map((preset) => (
                                  <ChoiceButton
                                    key={preset}
                                    label={`+ ${preset}`}
                                    selected={
                                      newSectionName.trim().toLowerCase() === preset.toLowerCase()
                                    }
                                    onPress={() => setNewSectionName(preset)}
                                  />
                                ))}
                              </View>
                            )}
                            <Field
                              label={`${offeringTerminology.section.replace(/^./, (letter) => letter.toUpperCase())} name (required)`}
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
                              loading={saving}
                              disabled={saving || !newSectionName.trim()}
                              label={`Create ${offeringTerminology.section}`}
                              onPress={() => void createOfferingSection()}
                            />
                          </View>
                        )}
                      </View>
                    )}
                    {canEdit && offerSections.length > 0 && (
                      <View style={styles.formCard}>
                        <View style={styles.menuActionHeader}>
                          <View style={styles.rowText}>
                            <ThemedText type="subtitle">
                              Add a {offeringTerminology.item}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              Add the basics first, then fine-tune the item after it is saved.
                            </ThemedText>
                          </View>
                          <SecondaryButton
                            label={
                              menuEditorPanel === 'item'
                                ? 'Close'
                                : `Add ${offeringTerminology.item}`
                            }
                            onPress={() =>
                              setMenuEditorPanel((current) => (current === 'item' ? null : 'item'))
                            }
                          />
                        </View>
                        {menuEditorPanel === 'item' && (
                          <View style={styles.menuEditorForm}>
                            <ThemedText type="smallBold">
                              {offeringTerminology.section.replace(/^./, (letter) =>
                                letter.toUpperCase(),
                              )}{' '}
                              (required)
                            </ThemedText>
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
                              label="Price (optional)"
                              value={newOfferingPrice}
                              onChangeText={setNewOfferingPrice}
                              colors={colors}
                              keyboardType="decimal-pad"
                              placeholder="$25.00"
                            />
                            {isMenuBusiness && (
                              <Field
                                label="Menu price label (optional)"
                                value={newOfferingPriceText}
                                onChangeText={setNewOfferingPriceText}
                                colors={colors}
                                placeholder="Market price, From $8, or 2 for $10"
                              />
                            )}
                            {isMenuBusiness && (
                              <View style={styles.menuImageOption}>
                                <LabeledSwitch
                                  label="Add an image after saving"
                                  disabled={saving || photoUploading}
                                  value={newOfferingAddImage}
                                  onValueChange={setNewOfferingAddImage}
                                />
                                <ThemedText themeColor="textSecondary" type="small">
                                  The item saves first, then the photo picker opens so the image is
                                  linked to this menu item automatically.
                                </ThemedText>
                              </View>
                            )}
                            <PrimaryButton
                              loading={saving}
                              disabled={saving || !newOfferingName.trim()}
                              label={`Add ${offeringTerminology.item}`}
                              onPress={() => void createOffering()}
                            />
                          </View>
                        )}
                      </View>
                    )}
                    {offerSections.length === 0 && !canEdit && (
                      <EmptyState
                        title="No offerings yet"
                        message="The owner has not added offerings."
                      />
                    )}
                  </View>
                )}

                {section === 'events' && (
                  <View style={styles.cardList}>
                    {events.length === 0 ? (
                      <EmptyState
                        title="No events yet"
                        message="Events help customers plan a visit. Use the form below to add your first date, location, and event details."
                      />
                    ) : (
                      events.map((item) => (
                        <View key={item.id} style={styles.settingRowCard}>
                          {editingEventId === item.id ? (
                            <View style={styles.editForm}>
                              <Field
                                label="Event title (required)"
                                value={editEventTitle}
                                onChangeText={setEditEventTitle}
                                colors={colors}
                              />
                              <Field
                                label="Description (optional)"
                                value={editEventDescription}
                                onChangeText={setEditEventDescription}
                                colors={colors}
                                multiline
                                style={styles.multiline}
                              />
                              <View style={styles.stackFields}>
                                <StopPickerField
                                  label="Date (required)"
                                  value={
                                    editEventDate ? formatStopDateForDisplay(editEventDate) : ''
                                  }
                                  placeholder="Choose a date"
                                  colors={colors}
                                  onPress={() => setEventPickerTarget('edit-date')}
                                />
                                <StopPickerField
                                  label="Start time (required)"
                                  value={
                                    editEventTime ? formatStopTimeForDisplay(editEventTime) : ''
                                  }
                                  placeholder="Choose a time"
                                  colors={colors}
                                  onPress={() => setEventPickerTarget('edit-time')}
                                />
                              </View>
                              <Field
                                label="Location (optional)"
                                value={editEventLocation}
                                onChangeText={setEditEventLocation}
                                colors={colors}
                              />
                              <View style={styles.eventMediaEditor}>
                                <ThemedText type="smallBold">Event photos</ThemedText>
                                <ThemedText themeColor="textSecondary" type="small">
                                  Add one cover image and up to {mediaLimits.maxGalleryImages}{' '}
                                  gallery images. Images are optimized before upload.
                                </ThemedText>
                                {(() => {
                                  const cover = firstMediaAsset(item.media_assets);
                                  return cover?.status === 'ready' ? (
                                    <Image
                                      accessibilityLabel={cover.alt_text ?? `${item.title} cover`}
                                      contentFit="cover"
                                      source={{ uri: storagePublicUrl(cover.storage_path) }}
                                      style={styles.eventCoverPreview}
                                      transition={180}
                                    />
                                  ) : (
                                    <ThemedText themeColor="textSecondary" type="small">
                                      No cover image yet.
                                    </ThemedText>
                                  );
                                })()}
                                <Field
                                  label="Event photo description (optional)"
                                  value={eventPhotoAltText}
                                  onChangeText={setEventPhotoAltText}
                                  colors={colors}
                                  editable={!photoUploading}
                                />
                                <Field
                                  label="Gallery caption (optional)"
                                  value={eventPhotoCaption}
                                  onChangeText={setEventPhotoCaption}
                                  colors={colors}
                                  editable={!photoUploading}
                                />
                                <View style={styles.inlineActions}>
                                  <SecondaryButton
                                    disabled={photoUploading}
                                    label={photoUploading ? 'Uploading…' : 'Add / replace cover'}
                                    onPress={() => void pickAndUploadPhoto('event', item.id)}
                                  />
                                  <SecondaryButton
                                    disabled={
                                      photoUploading ||
                                      (item.event_photos?.length ?? 0) >=
                                        mediaLimits.maxGalleryImages
                                    }
                                    label={photoUploading ? 'Uploading…' : 'Add gallery image'}
                                    onPress={() =>
                                      void pickAndUploadPhoto('event_gallery', item.id)
                                    }
                                  />
                                </View>
                                {!!item.event_photos?.length && (
                                  <View style={styles.eventGalleryList}>
                                    {item.event_photos
                                      .slice()
                                      .sort((a, b) => a.display_order - b.display_order)
                                      .map((photo, photoIndex, ordered) => {
                                        const asset = firstMediaAsset(photo.media_assets);
                                        return (
                                          <View key={photo.id} style={styles.eventGalleryRow}>
                                            {asset?.status === 'ready' && (
                                              <Image
                                                accessibilityLabel={
                                                  asset.alt_text ?? photo.caption ?? ''
                                                }
                                                contentFit="cover"
                                                source={{
                                                  uri: storagePublicUrl(asset.storage_path),
                                                }}
                                                style={styles.eventGalleryThumb}
                                                transition={180}
                                              />
                                            )}
                                            <View style={styles.rowText}>
                                              <ThemedText type="smallBold">
                                                {photo.caption || asset?.alt_text || 'No caption'}
                                              </ThemedText>
                                              <View style={styles.inlineActions}>
                                                <Pressable
                                                  onPress={() => beginEventPhotoEdit(photo)}
                                                  style={{
                                                    minHeight: 44,
                                                    minWidth: 44,
                                                    justifyContent: 'center',
                                                  }}
                                                >
                                                  <ThemedText type="smallBold">Caption</ThemedText>
                                                </Pressable>
                                                <Pressable
                                                  disabled={photoIndex === 0}
                                                  onPress={() =>
                                                    void moveEventPhoto(item, photo, -1)
                                                  }
                                                  style={photoIndex === 0 && styles.disabled}
                                                >
                                                  <ThemedText type="smallBold">Up</ThemedText>
                                                </Pressable>
                                                <Pressable
                                                  disabled={photoIndex === ordered.length - 1}
                                                  onPress={() =>
                                                    void moveEventPhoto(item, photo, 1)
                                                  }
                                                  style={
                                                    photoIndex === ordered.length - 1 &&
                                                    styles.disabled
                                                  }
                                                >
                                                  <ThemedText type="smallBold">Down</ThemedText>
                                                </Pressable>
                                                <Pressable
                                                  onPress={() => removeEventPhoto(item, photo)}
                                                  style={{
                                                    minHeight: 44,
                                                    minWidth: 44,
                                                    justifyContent: 'center',
                                                  }}
                                                >
                                                  <ThemedText
                                                    style={styles.destructiveText}
                                                    type="smallBold"
                                                  >
                                                    Remove
                                                  </ThemedText>
                                                </Pressable>
                                              </View>
                                            </View>
                                          </View>
                                        );
                                      })}
                                  </View>
                                )}
                                {editingPhotoId &&
                                  item.event_photos?.some(
                                    (photo) => photo.id === editingPhotoId,
                                  ) && (
                                    <View style={styles.editForm}>
                                      <ThemedText type="smallBold">Edit gallery caption</ThemedText>
                                      <TextInput
                                        accessibilityLabel="Event gallery caption"
                                        editable={canEdit}
                                        onChangeText={setEventPhotoCaption}
                                        placeholder="Describe this image for customers"
                                        placeholderTextColor={colors.textSecondary}
                                        style={[
                                          styles.input,
                                          {
                                            color: colors.text,
                                            backgroundColor: colors.background,
                                            borderColor: colors.inputBorder,
                                          },
                                        ]}
                                        value={eventPhotoCaption}
                                      />
                                      <View style={styles.inlineActions}>
                                        <PrimaryButton
                                          loading={saving}
                                          disabled={!canEdit}
                                          label="Save caption"
                                          onPress={() => {
                                            const photo = item.event_photos?.find(
                                              (candidate) => candidate.id === editingPhotoId,
                                            );
                                            if (photo) void saveEventPhotoCaption(item, photo);
                                          }}
                                        />
                                        <SecondaryButton
                                          label="Cancel"
                                          onPress={() => setEditingPhotoId(null)}
                                        />
                                      </View>
                                    </View>
                                  )}
                              </View>
                              <ThemedText type="smallBold">Publishing</ThemedText>
                              <View style={styles.choiceRow}>
                                <ChoiceButton
                                  label="Draft"
                                  selected={editEventSaveMode === 'draft'}
                                  onPress={() => setEditEventSaveMode('draft')}
                                />
                                <ChoiceButton
                                  label="Publish now"
                                  selected={editEventSaveMode === 'publish'}
                                  onPress={() => setEditEventSaveMode('publish')}
                                />
                                <ChoiceButton
                                  label="Schedule"
                                  selected={editEventSaveMode === 'schedule'}
                                  onPress={() => setEditEventSaveMode('schedule')}
                                />
                              </View>
                              {editEventSaveMode === 'schedule' && (
                                <View style={styles.stackFields}>
                                  <StopPickerField
                                    label="Publish date (required)"
                                    value={
                                      editEventPublishDate
                                        ? formatStopDateForDisplay(editEventPublishDate)
                                        : ''
                                    }
                                    placeholder="Choose a date"
                                    colors={colors}
                                    onPress={() => setEventPickerTarget('edit-publish-date')}
                                  />
                                  <StopPickerField
                                    label="Publish time (required)"
                                    value={
                                      editEventPublishTime
                                        ? formatStopTimeForDisplay(editEventPublishTime)
                                        : ''
                                    }
                                    placeholder="Choose a time"
                                    colors={colors}
                                    onPress={() => setEventPickerTarget('edit-publish-time')}
                                  />
                                </View>
                              )}
                              <View style={styles.inlineActions}>
                                <PrimaryButton
                                  loading={saving}
                                  disabled={
                                    saving ||
                                    !editEventTitle.trim() ||
                                    !editEventDate ||
                                    !editEventTime
                                  }
                                  label="Save changes"
                                  onPress={() => void saveEventEdit(item)}
                                />
                                <SecondaryButton
                                  label="Cancel"
                                  onPress={() => setEditingEventId(null)}
                                />
                              </View>
                            </View>
                          ) : (
                            <>
                              <View style={styles.rowText}>
                                <ThemedText type="smallBold">{item.title}</ThemedText>
                                <ThemedText themeColor="textSecondary" type="small">
                                  {new Date(item.starts_at).toLocaleString()}
                                </ThemedText>
                                {!!item.address_text && (
                                  <ThemedText themeColor="textSecondary" type="small">
                                    {item.address_text}
                                  </ThemedText>
                                )}
                                {item.publish_at && (
                                  <ThemedText themeColor="textSecondary" type="small">
                                    Scheduled to publish{' '}
                                    {new Date(item.publish_at).toLocaleString()}
                                  </ThemedText>
                                )}
                              </View>
                              <LabeledSwitch
                                label="Published"
                                disabled={!canEdit}
                                value={item.is_published}
                                onValueChange={(value) => void updateEvent(item, value)}
                              />
                              {canEdit && (
                                <View style={styles.inlineActions}>
                                  <Pressable
                                    onPress={() => beginEventEdit(item)}
                                    style={{
                                      minHeight: 44,
                                      minWidth: 44,
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <ThemedText type="smallBold">Edit</ThemedText>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => archiveEvent(item)}
                                    style={{
                                      minHeight: 44,
                                      minWidth: 44,
                                      justifyContent: 'center',
                                    }}
                                  >
                                    <ThemedText style={styles.destructiveText} type="smallBold">
                                      Archive
                                    </ThemedText>
                                  </Pressable>
                                </View>
                              )}
                            </>
                          )}
                        </View>
                      ))
                    )}
                    {canEdit && (
                      <View style={styles.formCard}>
                        <ThemedText type="subtitle">Create an event</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          Required fields are labeled. Choose whether this saves as a draft or
                          publishes now.
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          After creating the event, tap Edit to add its cover and gallery photos.
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
                        <View style={styles.stackFields}>
                          <StopPickerField
                            label="Date (required)"
                            value={newEventDate ? formatStopDateForDisplay(newEventDate) : ''}
                            placeholder="Choose a date"
                            colors={colors}
                            onPress={() => setEventPickerTarget('new-date')}
                          />
                          <StopPickerField
                            label="Start time (required)"
                            value={newEventTime ? formatStopTimeForDisplay(newEventTime) : ''}
                            placeholder="Choose a time"
                            colors={colors}
                            onPress={() => setEventPickerTarget('new-time')}
                          />
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
                          <ChoiceButton
                            label="Schedule"
                            selected={eventSaveMode === 'schedule'}
                            onPress={() => setEventSaveMode('schedule')}
                          />
                        </View>
                        {eventSaveMode === 'schedule' && (
                          <View style={styles.stackFields}>
                            <StopPickerField
                              label="Publish date (required)"
                              value={
                                newEventPublishDate
                                  ? formatStopDateForDisplay(newEventPublishDate)
                                  : ''
                              }
                              placeholder="Choose a date"
                              colors={colors}
                              onPress={() => setEventPickerTarget('new-publish-date')}
                            />
                            <StopPickerField
                              label="Publish time (required)"
                              value={
                                newEventPublishTime
                                  ? formatStopTimeForDisplay(newEventPublishTime)
                                  : ''
                              }
                              placeholder="Choose a time"
                              colors={colors}
                              onPress={() => setEventPickerTarget('new-publish-time')}
                            />
                          </View>
                        )}
                        <PrimaryButton
                          loading={saving}
                          disabled={
                            saving ||
                            !newEventTitle.trim() ||
                            !newEventDate ||
                            !newEventTime ||
                            (eventSaveMode === 'schedule' &&
                              (!newEventPublishDate || !newEventPublishTime))
                          }
                          label={
                            eventSaveMode === 'publish'
                              ? 'Create and publish'
                              : eventSaveMode === 'schedule'
                                ? 'Create and schedule'
                                : 'Save as draft'
                          }
                          onPress={() => void createEvent()}
                        />
                      </View>
                    )}
                  </View>
                )}

                {section === 'events' && eventPickerTarget && (
                  <Modal
                    animationType="slide"
                    transparent
                    visible
                    onRequestClose={() => setEventPickerTarget(null)}
                  >
                    <View style={styles.stopPickerModalRoot}>
                      <Pressable
                        accessibilityLabel="Close event date and time picker"
                        accessibilityRole="button"
                        onPress={() => setEventPickerTarget(null)}
                        style={styles.stopPickerBackdrop}
                      />
                      <View
                        style={[
                          styles.stopPickerSheet,
                          { backgroundColor: colors.backgroundElement },
                        ]}
                      >
                        <View style={styles.stopPickerHeader}>
                          <View style={styles.rowText}>
                            <ThemedText type="subtitle">
                              {eventPickerTarget.endsWith('date')
                                ? 'Choose a date'
                                : 'Choose a time'}
                            </ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              Use the native picker; no date or 24-hour text entry is required.
                            </ThemedText>
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            onPress={() => setEventPickerTarget(null)}
                            style={styles.stopPickerDoneButton}
                          >
                            <ThemedText style={styles.primaryButtonText} type="smallBold">
                              Done
                            </ThemedText>
                          </Pressable>
                        </View>
                        <DateTimePicker
                          value={eventPickerValue(eventPickerTarget)}
                          mode={eventPickerTarget.endsWith('date') ? 'date' : 'time'}
                          display={
                            eventPickerTarget.endsWith('date')
                              ? 'inline'
                              : Platform.OS === 'ios'
                                ? 'spinner'
                                : 'default'
                          }
                          presentation="inline"
                          is24Hour={false}
                          accentColor={Brand.primary}
                          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
                          onValueChange={(_, value) =>
                            handleEventPickerChange(eventPickerTarget, value)
                          }
                        />
                      </View>
                    </View>
                  </Modal>
                )}

                {section === 'updates' && (
                  <View style={styles.cardList}>
                    {canEdit && (
                      <View style={styles.formCard}>
                        <FormSectionHeading
                          title="Send a follower update"
                          description="Reach followers who enabled General updates. New published events send their own event alert."
                        />
                        <ThemedText type="smallBold">Update type</ThemedText>
                        <View style={styles.choiceRow}>
                          <ChoiceButton
                            label="Announcement"
                            selected={newUpdateType === 'announcement'}
                            onPress={() => setNewUpdateType('announcement')}
                          />
                          <ChoiceButton
                            label="Special offer"
                            selected={newUpdateType === 'deal'}
                            onPress={() => setNewUpdateType('deal')}
                          />
                        </View>
                        <Field
                          label="Title (required)"
                          value={newUpdateTitle}
                          onChangeText={setNewUpdateTitle}
                          colors={colors}
                          maxLength={120}
                          returnKeyType="next"
                        />
                        <Field
                          label="Message (required)"
                          value={newUpdateBody}
                          onChangeText={setNewUpdateBody}
                          colors={colors}
                          multiline
                          maxLength={500}
                          style={styles.multiline}
                        />
                        <ThemedText themeColor="textSecondary" type="small">
                          This sends immediately after your business is approved. Avoid sending
                          frequent or unrelated alerts.
                        </ThemedText>
                        <PrimaryButton
                          loading={saving}
                          disabled={saving || !newUpdateTitle.trim() || !newUpdateBody.trim()}
                          label={saving ? 'Sending…' : 'Send to followers'}
                          onPress={() => void sendBusinessUpdate()}
                        />
                      </View>
                    )}
                    <View style={styles.formCard}>
                      <FormSectionHeading
                        title="Recent updates"
                        description="Your latest announcements and offers appear here."
                      />
                      {updates.length ? (
                        updates.map((update) => (
                          <View key={update.id} style={styles.settingRow}>
                            <View style={styles.rowText}>
                              <ThemedText type="smallBold">
                                {update.update_type === 'deal' ? 'Special offer' : 'Announcement'} ·{' '}
                                {update.title}
                              </ThemedText>
                              <ThemedText themeColor="textSecondary" type="small">
                                {update.body}
                              </ThemedText>
                              <ThemedText themeColor="textSecondary" type="small">
                                Sent {new Date(update.created_at).toLocaleString()}
                              </ThemedText>
                            </View>
                          </View>
                        ))
                      ) : (
                        <EmptyState
                          title="No updates yet"
                          message="Announcements and offers you send will appear here."
                        />
                      )}
                    </View>
                  </View>
                )}

                {section === 'rewards' && (
                  <View style={styles.formCard}>
                    <FormSectionHeading
                      title="Customer rewards"
                      description="Choose visits or points. Customers will see the rules before they join."
                    />
                    <ThemedText type="smallBold">Reward type</ThemedText>
                    <View style={styles.choiceRow}>
                      <ChoiceButton
                        label="Visit stamps"
                        selected={rewardProgramType === 'visits'}
                        onPress={() => canEdit && setRewardProgramType('visits')}
                      />
                      <ChoiceButton
                        label="Spend points"
                        selected={rewardProgramType === 'points'}
                        onPress={() => canEdit && setRewardProgramType('points')}
                      />
                    </View>
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
                    <ThemedText type="smallBold">Pickup checkout reward</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small">
                      Customers with a ready reward can apply it automatically while paying for a
                      pickup order. Leave the item ID blank to use the first eligible cart item.
                    </ThemedText>
                    <View style={styles.choiceRow}>
                      <ChoiceButton
                        label="Free item"
                        selected={checkoutRewardType === 'free_item'}
                        onPress={() => canEdit && setCheckoutRewardType('free_item')}
                      />
                      <ChoiceButton
                        label="Buy one, get one"
                        selected={checkoutRewardType === 'bogo'}
                        onPress={() => canEdit && setCheckoutRewardType('bogo')}
                      />
                      <ChoiceButton
                        label="Percent off"
                        selected={checkoutRewardType === 'percent_discount'}
                        onPress={() => canEdit && setCheckoutRewardType('percent_discount')}
                      />
                    </View>
                    {checkoutRewardType === 'percent_discount' ? (
                      <Field
                        label="Discount percentage"
                        value={checkoutRewardPercent}
                        onChangeText={setCheckoutRewardPercent}
                        colors={colors}
                        editable={canEdit}
                        keyboardType="number-pad"
                      />
                    ) : (
                      <Field
                        label="Square variation ID (optional)"
                        value={checkoutRewardVariationId}
                        onChangeText={setCheckoutRewardVariationId}
                        colors={colors}
                        editable={canEdit}
                        autoCapitalize="none"
                      />
                    )}
                    {rewardProgramType === 'visits' ? (
                      <Field
                        label="Stamps required (2–30)"
                        value={stampsRequired}
                        onChangeText={setStampsRequired}
                        colors={colors}
                        editable={canEdit}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    ) : (
                      <>
                        <Field
                          label="Points earned per $1 spent"
                          value={pointsPerDollar}
                          onChangeText={setPointsPerDollar}
                          colors={colors}
                          editable={canEdit}
                          keyboardType="decimal-pad"
                        />
                        <Field
                          label="Points needed to redeem (required)"
                          value={pointsRequired}
                          onChangeText={setPointsRequired}
                          colors={colors}
                          editable={canEdit}
                          keyboardType="number-pad"
                        />
                        <ThemedText themeColor="textSecondary" type="small">
                          Staff will enter the purchase total when scanning. A $25 purchase at 1
                          point per dollar earns 25 points.
                        </ThemedText>
                      </>
                    )}
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
                        loading={saving}
                        disabled={saving}
                        label={
                          saving
                            ? 'Saving…'
                            : reward
                              ? 'Save rewards program'
                              : 'Create rewards program'
                        }
                        onPress={() => void saveReward()}
                      />
                    )}
                  </View>
                )}

                {section === 'photos' && (
                  <View style={styles.cardList}>
                    {canEdit && (
                      <View style={styles.formCard}>
                        <ThemedText type="subtitle">Add business photos</ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          Images are resized on this device before secure upload. Gallery photos are
                          limited to {mediaLimits.maxGalleryImages}.
                        </ThemedText>
                        <Field
                          label="Image description (optional)"
                          value={photoAltText}
                          onChangeText={setPhotoAltText}
                          colors={colors}
                          editable={!photoUploading}
                        />
                        <View style={styles.inlineActions}>
                          <PrimaryButton
                            loading={saving}
                            disabled={photoUploading}
                            label={photoUploading ? 'Uploading…' : 'Add gallery photo'}
                            onPress={() => void pickAndUploadPhoto('gallery')}
                          />
                          <SecondaryButton
                            disabled={photoUploading}
                            label="Add cover"
                            onPress={() => void pickAndUploadPhoto('cover')}
                          />
                          <SecondaryButton
                            disabled={photoUploading}
                            label="Add logo"
                            onPress={() => void pickAndUploadPhoto('logo')}
                          />
                        </View>
                      </View>
                    )}
                    {photos.length === 0 ? (
                      <EmptyState
                        title="No photos yet"
                        message="No photos have been added to this business."
                      />
                    ) : (
                      photos.map((photo, photoIndex) => {
                        const asset = Array.isArray(photo.media_assets)
                          ? photo.media_assets[0]
                          : photo.media_assets;
                        return (
                          <View key={photo.id} style={styles.settingRowCard}>
                            {asset?.status === 'ready' && (
                              <Image
                                accessibilityLabel={asset.alt_text ?? photo.caption ?? ''}
                                source={{ uri: storagePublicUrl(asset.storage_path) }}
                                contentFit={photo.role === 'logo' ? 'contain' : 'cover'}
                                style={[
                                  styles.photoPreview,
                                  { backgroundColor: colors.logoSurface },
                                ]}
                                transition={180}
                              />
                            )}
                            {editingPhotoId === photo.id ? (
                              <View style={styles.editForm}>
                                <ThemedText type="smallBold">Photo caption (optional)</ThemedText>
                                <TextInput
                                  accessibilityLabel="Photo caption"
                                  editable={canEdit}
                                  onChangeText={setPhotoCaptionDraft}
                                  placeholder="Describe this photo for customers"
                                  placeholderTextColor={colors.textSecondary}
                                  style={[
                                    styles.input,
                                    {
                                      color: colors.text,
                                      backgroundColor: colors.background,
                                      borderColor: colors.inputBorder,
                                    },
                                  ]}
                                  value={photoCaptionDraft}
                                />
                                <View style={styles.inlineActions}>
                                  <PrimaryButton
                                    loading={saving}
                                    disabled={!canEdit}
                                    label="Save caption"
                                    onPress={() => void savePhotoCaption(photo)}
                                  />
                                  <SecondaryButton
                                    label="Cancel"
                                    onPress={() => setEditingPhotoId(null)}
                                  />
                                </View>
                              </View>
                            ) : (
                              <>
                                <View style={styles.rowText}>
                                  <ThemedText type="smallBold">
                                    {photo.role.replaceAll('_', ' ')}
                                  </ThemedText>
                                  <ThemedText themeColor="textSecondary" type="small">
                                    {photo.caption || asset?.alt_text || 'No caption'}
                                  </ThemedText>
                                </View>
                                <View style={styles.statusBadge}>
                                  <ThemedText style={styles.statusText} type="smallBold">
                                    {asset?.status ?? 'linked'}
                                  </ThemedText>
                                </View>
                                {canEdit && (
                                  <View style={styles.inlineActions}>
                                    <Pressable
                                      accessibilityLabel="Move photo up"
                                      disabled={photoIndex === 0}
                                      onPress={() => void movePhoto(photo, -1)}
                                      style={photoIndex === 0 && styles.disabled}
                                    >
                                      <ThemedText type="smallBold">↑</ThemedText>
                                    </Pressable>
                                    <Pressable
                                      accessibilityLabel="Move photo down"
                                      disabled={photoIndex === photos.length - 1}
                                      onPress={() => void movePhoto(photo, 1)}
                                      style={photoIndex === photos.length - 1 && styles.disabled}
                                    >
                                      <ThemedText type="smallBold">↓</ThemedText>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => beginPhotoEdit(photo)}
                                      style={{
                                        minHeight: 44,
                                        minWidth: 44,
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <ThemedText type="smallBold">Caption</ThemedText>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => removePhoto(photo)}
                                      style={{
                                        minHeight: 44,
                                        minWidth: 44,
                                        justifyContent: 'center',
                                      }}
                                    >
                                      <ThemedText style={styles.destructiveText} type="smallBold">
                                        Remove
                                      </ThemedText>
                                    </Pressable>
                                  </View>
                                )}
                              </>
                            )}
                          </View>
                        );
                      })
                    )}
                    <Notice
                      kind="info"
                      message="Photos use the same optimized storage pipeline on the web and iPhone. Captions, ordering, and removal are saved immediately."
                    />
                  </View>
                )}

                {section === 'staff' && canEdit && (
                  <View style={styles.cardList}>
                    <View style={styles.formCard}>
                      <ThemedText type="subtitle">Invite staff</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        Send a secure, single-use link. They can create an account or sign in first,
                        then accept the invite to unlock Staff Scan access.
                      </ThemedText>
                      <Field
                        label="Staff email"
                        value={staffEmail}
                        onChangeText={setStaffEmail}
                        colors={colors}
                        editable={!saving}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <PrimaryButton
                        loading={saving}
                        disabled={saving}
                        label={saving ? 'Creating invite…' : 'Create invite'}
                        onPress={() => void createStaffInvite()}
                      />
                    </View>
                    {latestInviteLink && (
                      <View style={styles.inviteLinkCard}>
                        <View style={styles.rowText}>
                          <ThemedText type="smallBold">
                            Invite ready for {latestInviteLink.email}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            This link expires in 7 days and works whether they already have an
                            account or are joining SDS Local for the first time.
                          </ThemedText>
                          <ThemedText
                            selectable
                            numberOfLines={2}
                            style={styles.inviteLinkText}
                            type="code"
                          >
                            {latestInviteLink.url}
                          </ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            You can also press and hold the link to copy it.
                          </ThemedText>
                        </View>
                        <PrimaryButton
                          loading={saving}
                          disabled={false}
                          label="Share or copy invite link"
                          onPress={() => void shareStaffInvite()}
                        />
                      </View>
                    )}
                    {staffInvites
                      .filter((invite) => invite.status === 'pending')
                      .map((invite) => (
                        <View key={invite.invite_id} style={styles.settingRowCard}>
                          <View style={styles.rowText}>
                            <ThemedText type="smallBold">{invite.invited_email}</ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              Pending · expires {new Date(invite.expires_at).toLocaleDateString()}
                            </ThemedText>
                          </View>
                          <SecondaryButton
                            label="Revoke"
                            onPress={() => revokeStaffInvite(invite)}
                          />
                        </View>
                      ))}
                    {staff.length === 0 ? (
                      <EmptyState
                        title="No staff members"
                        message="Invite trusted staff so they can scan customer rewards at your business."
                      />
                    ) : (
                      staff.map((member) => (
                        <View key={member.member_id} style={styles.settingRowCard}>
                          <View style={styles.rowText}>
                            <ThemedText type="smallBold">{member.display_name}</ThemedText>
                            <ThemedText themeColor="textSecondary" type="small">
                              Staff member · Added{' '}
                              {new Date(member.created_at).toLocaleDateString()}
                            </ThemedText>
                          </View>
                          <SecondaryButton
                            label="Remove"
                            onPress={() => removeStaffMember(member)}
                          />
                        </View>
                      ))
                    )}
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
                          <View
                            style={[styles.checkDot, check.complete && styles.checkDotComplete]}
                          >
                            <ThemedText style={styles.checkMark} type="smallBold">
                              {check.complete ? '✓' : '·'}
                            </ThemedText>
                          </View>
                          <ThemedText style={styles.checkLabel}>{check.label}</ThemedText>
                        </View>
                      ))}
                      {business.status === 'draft' && canEdit && (
                        <>
                          <AppButton
                            label="View listing plans"
                            onPress={() => router.push('/(tabs)/listing-plans' as Href)}
                            variant="secondary"
                          />
                          <PrimaryButton
                            loading={saving}
                            disabled={saving || !readiness?.ready}
                            label={
                              readiness?.ready
                                ? 'Submit for SDS review'
                                : 'Complete checklist to submit'
                            }
                            onPress={() => void submitForReview()}
                          />
                        </>
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
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </SwipeBackView>
  );
}

function BusinessDestinationUnderlay({
  accent,
  attention,
  business,
  canEdit,
  colors,
  logoUri,
  scrollOffset,
  setupItems,
  summaryFor,
}: Omit<React.ComponentProps<typeof BusinessHub>, 'onOpen' | 'onPreview'> & {
  readonly scrollOffset: number;
}) {
  const bottomPadding = useScreenBottomPadding();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
          contentOffset={{ x: 0, y: Math.max(0, scrollOffset) }}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.compactWorkspaceHeader}>
            <ThemedText style={{ color: accent }} type="smallBold">
              ‹ All businesses
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {canEdit ? 'Owner workspace' : 'Staff workspace'}
            </ThemedText>
          </View>
          <BusinessHub
            accent={accent}
            attention={attention}
            business={business}
            canEdit={canEdit}
            colors={colors}
            logoUri={logoUri}
            onOpen={() => undefined}
            onPreview={() => undefined}
            setupItems={setupItems}
            summaryFor={summaryFor}
            showCompletionPrompt={false}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function formatPrice(item: OfferingItem) {
  if (item.price_text) return item.price_text;
  if (item.price_minor === null) return 'Price not set';
  return formatMinorCurrency(item.price_minor);
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
        accessibilityLabel={label}
        {...props}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.background,
            borderColor: colors.inputBorder,
          },
          props.style,
        ]}
      />
    </View>
  );
}

function StopPickerField({
  label,
  value,
  placeholder,
  colors,
  onPress,
}: {
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly colors: typeof Colors.light | typeof Colors.dark;
  readonly onPress: () => void;
}) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={[
          styles.stopPickerInput,
          {
            backgroundColor: colors.background,
            borderColor: colors.inputBorder,
          },
        ]}
      >
        <ThemedText style={{ color: value ? colors.text : colors.textSecondary }}>
          {value || placeholder}
        </ThemedText>
        <ThemedText style={styles.stopPickerAffordance} type="smallBold">
          Choose
        </ThemedText>
      </Pressable>
    </View>
  );
}

function formatStopDateForDisplay(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(parsed);
}

function formatStopTimeForDisplay(value: string) {
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
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
  loading = false,
}: {
  readonly disabled: boolean;
  readonly label: string;
  readonly loading?: boolean;
  readonly onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      disabled={disabled}
      loading={loading}
      onPress={() => {
        void haptics.medium();
        onPress();
      }}
    />
  );
}

function SecondaryButton({
  label,
  onPress,
  disabled = false,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly disabled?: boolean;
}) {
  return (
    <AppButton
      label={label}
      disabled={disabled}
      variant="secondary"
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
    />
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
      onPress={() => {
        void haptics.selection();
        onPress();
      }}
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
  return <StateNotice message={message} kind={kind} />;
}

function EmptyState({ title, message }: { readonly title: string; readonly message: string }) {
  return (
    <View style={styles.formCard}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
    </View>
  );
}

function FormSectionHeading({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <View style={styles.formSectionHeading}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {description}
      </ThemedText>
    </View>
  );
}

function MenuStat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <View style={styles.menuStat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText themeColor="textSecondary" type="small">
        {label}
      </ThemedText>
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

function parseLocalDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function toDateInputValue(value: Date) {
  return sharedDateInputValue(value);
}

function toTimeInputValue(value: Date) {
  return sharedTimeInputValue(value);
}

function formatTime(value: string | null | undefined) {
  if (!value) return 'Hours not set';
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
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
  editorHeader: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compactWorkspaceHeader: {
    gap: Spacing.one,
    paddingBottom: Spacing.two,
  },
  workspaceEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  workspaceEyebrowDot: { width: 8, height: 8, borderRadius: 4 },
  backButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one,
  },
  pressed: { opacity: 0.72 },
  workspaceNav: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  workspaceNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  workspaceNavCopy: { flex: 1, gap: 2 },
  currentSectionBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  formSectionHeading: { gap: Spacing.one, paddingBottom: Spacing.one },
  formCard: {
    borderRadius: Radius.medium,
    borderWidth: 0,
    borderColor: 'rgba(138,147,142,0.65)',
    backgroundColor: 'rgba(120,140,128,0.05)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  inviteLinkCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: 'rgba(23,107,77,0.45)',
    backgroundColor: 'rgba(23,107,77,0.08)',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  shareCard: {
    gap: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: 'rgba(23,107,77,0.45)',
    backgroundColor: 'rgba(23,107,77,0.08)',
    padding: Spacing.four,
  },
  shareCardCopy: { gap: Spacing.one },
  inviteLinkText: {
    color: Brand.primary,
    marginTop: Spacing.one,
  },
  menuIntroCard: {
    borderRadius: Radius.large,
    borderWidth: 1,
    backgroundColor: 'rgba(120,140,128,0.08)',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  menuIntroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  menuItemCount: {
    minWidth: 88,
    minHeight: 88,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 2,
  },
  menuStatsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(138,147,142,0.5)',
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  menuStat: { flex: 1, gap: 2 },
  menuPresetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  menuActionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  menuEditorForm: { gap: Spacing.three, paddingTop: Spacing.one },
  menuImportPreview: {
    maxHeight: 280,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
    backgroundColor: 'rgba(120,140,128,0.08)',
  },
  menuImportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(138,147,142,0.45)',
    paddingVertical: Spacing.two,
  },
  menuImageOption: {
    gap: Spacing.one,
    borderRadius: Radius.medium,
    padding: Spacing.two,
    backgroundColor: 'rgba(120,140,128,0.08)',
  },
  menuItemSummary: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  menuItemImageFrame: {
    width: 76,
    height: 76,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,140,128,0.12)',
    overflow: 'hidden',
  },
  menuItemImage: { width: '100%', height: '100%' },
  menuPhotoField: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderRadius: Radius.medium,
    padding: Spacing.two,
    backgroundColor: 'rgba(120,140,128,0.08)',
  },
  menuPhotoPreview: {
    width: 96,
    height: 96,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(120,140,128,0.14)',
    overflow: 'hidden',
  },
  menuPhotoImage: { width: '100%', height: '100%' },
  menuItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  menuPrice: { color: Brand.primary },
  featuredBadge: {
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(23,107,77,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featuredBadgeText: { color: Brand.primary },
  menuGroupHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  reorderActions: { flexDirection: 'row', gap: Spacing.one },
  reorderButton: {
    width: 44,
    height: 44,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(138,147,142,0.65)',
  },
  cardList: { gap: Spacing.three },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
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
  stopPickerInput: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stopPickerAffordance: { color: Brand.primary },
  stopPickerModalRoot: { flex: 1, justifyContent: 'flex-end' },
  stopPickerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(4,12,8,0.58)',
  },
  stopPickerSheet: {
    width: '100%',
    maxHeight: '78%',
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.three,
  },
  stopPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  stopPickerDoneButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.small,
    backgroundColor: Brand.primary,
    paddingHorizontal: 18,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  inlineFields: { flexDirection: 'row', gap: Spacing.two },
  inlineField: { flex: 1 },
  stackFields: { gap: Spacing.three },
  inlineActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  editForm: { width: '100%', gap: Spacing.three },
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
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(120,140,128,0.16)',
    paddingHorizontal: 14,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Brand.primary,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: Brand.onPrimary },
  secondaryButton: {
    minHeight: 50,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 18,
  },
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
    borderColor: 'rgba(138,147,142,0.65)',
    backgroundColor: 'rgba(120,140,128,0.05)',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  locationStopCard: {
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: 'rgba(23,107,77,0.35)',
    backgroundColor: 'rgba(23,107,77,0.06)',
    padding: Spacing.three,
    gap: Spacing.two,
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
  underlayHeader: { gap: Spacing.two },
  photoPreview: { width: '100%', aspectRatio: 1.8, borderRadius: 14 },
  eventMediaEditor: {
    gap: Spacing.two,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    backgroundColor: 'rgba(120,140,128,0.08)',
  },
  eventCoverPreview: { width: '100%', aspectRatio: 1.9, borderRadius: 14 },
  eventGalleryList: { gap: Spacing.two },
  eventGalleryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  eventGalleryThumb: { width: 78, height: 62, borderRadius: 10 },
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
