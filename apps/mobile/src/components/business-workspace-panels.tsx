import { useColorScheme } from '@/hooks/use-color-scheme';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { BusinessLogo } from './business-logo';
import { BusinessWorkspaceSheet } from './business-workspace-sheet';
import { AppIcon as SymbolView } from '@/components/app-icon';
import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { hasUnsavedChanges } from '@sds/business-logic';
import type { BusinessSection } from '@/lib/business-workspace-config';

type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];
type SymbolName = React.ComponentProps<typeof SymbolView>['name'];

export interface WorkspaceBusiness {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly status: string;
  readonly business_type:
    'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
  readonly description: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address_line_1: string | null;
  readonly city: string | null;
  readonly region_code: string | null;
  readonly service_area_type: string;
  readonly service_area_regions: readonly string[];
  readonly service_area: string | null;
  readonly primary_color: string;
  readonly accent_color: string;
}

export interface WorkspaceHour {
  readonly id?: string;
  readonly day_of_week: number;
  readonly interval_number: number;
  readonly opens_at: string | null;
  readonly closes_at: string | null;
  readonly is_closed: boolean;
}

interface WorkspaceEvent {
  readonly title: string;
  readonly starts_at: string;
  readonly is_published: boolean;
}

interface WorkspaceReward {
  readonly name: string;
  readonly is_active: boolean;
}

interface WorkspaceLocationStop {
  readonly title: string;
  readonly address_text: string | null;
  readonly starts_at: string;
  readonly ends_at: string;
  readonly is_published: boolean;
}

export interface WorkspaceProfile {
  readonly completed: number;
  readonly total: number;
  readonly percent: number;
  readonly missing: readonly string[];
}

export interface WorkspaceAttentionItem {
  readonly key: 'review' | 'profile' | 'hours' | 'location' | 'offerings' | 'photos';
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
}

export interface BusinessOverviewProps {
  readonly business: WorkspaceBusiness;
  readonly colors: ThemeColors;
  readonly accent: string;
  readonly canEdit: boolean;
  readonly logoUri: string | null;
  readonly profile: WorkspaceProfile;
  readonly attention: WorkspaceAttentionItem | null;
  readonly hours: readonly WorkspaceHour[];
  readonly offeringsCount: number;
  readonly visibleOfferingCount: number;
  readonly photosCount: number;
  readonly events: readonly WorkspaceEvent[];
  readonly reward: WorkspaceReward | null;
  readonly locationStops: readonly WorkspaceLocationStop[];
  readonly onPreview: () => void;
  readonly onManage: () => void;
  readonly onAction: (key: BusinessSection | 'location' | 'profile') => void;
}

