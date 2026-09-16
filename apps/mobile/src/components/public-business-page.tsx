import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { readableTextColor } from '@/lib/color-contrast';
import { storagePublicUrl } from '@/lib/storage-url';
import { supabase } from '@/lib/supabase';
import { userMessageFromError } from '@/lib/user-error';
import { useAuth } from '@/providers/auth-provider';

interface BusinessPageData {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly description: string;
  readonly category_summary: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website_url: string | null;
  readonly address_line_1: string | null;
  readonly address_line_2: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly postal_code: string | null;
  readonly service_area: string | null;
  readonly primary_color: string;
  readonly accent_color: string;
}

interface PhotoData {
  readonly id: string;
  readonly role: 'logo' | 'cover' | 'gallery';
  readonly caption: string | null;
  readonly media_assets:
    | { readonly alt_text: string | null; readonly storage_path: string; readonly status: string }
    | readonly {
        readonly alt_text: string | null;
        readonly storage_path: string;
        readonly status: string;
      }[]
    | null;
}

interface SectionData {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
}
interface ItemData {
  readonly id: string;
  readonly section_id: string;
  readonly name: string;
  readonly description: string;
  readonly price_minor: number | null;
  readonly price_text: string | null;
  readonly currency: string;
  readonly is_available: boolean;
}
interface EventData {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly starts_at: string;
  readonly address_text: string | null;
}
interface LoyaltyData {
  readonly id: string;
  readonly name: string;
  readonly reward_description: string;
  readonly stamps_required: number;
}
interface LoyaltyMembershipData {
  readonly id: string;
  readonly program_id: string;
  readonly is_active: boolean;
}
interface HourData {
  readonly day_of_week: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed: boolean;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PublicBusinessPageContent({
  businessId,
  preview = false,
}: {
  readonly businessId: string;
  readonly preview?: boolean;
}) {
  const { session } = useAuth();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const [business, setBusiness] = useState<BusinessPageData | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [items, setItems] = useState<ItemData[]>([]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [hours, setHours] = useState<HourData[]>([]);
  const [following, setFollowing] = useState(false);
  const [savedEventIds, setSavedEventIds] = useState<Set<string>>(new Set());
  const [loyaltyMembership, setLoyaltyMembership] = useState<LoyaltyMembershipData | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase
        .from('businesses')
        .select(
          'id, name, slug, status, description, category_summary, phone, email, website_url, address_line_1, address_line_2, city, region_code, postal_code, service_area, primary_color, accent_color',
        )
        .eq('id', businessId)
        .maybeSingle(),
      supabase
        .from('business_photos')
        .select('id, role, caption, media_assets(alt_text, storage_path, status)')
        .eq('business_id', businessId)
        .order('display_order'),
      supabase
        .from('offering_sections')
        .select('id, name, description')
        .eq('business_id', businessId)
        .eq('is_visible', true)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('offering_items')
        .select(
          'id, section_id, name, description, price_minor, price_text, currency, is_available',
        )
        .eq('business_id', businessId)
        .eq('is_visible', true)
        .is('archived_at', null)
        .order('display_order'),
      supabase
        .from('events')
        .select('id, title, description, starts_at, address_text')
        .eq('business_id', businessId)
        .is('archived_at', null)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(6),
      supabase
        .from('loyalty_programs')
        .select('id, name, reward_description, stamps_required')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('business_hours')
        .select('day_of_week, opens_at, closes_at, is_closed')
        .eq('business_id', businessId)
        .order('day_of_week'),
      session
        ? supabase
            .from('business_follows')
            .select('business_id')
            .eq('business_id', businessId)
            .eq('customer_id', session.user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      session
        ? supabase.from('event_saves').select('event_id').eq('customer_id', session.user.id)
        : Promise.resolve({ data: [], error: null }),
      session
        ? supabase
            .from('loyalty_memberships')
            .select('id, program_id, is_active')
            .eq('business_id', businessId)
            .eq('customer_id', session.user.id)
            .eq('is_active', true)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]).then(
      ([
        businessResult,
        photoResult,
        sectionResult,
        itemResult,
        eventResult,
        loyaltyResult,
        hourResult,
        followResult,
        savesResult,
        membershipResult,
      ]) => {
        if (!active) return;
        const firstError = [
          businessResult.error,
          photoResult.error,
          sectionResult.error,
          itemResult.error,
          eventResult.error,
          loyaltyResult.error,
          hourResult.error,
          followResult.error,
          savesResult.error,
          membershipResult.error,
        ].find(Boolean);
        if (firstError)
          setError(userMessageFromError(firstError, 'We could not load this business page.'));
        else if (!businessResult.data) setError('This business page is unavailable.');
        else {
          setBusiness(businessResult.data as BusinessPageData);
          setPhotos((photoResult.data ?? []) as PhotoData[]);
          setSections((sectionResult.data ?? []) as SectionData[]);
          setItems((itemResult.data ?? []) as ItemData[]);
          setEvents((eventResult.data ?? []) as EventData[]);
          setLoyalty((loyaltyResult.data as LoyaltyData | null) ?? null);
          setHours((hourResult.data ?? []) as HourData[]);
          setFollowing(Boolean(followResult.data));
          setSavedEventIds(
            new Set((savesResult.data ?? []).map((row: { event_id: string }) => row.event_id)),
          );
          setLoyaltyMembership((membershipResult.data as LoyaltyMembershipData | null) ?? null);
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, [businessId, session]);

  const resolvedPhotos = useMemo(
    () =>
      photos.flatMap((photo) => {
        const asset = Array.isArray(photo.media_assets)
          ? photo.media_assets[0]
          : photo.media_assets;
        return asset?.status === 'ready'
          ? [{ ...photo, url: storagePublicUrl(asset.storage_path), altText: asset.alt_text }]
          : [];
      }),
    [photos],
  );

  async function toggleFollow() {
    if (!session || !business) return;
    const next = !following;
    setFollowing(next);
    const result = next
      ? await supabase
          .from('business_follows')
          .insert({ business_id: business.id, customer_id: session.user.id })
      : await supabase
          .from('business_follows')
          .delete()
          .eq('business_id', business.id)
          .eq('customer_id', session.user.id);
    if (result.error) {
      setFollowing(!next);
      setError(userMessageFromError(result.error, 'We could not update your follow preference.'));
    }
  }

  async function toggleEventSave(eventId: string) {
    if (!session) {
      setError('Sign in to save events.');
      return;
    }
    const isSaved = savedEventIds.has(eventId);
    setActionPending(`event:${eventId}`);
    setError(null);
    setSavedEventIds((current) => {
      const next = new Set(current);
      if (isSaved) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
    const result = isSaved
      ? await supabase
          .from('event_saves')
          .delete()
          .eq('event_id', eventId)
          .eq('customer_id', session.user.id)
      : await supabase
          .from('event_saves')
          .insert({ event_id: eventId, customer_id: session.user.id });
    setActionPending(null);
    if (result.error) {
      setSavedEventIds((current) => {
        const next = new Set(current);
        if (isSaved) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
      setError(userMessageFromError(result.error, 'We could not update your saved events.'));
    }
  }

  async function toggleLoyaltyMembership() {
    if (!session || !loyalty) {
      setError('Sign in to join this rewards program.');
      return;
    }
    setActionPending('loyalty');
    setError(null);
    if (loyaltyMembership) {
      const { error: leaveError } = await supabase.rpc('leave_loyalty_program', {
        p_membership_id: loyaltyMembership.id,
      });
      setActionPending(null);
      if (leaveError) {
        setError(userMessageFromError(leaveError, 'We could not leave this rewards program.'));
        return;
      }
      setLoyaltyMembership(null);
      return;
    }
    const { data, error: joinError } = await supabase.rpc('join_loyalty_program', {
      p_program_id: loyalty.id,
    });
    setActionPending(null);
    if (joinError) {
      setError(userMessageFromError(joinError, 'We could not add this program to your rewards.'));
      return;
    }
    setLoyaltyMembership({ id: data as string, program_id: loyalty.id, is_active: true });
  }

  if (loading) return <ActivityIndicator color={Brand.primaryBright} style={styles.loader} />;
  if (error || !business)
    return (
      <View style={styles.errorCard}>
        <ThemedText style={styles.errorText}>{error ?? 'Business unavailable.'}</ThemedText>
      </View>
    );

  const cover = resolvedPhotos.find((photo) => photo.role === 'cover');
  const logo = resolvedPhotos.find((photo) => photo.role === 'logo');
  const gallery = resolvedPhotos.filter((photo) => photo.role === 'gallery');
  const brandText = readableTextColor(business.primary_color);
  const address = [
    business.address_line_1,
    business.address_line_2,
    business.city,
    business.region_code,
    business.postal_code,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View style={styles.page}>
      {(preview || business.status !== 'active') && (
        <View style={styles.previewBanner}>
          <ThemedText style={styles.previewText} type="smallBold">
            Private page preview · {business.status.replaceAll('_', ' ')}
          </ThemedText>
        </View>
      )}
      <View style={[styles.hero, { backgroundColor: business.primary_color }]}>
        {cover && (
          <Image
            accessibilityLabel={cover.altText ?? ''}
            contentFit="cover"
            source={{ uri: cover.url }}
            style={styles.cover}
            transition={180}
          />
        )}
        {cover && <View style={styles.heroShade} />}
        <View style={styles.heroContent}>
          <View style={[styles.logo, { backgroundColor: colors.backgroundElement }]}>
            {logo ? (
              <Image
                accessibilityLabel={logo.altText ?? `${business.name} logo`}
                contentFit="cover"
                source={{ uri: logo.url }}
                style={styles.logoImage}
                transition={180}
              />
            ) : (
              <ThemedText style={{ color: colors.text }} type="subtitle">
                {business.name.slice(0, 1).toUpperCase()}
              </ThemedText>
            )}
          </View>
          <ThemedText
            style={[styles.kicker, { color: cover ? '#FFFFFF' : brandText }]}
            type="smallBold"
          >
            {business.category_summary || 'LOCAL BUSINESS'}
          </ThemedText>
          <ThemedText style={[styles.businessName, { color: cover ? '#FFFFFF' : brandText }]}>
            {business.name}
          </ThemedText>
          {!!business.description && (
            <ThemedText style={{ color: cover ? '#F2F6F3' : brandText }}>
              {business.description}
            </ThemedText>
          )}
        </View>
      </View>

      <View style={styles.actionRow}>
        {!preview && session && (
          <Pressable
            onPress={() => void toggleFollow()}
            style={[styles.primaryAction, { backgroundColor: business.primary_color }]}
          >
            <ThemedText style={{ color: brandText }} type="smallBold">
              {following ? 'Following' : 'Follow'}
            </ThemedText>
          </Pressable>
        )}
        {business.phone && (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`tel:${business.phone}`)}
            style={styles.secondaryAction}
          >
            <ThemedText type="smallBold">Call</ThemedText>
          </Pressable>
        )}
        {business.email && (
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(`mailto:${business.email}`)}
            style={styles.secondaryAction}
          >
            <ThemedText type="smallBold">Email</ThemedText>
          </Pressable>
        )}
      </View>

      <View style={styles.twoColumn}>
        <PageSection title="About">
          <ThemedText themeColor="textSecondary">
            {business.description ||
              `Discover what ${business.name} offers and plan your next visit.`}
          </ThemedText>
        </PageSection>
        <PageSection title="Location">
          <ThemedText themeColor="textSecondary">
            {address || business.service_area || 'Location details coming soon.'}
          </ThemedText>
        </PageSection>
      </View>

      {hours.length > 0 && (
        <PageSection title="Hours">
          <View style={styles.hours}>
            {hours.map((hour) => (
              <View key={hour.day_of_week} style={styles.hourRow}>
                <ThemedText type="smallBold">{dayNames[hour.day_of_week]}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {hour.is_closed
                    ? 'Closed'
                    : `${formatTime(hour.opens_at)}–${formatTime(hour.closes_at)}`}
                </ThemedText>
              </View>
            ))}
          </View>
        </PageSection>
      )}

      {sections.length > 0 && (
        <View style={styles.sectionGroup}>
          <ThemedText type="subtitle">Offerings</ThemedText>
          {sections.map((section) => (
            <PageSection key={section.id} title={section.name}>
              {section.description && (
                <ThemedText themeColor="textSecondary" type="small">
                  {section.description}
                </ThemedText>
              )}
              {items
                .filter((item) => item.section_id === section.id)
                .map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemCopy}>
                      <ThemedText type="smallBold">{item.name}</ThemedText>
                      {item.description && (
                        <ThemedText themeColor="textSecondary" type="small">
                          {item.description}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="smallBold">
                      {item.is_available ? formatPrice(item) : 'Unavailable'}
                    </ThemedText>
                  </View>
                ))}
            </PageSection>
          ))}
        </View>
      )}

      {events.length > 0 && (
        <View style={styles.sectionGroup}>
          <ThemedText type="subtitle">Coming up</ThemedText>
          {events.map((event) => (
            <PageSection key={event.id} title={event.title}>
              <ThemedText style={styles.eventDate} type="smallBold">
                {new Date(event.starts_at).toLocaleString()}
              </ThemedText>
              {event.description && (
                <ThemedText themeColor="textSecondary" type="small">
                  {event.description}
                </ThemedText>
              )}
              {!preview && session && (
                <Pressable
                  disabled={actionPending === `event:${event.id}`}
                  onPress={() => void toggleEventSave(event.id)}
                  style={[
                    styles.inlineAction,
                    savedEventIds.has(event.id) && styles.inlineActionSelected,
                  ]}
                >
                  <ThemedText
                    style={
                      savedEventIds.has(event.id) ? styles.inlineActionTextSelected : undefined
                    }
                    type="smallBold"
                  >
                    {actionPending === `event:${event.id}`
                      ? 'Saving…'
                      : savedEventIds.has(event.id)
                        ? 'Saved'
                        : 'Save event'}
                  </ThemedText>
                </Pressable>
              )}
            </PageSection>
          ))}
        </View>
      )}

      {loyalty && (
        <View style={[styles.rewardCard, { backgroundColor: business.accent_color }]}>
          <ThemedText style={{ color: readableTextColor(business.accent_color) }} type="smallBold">
            REWARDS
          </ThemedText>
          <ThemedText style={{ color: readableTextColor(business.accent_color) }} type="subtitle">
            {loyalty.name}
          </ThemedText>
          <ThemedText style={{ color: readableTextColor(business.accent_color) }}>
            {loyalty.reward_description}
          </ThemedText>
          <ThemedText style={{ color: readableTextColor(business.accent_color) }} type="smallBold">
            Reward every {loyalty.stamps_required} visits
          </ThemedText>
          {!preview && session && (
            <Pressable
              disabled={actionPending === 'loyalty'}
              onPress={() => void toggleLoyaltyMembership()}
              style={styles.rewardAction}
            >
              <ThemedText style={styles.rewardActionText} type="smallBold">
                {actionPending === 'loyalty'
                  ? 'Updating…'
                  : loyaltyMembership
                    ? 'In your rewards · Leave'
                    : 'Add to my rewards'}
              </ThemedText>
            </Pressable>
          )}
        </View>
      )}

      {gallery.length > 0 && (
        <View style={styles.sectionGroup}>
          <ThemedText type="subtitle">Photos</ThemedText>
          <View style={styles.gallery}>
            {gallery.map((photo) => (
              <Image
                key={photo.id}
                accessibilityLabel={photo.altText ?? photo.caption ?? ''}
                contentFit="cover"
                source={{ uri: photo.url }}
                style={styles.galleryImage}
                transition={180}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function PageSection({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
    </View>
  );
}
function formatTime(value: string | null) {
  if (!value) return '—';
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}
function formatPrice(item: ItemData) {
  if (item.price_text) return item.price_text;
  if (item.price_minor === null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency }).format(
    item.price_minor / 100,
  );
}

const styles = StyleSheet.create({
  page: { gap: Spacing.three },
  loader: { marginVertical: Spacing.six },
  previewBanner: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    backgroundColor: '#E4F4EC',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  previewText: { color: '#164E38' },
  hero: {
    minHeight: 360,
    borderRadius: Radius.hero,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  cover: { position: 'absolute', inset: 0 },
  heroShade: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.38)' },
  heroContent: { padding: Spacing.four, gap: Spacing.two },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  logoImage: { width: '100%', height: '100%' },
  kicker: { textTransform: 'uppercase', letterSpacing: 1.4 },
  businessName: { fontSize: 38, lineHeight: 43, fontWeight: '800', letterSpacing: -0.8 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  primaryAction: {
    minHeight: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryAction: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  twoColumn: { gap: Spacing.three },
  sectionGroup: { gap: Spacing.three },
  card: {
    borderRadius: Radius.large,
    backgroundColor: 'rgba(120,140,128,0.10)',
    padding: Spacing.three,
    gap: Spacing.two,
  },
  hours: { gap: Spacing.one },
  hourRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.three },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Brand.border,
    paddingTop: Spacing.two,
  },
  itemCopy: { flex: 1, gap: 2 },
  eventDate: { color: Brand.primaryBright },
  inlineAction: {
    alignSelf: 'flex-start',
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Brand.border,
    paddingHorizontal: 16,
  },
  inlineActionSelected: { backgroundColor: Brand.primary, borderColor: Brand.primary },
  inlineActionTextSelected: { color: Brand.onPrimary },
  rewardCard: { borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.two },
  rewardAction: {
    alignSelf: 'flex-start',
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 21,
    backgroundColor: Brand.onPrimary,
    paddingHorizontal: 16,
    marginTop: Spacing.one,
  },
  rewardActionText: { color: '#14231C' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  galleryImage: { width: '48%', flexGrow: 1, aspectRatio: 1.2, borderRadius: 16 },
  errorCard: { borderRadius: 16, backgroundColor: '#F8E6E6', padding: Spacing.three },
  errorText: { color: '#761F1F' },
});
