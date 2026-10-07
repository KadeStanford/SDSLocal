import { PageHeader } from '@/components/page-header';

import { BusinessLogo } from './business-logo';
import { AppButton } from './app-button';
import { AppIcon, AppIcon as SymbolView } from '@/components/app-icon';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import {
  businessHubGroups,
  visibleBusinessHubDestinations,
  type BusinessHubGroup,
  type BusinessSection,
} from '@/lib/business-workspace-config';

type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

export interface BusinessHubBusiness {
  readonly name: string;
  readonly status: string;
  readonly business_type:
    'food_drink' | 'services' | 'retail' | 'entertainment_venue' | 'mobile' | 'general';
}

export interface BusinessHubAttention {
  readonly key: 'review' | 'profile' | 'hours' | 'location' | 'offerings' | 'photos';
  readonly title: string;
  readonly detail: string;
  readonly actionLabel: string;
}

export interface BusinessHubSetupItem {
  readonly key: BusinessSection;
  readonly label: string;
  readonly complete: boolean;
}

export function BusinessHub({
  business,
  colors,
  accent,
  canEdit,
  logoUri,
  attention,
  setupItems,
  summaryFor,
  onPreview,
  onOpen,
  onOrders,
  onRequests,
  showBrand = true,
}: {
  readonly showBrand?: boolean;
  readonly business: BusinessHubBusiness;
  readonly colors: ThemeColors;
  readonly accent: string;
  readonly canEdit: boolean;
  readonly logoUri: string | null;
  readonly attention: BusinessHubAttention | null;
  readonly setupItems: readonly BusinessHubSetupItem[];
  readonly summaryFor: (destination: BusinessSection) => string;
  readonly onPreview: () => void;
  readonly onOpen: (destination: BusinessSection) => void;
  readonly onRequests?: (() => void) | undefined;
  readonly onOrders?: (() => void) | undefined;
}) {
  const isMobile = business.business_type === 'mobile';
  const [expandedGroup, setExpandedGroup] = useState<BusinessHubGroup | null>('OPERATIONS');
  const attentionDestination: BusinessSection | null = attention
    ? attention.key === 'location'
      ? isMobile
        ? 'mobile-location'
        : 'location'
      : attention.key
    : null;
  const incompleteSetup = setupItems.filter((item) => !item.complete);
  const completedSetup = setupItems.length - incompleteSetup.length;

  return (
    <View style={styles.root}>
      {showBrand && <PageHeader />}
      <View
        style={{
          gap: 16,
          padding: 18,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.divider,
          backgroundColor: colors.backgroundElement,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <BusinessLogo name={business.name} uri={logoUri} size={56} decorative />
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <ThemedText type="card" style={{ fontSize: 24, lineHeight: 30 }}>
              {business.name}
            </ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              {businessTypeLabel(business.business_type)}
            </ThemedText>
          </View>
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: colors.backgroundSelected,
              paddingHorizontal: 10,
              paddingVertical: 7,
              borderRadius: 8,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  business.status === 'active' ? colors.accent : colors.textSecondary,
              }}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {statusLabel(business.status)}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View public page"
            onPress={onPreview}
            style={({ pressed }) => [
              styles.preview,
              {
                minHeight: 48,
                width: '100%',
                justifyContent: 'center',
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: colors.backgroundSelected,
                gap: 8,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView name="eye" tintColor={colors.accent} style={styles.icon} />
            <ThemedText type="smallBold" style={{ color: colors.text }}>
              View public page
            </ThemedText>
          </Pressable>
        </View>
      </View>
      {(onRequests || onOrders) && (
        <View style={{ gap: 12 }}>
          <ThemedText accessibilityRole="header" type="subtitle">
            Your day-to-day
          </ThemedText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {onRequests && (
              <AppButton
                style={{ flex: 1, minWidth: 145 }}
                icon={<AppIcon name="inbox" tintColor="#FFFFFF" size={20} />}
                label="Requests & estimates"
                onPress={onRequests}
              />
            )}
            {onOrders && (
              <AppButton
                style={{ flex: 1, minWidth: 145 }}
                icon={<AppIcon name="shopping-bag" tintColor="#FFFFFF" size={20} />}
                label="Pickup orders"
                onPress={onOrders}
              />
            )}
          </View>
        </View>
      )}

      {canEdit && business.status === 'draft' && setupItems.length > 0 ? (
        <View
          style={[
            styles.setupCard,
            { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
          ]}
        >
          <View style={styles.setupHeading}>
            <View style={styles.grow}>
              <ThemedText type="smallBold">Business setup</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {completedSetup} of {setupItems.length} steps complete
              </ThemedText>
            </View>
          </View>
          <View style={[styles.setupTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.setupFill,
                {
                  backgroundColor: accent,
                  width: `${(completedSetup / setupItems.length) * 100}%`,
                },
              ]}
            />
          </View>
          {incompleteSetup.slice(0, 1).map((item) => (
            <Pressable
              key={`${item.key}-${item.label}`}
              accessibilityRole="button"
              onPress={() => onOpen(item.key)}
              style={styles.setupRow}
            >
              <ThemedText style={styles.grow} type="small">
                {item.label}
              </ThemedText>
              <ThemedText style={{ color: accent }} type="smallBold">
                Open ›
              </ThemedText>
            </Pressable>
          ))}
          {incompleteSetup.length === 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => onOpen('review')}
              style={styles.setupRow}
            >
              <ThemedText style={styles.grow} type="smallBold">
                Ready for review.
              </ThemedText>
              <ThemedText style={{ color: accent }} type="smallBold">
                Review ›
              </ThemedText>
            </Pressable>
          )}
        </View>
      ) : null}

      {attention &&
      attentionDestination &&
      !(business.status === 'draft' && setupItems.length > 0) ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen(attentionDestination)}
          style={({ pressed }) => [
            styles.attention,
            { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView name="exclamationmark.circle.fill" tintColor={accent} style={styles.icon} />
          <View style={styles.grow}>
            <ThemedText type="smallBold">{attention.title}</ThemedText>
            <ThemedText themeColor="textSecondary" type="small" numberOfLines={2}>
              {attention.detail}
            </ThemedText>
          </View>
          <AppIcon name="chevron-right" size={18} />
        </Pressable>
      ) : null}

      {businessHubGroups.map((group) => {
        const rows = visibleBusinessHubDestinations({
          isMobile,
          canEdit,
          businessType: business.business_type,
        }).filter((destination) => destination.group === group);
        const expanded = expandedGroup === group;
        const category = groupPresentation[group];
        return (
          <View
            key={group}
            style={[
              styles.groupCard,
              { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpandedGroup(expanded ? null : group)}
              style={({ pressed }) => [
                styles.groupHeader,
                { backgroundColor: colors.backgroundElement, borderRadius: 8 },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.grow}>
                <ThemedText type="smallBold">{category.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {rows.length} tools
                </ThemedText>
              </View>
              <SymbolView
                name={expanded ? 'chevron.up' : 'chevron.down'}
                tintColor={colors.textSecondary}
                style={styles.chevron}
              />
            </Pressable>
            {expanded && (
              <View style={[styles.destinationRows, { borderTopColor: colors.divider }]}>
                {rows.map((destination, index) => (
                  <HubRow
                    key={destination.key}
                    colors={colors}
                    icon={destination.icon}
                    index={index}
                    tile={false}
                    onPress={() => onOpen(destination.key)}
                    summary={summaryFor(destination.key)}
                    title={
                      destination.key === 'offerings'
                        ? offeringTitle(business.business_type)
                        : destination.title
                    }
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
      {!canEdit ? (
        <ThemedText themeColor="textSecondary" type="small">
          Staff can manage pickup orders. Only owners can change settings or issue refunds.
        </ThemedText>
      ) : null}
    </View>
  );
}

const groupPresentation: Record<
  BusinessHubGroup,
  {
    readonly title: string;
  }
> = {
  'CUSTOMER EXPERIENCE': { title: 'Your business page' },
  OPERATIONS: { title: 'Operations' },
  'MARKETING AND VISIBILITY': { title: 'Promotion & sharing' },
};

function offeringTitle(businessType: BusinessHubBusiness['business_type']) {
  if (businessType === 'food_drink' || businessType === 'mobile') return 'Menu';
  if (businessType === 'services') return 'Services';
  return 'Offerings';
}

function HubRow({
  colors,
  icon,
  index,
  title,
  summary,
  onPress,
  tile = false,
}: {
  readonly colors: ThemeColors;
  readonly icon: React.ComponentProps<typeof SymbolView>['name'];
  readonly index: number;
  readonly title: string;
  readonly summary: string;
  readonly onPress: () => void;
  readonly tile?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        tile && [
          styles.operationTile,
          { borderColor: colors.divider, backgroundColor: colors.backgroundElement },
        ],
        !tile && index > 0 && styles.separator,
        !tile && index > 0 && { borderTopColor: colors.divider },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={
          tile
            ? {
                width: '100%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }
            : [styles.rowIcon, { backgroundColor: colors.backgroundSelected }]
        }
      >
        <SymbolView
          name={icon}
          tintColor={tile ? colors.accent : colors.textSecondary}
          style={{ width: 24, height: 24 }}
        />
        {tile && (
          <SymbolView
            name="chevron.right"
            tintColor={colors.textMuted}
            style={{ width: 14, height: 14 }}
          />
        )}
      </View>
      <View style={[styles.grow, tile && { flexBasis: 'auto', flexGrow: 0 }]}>
        <ThemedText type="smallBold" style={tile ? { fontSize: 16, lineHeight: 22 } : undefined}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small">
          {summary}
        </ThemedText>
      </View>
      {!tile && (
        <SymbolView name="chevron.right" tintColor={colors.textSecondary} style={styles.chevron} />
      )}
    </Pressable>
  );
}

function businessTypeLabel(type: BusinessHubBusiness['business_type']) {
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

const styles = StyleSheet.create({
  root: { gap: 16 },
  operationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 0,
  },
  operationTile: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 164,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 16,
  },
  identity: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.three,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  grow: { flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: 4 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  attention: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.two,
  },
  setupCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  setupHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  setupTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  setupFill: { height: 6, borderRadius: 3 },
  setupRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  groupCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
  },
  groupHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  destinationRows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    minHeight: 80,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 20, height: 20 },
  chevron: { width: 16, height: 16 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.72 },
});
