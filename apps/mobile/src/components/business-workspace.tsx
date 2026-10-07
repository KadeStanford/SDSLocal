import { inputPresets } from '@/lib/input-presets';
import { BusinessFeatureGate } from '@/components/business-feature-gate';
import { workspaceFeatureOperation } from '@/lib/business-feature-access';
import { imageSelectionError } from '@/lib/image-selection';
import { FlowAvatar, FlowSection, FlowIdentity } from '@/components/flow-layout';
import { MenuCategoryActions } from './menu-workspace-ui';
import { BusinessEditorHeader, ParishBusinessBrand } from './business-screen-header';
import { ManagedEventOverview } from './managed-event-overview';
import { RewardProgramCard } from './reward-program-card';
import {
  MenuSetupHeader,
  MenuSetupItem,
  MenuSetupSearch,
  MenuSetupTabs,
  menuStockMatches,
  type MenuStockFilter,
} from './menu-workspace-ui';
import { BrandColorPicker } from './brand-color-picker';
import { CheckoutRewardEditor, type RewardMenuItem } from './checkout-reward-editor';
import { withBusinessTheme } from './business-theme';
import { useTheme } from '@/hooks/use-theme';
import { BackPill } from './back-pill';
import { MobileStopInbox, mobileStopTime } from './mobile-stop-inbox';
import { WorkspaceDetailsOverview } from './workspace-details-overview';
import { EventInbox } from './event-inbox';
import { usePullRefresh } from '@/hooks/use-pull-refresh';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import {
  MerchantButton,
  MerchantHeading,
  MerchantRow,
  MerchantSearch,
  MerchantSheet,
  MerchantStatus,
  merchantStyles,
} from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { AppButton } from '@/components/app-button';
import { OrderingPanel } from '@/components/ordering-panel';
import { AppointmentWorkspace } from '@/components/appointment-workspace';
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
  Pressable,
  Platform,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Share,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { AppTextInput as TextInput } from '@/components/app-text-input';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { PublicBusinessPageContent } from '@/components/public-business-page';