export function BusinessOverview({
  business,
  colors,
  accent,
  canEdit,
  logoUri,
  profile,
  attention,
  hours,
  offeringsCount,
  visibleOfferingCount,
  photosCount,
  events,
  reward,
  locationStops,
  onPreview,
  onManage,
  onAction,
}: BusinessOverviewProps) {
  const isMobile = business.business_type === 'mobile';
  const [now] = useState(() => Date.now());
  const today = new Date(now);
  const todayHours = hours.find(
    (row) => row.day_of_week === today.getDay() && row.interval_number === 1,
  );
  const todayHoursLabel = todayHours
    ? todayHours.is_closed
      ? 'Closed today'
      : `${formatTime(todayHours.opens_at)}–${formatTime(todayHours.closes_at)}`
    : 'Hours not set';
  const liveLocation = locationStops.find((stop) => {
    const starts = new Date(stop.starts_at).getTime();
    const ends = new Date(stop.ends_at).getTime();
    return stop.is_published && starts <= now && ends >= now;
  });
  const nextEvent = events.find((event) => new Date(event.starts_at).getTime() > now);
  const quickActions: readonly {
    readonly key: BusinessSection | 'location' | 'profile';
    readonly icon: SymbolName;
    readonly label: string;
  }[] = [
    { key: 'updates' as const, icon: 'megaphone.fill', label: 'Post update' },
    { key: 'hours' as const, icon: 'clock.fill', label: 'Change hours' },
    isMobile
      ? { key: 'location' as const, icon: 'mappin.and.ellipse', label: 'Set current location' }
      : { key: 'profile' as const, icon: 'person.crop.circle', label: 'Edit details' },
  ];

  return (
    <View style={styles.panelList}>
      <View style={styles.overviewHeader}>
        <BusinessLogo name={business.name} uri={logoUri} size={60} decorative />
        <View style={styles.overviewHeaderCopy}>
          <ThemedText type="smallBold" style={{ color: accent }}>
            BUSINESS OVERVIEW
          </ThemedText>
          <ThemedText type="subtitle" numberOfLines={2}>
            {business.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {businessTypeLabel(business.business_type)} · {statusLabel(business.status)}
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel="View customer-facing page preview"
          accessibilityRole="button"
          onPress={onPreview}
          style={({ pressed }) => [styles.iconTextAction, pressed && styles.pressed]}
        >
          <SymbolView name="eye" tintColor={accent} style={styles.actionIcon} />
          <ThemedText style={{ color: accent }} type="smallBold">
            Preview
          </ThemedText>
        </Pressable>
      </View>

      {attention ? (
        <View
          style={[
            styles.attention,
            { backgroundColor: colors.backgroundSelected, borderColor: accent },
          ]}
        >
          <View style={styles.attentionIcon}>
            <SymbolView
              name="exclamationmark.circle.fill"
              tintColor={accent}
              style={styles.actionIcon}
            />
          </View>
          <View style={styles.rowCopy}>
            <ThemedText type="smallBold">{attention.title}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {attention.detail}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onAction(attention.key)}
            style={({ pressed }) => [
              styles.inlineAction,
              { borderColor: accent },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText style={{ color: accent }} type="smallBold">
              {attention.actionLabel}
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.successRow,
            { backgroundColor: colors.successSurface, borderColor: colors.successText },
          ]}
        >
          <SymbolView
            name="checkmark.circle.fill"
            tintColor={colors.successText}
            style={styles.actionIcon}
          />
          <ThemedText style={{ color: colors.successText }} type="smallBold">
            Everything important is up to date.
          </ThemedText>
        </View>
      )}

      <SectionLabel label="Quick actions" />
      <View
        style={[
          styles.quickActions,
          { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        ]}
      >
        {quickActions.map((action, index) => (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            key={action.label}
            onPress={() => onAction(action.key)}
            style={({ pressed }) => [
              styles.quickAction,
              index > 0 && styles.separatorTop,
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: colors.backgroundSelected }]}>
              <SymbolView name={action.icon} tintColor={accent} style={styles.actionIcon} />
            </View>
            <ThemedText type="smallBold" style={styles.quickActionLabel}>
              {action.label}
            </ThemedText>
            <SymbolView
              name="chevron.right"
              tintColor={colors.textSecondary}
              style={styles.chevron}
            />
          </Pressable>
        ))}
      </View>

      <SectionLabel label="Today" />
      <View
        style={[
          styles.todayList,
          { backgroundColor: colors.backgroundElement, borderColor: colors.border },
        ]}
      >
        <TodayRow icon="clock" label="Hours" value={todayHoursLabel} colors={colors} />
        {isMobile && (
          <TodayRow
            icon="mappin"
            label="Location"
            value={liveLocation?.title ?? 'No current location'}
            colors={colors}
          />
        )}
        {reward?.is_active && (
          <TodayRow icon="gift" label="Reward" value={reward.name} colors={colors} />
        )}
        {nextEvent && (
          <TodayRow icon="calendar" label="Next event" value={nextEvent.title} colors={colors} />
        )}
        {!reward?.is_active && !nextEvent && !isMobile && (
          <TodayRow
            icon="chart.bar"
            label="Profile"
            value={`${profile.completed}/${profile.total} customer details complete`}
            colors={colors}
          />
        )}
        {isMobile && liveLocation && (
          <ThemedText themeColor="textSecondary" type="small" style={styles.todaySubcopy}>
            {liveLocation.address_text ?? 'Live location is published to customers.'}
          </ThemedText>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onManage}
        style={({ pressed }) => [
          styles.manageCta,
          { backgroundColor: accent },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.rowCopy}>
          <ThemedText style={{ color: readableOn(accent) }} type="smallBold">
            Manage your workspace
          </ThemedText>
          <ThemedText style={{ color: readableOn(accent), opacity: 0.82 }} type="small">
            {visibleOfferingCount || offeringsCount} offerings · {photosCount} photos
          </ThemedText>
        </View>
        <SymbolView name="arrow.right" tintColor={readableOn(accent)} style={styles.actionIcon} />
      </Pressable>
      {!canEdit && (
        <ThemedText themeColor="textSecondary" type="small">
          Staff access is view-only. Owners can make changes.
        </ThemedText>
      )}
    </View>
  );
}

interface ManageGroup {
  readonly label: string;
  readonly rows: readonly {
    readonly key: BusinessSection;
    readonly icon: SymbolName;
    readonly title: string;
    readonly summary: string;
  }[];
}

export function BusinessManage({
  business,
  colors,
  accent,
  canEdit,
  offeringsCount,
  visibleOfferingCount,
  photosCount,
  eventsCount,
  updatesCount,
  staffCount,
  hasReward,
  todayHoursLabel,
  liveLocationLabel,
  onOpen,
}: {
  readonly business: WorkspaceBusiness;
  readonly colors: ThemeColors;
  readonly accent: string;
  readonly canEdit: boolean;
  readonly offeringsCount: number;
  readonly visibleOfferingCount: number;
  readonly photosCount: number;
  readonly eventsCount: number;
  readonly updatesCount: number;
  readonly staffCount: number;
  readonly hasReward: boolean;
  readonly todayHoursLabel: string;
  readonly liveLocationLabel: string;
  readonly onOpen: (section: BusinessSection) => void;
}) {
  const offeringLabel =
    business.business_type === 'food_drink'
      ? 'Menu'
      : business.business_type === 'services'
        ? 'Services'
        : 'Offerings';
  const groups: readonly ManageGroup[] = [
    {
      label: 'CUSTOMER EXPERIENCE',
      rows: [
        {
          key: 'profile',
          icon: 'paintbrush',
          title: 'Profile and branding',
          summary: `${business.name}${business.description ? ' · profile ready' : ' · add a description'}`,
        },
        {
          key: 'contact',
          icon: 'phone',
          title: 'Contact information',
          summary:
            business.phone || business.email
              ? 'Contact details are available'
              : 'Add a phone or email',
        },
        {
          key: 'offerings',
          icon: 'list.bullet',
          title: offeringLabel,
          summary: `${visibleOfferingCount} visible · ${offeringsCount} total`,
        },
        {
          key: 'photos',
          icon: 'photo.on.rectangle',
          title: 'Photos and gallery',
          summary: photosCount
            ? `${photosCount} photos on the page`
            : 'Add photos customers can trust',
        },
        {
          key: 'updates',
          icon: 'megaphone',
          title: 'Updates',
          summary: updatesCount ? `${updatesCount} recent updates` : 'Share a helpful announcement',
        },
        {
          key: 'events',
          icon: 'calendar',
          title: 'Events',
          summary: eventsCount ? `${eventsCount} upcoming or saved` : 'Add your next event',
        },
      ],
    },
    {
      label: 'OPERATIONS',
      rows: [
        { key: 'hours', icon: 'clock', title: 'Hours', summary: todayHoursLabel },
        {
          key: 'location',
          icon: business.business_type === 'mobile' ? 'mappin.and.ellipse' : 'map',
          title:
            business.business_type === 'mobile'
              ? 'Locations and mobile status'
              : 'Locations and service area',
          summary: liveLocationLabel,
        },
        {
          key: 'rewards',
          icon: 'gift',
          title: 'Rewards',
          summary: hasReward ? 'Loyalty program is set up' : 'Create a reason to return',
        },
        {
          key: 'staff',
          icon: 'person.2',
          title: 'Staff and scanner access',
          summary: staffCount
            ? `${staffCount} active team members`
            : 'Invite your first team member',
        },
      ],
    },
    {
      label: 'MARKETING AND VISIBILITY',
      rows: [
        {
          key: 'preview',
          icon: 'qrcode',
          title: 'QR materials',
          summary: 'Create, save, share or print',
        },
        {
          key: 'preview',
          icon: 'square.and.arrow.up',
          title: 'Sharing',
          summary: 'Share the customer-facing page',
        },
        {
          key: 'review',
          icon: 'checkmark.seal',
          title: 'Publishing and visibility',
          summary: statusLabel(business.status),
        },
      ],
    },
  ];
  return (
    <View style={styles.panelList}>
      <View style={styles.manageIntro}>
        <ThemedText type="title">Manage</ThemedText>
        <ThemedText themeColor="textSecondary">
          Choose one area to update. Your customer page stays in the app while you work.
        </ThemedText>
      </View>
      {groups.map((group) => (
        <View key={group.label} style={styles.manageGroup}>
          <SectionLabel label={group.label} />
          <View
            style={[
              styles.manageRows,
              { backgroundColor: colors.backgroundElement, borderColor: colors.border },
            ]}
          >
            {group.rows
              .filter((row) => row.key !== 'staff' || canEdit)
              .map((row, index) => (
                <Pressable
                  accessibilityLabel={`${row.title}: ${row.summary}`}
                  accessibilityRole="button"
                  key={`${group.label}-${row.title}-${index}`}
                  onPress={() => onOpen(row.key)}
                  style={({ pressed }) => [
                    styles.manageRow,
                    index > 0 && styles.separatorTop,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.manageIcon, { backgroundColor: colors.backgroundSelected }]}>
                    <SymbolView name={row.icon} tintColor={accent} style={styles.actionIcon} />
                  </View>
                  <View style={styles.rowCopy}>
                    <ThemedText type="smallBold">{row.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small" numberOfLines={2}>
                      {row.summary}
                    </ThemedText>
                  </View>
                  <SymbolView
                    name="chevron.right"
                    tintColor={colors.textSecondary}
                    style={styles.chevron}
                  />
                </Pressable>
              ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export function HoursEditor({
  onDirtyChange,
  colors,
  accent,
  hours,
  canEdit,
  saving,
  onSave,
}: {
  readonly colors: ThemeColors;
  readonly accent: string;
  readonly hours: readonly WorkspaceHour[];
  readonly canEdit: boolean;
  readonly saving: boolean;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onSave: (hours: readonly WorkspaceHour[]) => Promise<boolean>;
}) {
  const scheme = useColorScheme();
  const initial = useMemo(() => normalizeHours(hours), [hours]);
  const [draft, setDraft] = useState<WorkspaceHour[]>(initial);
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [picker, setPicker] = useState<{ day: number; field: 'opens_at' | 'closes_at' } | null>(
    null,
  );

  const missingDays = new Set(hours.map((row) => row.day_of_week)).size < 7;
  const dirty = missingDays || hasUnsavedChanges(initial, draft);
  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges(initial, draft));
  }, [initial, draft, onDirtyChange]);
  const [previousInitial, setPreviousInitial] = useState(initial);
  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setDraft(initial);
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function updateDay(day: number, patch: Partial<WorkspaceHour>) {
    setDraft((current) =>
      current.map((row) => (row.day_of_week === day ? { ...row, ...patch } : row)),
    );
  }

  function pickerValue() {
    const row = draft.find((candidate) => candidate.day_of_week === picker?.day);
    const value = picker ? row?.[picker.field] : null;
    const [hoursText = '09', minutesText = '00'] = (value ?? '09:00').split(':');
    const date = new Date();
    date.setHours(Number(hoursText), Number(minutesText), 0, 0);
    return date;
  }

  return (
    <View style={styles.panelList}>
      <View style={styles.editorIntro}>
        <ThemedText type="smallBold" style={{ color: colors.accent }}>
          WEEKLY SCHEDULE
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {missingDays
            ? 'Hours are not saved yet. Set your week, including closed days, then save.'
            : 'Your week at a glance. Tap a day to change its times.'}
        </ThemedText>
      </View>
      <View
        style={[
          styles.hoursList,
          { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
        ]}
      >
        {draft.map((row) => (
          <View
            key={row.day_of_week}
            style={[
              styles.hoursRow,
              { borderTopWidth: row.day_of_week > 0 ? 1 : 0, borderColor: colors.divider },
            ]}
          >
            <View style={styles.hoursDayHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${dayNames[row.day_of_week]} hours`}
                accessibilityState={{ expanded: expandedDay === row.day_of_week }}
                onPress={() =>
                  setExpandedDay(expandedDay === row.day_of_week ? null : row.day_of_week)
                }
                style={[styles.hoursDayCopy, { minHeight: 44, justifyContent: 'center' }]}
              >
                <ThemedText type="card">{dayNames[row.day_of_week]}</ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: row.is_closed ? colors.textSecondary : colors.accent }}
                >
                  {row.is_closed
                    ? 'Closed'
                    : `${formatTime(row.opens_at)} – ${formatTime(row.closes_at)} · Edit`}
                </ThemedText>
              </Pressable>
              <Switch
                accessibilityLabel={`${dayNames[row.day_of_week]} open`}
                disabled={!canEdit || saving}
                trackColor={{ false: colors.divider, true: colors.actionPrimary }}
                onValueChange={(isOpen) => {
                  if (isOpen) setExpandedDay(row.day_of_week);
                  updateDay(
                    row.day_of_week,
                    isOpen
                      ? {
                          is_closed: false,
                          opens_at: row.opens_at ?? '09:00:00',
                          closes_at: row.closes_at ?? '17:00:00',
                        }
                      : { is_closed: true, opens_at: null, closes_at: null },
                  );
                }}
                value={!row.is_closed}
              />
            </View>
            {!row.is_closed && expandedDay === row.day_of_week && (
              <View style={styles.timeButtons}>
                <TimeButton
                  caption="Opens at"
                  accessibilityLabel={`${dayNames[row.day_of_week]} opening time, ${formatTime(row.opens_at)}`}
                  colors={colors}
                  label={formatTime(row.opens_at)}
                  disabled={!canEdit || saving}
                  onPress={() => setPicker({ day: row.day_of_week, field: 'opens_at' })}
                />
                <TimeButton
                  caption="Closes at"
                  accessibilityLabel={`${dayNames[row.day_of_week]} closing time, ${formatTime(row.closes_at)}`}
                  colors={colors}
                  label={formatTime(row.closes_at)}
                  disabled={!canEdit || saving}
                  onPress={() => setPicker({ day: row.day_of_week, field: 'closes_at' })}
                />
              </View>
            )}
          </View>
        ))}
      </View>
      {canEdit && (
        <Pressable
          accessibilityRole="button"
          disabled={saving || !dirty}
          onPress={async () => {
            void haptics.medium();
            await onSave(draft);
          }}
          style={[
            styles.saveButton,
            { backgroundColor: accent },
            (saving || !dirty) && styles.disabled,
          ]}
        >
          <ThemedText style={{ color: readableOn(accent) }} type="smallBold">
            {saving ? 'Saving…' : dirty ? 'Save hours' : 'Hours saved'}
          </ThemedText>
        </Pressable>
      )}
      {picker && (
        <BusinessWorkspaceSheet
          visible
          onClose={() => setPicker(null)}
          closeAccessibilityLabel="Close time picker"
          title="Choose a time"
          description={`${dayNames[picker.day]} · ${picker.field === 'opens_at' ? 'Opening time' : 'Closing time'}`}
          backgroundColor={colors.backgroundElement}
          accentColor={accent}
          closeVariant="text"
        >
          <DateTimePicker
            accentColor={accent}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            mode="time"
            onValueChange={(_, value) =>
              updateDay(picker.day, { [picker.field]: `${toTime(value)}:00` })
            }
            presentation="inline"
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            value={pickerValue()}
          />
        </BusinessWorkspaceSheet>
      )}
    </View>
  );
}

function normalizeHours(hours: readonly WorkspaceHour[]): WorkspaceHour[] {
  return Array.from({ length: 7 }, (_, day) => {
    const row = hours.find(
      (candidate) => candidate.day_of_week === day && candidate.interval_number === 1,
    );
    return (
      row ?? {
        day_of_week: day,
        interval_number: 1,
        opens_at: null,
        closes_at: null,
        is_closed: true,
      }
    );
  });
}

function TimeButton({
  caption,
  accessibilityLabel,
  colors,
  label,
  disabled,
  onPress,
}: {
  readonly caption: string;
  readonly accessibilityLabel: string;
  readonly colors: ThemeColors;
  readonly label: string;
  readonly disabled: boolean;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.timeButton,
        { backgroundColor: colors.background, borderColor: colors.divider },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {caption}
      </ThemedText>
      <ThemedText type="smallBold" style={{ fontSize: 17, lineHeight: 24 }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function TodayRow({
  icon,
  label,
  value,
  colors,
}: {
  readonly icon: SymbolName;
  readonly label: string;
  readonly value: string;
  readonly colors: ThemeColors;
}) {
  return (
    <View style={styles.todayRow}>
      <SymbolView name={icon} tintColor={colors.textSecondary} style={styles.actionIcon} />
      <View style={styles.rowCopy}>
        <ThemedText themeColor="textSecondary" type="small">
          {label}
        </ThemedText>
        <ThemedText type="smallBold" numberOfLines={1}>
          {value}
        </ThemedText>
      </View>
    </View>
  );
}

function SectionLabel({ label }: { readonly label: string }) {
  return (
    <ThemedText style={styles.sectionLabel} type="smallBold">
      {label}
    </ThemedText>
  );
}

function formatTime(value: string | null | undefined) {
  if (!value) return 'Not set';
  const [hourText, minute = '00'] = value.split(':');
  const hour = Number(hourText);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function toTime(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function businessTypeLabel(type: WorkspaceBusiness['business_type']) {
  if (type === 'food_drink') return 'Food & drink';
  if (type === 'entertainment_venue') return 'Entertainment & venue';
  if (type === 'mobile') return 'Mobile business';
  if (type === 'retail') return 'Retail';
  if (type === 'services') return 'Services';
  return 'Local business';
}

function statusLabel(status: string) {
  if (status === 'active') return 'Published';
  if (status === 'pending_review') return 'Submitted for approval';
  if (status === 'draft') return 'Not submitted';
  return status.replaceAll('_', ' ');
}

function readableOn(hex: string) {
  const value = hex.replace('#', '');
  if (value.length !== 6) return Brand.onPrimary;
  const [r = 0, g = 0, b = 0] = [0, 2, 4].map((index) =>
    Number.parseInt(value.slice(index, index + 2), 16),
  );
  return (r * 299 + g * 587 + b * 114) / 1000 > 155 ? '#163329' : Brand.onPrimary;
}

const styles = StyleSheet.create({
  panelList: { gap: Spacing.three },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.one,
  },
  overviewHeaderCopy: { flex: 1, gap: 2 },
  logoFrame: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: { color: Brand.onPrimary, fontSize: 26, fontWeight: '800' },
  iconTextAction: { alignItems: 'center', gap: 3, padding: Spacing.one },
  actionIcon: { width: 20, height: 20 },
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  attentionIcon: { width: 28, alignItems: 'center' },
  rowCopy: { flex: 1, gap: 2 },
  inlineAction: {
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  successRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  sectionLabel: { color: Brand.primary, letterSpacing: 1.1, marginTop: Spacing.one },
  quickActions: { borderWidth: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  quickAction: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: { flex: 1 },
  chevron: { width: 16, height: 16 },
  separatorTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(138,147,142,0.65)',
  },
  todayList: { borderWidth: 1, borderRadius: Radius.medium, paddingHorizontal: Spacing.three },
  todayRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  todaySubcopy: { paddingBottom: Spacing.three, paddingLeft: 28 },
  manageCta: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
  },
  manageIntro: { gap: Spacing.one, paddingVertical: Spacing.one },
  manageGroup: { gap: Spacing.two },
  manageRows: { borderWidth: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  manageRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  manageIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorIntro: { gap: Spacing.one, paddingVertical: Spacing.one },
  hoursList: { borderWidth: 1, borderRadius: Radius.large, paddingHorizontal: Spacing.three },
  hoursRow: {
    gap: Spacing.three,
    paddingVertical: 20,
  },
  hoursDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  hoursDayCopy: { flex: 1, gap: 2 },
  timeButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  timeButton: {
    flexGrow: 1,
    flexBasis: 120,
    minHeight: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  exceptionNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  saveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.medium,
  },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
});