import { BusinessLocationMap } from '@/components/business-location-map';
import { BusinessQrPoster } from '@/components/business-qr-poster';
import { BusinessHub } from '@/components/business-hub';
import { BusinessAnalyticsCard } from '@/components/business-analytics-card';
import { HoursEditor, type WorkspaceHour } from '@/components/business-workspace-panels';
import { BusinessWorkspaceSheet } from '@/components/business-workspace-sheet';
import { ChoicePicker } from '@/components/choice-picker';
import { FormField } from '@/components/form-field';
import { SwipeBackView } from '@/components/swipe-back-view';
import {
  businessWorkspaceBackTarget,
  publishingCheckSection,
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
import { parseMenuImport, type MenuImportRow } from '@/lib/menu-import';
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
  readonly timezone: string;
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
  readonly rsvp_limit: number | null;
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
  readonly checkout_reward_type: 'free_item' | 'bogo' | 'percent_discount' | 'item_discount';
  readonly checkout_reward_variation_id: string | null;
  readonly checkout_reward_enabled: boolean;
  readonly checkout_reward_items: RewardMenuItem[];
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

function BusinessWorkspaceContent({
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
  const bottomPadding = useScreenBottomPadding(false);
  const { session, loading: authLoading } = useAuth();
  const pickupWorkspace = usePickupWorkspace();
  const scheme = useColorScheme();
  const colors = useTheme();
  const [section, setSection] = useState<Section | null>(initialSection);
  const [orderingDirty, setOrderingDirty] = useState(false);
  const [appointmentsDirty, setAppointmentsDirty] = useState(false);
  const [business, setBusiness] = useState<BusinessRecord | null>(null);
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [offerSections, setOfferSections] = useState<OfferingSection[]>([]);
  const [offerings, setOfferings] = useState<OfferingItem[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventRsvpCounts, setEventRsvpCounts] = useState<
    Record<string, { going: number; waitlist: number }>
  >({});
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
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [stopEditorOpen, setStopEditorOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
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
    'free_item' | 'bogo' | 'percent_discount' | 'item_discount'
  >('free_item');
  const [checkoutRewardEnabled, setCheckoutRewardEnabled] = useState(false);
  const [checkoutRewardItems, setCheckoutRewardItems] = useState<RewardMenuItem[]>([]);
  const [checkoutRewardPercent, setCheckoutRewardPercent] = useState('20');
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [newOfferingSectionId, setNewOfferingSectionId] = useState('');
  const [newOfferingName, setNewOfferingName] = useState('');
  const [newOfferingDescription, setNewOfferingDescription] = useState('');
  const [newOfferingPrice, setNewOfferingPrice] = useState('');
  const [newOfferingPriceText, setNewOfferingPriceText] = useState('');
  const [newOfferingImage, setNewOfferingImage] = useState<ImagePicker.ImagePickerAsset | null>(
    null,
  );
  const [choosingOfferingImage, setChoosingOfferingImage] = useState(false);
  const choosingOfferingImageRef = useRef(false);
  const inventoryColors = useMerchantTheme();
  const inventoryMutation = useRef(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('all');
  const [inventoryStatus, setInventoryStatus] = useState<MenuStockFilter>('all');
  const [inventoryReorder, setInventoryReorder] = useState(false);
  const [inventoryTools, setInventoryTools] = useState(false);
  const [menuEditorPanel, setMenuEditorPanel] = useState<'section' | 'item' | null>(null);
  const [menuImportOpen, setMenuImportOpen] = useState(false);
  const [menuImportFileName, setMenuImportFileName] = useState('');
  const [menuImportRows, setMenuImportRows] = useState<MenuImportRow[]>([]);
  const [menuImportError, setMenuImportError] = useState<string | null>(null);
  const [menuItemTab, setMenuItemTab] = useState<'details' | 'options' | 'availability'>('details');
  const [editOfferingSectionId, setEditOfferingSectionId] = useState('');
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
  const [newEventRsvpLimit, setNewEventRsvpLimit] = useState('');
  const [eventSaveMode, setEventSaveMode] = useState<'draft' | 'publish' | 'schedule'>('draft');
  const [newEventPublishDate, setNewEventPublishDate] = useState('');
  const [newEventPublishTime, setNewEventPublishTime] = useState('');
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [newEventOpen, setNewEventOpen] = useState(false);
  const selectedEvent = events.find((item) => item.id === selectedEventId);
  const [editEventTitle, setEditEventTitle] = useState('');
  const [editEventDescription, setEditEventDescription] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEventTime, setEditEventTime] = useState('');
  const [editEventLocation, setEditEventLocation] = useState('');
  const [editEventRsvpLimit, setEditEventRsvpLimit] = useState('');
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
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [rewardEditorOpen, setRewardEditorOpen] = useState(false);
  const selectedPhoto = photos.find((photo) => photo.id === selectedPhotoId);
  const [photoCaptionDraft, setPhotoCaptionDraft] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [contentPanel, setContentPanel] = useState<'update' | 'invite' | null>(null);
  const [contentQuery, setContentQuery] = useState('');
  const [selectedUpdateId, setSelectedUpdateId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedInviteId, setSelectedInviteId] = useState<string | null>(null);
  const selectedUpdate = updates.find((update) => update.id === selectedUpdateId);
  const selectedStaff = staff.find((member) => member.member_id === selectedStaffId);
  const pendingInvites = staffInvites.filter((invite) => invite.status === 'pending');
  const selectedInvite = pendingInvites.find((invite) => invite.invite_id === selectedInviteId);
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
    setCheckoutRewardEnabled(record?.checkout_reward_enabled ?? false);
    setCheckoutRewardItems(record?.checkout_reward_items ?? []);
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
      rsvpCountsResult,
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
          'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color, timezone',
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
          'id, title, description, starts_at, address_text, is_published, publish_at, rsvp_limit, media_assets(storage_path, status, alt_text), event_photos(id, caption, display_order, media_assets(storage_path, status, alt_text))',
        )
        .eq('business_id', businessId)
        .is('archived_at', null)
        .order('starts_at'),
      supabase
        .from('loyalty_programs')
        .select(
          'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_enabled, checkout_reward_items, checkout_reward_percent, terms, is_active',
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
      supabase.rpc('get_business_event_rsvp_counts', { p_business_id: businessId }),
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
      rsvpCountsResult.error,
    ].find(Boolean);
    if (firstError) {
      setError(userMessageFromError(firstError, 'We could not load this business.'));
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
    setEventRsvpCounts(
      Object.fromEntries(
        (
          (rsvpCountsResult.data ?? []) as {
            event_id: string;
            going_count: number;
            waitlist_count: number;
          }[]
        ).map((row) => [
          row.event_id,
          { going: Number(row.going_count), waitlist: Number(row.waitlist_count) },
        ]),
      ),
    );
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

  const pullRefresh = usePullRefresh(loadWorkspace);
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
  const editingOffering = offerings.find((item) => item.id === editingOfferingId);
  function offeringEditorIsDirty() {
    if (!editingOffering) return false;
    return (
      editOfferingSectionId !== editingOffering.section_id ||
      editOfferingName !== editingOffering.name ||
      editOfferingDescription !== editingOffering.description ||
      editOfferingPrice !==
        (editingOffering.price_minor === null
          ? ''
          : formatMinorCurrency(editingOffering.price_minor)) ||
      editOfferingPriceText !==
        (editingOffering.price_minor === null ? (editingOffering.price_text ?? '') : '')
    );
  }
  function closeOfferingEditor() {
    if (saving || photoUploading) return;
    if (!offeringEditorIsDirty()) {
      setEditingOfferingId(null);
      return;
    }
    Alert.alert(
      'Discard item changes?',
      'Your unsaved name, description and price changes will be lost.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard changes',
          style: 'destructive',
          onPress: () => setEditingOfferingId(null),
        },
      ],
    );
  }
  const sectionTitle = useMemo(
    () => (section ? workspaceSectionLabel(section, business?.business_type) : 'Business'),
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
    setIdentityEditorOpen(false);
    setStopEditorOpen(false);
    setSelectedStopId(null);
    setContentQuery('');
    setContentPanel(null);
    setSelectedUpdateId(null);
    setSelectedStaffId(null);
    setSelectedInviteId(null);
    setRewardEditorOpen(false);
    setPhotoUploadOpen(false);
    setSelectedPhotoId(null);
    setHubReturnOffset(hubScrollOffset.current);
    setSection(nextSection);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
  }

  function leaveEditor() {
    if (saving || photoUploading || stopGeocoding) return;
    if (stopEditorOpen) {
      closeStopEditor();
      return;
    }
    if (selectedStopId) {
      setSelectedStopId(null);
      return;
    }
    const returnToHub = () => {
      if (section === 'events') {
        setEditingEventId(null);
        setSelectedEventId(null);
        setNewEventOpen(false);
        setEventPickerTarget(null);
      }
      if (section === 'rewards') {
        applyReward(reward);
        setRewardEditorOpen(false);
      }
      if (section === 'photos') {
        setEditingPhotoId(null);
        setSelectedPhotoId(null);
        setPhotoUploadOpen(false);
      }
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
    if (section === 'offerings')
      return (
        offeringEditorIsDirty() ||
        !!(
          menuEditorPanel === 'item' &&
          (newOfferingName ||
            newOfferingDescription ||
            newOfferingPrice ||
            newOfferingPriceText ||
            newOfferingImage)
        ) ||
        !!(menuEditorPanel === 'section' && (newSectionName || newSectionDescription))
      );
    if (section === 'events') return eventEditorIsDirty();
    if (section === 'photos') return photoEditorIsDirty();
    if (section === 'rewards') return rewardEditorIsDirty();
    if (section === 'ordering') return orderingDirty;
    if (section === 'appointments') return appointmentsDirty;
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
    if (section === 'mobile-location') return stopDraftIsDirty();
    return false;
  }

  function stopDraftIsDirty() {
    return !!(
      newStopTitle ||
      newStopAddress ||
      newStopDate ||
      newStopStart ||
      newStopEnd ||
      newStopLatitude ||
      newStopLongitude
    );
  }
  function resetStopDraft() {
    ++stopLookupRequest.current;
    setNewStopTitle('');
    setNewStopAddress('');
    setNewStopDate('');
    setNewStopStart('');
    setNewStopEnd('');
    setNewStopLatitude('');
    setNewStopLongitude('');
    setStopPickerTarget(null);
    setMapInteractionActive(false);
  }
  function closeStopEditor() {
    if (saving || stopGeocoding) return;
    const close = () => {
      resetStopDraft();
      setStopEditorOpen(false);
      setError(null);
    };
    if (stopDraftIsDirty())
      Alert.alert('Discard stop draft?', 'This stop has not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
    else close();
  }
  function closeIdentityEditor() {
    if (saving || photoUploading || !business) return;
    const close = () => {
      if (section === 'profile') {
        setName(business.name);
        setBusinessType(business.business_type);
        setDescription(business.description);
        setPrimaryColor(business.primary_color);
        setAccentColor(business.accent_color);
      }
      if (section === 'contact') {
        setPhone(business.phone ?? '');
        setEmail(business.email ?? '');
        setWebsite(business.website_url ?? '');
      }
      if (section === 'location') {
        setAddressLine1(business.address_line_1 ?? '');
        setCity(business.city ?? '');
        setRegion(business.region_code ?? '');
        setPostalCode(business.postal_code ?? '');
        setServiceAreaType(business.service_area_type);
        setServiceCities([...business.service_area_regions]);
        setServiceRadiusMiles(business.service_radius_miles ?? 25);
        setCustomServiceArea(business.service_area ?? '');
        setServiceCityDraft('');
      }
      setIdentityEditorOpen(false);
      setError(null);
    };
    if (focusedEditorIsDirty() || (section === 'location' && serviceCityDraft.trim()))
      Alert.alert('Discard unsaved changes?', 'Your changes have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
    else close();
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
    if (destination === 'appointments') return 'Set up bookings and manage the schedule';
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
      return staff.length
        ? `${staff.length} active ${staff.length === 1 ? 'staff member' : 'staff members'}`
        : 'Invite and manage staff';
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
    if (!business || !canEdit || saving || photoUploading) return;
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
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color, timezone',
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
    if (!business || !canEdit || saving) return;
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
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color, timezone',
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
    if (!business || !canEdit || saving) return;
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
        'id, name, slug, status, business_type, description, phone, email, website_url, address_line_1, city, region_code, postal_code, service_area_type, service_area_regions, service_radius_miles, service_area, primary_color, accent_color, timezone',
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
    let latitude = newStopLatitude.trim() ? Number(newStopLatitude) : Number.NaN;
    let longitude = newStopLongitude.trim() ? Number(newStopLongitude) : Number.NaN;
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
    setStopEditorOpen(false);
    setSelectedStopId((data as LocationStopRecord).id);
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
    if (inventoryMutation.current || saving || photoUploading || !canEdit) return;
    inventoryMutation.current = true;
    try {
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
    } catch (cause) {
      setError(
        userMessageFromError(cause, 'We could not save this inventory change. Please retry.'),
      );
    } finally {
      inventoryMutation.current = false;
      setSaving(false);
    }
  }

  async function createOffering() {
    if (
      inventoryMutation.current ||
      saving ||
      photoUploading ||
      choosingOfferingImageRef.current ||
      !canEdit
    )
      return;
    inventoryMutation.current = true;
    try {
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
      const selectedImage = newOfferingImage;
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
          display_order: offerings.filter((item) => item.section_id === newOfferingSectionId)
            .length,
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
      setNewOfferingImage(null);
      setMenuEditorPanel(null);
      setNotice('Offering created.');
      if (selectedImage) {
        const uploaded = await pickAndUploadPhoto(
          'offering',
          (data as OfferingItem).id,
          createdName,
          selectedImage,
        );
        if (!uploaded) {
          beginOfferingEdit(data as OfferingItem);
          setNotice('Item saved. Add the photo again from item details.');
          setError(
            'The photo could not be attached. Your item has been saved; you do not need to add it again.',
          );
        }
      }
    } catch (cause) {
      setError(
        userMessageFromError(cause, 'We could not save this inventory change. Please retry.'),
      );
    } finally {
      inventoryMutation.current = false;
      setSaving(false);
    }
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
    setMenuItemTab('details');
    setEditOfferingSectionId(item.section_id);
    setEditingOfferingId(item.id);
    setEditOfferingName(item.name);
    setEditOfferingDescription(item.description);
    setEditOfferingPrice(item.price_minor === null ? '' : formatMinorCurrency(item.price_minor));
    setEditOfferingPriceText(item.price_minor === null ? (item.price_text ?? '') : '');
    setError(null);
  }

  async function saveOfferingEdit(item: OfferingItem) {
    if (inventoryMutation.current || saving || photoUploading || !canEdit) return;
    inventoryMutation.current = true;
    try {
      if (
        !canEdit ||
        !editOfferingName.trim() ||
        !offerSections.some((group) => group.id === editOfferingSectionId)
      ) {
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
        section_id: editOfferingSectionId,
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
    } catch (cause) {
      setError(
        userMessageFromError(cause, 'We could not save this inventory change. Please retry.'),
      );
    } finally {
      inventoryMutation.current = false;
      setSaving(false);
    }
  }

  async function archiveOffering(item: OfferingItem) {
    if (inventoryMutation.current || saving || photoUploading || !canEdit) return;
    inventoryMutation.current = true;
    try {
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
      setEditingOfferingId(null);
      setNotice('Offering archived.');
    } catch (cause) {
      setError(
        userMessageFromError(cause, 'We could not save this inventory change. Please retry.'),
      );
    } finally {
      inventoryMutation.current = false;
      setSaving(false);
    }
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
    const rsvpLimit = parseOptionalEventLimit(newEventRsvpLimit);
    if (rsvpLimit === undefined) {
      setError(
        'RSVP capacity must be a whole number from 0 to 100,000. Leave it blank for no limit.',
      );
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
        rsvp_limit: rsvpLimit,
        is_published: eventSaveMode === 'publish',
        publish_at: publishAt?.toISOString() ?? null,
      })
      .select(
        'id, title, description, starts_at, address_text, is_published, publish_at, rsvp_limit',
      )
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
    setNewEventRsvpLimit('');
    setNewEventPublishDate('');
    setNewEventPublishTime('');
    setEventSaveMode('draft');
    setNewEventOpen(false);
    setSelectedEventId((data as EventRecord).id);
    setNotice(
      eventSaveMode === 'publish'
        ? 'Event created and published.'
        : eventSaveMode === 'schedule'
          ? 'Event created and scheduled.'
          : 'Event saved as a draft.',
    );
  }

  function eventEditorIsDirty() {
    const item = events.find((candidate) => candidate.id === editingEventId);
    if (!item) return false;
    const start = new Date(item.starts_at);
    const publish = item.publish_at ? new Date(item.publish_at) : null;
    return hasUnsavedChanges(
      {
        title: item.title,
        description: item.description,
        date: toDateInputValue(start),
        time: toTimeInputValue(start),
        location: item.address_text ?? '',
        limit: item.rsvp_limit === null ? '' : String(item.rsvp_limit),
        mode: item.is_published ? 'publish' : publish ? 'schedule' : 'draft',
        publishDate: publish ? toDateInputValue(publish) : '',
        publishTime: publish ? toTimeInputValue(publish) : '',
      },
      {
        title: editEventTitle,
        description: editEventDescription,
        date: editEventDate,
        time: editEventTime,
        location: editEventLocation,
        limit: editEventRsvpLimit,
        mode: editEventSaveMode,
        publishDate: editEventPublishDate,
        publishTime: editEventPublishTime,
      },
    );
  }
  function closeEventView(returnToList = true) {
    if (saving || photoUploading) return;
    const close = () => {
      setEditingEventId(null);
      setEventPickerTarget(null);
      if (returnToList) {
        setSelectedEventId(null);
        setNewEventOpen(false);
      }
    };
    if (eventEditorIsDirty()) {
      Alert.alert('Discard event changes?', 'Your event changes have not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
    } else close();
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
    setEditEventRsvpLimit(item.rsvp_limit === null ? '' : String(item.rsvp_limit));
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
    const rsvpLimit = parseOptionalEventLimit(editEventRsvpLimit);
    if (rsvpLimit === undefined) {
      setError(
        'RSVP capacity must be a whole number from 0 to 100,000. Leave it blank for no limit.',
      );
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
      rsvp_limit: rsvpLimit,
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
      'It will be removed from business management and customer listings.',
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
    if (!canEdit || inventoryMutation.current || saving || photoUploading) return;
    inventoryMutation.current = true;
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('offering_items')
        .update(updates)
        .eq('id', item.id)
        .eq('business_id', businessId);
      if (updateError) throw updateError;
      setOfferings((current) =>
        current.map((candidate) =>
          candidate.id === item.id ? { ...candidate, ...updates } : candidate,
        ),
      );
      setNotice('Item availability saved.');
    } catch (cause) {
      setError(userMessageFromError(cause, 'We could not update that offering. Please retry.'));
    } finally {
      inventoryMutation.current = false;
      setSaving(false);
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

  function photoEditorIsDirty() {
    const photo = photos.find((item) => item.id === editingPhotoId);
    return Boolean(photo && photoCaptionDraft !== (photo.caption ?? ''));
  }
  function closePhotoView(returnToList = true) {
    if (saving || photoUploading) return;
    const close = () => {
      setEditingPhotoId(null);
      if (returnToList) setSelectedPhotoId(null);
    };
    if (photoEditorIsDirty()) {
      Alert.alert('Discard caption changes?', 'Your photo caption has not been saved.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: close },
      ]);
    } else close();
  }

  function rewardEditorIsDirty() {
    return hasUnsavedChanges(
      {
        name: reward?.name ?? 'Local rewards',
        description: reward?.reward_description ?? '',
        terms: reward?.terms ?? '',
        type: reward?.program_type ?? 'visits',
        stamps: String(reward?.stamps_required ?? 10),
        rate: String(reward?.points_per_dollar ?? 1),
        required: String(reward?.points_required ?? 100),
        checkout: reward?.checkout_reward_type ?? 'free_item',
        enabled: reward?.checkout_reward_enabled ?? false,
        items: reward?.checkout_reward_items ?? [],
        percent: String(reward?.checkout_reward_percent ?? 20),
      },
      {
        name: rewardName,
        description: rewardDescription,
        terms: rewardTerms,
        type: rewardProgramType,
        stamps: stampsRequired,
        rate: pointsPerDollar,
        required: pointsRequired,
        checkout: checkoutRewardType,
        enabled: checkoutRewardEnabled,
        items: checkoutRewardItems,
        percent: checkoutRewardPercent,
      },
    );
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

  async function chooseOfferingImage() {
    if (!canEdit || saving || photoUploading || choosingOfferingImageRef.current) return;
    choosingOfferingImageRef.current = true;
    setChoosingOfferingImage(true);
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const selectionError = imageSelectionError(result.assets[0]);
      if (selectionError) {
        setError(selectionError);
        return;
      }
      setNewOfferingImage(result.assets[0]);
    } catch (cause) {
      setError(
        userMessageFromError(cause, 'We could not open your photo library. Please try again.'),
      );
    } finally {
      choosingOfferingImageRef.current = false;
      setChoosingOfferingImage(false);
    }
  }

  async function pickAndUploadPhoto(
    role: UploadRole,
    eventId?: string,
    altTextOverride?: string,
    selectedAsset?: ImagePicker.ImagePickerAsset,
  ) {
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
      result = selectedAsset
        ? { canceled: false, assets: [selectedAsset] }
        : await ImagePicker.launchImageLibraryAsync({
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
    const selectionError = imageSelectionError(asset);
    if (selectionError) {
      setError(selectionError);
      return false;
    }

    setPhotoUploading(true);
    setError(null);
    setNotice('Preparing image variants…');
    const assetGroupId = Crypto.randomUUID();
    let stagingIntentCreated = false;
    try {
      const { data: intentData, error: intentError } = await supabase.functions.invoke(
        'business-media-upload-intent',
        {
          body: {
            action: 'create',
            businessId: business.id,
            assetGroupId,
            role,
            targetId: eventId,
          },
        },
      );
      if (intentError) {
        const details =
          typeof intentData === 'object' && intentData && 'error' in intentData
            ? String(intentData.error)
            : intentError.message;
        throw new Error(details);
      }
      stagingIntentCreated = true;
      const intentVariants =
        typeof intentData === 'object' && intentData && 'variants' in intentData
          ? (intentData.variants as Record<string, { maxBytes?: number; variant?: string }>)
          : null;
      if (!intentVariants) throw new Error('The secure photo upload could not be prepared.');
      const uploadPathsByVariant = new Map<
        string,
        { path: string; detail: { maxBytes?: number; variant?: string } }
      >();
      for (const [path, detail] of Object.entries(intentVariants)) {
        if (detail.variant) uploadPathsByVariant.set(detail.variant, { path, detail });
      }
      const uploadPlans = variantPlan(role);
      if (
        uploadPathsByVariant.size !== uploadPlans.length ||
        uploadPlans.some((plan) => {
          const prepared = uploadPathsByVariant.get(plan.name);
          return !prepared || !Number.isInteger(prepared.detail.maxBytes);
        })
      ) {
        throw new Error('The secure photo upload returned an invalid image plan.');
      }

      const variants: { path: string; variant: string }[] = [];
      for (const plan of uploadPlans) {
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
        const plannedUpload = uploadPathsByVariant.get(plan.name);
        if (!plannedUpload)
          throw new Error('The secure photo upload returned an invalid image plan.');
        if (bytes.byteLength > (plannedUpload.detail.maxBytes ?? 0)) {
          throw new Error(`The ${plan.name} photo is larger than allowed. Choose a smaller image.`);
        }
        const { error: uploadError } = await supabase.storage
          .from('media-staging')
          .upload(plannedUpload.path, bytes.buffer as ArrayBuffer, {
            cacheControl: '3600',
            contentType: 'image/webp',
            upsert: false,
          });
        if (uploadError) throw uploadError;
        variants.push({ path: plannedUpload.path, variant: plan.name });
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
      return true;
    } catch (caught) {
      if (stagingIntentCreated) {
        const { error: releaseError } = await supabase.functions.invoke(
          'business-media-upload-intent',
          {
            body: {
              action: 'release',
              businessId: business.id,
              assetGroupId,
              role,
              targetId: eventId,
            },
          },
        );
        if (releaseError) {
          console.warn('Temporary image cleanup will be retried by the media worker.', {
            code: releaseError.name,
          });
        }
      }
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
      title: 'Parish Pass staff invite',
      message: `Join ${business?.name ?? 'this business'} on Parish Pass as a staff member:\n${latestInviteLink.url}`,
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
      message: `Find ${business.name} on Parish Pass:\n${url}`,
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
      ['percent_discount', 'item_discount'].includes(checkoutRewardType) &&
      (!Number.isInteger(rewardPercent) || rewardPercent < 1 || rewardPercent > 100)
    ) {
      setError('Checkout discount must be a whole percentage from 1 to 100.');
      return;
    }
    if (
      checkoutRewardEnabled &&
      checkoutRewardType !== 'percent_discount' &&
      !checkoutRewardItems.length
    ) {
      setError('Choose at least one eligible menu item for this checkout reward.');
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
      checkout_reward_variation_id: null,
      checkout_reward_enabled: checkoutRewardEnabled,
      checkout_reward_items: checkoutRewardItems,
      checkout_reward_percent: ['percent_discount', 'item_discount'].includes(checkoutRewardType)
        ? Number(checkoutRewardPercent)
        : null,
    };
    const result = reward
      ? await supabase
          .from('loyalty_programs')
          .update(payload)
          .eq('id', reward.id)
          .select(
            'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_enabled, checkout_reward_items, checkout_reward_percent, terms, is_active',
          )
          .single()
      : await supabase
          .from('loyalty_programs')
          .insert(payload)
          .select(
            'id, name, reward_description, program_type, stamps_required, points_per_dollar, points_required, checkout_reward_type, checkout_reward_variation_id, checkout_reward_enabled, checkout_reward_items, checkout_reward_percent, terms, is_active',
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
      enabled={!businessViewerOpen && !mapInteractionActive && !identityEditorOpen}
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
            refreshControl={
              <RefreshControl
                refreshing={pullRefresh.refreshing}
                onRefresh={pullRefresh.onRefresh}
              />
            }
          >
            <BusinessFeatureGate businessId={businessId} operation={section ? workspaceFeatureOperation[section] : undefined}
              recovery={<AppButton label="Back to business overview" variant="secondary" onPress={leaveEditor} />}>
            {section === 'offerings' ? (
              <MenuSetupHeader
                services={!isMenuBusiness}
                businessName={business?.name ?? ''}
                canEdit={canEdit}
                disabled={saving || photoUploading}
                onBack={leaveEditor}
                onAdd={() => {
                  setError(null);
                  setNewOfferingSectionId(newOfferingSectionId || offerSections[0]?.id || '');
                  setMenuEditorPanel('item');
                }}
              />
            ) : section ? (
              <BusinessEditorHeader
                title={
                  section === 'events' && newEventOpen
                    ? 'Create event'
                    : section === 'events' && editingEventId
                      ? 'Edit event'
                      : sectionTitle
                }
                subtitle={sectionDescriptions[section]}
                onBack={
                  section === 'events' && (selectedEvent || newEventOpen)
                    ? closeEventView
                    : leaveEditor
                }
                backLabel={
                  section === 'events' && (selectedEvent || newEventOpen)
                    ? 'Back to events'
                    : 'Back to business overview'
                }
                disabled={saving || photoUploading}
              />
            ) : (
              <View style={{ gap: 12 }}>
                <ParishBusinessBrand />
                <View style={styles.compactWorkspaceHeader}>
                  <BackPill label="All businesses" onPress={onBack} />
                  <ThemedText themeColor="textSecondary" type="small">
                    {canEdit ? 'Owner access' : 'Staff access'}
                  </ThemedText>
                </View>
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
              <View style={{ gap: Spacing.four }}>
                <BusinessHub
                  showBrand={false}
                  accent={workspaceAccent}
                  attention={attention}
                  setupItems={setupItems}
                  business={business}
                  canEdit={canEdit}
                  colors={colors}
                  logoUri={logoUri}
                  onOpen={handleWorkspaceAction}
                  onRequests={
                    business.business_type === 'services'
                      ? () =>
                          router.push({
                            pathname: '/service-requests',
                            params: { businessId: business.id },
                          } as never)
                      : undefined
                  }
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

                {canEdit && business.status === 'active' && (
                  <AppButton
                    label="Customer reviews"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: '/business-reviews',
                        params: { businessId: business.id },
                      } as never)
                    }
                  />
                )}
                {canEdit && business.status === 'active' && (
                  <BusinessFeatureGate businessId={business.id} operation="view_analytics">
                    <BusinessAnalyticsCard businessId={business.id} />
                  </BusinessFeatureGate>
                )}
              </View>
            )}

            {section && (
              <>
                {section === 'preview' && business && (
                  <View style={styles.cardList}>
                    {canEdit && (
                      <View style={styles.shareCard}>
                        <View style={styles.shareCardCopy}>
                          <ThemedText type="smallBold">QR poster</ThemedText>
                          <ThemedText themeColor="textSecondary" type="small">
                            Customers can scan the code to open your business page.
                          </ThemedText>
                        </View>
                        <SecondaryButton
                          label="Print QR poster"
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
                      <FormSectionDescription description="Print a code customers can scan to open your page." />
                      <PrimaryButton
                        loading={saving}
                        disabled={false}
                        label="Open QR poster"
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
                    <FormSectionDescription description="Share the page link from your phone." />
                    <PrimaryButton
                      loading={saving}
                      disabled={false}
                      label="Share page"
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
                        <View style={{ gap: 16 }}>
                          <WorkspaceDetailsOverview
                            title="Profile and branding"
                            rows={[
                              { label: 'Business name', value: business.name },
                              {
                                label: 'Business type',
                                value: business.business_type.replaceAll('_', ' '),
                              },
                              { label: 'Description', value: business.description },
                              {
                                label: 'Brand colors',
                                value: `${business.primary_color} · ${business.accent_color}`,
                              },
                            ]}
                            {...(canEdit
                              ? {
                                  onEdit: () => {
                                    setError(null);
                                    setIdentityEditorOpen(true);
                                  },
                                }
                              : {})}
                          />
                          <MerchantSheet
                            visible={identityEditorOpen && canEdit}
                            title="Edit profile and branding"
                            onClose={closeIdentityEditor}
                            blocked={saving || photoUploading}
                          >
                            {error && <StateNotice kind="error" message={error} />}
                            {notice && (
                              <ThemedText type="small" themeColor="textSecondary">
                                {notice}
                              </ThemedText>
                            )}

                            <FormSectionDescription description="The business identity customers recognize across Parish Pass." />
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
                            <BrandColorPicker
                              label="Primary brand color"
                              value={primaryColor}
                              onChange={setPrimaryColor}
                              disabled={!canEdit}
                            />
                            <BrandColorPicker
                              label="Accent brand color"
                              value={accentColor}
                              onChange={setAccentColor}
                              disabled={!canEdit}
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
                          </MerchantSheet>
                        </View>
                      )}
                      {section === 'contact' && (
                        <View style={{ gap: 16 }}>
                          <WorkspaceDetailsOverview
                            title="Contact information"
                            rows={[
                              { label: 'Phone', value: business.phone ?? '' },
                              { label: 'Email', value: business.email ?? '' },
                              { label: 'Website', value: business.website_url ?? '' },
                            ]}
                            {...(canEdit
                              ? {
                                  onEdit: () => {
                                    setError(null);
                                    setIdentityEditorOpen(true);
                                  },
                                }
                              : {})}
                          />
                          <MerchantSheet
                            visible={identityEditorOpen && canEdit}
                            title="Edit contact information"
                            onClose={closeIdentityEditor}
                            blocked={saving || photoUploading}
                          >
                            {error && <StateNotice kind="error" message={error} />}
                            {notice && (
                              <ThemedText type="small" themeColor="textSecondary">
                                {notice}
                              </ThemedText>
                            )}

                            <FormSectionDescription description="Give customers a reliable way to reach you." />
                            <Field
                              label="Phone"
                              {...inputPresets.phone}
                              value={phone}
                              onChangeText={setPhone}
                              colors={colors}
                              editable={canEdit}
                              keyboardType="phone-pad"
                            />
                            <Field
                              label="Email"
                              {...inputPresets.email}
                              value={email}
                              onChangeText={setEmail}
                              colors={colors}
                              editable={canEdit}
                              keyboardType="email-address"
                              autoCapitalize="none"
                            />
                            <Field
                              label="Website"
                              {...inputPresets.url}
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
                          </MerchantSheet>
                        </View>
                      )}
                      {section === 'location' && (
                        <View style={{ gap: 16 }}>
                          <WorkspaceDetailsOverview
                            title="Service area"
                            rows={[
                              {
                                label: 'Coverage',
                                value:
                                  serviceAreaTypes.find(
                                    (item) => item.value === business.service_area_type,
                                  )?.label ?? business.service_area_type,
                              },
                              {
                                label: 'Address',
                                value: [
                                  business.address_line_1,
                                  business.city,
                                  business.region_code,
                                  business.postal_code,
                                ]
                                  .filter(Boolean)
                                  .join(', '),
                              },
                              ...(business.service_area_type === 'cities'
                                ? [
                                    {
                                      label: 'Cities',
                                      value: business.service_area_regions.join(', '),
                                    },
                                  ]
                                : []),
                              ...(business.service_area_type === 'radius'
                                ? [
                                    {
                                      label: 'Radius',
                                      value: `${business.service_radius_miles ?? 25} miles`,
                                    },
                                  ]
                                : []),
                              ...(business.service_area_type === 'custom'
                                ? [
                                    {
                                      label: 'Coverage description',
                                      value: business.service_area ?? '',
                                    },
                                  ]
                                : []),
                            ]}
                            {...(canEdit
                              ? {
                                  onEdit: () => {
                                    setError(null);
                                    setIdentityEditorOpen(true);
                                  },
                                }
                              : {})}
                          />
                          <MerchantSheet
                            visible={identityEditorOpen && canEdit}
                            title="Edit service area"
                            onClose={closeIdentityEditor}
                            blocked={saving || photoUploading}
                          >
                            {error && <StateNotice kind="error" message={error} />}
                            {notice && (
                              <ThemedText type="small" themeColor="textSecondary">
                                {notice}
                              </ThemedText>
                            )}

                            <FormSectionDescription description="Tell customers where you work. Choose one clear coverage option." />
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
                              (serviceAreaType === 'at_location' ||
                                serviceAreaType === 'radius') && (
                                <Field
                                  label="Street address (required)"
                                  {...inputPresets.street}
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
                                {...inputPresets.city}
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
                              (serviceAreaType === 'at_location' ||
                                serviceAreaType === 'radius') && (
                                <Field
                                  label="Postal code (optional)"
                                  {...inputPresets.postal}
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
                          </MerchantSheet>
                        </View>
                      )}
                      {section === 'mobile-location' && business.business_type === 'mobile' && (
                        <View style={{ gap: 16 }}>
                          {!stopEditorOpen &&
                            !locationStops.some((stop) => stop.id === selectedStopId) && (
                              <MobileStopInbox
                                key={business.id}
                                stops={locationStops}
                                now={clockNow}
                                canEdit={canEdit}
                                onCreate={() => {
                                  setError(null);
                                  setNotice(null);
                                  setStopEditorOpen(true);
                                }}
                                onSelect={setSelectedStopId}
                              />
                            )}
                          {(stopEditorOpen ||
                            locationStops.some((stop) => stop.id === selectedStopId)) && (
                            <BackPill
                              label="Back to stops"
                              disabled={saving || stopGeocoding}
                              onPress={() =>
                                stopEditorOpen ? closeStopEditor() : setSelectedStopId(null)
                              }
                            />
                          )}
                          {stopEditorOpen && (
                            <MerchantHeading
                              title="Add scheduled stop"
                              subtitle="Save a draft, then review and publish it."
                            />
                          )}
                          {locationStops
                            .filter((stop) => stop.id === selectedStopId)
                            .map((stop) => (
                              <View key={stop.id} style={styles.locationStopCard}>
                                <FlowSection title="Scheduled stop">
                                  <View style={styles.rowText}>
                                    <ThemedText type="smallBold">{stop.title}</ThemedText>
                                    <ThemedText themeColor="textSecondary" type="small">
                                      {mobileStopTime(stop)}
                                    </ThemedText>
                                    <ThemedText themeColor="textSecondary" type="small">
                                      {stop.address_text || 'Map pin set'}
                                    </ThemedText>
                                  </View>
                                </FlowSection>
                                <View style={styles.inlineActions}>
                                  <LabeledSwitch
                                    label={stop.is_published ? 'Published' : 'Draft'}
                                    disabled={!canEdit}
                                    value={stop.is_published}
                                    onValueChange={(value) => void toggleLocationStop(stop, value)}
                                  />
                                  {canEdit && (
                                    <MerchantButton
                                      label="Remove stop"
                                      destructive
                                      onPress={() => removeLocationStop(stop)}
                                    />
                                  )}
                                </View>
                              </View>
                            ))}
                          {canEdit && stopEditorOpen && (
                            <>
                              <FlowSection title="Where you’ll be">
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
                              </FlowSection>
                              <SecondaryButton
                                disabled={stopGeocoding || !newStopAddress.trim()}
                                label={stopGeocoding ? 'Placing address…' : 'Place address on map'}
                                onPress={() => void placeAddressOnMap()}
                              />
                              <ThemedText themeColor="textSecondary" type="small">
                                An address is optional when you drop a pin directly on the map.
                              </ThemedText>
                              <FlowSection title="Date & service times">
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
                                    value={
                                      newStopStart ? formatStopTimeForDisplay(newStopStart) : ''
                                    }
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
                              </FlowSection>
                              <FlowSection title="Confirm the map pin">
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
                              </FlowSection>
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
                        </View>
                      )}
                      {section === 'mobile-location' && stopPickerTarget && (
                        <BusinessWorkspaceSheet
                          visible
                          onClose={() => setStopPickerTarget(null)}
                          closeAccessibilityLabel="Close date and time picker"
                          title={
                            stopPickerTarget === 'date'
                              ? 'Choose a date'
                              : stopPickerTarget === 'start'
                                ? 'Choose a start time'
                                : 'Choose an end time'
                          }
                          description={
                            stopPickerTarget === 'date'
                              ? 'Use the calendar to schedule this stop.'
                              : 'Use the native time picker for the stop hours.'
                          }
                          backgroundColor={colors.backgroundElement}
                          headerCopyGap={Spacing.one}
                          maxHeight="78%"
                        >
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
                        </BusinessWorkspaceSheet>
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
                {section === 'appointments' &&
                  canEdit &&
                  business?.business_type === 'services' && (
                    <AppointmentWorkspace
                      businessId={businessId}
                      businessTimezone={business.timezone}
                      onDirtyChange={setAppointmentsDirty}
                    />
                  )}
                {section === 'appointments' &&
                  canEdit &&
                  business &&
                  business.business_type !== 'services' && (
                    <View style={{ gap: 16 }}>
                      <StateNotice message="Appointments are available for service businesses. This business does not use appointment booking." />
                      <AppButton
                        label="Back to business overview"
                        variant="secondary"
                        onPress={leaveEditor}
                      />
                    </View>
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
                  <View style={{ gap: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {[
                        { label: isMenuBusiness ? 'Items' : 'Services', value: offerings.length },
                        { label: 'Visible', value: visibleOfferingCount },
                        { label: 'Featured', value: featuredOfferingCount },
                      ].map((stat) => (
                        <View
                          key={stat.label}
                          style={{
                            flex: 1,
                            padding: 14,
                            gap: 4,
                            borderRadius: 14,
                            backgroundColor: colors.backgroundElement,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <ThemedText type="subtitle">{stat.value}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {stat.label}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                    <>
                      <MenuSetupSearch
                        services={!isMenuBusiness}
                        value={inventorySearch}
                        onChange={setInventorySearch}
                        canEdit={canEdit}
                        onTools={() => setInventoryTools(true)}
                      />
                      <MenuCategoryActions
                        canEdit={canEdit}
                        disabled={saving || photoUploading}
                        onAdd={() => {
                          setError(null);
                          setMenuEditorPanel('section');
                        }}
                      />
                      <MenuSetupTabs
                        value={inventoryCategory}
                        onChange={setInventoryCategory}
                        options={[
                          { value: 'all', label: 'All categories' },
                          ...offerSections.map((g) => ({ value: g.id, label: g.name })),
                        ]}
                      />
                      <MenuSetupTabs
                        underline
                        value={inventoryStatus}
                        onChange={setInventoryStatus}
                        options={[
                          { value: 'all', label: 'All items' },
                          { value: 'available', label: 'Available' },
                          { value: 'sold-out', label: isMenuBusiness ? 'Sold out' : 'Unavailable' },
                          { value: 'hidden', label: 'Hidden' },
                        ]}
                      />
                    </>
                    {inventoryReorder && (
                      <View style={{ gap: 8 }}>
                        <ThemedText type="small">
                          Reorder mode · arrows change the public menu order.
                        </ThemedText>
                        <MerchantButton
                          label="Done reordering"
                          secondary
                          onPress={() => setInventoryReorder(false)}
                        />
                      </View>
                    )}
                    {offerSections
                      .filter((g) => inventoryCategory === 'all' || inventoryCategory === g.id)
                      .map((group, groupIndex) => {
                        const groupItems = offerings.filter((item) => item.section_id === group.id);
                        const matched = groupItems.filter(
                          (item) =>
                            menuStockMatches(item, inventoryStatus) &&
                            [item.name, item.description]
                              .join(' ')
                              .toLocaleLowerCase()
                              .includes(inventorySearch.trim().toLocaleLowerCase()),
                        );
                        if (
                          !matched.length &&
                          (inventorySearch.trim() || inventoryStatus !== 'all')
                        )
                          return null;
                        return (
                          <View key={group.id} style={{ gap: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <ThemedText
                                type="smallBold"
                                style={{ color: inventoryColors.text, flex: 1 }}
                              >
                                {group.name} · {matched.length}
                              </ThemedText>
                              {canEdit && inventoryReorder && (
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  <MerchantButton
                                    label="↑"
                                    secondary
                                    disabled={saving || offerSections.indexOf(group) === 0}
                                    onPress={() => void moveOfferingSection(group, 'up')}
                                    accessibilityLabel={`Move ${group.name} up`}
                                  />
                                  <MerchantButton
                                    label="↓"
                                    secondary
                                    disabled={
                                      saving ||
                                      offerSections.indexOf(group) === offerSections.length - 1
                                    }
                                    onPress={() => void moveOfferingSection(group, 'down')}
                                    accessibilityLabel={`Move ${group.name} down`}
                                  />
                                </View>
                              )}
                            </View>
                            <View style={{ gap: 11 }}>
                              {matched.map((item) => (
                                <View key={item.id}>
                                  <MenuSetupItem
                                    services={!isMenuBusiness}
                                    name={item.name}
                                    category={group.name}
                                    price={formatPrice(item)}
                                    photo={offeringImageUrl(item)}
                                    visible={item.is_visible}
                                    available={item.is_available}
                                    featured={item.is_featured}
                                    disabled={!canEdit || saving || photoUploading}
                                    onPress={() => beginOfferingEdit(item)}
                                  />

                                  {canEdit && inventoryReorder && (
                                    <View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
                                      <MerchantButton
                                        label="Move up"
                                        secondary
                                        disabled={saving || groupItems.indexOf(item) === 0}
                                        onPress={() => void moveOfferingItem(item, 'up')}
                                      />
                                      <MerchantButton
                                        label="Move down"
                                        secondary
                                        disabled={
                                          saving ||
                                          groupItems.indexOf(item) === groupItems.length - 1
                                        }
                                        onPress={() => void moveOfferingItem(item, 'down')}
                                      />
                                    </View>
                                  )}
                                </View>
                              ))}
                              {!matched.length && (
                                <ThemedText
                                  type="small"
                                  style={{ padding: 16, color: inventoryColors.secondary }}
                                >
                                  No items in this category.
                                </ThemedText>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    {!offerings.some(
                      (item) =>
                        (inventoryCategory === 'all' || item.section_id === inventoryCategory) &&
                        menuStockMatches(item, inventoryStatus) &&
                        [item.name, item.description]
                          .join(' ')
                          .toLocaleLowerCase()
                          .includes(inventorySearch.trim().toLocaleLowerCase()),
                    ) && (
                      <EmptyState
                        title={offerings.length ? 'No matching items' : 'Your inventory is empty'}
                        message={
                          offerings.length
                            ? 'Try another category or search.'
                            : 'Add a category, then add your first item.'
                        }
                      />
                    )}
                    <MerchantSheet
                      visible={inventoryTools}
                      title="Inventory tools"
                      onClose={() => setInventoryTools(false)}
                    >
                      <MerchantButton
                        label="Add category"
                        secondary
                        onPress={() => {
                          setInventoryTools(false);
                          setError(null);
                          setMenuEditorPanel('section');
                        }}
                      />
                      <MerchantButton
                        label="Reorder categories and items"
                        secondary
                        onPress={() => {
                          setInventoryTools(false);
                          setInventorySearch('');
                          setInventoryCategory('all');
                          setInventoryStatus('all');
                          setInventoryReorder(true);
                        }}
                      />
                      {isMenuBusiness && (
                        <>
                          <ThemedText type="small">
                            Import adds new entries. Repeating a file can create duplicates. Photos
                            and Square modifiers are not copied.
                          </ThemedText>
                          <MerchantButton
                            label="Import menu file"
                            secondary
                            onPress={() => {
                              setInventoryTools(false);
                              void pickMenuImport();
                            }}
                          />
                        </>
                      )}
                    </MerchantSheet>
                    <BusinessWorkspaceSheet
                      visible={menuImportOpen}
                      onClose={() => setMenuImportOpen(false)}
                      closeAccessibilityLabel="Close menu import"
                      title="Import menu"
                      description={
                        menuImportFileName || 'Import a Square Dashboard CSV or menu file'
                      }
                      closeLabel="Close"
                      backgroundColor={colors.backgroundElement}
                      headerCopyGap={Spacing.one}
                      maxHeight="78%"
                    >
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
                          <ThemedText themeColor="textSecondary" type="small">
                            Square modifiers and photos are not copied. Review prices and
                            availability in Parish Pass before accepting online orders.
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
                          <FlowSection title="Import from Square" collapsible>
                            <ThemedText themeColor="textSecondary">
                              In Square Dashboard, go to Items & services → Items → Item library →
                              Actions → Export Library → CSV. Then choose that CSV here. Parish Pass
                              imports item names, categories, descriptions, prices, and variations.
                              Review modifiers, images, and location availability after import.
                            </ThemedText>
                          </FlowSection>
                          <FlowSection title="Prepare a CSV or JSON file" collapsible>
                            <ThemedText themeColor="textSecondary">
                              Supported CSV columns: category, name, description, price, price_text,
                              featured, visible. JSON accepts the same fields. PDFs and spreadsheets
                              are reference files only. Variable-price items need a fixed price
                              before they can be ordered online.
                            </ThemedText>
                          </FlowSection>
                          <SecondaryButton
                            label="Choose another file"
                            onPress={() => void pickMenuImport()}
                          />
                        </>
                      )}
                    </BusinessWorkspaceSheet>
                    <MerchantSheet
                      visible={!!editingOffering && canEdit}
                      title={isMenuBusiness ? 'Edit menu item' : 'Edit service'}
                      blocked={saving || photoUploading}
                      onClose={closeOfferingEditor}
                      footer={
                        editingOffering ? (
                          <MerchantButton
                            brand
                            label="Save changes"
                            loading={saving}
                            disabled={photoUploading || !editOfferingName.trim()}
                            onPress={() => void saveOfferingEdit(editingOffering)}
                          />
                        ) : undefined
                      }
                    >
                      {error && <Notice kind="error" message={error} />}
                      {editingOffering && (
                        <>
                          {isMenuBusiness && (
                            <View style={styles.menuPhotoField}>
                              <View style={styles.menuPhotoPreview}>
                                {offeringImageUrl(editingOffering) ? (
                                  <Image
                                    accessibilityLabel={`${editingOffering.name} image preview`}
                                    contentFit="cover"
                                    source={{ uri: offeringImageUrl(editingOffering)! }}
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
                                      : editingOffering.media_asset_id
                                        ? 'Replace image'
                                        : 'Add image'
                                  }
                                  onPress={() =>
                                    void pickAndUploadPhoto(
                                      'offering',
                                      editingOffering.id,
                                      editingOffering.name,
                                    )
                                  }
                                />
                              </View>
                            </View>
                          )}
                          {isMenuBusiness && (
                            <MenuSetupTabs
                              underline
                              value={menuItemTab}
                              onChange={setMenuItemTab}
                              options={[
                                { value: 'details', label: 'Details' },
                                { value: 'options', label: 'Options' },
                                { value: 'availability', label: 'Availability' },
                              ]}
                            />
                          )}
                          {isMenuBusiness && menuItemTab === 'options' && (
                            <View style={{ gap: 16 }}>
                              <ThemedText type="smallBold">Online order options</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                Sizes, extras and required choices are managed in your connected
                                ordering catalog. Save any item edits before opening ordering
                                settings.
                              </ThemedText>
                              <MerchantButton
                                brand
                                label="Manage ordering options"
                                disabled={saving || photoUploading || offeringEditorIsDirty()}
                                onPress={() => {
                                  setEditingOfferingId(null);
                                  openEditor('ordering');
                                }}
                              />
                            </View>
                          )}
                          {(!isMenuBusiness || menuItemTab === 'details') && (
                            <View style={styles.editForm}>
                              <ChoicePicker
                                label="Category"
                                value={editOfferingSectionId}
                                options={offerSections.map((g) => ({ value: g.id, label: g.name }))}
                                onChange={setEditOfferingSectionId}
                                disabled={saving || photoUploading}
                              />
                              <FlowSection title="Item details">
                                <Field
                                  editable={!saving && !photoUploading}
                                  label="Name (required)"
                                  value={editOfferingName}
                                  onChangeText={setEditOfferingName}
                                  colors={colors}
                                />
                                <Field
                                  editable={!saving && !photoUploading}
                                  label="Description (optional)"
                                  value={editOfferingDescription}
                                  onChangeText={setEditOfferingDescription}
                                  colors={colors}
                                  multiline
                                  style={styles.multiline}
                                />
                              </FlowSection>
                              <Field
                                editable={!saving && !photoUploading}
                                label="Price (optional)"
                                value={editOfferingPrice}
                                onChangeText={setEditOfferingPrice}
                                colors={colors}
                                keyboardType="decimal-pad"
                                placeholder="$25.00"
                              />
                              {isMenuBusiness && (
                                <Field
                                  editable={!saving && !photoUploading}
                                  label="Menu price label (optional)"
                                  value={editOfferingPriceText}
                                  onChangeText={setEditOfferingPriceText}
                                  colors={colors}
                                  placeholder="Market price, From $8, or 2 for $10"
                                />
                              )}
                            </View>
                          )}
                          {(!isMenuBusiness || menuItemTab === 'availability') && (
                            <View style={{ gap: 12 }}>
                              <ThemedText type="smallBold">Availability & display</ThemedText>
                              <LabeledSwitch
                                label="Available"
                                disabled={saving || photoUploading}
                                value={editingOffering.is_available}
                                onValueChange={(v) =>
                                  void updateOffering(editingOffering, { is_available: v })
                                }
                              />
                              <LabeledSwitch
                                label="Visible on public page"
                                disabled={saving || photoUploading}
                                value={editingOffering.is_visible}
                                onValueChange={(v) =>
                                  void updateOffering(editingOffering, { is_visible: v })
                                }
                              />
                              {isMenuBusiness && (
                                <LabeledSwitch
                                  label="Featured"
                                  disabled={saving || photoUploading}
                                  value={editingOffering.is_featured}
                                  onValueChange={(v) =>
                                    void updateOffering(editingOffering, { is_featured: v })
                                  }
                                />
                              )}
                              <ThemedText type="small" themeColor="textSecondary">
                                Availability and display changes save immediately.
                              </ThemedText>
                              <MerchantButton
                                label="Archive item"
                                secondary
                                disabled={saving || photoUploading}
                                onPress={() =>
                                  Alert.alert(
                                    'Archive this item?',
                                    editingOffering.name +
                                      ' will be removed from your public offerings. Existing orders are retained.',
                                    [
                                      { text: 'Keep item', style: 'cancel' },
                                      {
                                        text: 'Archive',
                                        style: 'destructive',
                                        onPress: () => void archiveOffering(editingOffering),
                                      },
                                    ],
                                  )
                                }
                              />
                            </View>
                          )}
                        </>
                      )}
                    </MerchantSheet>
                    <MerchantSheet
                      visible={menuEditorPanel === 'item' && canEdit}
                      title={`Add ${offeringTerminology.item}`}
                      blocked={saving || photoUploading || choosingOfferingImage}
                      footer={
                        <PrimaryButton
                          loading={saving || photoUploading}
                          disabled={
                            saving ||
                            photoUploading ||
                            choosingOfferingImage ||
                            !newOfferingName.trim() ||
                            !newOfferingSectionId
                          }
                          label={`Add ${offeringTerminology.item}`}
                          onPress={() => void createOffering()}
                        />
                      }
                      onClose={() => setMenuEditorPanel(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {!offerSections.length && (
                        <>
                          <ThemedText type="small">
                            Create a category before adding your first item.
                          </ThemedText>
                          <MerchantButton
                            label="Create category"
                            secondary
                            onPress={() => setMenuEditorPanel('section')}
                          />
                        </>
                      )}
                      <View style={styles.menuEditorForm}>
                        <FlowSection
                          title="Photo"
                          description="Optional. Help customers recognize this item."
                        >
                          {newOfferingImage ? (
                            <>
                              <Image
                                source={{ uri: newOfferingImage.uri }}
                                contentFit="cover"
                                style={{ width: '100%', aspectRatio: 1.8, borderRadius: 12 }}
                                accessibilityLabel="Selected item photo"
                              />
                              <View style={{ flexDirection: 'row', gap: 12 }}>
                                <MerchantButton
                                  label="Change photo"
                                  secondary
                                  disabled={choosingOfferingImage || saving || photoUploading}
                                  onPress={() => void chooseOfferingImage()}
                                />
                                <MerchantButton
                                  label="Remove"
                                  secondary
                                  disabled={choosingOfferingImage || saving || photoUploading}
                                  onPress={() => setNewOfferingImage(null)}
                                />
                              </View>
                            </>
                          ) : (
                            <MerchantButton
                              label={choosingOfferingImage ? 'Opening photos…' : 'Add photo'}
                              secondary
                              disabled={choosingOfferingImage || saving || photoUploading}
                              onPress={() => void chooseOfferingImage()}
                            />
                          )}
                        </FlowSection>
                        <FlowSection title="Category">
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
                        </FlowSection>
                        <FlowSection title="Item details">
                          <Field
                            editable={!saving && !photoUploading}
                            label="Name (required)"
                            value={newOfferingName}
                            onChangeText={setNewOfferingName}
                            colors={colors}
                          />
                          <Field
                            editable={!saving && !photoUploading}
                            label="Description (optional)"
                            value={newOfferingDescription}
                            onChangeText={setNewOfferingDescription}
                            colors={colors}
                            multiline
                            style={styles.multiline}
                          />
                        </FlowSection>
                        <FlowSection
                          title="Pricing"
                          description="Leave blank for contact-for-price items."
                        >
                          <Field
                            editable={!saving && !photoUploading}
                            label="Price (optional)"
                            value={newOfferingPrice}
                            onChangeText={setNewOfferingPrice}
                            colors={colors}
                            keyboardType="decimal-pad"
                            placeholder="$25.00"
                          />
                          {isMenuBusiness && (
                            <Field
                              editable={!saving && !photoUploading}
                              label="Menu price label (optional)"
                              value={newOfferingPriceText}
                              onChangeText={setNewOfferingPriceText}
                              colors={colors}
                              placeholder="Market price"
                              hint="Use a label such as From $8 or 2 for $10 instead of a fixed price."
                            />
                          )}
                        </FlowSection>
                      </View>
                    </MerchantSheet>
                    <MerchantSheet
                      visible={menuEditorPanel === 'section' && canEdit}
                      title="Add category"
                      blocked={saving}
                      onClose={() => setMenuEditorPanel(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
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
                          editable={!saving && !photoUploading}
                          label={`${offeringTerminology.section.replace(/^./, (letter) => letter.toUpperCase())} name (required)`}
                          value={newSectionName}
                          onChangeText={setNewSectionName}
                          colors={colors}
                          returnKeyType="next"
                        />
                        <Field
                          editable={!saving && !photoUploading}
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
                    </MerchantSheet>
                  </View>
                )}

                {section === 'events' && (
                  <View style={styles.cardList}>
                    {!selectedEvent && !newEventOpen && (
                      <EventInbox
                        events={events.map((item) => ({
                          id: item.id,
                          title: item.title,
                          startsAt: item.starts_at,
                          timezone: business?.timezone || 'America/Chicago',
                          photo: (() => {
                            const a = firstMediaAsset(item.media_assets);
                            return a?.status === 'ready' ? storagePublicUrl(a.storage_path) : null;
                          })(),
                          published: item.is_published,
                          publishAt: item.publish_at,
                          attending: eventRsvpCounts[item.id]?.going ?? 0,
                          waitlisted: eventRsvpCounts[item.id]?.waitlist ?? 0,
                        }))}
                        disabled={saving || photoUploading}
                        onOpen={setSelectedEventId}
                        {...(canEdit ? { onCreate: () => setNewEventOpen(true) } : {})}
                      />
                    )}
                    {selectedEvent &&
                      (events.length === 0 ? (
                        <EmptyState
                          title="No events yet"
                          message="Add a date, location and details to help customers plan a visit."
                        />
                      ) : (
                        events
                          .filter((item) => item.id === selectedEventId)
                          .map((item) => (
                            <View
                              key={item.id}
                              style={
                                editingEventId === item.id ? { gap: 20 } : styles.settingRowCard
                              }
                            >
                              {editingEventId === item.id ? (
                                <View style={styles.editForm}>
                                  <FlowSection title="The essentials">
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
                                  </FlowSection>
                                  <FlowSection title="When & where">
                                    <View style={styles.stackFields}>
                                      <StopPickerField
                                        label="Date (required)"
                                        value={
                                          editEventDate
                                            ? formatStopDateForDisplay(editEventDate)
                                            : ''
                                        }
                                        placeholder="Choose a date"
                                        colors={colors}
                                        onPress={() => setEventPickerTarget('edit-date')}
                                      />
                                      <StopPickerField
                                        label="Start time (required)"
                                        value={
                                          editEventTime
                                            ? formatStopTimeForDisplay(editEventTime)
                                            : ''
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
                                    <Field
                                      label="RSVP capacity (optional)"
                                      value={editEventRsvpLimit}
                                      onChangeText={setEditEventRsvpLimit}
                                      colors={colors}
                                      keyboardType="number-pad"
                                      placeholder="No limit"
                                      hint="Leave blank for unlimited guests. Enter 0 for waitlist only."
                                    />
                                  </FlowSection>
                                  <ThemedText themeColor="textSecondary" type="small">
                                    {eventRsvpCounts[item.id]?.going ?? 0} people attending ·{' '}
                                    {eventRsvpCounts[item.id]?.waitlist ?? 0} groups waitlisted
                                  </ThemedText>
                                  <FlowSection
                                    title="Photos"
                                    description="Cover image and gallery"
                                    collapsible
                                  >
                                    <ThemedText type="smallBold">Event photos</ThemedText>
                                    <ThemedText themeColor="textSecondary" type="small">
                                      Add one cover image and up to {mediaLimits.maxGalleryImages}{' '}
                                      gallery images. Images are optimized before upload.
                                    </ThemedText>
                                    {(() => {
                                      const cover = firstMediaAsset(item.media_assets);
                                      return cover?.status === 'ready' ? (
                                        <Image
                                          accessibilityLabel={
                                            cover.alt_text ?? `${item.title} cover`
                                          }
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
                                        label={
                                          photoUploading ? 'Uploading…' : 'Add / replace cover'
                                        }
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
                                                    {photo.caption ||
                                                      asset?.alt_text ||
                                                      'No caption'}
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
                                                      <ThemedText type="smallBold">
                                                        Caption
                                                      </ThemedText>
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
                                          <ThemedText type="smallBold">
                                            Edit gallery caption
                                          </ThemedText>
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
                                  </FlowSection>
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
                                      onPress={() => closeEventView(false)}
                                    />
                                  </View>
                                </View>
                              ) : (
                                <ManagedEventOverview
                                  title={item.title}
                                  startsAt={item.starts_at}
                                  timezone={business?.timezone || 'America/Chicago'}
                                  location={item.address_text}
                                  photo={(() => {
                                    const a = firstMediaAsset(item.media_assets);
                                    return a?.status === 'ready'
                                      ? storagePublicUrl(a.storage_path)
                                      : null;
                                  })()}
                                  published={item.is_published}
                                  publishAt={item.publish_at}
                                  attending={eventRsvpCounts[item.id]?.going ?? 0}
                                  capacity={item.rsvp_limit}
                                  waitlisted={eventRsvpCounts[item.id]?.waitlist ?? 0}
                                  canEdit={canEdit}
                                  disabled={saving || photoUploading}
                                  publishingControl={
                                    <LabeledSwitch
                                      label="Visible to customers"
                                      disabled={!canEdit || saving || photoUploading}
                                      value={item.is_published}
                                      onValueChange={(value) => void updateEvent(item, value)}
                                    />
                                  }
                                  onEdit={() => beginEventEdit(item)}
                                  onArchive={() => archiveEvent(item)}
                                  onAttendees={() =>
                                    router.push({
                                      pathname: '/event-attendees' as never,
                                      params: { eventId: item.id },
                                    } as never)
                                  }
                                />
                              )}
                            </View>
                          ))
                      ))}
                    {canEdit && newEventOpen && (
                      <View style={{ gap: 20 }}>
                        <ThemedText themeColor="textSecondary" type="small">
                          Required fields are labeled. Choose whether this saves as a draft or
                          publishes now.
                        </ThemedText>
                        <ThemedText themeColor="textSecondary" type="small">
                          After creating the event, tap Edit to add its cover and gallery photos.
                        </ThemedText>
                        <FlowSection title="The essentials">
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
                        </FlowSection>
                        <FlowSection title="When & where">
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
                          <Field
                            label="RSVP capacity (optional)"
                            value={newEventRsvpLimit}
                            onChangeText={setNewEventRsvpLimit}
                            colors={colors}
                            keyboardType="number-pad"
                            placeholder="No limit"
                            hint="Leave blank for unlimited guests. Enter 0 for waitlist only."
                          />
                        </FlowSection>
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
                  <BusinessWorkspaceSheet
                    visible
                    onClose={() => setEventPickerTarget(null)}
                    closeAccessibilityLabel="Close event date and time picker"
                    title={eventPickerTarget.endsWith('date') ? 'Choose a date' : 'Choose a time'}
                    description="Choose when this event takes place."
                    backgroundColor={colors.backgroundElement}
                    headerCopyGap={Spacing.one}
                    maxHeight="78%"
                  >
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
                  </BusinessWorkspaceSheet>
                )}

                {section === 'updates' && (
                  <View style={{ gap: 16 }}>
                    <WorkspaceSectionToolbar
                      subtitle={updates.length + ' sent updates'}
                      action={
                        canEdit ? (
                          <MerchantButton
                            label="New update"
                            secondary
                            disabled={saving}
                            onPress={() => setContentPanel('update')}
                          />
                        ) : undefined
                      }
                    />
                    <MerchantSearch
                      value={contentQuery}
                      onChange={setContentQuery}
                      placeholder="Search updates"
                    />
                    <View style={[merchantStyles.list, { borderColor: inventoryColors.border }]}>
                      {updates
                        .filter((update) =>
                          (update.title + ' ' + update.body)
                            .toLowerCase()
                            .includes(contentQuery.trim().toLowerCase()),
                        )
                        .map((update) => (
                          <MerchantRow
                            key={update.id}
                            title={update.title}
                            detail={update.body}
                            subtitle={new Date(update.created_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                            status={
                              <MerchantStatus
                                label={update.update_type === 'deal' ? 'Offer' : 'Announcement'}
                              />
                            }
                            onPress={() => setSelectedUpdateId(update.id)}
                          />
                        ))}
                    </View>
                    {!updates.length && (
                      <EmptyState
                        title="No updates yet"
                        message="Announcements and offers you send will appear here."
                      />
                    )}
                    {!!updates.length &&
                      !updates.some((update) =>
                        (update.title + ' ' + update.body)
                          .toLowerCase()
                          .includes(contentQuery.trim().toLowerCase()),
                      ) && <StateNotice message="No updates match your search." />}
                    <MerchantSheet
                      visible={contentPanel === 'update' && canEdit}
                      title="New follower update"
                      blocked={saving}
                      onClose={() => setContentPanel(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {notice && <Notice kind="success" message={notice} />}
                      <View style={styles.formCard}>
                        <FormSectionDescription description="Reach followers who enabled General updates. New published events send their own event alert." />
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
                        <FlowSection title="Your message">
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
                        </FlowSection>
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
                    </MerchantSheet>
                    <MerchantSheet
                      visible={Boolean(selectedUpdate)}
                      title={selectedUpdate?.title ?? 'Update'}
                      onClose={() => setSelectedUpdateId(null)}
                    >
                      {selectedUpdate && (
                        <>
                          <MerchantStatus
                            label={
                              selectedUpdate.update_type === 'deal'
                                ? 'Special offer'
                                : 'Announcement'
                            }
                          />
                          <ThemedText themeColor="textSecondary">
                            Sent {new Date(selectedUpdate.created_at).toLocaleString()}
                          </ThemedText>
                          <FlowSection title="Message sent">
                            <ThemedText selectable>{selectedUpdate.body}</ThemedText>
                          </FlowSection>
                        </>
                      )}
                    </MerchantSheet>
                  </View>
                )}

                {section === 'rewards' && (
                  <View style={{ gap: 16 }}>
                    <WorkspaceSectionToolbar
                      subtitle="Program overview"
                      action={
                        canEdit ? (
                          <MerchantButton
                            label={reward ? 'Edit rules' : 'Create program'}
                            secondary
                            disabled={saving}
                            onPress={() => setRewardEditorOpen(true)}
                          />
                        ) : undefined
                      }
                    />
                    {reward ? (
                      <View style={{ gap: 16 }}>
                        <RewardProgramCard
                          preview
                          name={reward.name}
                          description={reward.reward_description}
                          type={reward.program_type}
                          target={
                            reward.program_type === 'visits'
                              ? reward.stamps_required
                              : (reward.points_required ?? 0)
                          }
                          active={reward.is_active}
                        />
                        <View
                          style={{
                            padding: 18,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: colors.border,
                            backgroundColor: colors.backgroundElement,
                            gap: 7,
                          }}
                        >
                          <ThemedText type="smallBold">Customers earn</ThemedText>
                          <ThemedText>
                            {reward.program_type === 'visits'
                              ? '1 stamp per visit'
                              : reward.points_per_dollar + ' points per $1'}
                          </ThemedText>
                          {!!reward.terms && (
                            <ThemedText type="small" themeColor="textSecondary">
                              {reward.terms}
                            </ThemedText>
                          )}
                        </View>
                      </View>
                    ) : (
                      <EmptyState
                        title="No rewards program"
                        message="Create a program to let customers earn visit stamps or spend points."
                      />
                    )}
                    <MerchantSheet
                      visible={rewardEditorOpen && canEdit}
                      title="Reward rules"
                      blocked={saving}
                      onClose={() => setRewardEditorOpen(false)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {notice && <Notice kind="success" message={notice} />}
                      <View style={{ gap: 12 }}>
                        <FlowSection title="Preview your reward card" collapsible>
                          <RewardProgramCard
                            preview
                            name={rewardName || 'Your rewards program'}
                            description={
                              rewardDescription || 'Give customers a reason to come back.'
                            }
                            type={rewardProgramType}
                            target={
                              Number(
                                rewardProgramType === 'visits' ? stampsRequired : pointsRequired,
                              ) || 0
                            }
                          />
                        </FlowSection>
                        <ThemedText type="card">1 · How customers earn</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Choose a visit-based or spend-based program.
                        </ThemedText>
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
                        <ThemedText type="card">2 · What customers receive</ThemedText>
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
                        <FlowSection
                          title="Use rewards at checkout"
                          description="Optional rewards for pickup orders"
                          collapsible
                          initiallyOpen={checkoutRewardEnabled}
                        >
                          <CheckoutRewardEditor
                            businessId={businessId}
                            enabled={checkoutRewardEnabled}
                            type={checkoutRewardType}
                            percent={checkoutRewardPercent}
                            items={checkoutRewardItems}
                            disabled={!canEdit}
                            onEnabled={setCheckoutRewardEnabled}
                            onType={setCheckoutRewardType}
                            onPercent={setCheckoutRewardPercent}
                            onItems={setCheckoutRewardItems}
                          />
                        </FlowSection>
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
                          label="3 · Terms (optional)"
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
                    </MerchantSheet>
                  </View>
                )}

                {section === 'photos' && (
                  <View style={styles.cardList}>
                    <WorkspaceSectionToolbar
                      subtitle={photos.length + ' images'}
                      action={
                        canEdit ? (
                          <MerchantButton
                            label="Add photo"
                            secondary
                            disabled={photoUploading || saving}
                            onPress={() => setPhotoUploadOpen(true)}
                          />
                        ) : undefined
                      }
                    />
                    {!selectedPhoto && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {photos.map((photo) => {
                          const asset = firstMediaAsset(photo.media_assets);
                          return (
                            <Pressable
                              key={photo.id}
                              accessibilityRole="button"
                              accessibilityLabel={
                                'Open ' +
                                photo.role.replaceAll('_', ' ') +
                                ': ' +
                                (photo.caption || asset?.alt_text || 'photo')
                              }
                              disabled={saving || photoUploading}
                              onPress={() => setSelectedPhotoId(photo.id)}
                              style={{
                                width: '47%',
                                flexGrow: 0,
                                gap: 8,
                                padding: 10,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: inventoryColors.border,
                                backgroundColor: inventoryColors.surface,
                              }}
                            >
                              {asset?.status === 'ready' ? (
                                <Image
                                  accessibilityLabel={
                                    asset.alt_text ?? photo.caption ?? 'Business photo'
                                  }
                                  contentFit={photo.role === 'logo' ? 'contain' : 'cover'}
                                  source={{ uri: storagePublicUrl(asset.storage_path) }}
                                  style={{ width: '100%', aspectRatio: 1, borderRadius: 12 }}
                                />
                              ) : (
                                <ThemedText type="small" themeColor="textSecondary">
                                  Image {asset?.status ?? 'unavailable'}
                                </ThemedText>
                              )}
                              <ThemedText type="smallBold">
                                {photo.role === 'gallery'
                                  ? 'Gallery photo'
                                  : photo.role === 'logo'
                                    ? 'Business logo'
                                    : 'Cover photo'}
                              </ThemedText>
                              <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                                {photo.caption || asset?.alt_text || 'No description'}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                    {selectedPhoto && (
                      <BackPill
                        label="Back to photos"
                        disabled={saving || photoUploading}
                        onPress={() => closePhotoView()}
                      />
                    )}
                    {canEdit && (
                      <MerchantSheet
                        visible={photoUploadOpen}
                        title="Add business photo"
                        blocked={photoUploading || saving}
                        onClose={() => setPhotoUploadOpen(false)}
                      >
                        {error && <Notice kind="error" message={error} />}
                        <View style={{ gap: 12 }}>
                          <ThemedText themeColor="textSecondary" type="small">
                            Images are resized on this device before secure upload. Gallery photos
                            are limited to {mediaLimits.maxGalleryImages}.
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
                      </MerchantSheet>
                    )}
                    {photos.length === 0 ? (
                      <EmptyState
                        title="No photos yet"
                        message="No photos have been added to this business."
                      />
                    ) : (
                      photos.map((photo, photoIndex) => {
                        if (photo.id !== selectedPhotoId) return null;
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
                                    onPress={() => closePhotoView(false)}
                                  />
                                </View>
                              </View>
                            ) : (
                              <>
                                <View style={styles.rowText}>
                                  <ThemedText type="smallBold">
                                    {photo.role === 'gallery'
                                      ? 'Gallery photo'
                                      : photo.role === 'logo'
                                        ? 'Business logo'
                                        : 'Cover photo'}
                                  </ThemedText>
                                  <ThemedText themeColor="textSecondary" type="small">
                                    {photo.caption || asset?.alt_text || 'No caption'}
                                  </ThemedText>
                                </View>
                                <View style={styles.statusBadge}>
                                  <ThemedText style={styles.statusText} type="smallBold">
                                    {asset?.status === 'ready'
                                      ? 'Visible on your page'
                                      : 'Processing image'}
                                  </ThemedText>
                                </View>
                                {canEdit && (
                                  <View style={styles.inlineActions}>
                                    <MerchantButton
                                      label="Move earlier"
                                      secondary
                                      disabled={photoIndex === 0}
                                      onPress={() => void movePhoto(photo, -1)}
                                    />
                                    <MerchantButton
                                      label="Move later"
                                      secondary
                                      disabled={photoIndex === photos.length - 1}
                                      onPress={() => void movePhoto(photo, 1)}
                                    />
                                    <MerchantButton
                                      label="Edit caption"
                                      secondary
                                      onPress={() => beginPhotoEdit(photo)}
                                    />
                                    <MerchantButton
                                      label="Remove photo"
                                      destructive
                                      onPress={() => removePhoto(photo)}
                                    />
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
                      message="Captions, ordering and removal are saved immediately. Open a photo to manage it."
                    />
                  </View>
                )}

                {section === 'staff' && canEdit && (
                  <View style={{ gap: 16 }}>
                    <WorkspaceSectionToolbar
                      subtitle={
                        staff.length + ' members · ' + pendingInvites.length + ' pending invites'
                      }
                      action={
                        <MerchantButton
                          label="Invite"
                          secondary
                          disabled={saving}
                          onPress={() => setContentPanel('invite')}
                        />
                      }
                    />
                    <MerchantSearch
                      value={contentQuery}
                      onChange={setContentQuery}
                      placeholder="Search staff and invites"
                    />
                    <ThemedText accessibilityRole="header" type="smallBold">
                      Members
                    </ThemedText>
                    <View style={[merchantStyles.list, { borderColor: inventoryColors.border }]}>
                      {staff
                        .filter((member) =>
                          member.display_name
                            .toLowerCase()
                            .includes(contentQuery.trim().toLowerCase()),
                        )
                        .map((member) => (
                          <MerchantRow
                            key={member.member_id}
                            title={member.display_name}
                            leading={<FlowAvatar name={member.display_name} />}
                            subtitle={'Added ' + new Date(member.created_at).toLocaleDateString()}
                            status={<MerchantStatus label="Staff" />}
                            onPress={() => setSelectedStaffId(member.member_id)}
                          />
                        ))}
                    </View>
                    {!staff.length && (
                      <EmptyState
                        title="No staff members"
                        message="Invite trusted staff to use Staff Scan for rewards, pickups and events."
                      />
                    )}
                    {!!staff.length &&
                      !staff.some((member) =>
                        member.display_name
                          .toLowerCase()
                          .includes(contentQuery.trim().toLowerCase()),
                      ) && <StateNotice message="No staff members match your search." />}
                    <ThemedText accessibilityRole="header" type="smallBold">
                      Pending invitations
                    </ThemedText>
                    <View style={[merchantStyles.list, { borderColor: inventoryColors.border }]}>
                      {pendingInvites
                        .filter((invite) =>
                          invite.invited_email
                            .toLowerCase()
                            .includes(contentQuery.trim().toLowerCase()),
                        )
                        .map((invite) => (
                          <MerchantRow
                            key={invite.invite_id}
                            title={invite.invited_email}
                            subtitle={'Expires ' + new Date(invite.expires_at).toLocaleDateString()}
                            status={<MerchantStatus label="Pending" tone="warning" />}
                            onPress={() => setSelectedInviteId(invite.invite_id)}
                          />
                        ))}
                    </View>
                    {!pendingInvites.length && (
                      <ThemedText type="small" themeColor="textSecondary">
                        No pending invitations.
                      </ThemedText>
                    )}
                    <MerchantSheet
                      visible={contentPanel === 'invite'}
                      title="Invite staff"
                      blocked={saving}
                      onClose={() => setContentPanel(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {notice && <Notice kind="success" message={notice} />}
                      <View style={styles.formCard}>
                        <ThemedText themeColor="textSecondary" type="small">
                          Send a secure, single-use link. They can create an account or sign in
                          first, then accept the invite to unlock Staff Scan access.
                        </ThemedText>
                        <FlowSection title="Invite someone to your team">
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
                        </FlowSection>
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
                              account or are joining Parish Pass for the first time.
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
                    </MerchantSheet>
                    <MerchantSheet
                      visible={Boolean(selectedStaff)}
                      title={selectedStaff?.display_name ?? 'Staff member'}
                      blocked={saving}
                      onClose={() => setSelectedStaffId(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {selectedStaff && (
                        <>
                          <FlowIdentity
                            name={selectedStaff.display_name}
                            detail="Staff Scan access"
                          />
                          <ThemedText themeColor="textSecondary">
                            Added {new Date(selectedStaff.created_at).toLocaleDateString()}
                          </ThemedText>
                          <ThemedText>
                            Removing this member revokes their staff access to this business.
                          </ThemedText>
                          <MerchantButton
                            label="Remove staff member"
                            destructive
                            loading={saving}
                            onPress={() => removeStaffMember(selectedStaff)}
                          />
                        </>
                      )}
                    </MerchantSheet>
                    <MerchantSheet
                      visible={Boolean(selectedInvite)}
                      title="Pending invitation"
                      blocked={saving}
                      onClose={() => setSelectedInviteId(null)}
                    >
                      {error && <Notice kind="error" message={error} />}
                      {selectedInvite && (
                        <>
                          <FlowIdentity
                            name={selectedInvite.invited_email}
                            detail="Invitation pending"
                          />
                          <ThemedText themeColor="textSecondary">
                            Expires {new Date(selectedInvite.expires_at).toLocaleString()}
                          </ThemedText>
                          <MerchantButton
                            label="Revoke invitation"
                            destructive
                            loading={saving}
                            onPress={() => revokeStaffInvite(selectedInvite)}
                          />
                        </>
                      )}
                    </MerchantSheet>
                  </View>
                )}

                {section === 'review' && business && (
                  <View style={styles.cardList}>
                    <View style={{ gap: 12 }}>
                      <WorkspaceSectionToolbar
                        subtitle={
                          readiness
                            ? readiness.checks.filter((check) => check.complete).length +
                              ' of ' +
                              readiness.checks.length +
                              ' requirements complete'
                            : 'Checking publication requirements'
                        }
                      />
                      <MerchantStatus
                        label={
                          business.status === 'active'
                            ? 'Published'
                            : business.status === 'pending_review'
                              ? 'Awaiting review'
                              : 'Draft'
                        }
                        tone={business.status === 'active' ? 'success' : 'quiet'}
                      />
                      <ThemedText themeColor="textSecondary">
                        Complete these items before you submit your page for review.
                      </ThemedText>
                      <View style={[merchantStyles.list, { borderColor: inventoryColors.border }]}>
                        {readiness?.checks.map((check) => {
                          const destination = publishingCheckSection(
                            check.key,
                            business.business_type === 'mobile',
                          );
                          return (
                            <MerchantRow
                              key={check.key}
                              title={check.label}
                              status={
                                <MerchantStatus
                                  label={check.complete ? 'Complete' : 'Required'}
                                  tone={check.complete ? 'success' : 'warning'}
                                />
                              }
                              disabled={!canEdit || !destination}
                              label={canEdit && destination ? 'Edit ' + check.label : check.label}
                              onPress={() => {
                                if (canEdit && destination) openEditor(destination);
                              }}
                            />
                          );
                        })}
                      </View>
                      {business.status === 'draft' && canEdit && (
                        <>
                          <AppButton
                            label="View listing plans"
                            onPress={() => router.push('/listing-plans' as Href)}
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
            </BusinessFeatureGate>
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
  const bottomPadding = useScreenBottomPadding(false);
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
          <View style={{ gap: 12 }}>
            <ParishBusinessBrand />
            <View style={styles.compactWorkspaceHeader}>
              <ThemedText style={{ color: accent }} type="smallBold">
                ‹ All businesses
              </ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {canEdit ? 'Owner access' : 'Staff access'}
              </ThemedText>
            </View>
          </View>
          <BusinessHub
            showBrand={false}
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
  hint,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  readonly label: string;
  readonly hint?: string;
  readonly colors: typeof Colors.light | typeof Colors.dark;
}) {
  return (
    <FormField label={label}>
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
      {hint && (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      )}
    </FormField>
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
    <FormField label={label}>
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
    </FormField>
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

function WorkspaceSectionToolbar({
  subtitle,
  action,
}: {
  readonly subtitle: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <ThemedText type="small" themeColor="textSecondary" style={{ flexGrow: 1, flexShrink: 1 }}>
        {subtitle}
      </ThemedText>
      {action}
    </View>
  );
}

function FormSectionDescription({ description }: { readonly description: string }) {
  return (
    <View style={styles.formSectionHeading}>
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

function parseOptionalEventLimit(value: string): number | null | undefined {
  const normalized = value.trim();
  if (!normalized) return null;
  if (!/^\d{1,6}$/.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isInteger(parsed) && parsed <= 100000 ? parsed : undefined;
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
    borderRadius: Radius.pill,
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

export const BusinessWorkspace = withBusinessTheme(BusinessWorkspaceContent);
