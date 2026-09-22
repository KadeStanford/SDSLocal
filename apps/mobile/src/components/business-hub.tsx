import { BusinessLogo } from './business-logo';
import { AppButton } from './app-button';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Colors, Radius, Spacing } from '@/constants/theme';
import {
  businessHubGroups,
  visibleBusinessHubDestinations,
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
  showCompletionPrompt = true,
}: {
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
  readonly onOrders?: (() => void) | undefined;
  readonly showCompletionPrompt?: boolean;
}) {
  const isMobile = business.business_type === 'mobile';
  const quickActions: readonly {
    readonly key: BusinessSection;
    readonly label: string;
    readonly icon: React.ComponentProps<typeof SymbolView>['name'];
  }[] = [
    { key: 'updates', label: 'Post update', icon: 'megaphone.fill' },
    { key: 'hours', label: 'Change hours', icon: 'clock.fill' },
    isMobile
      ? { key: 'mobile-location', label: 'Set current location', icon: 'mappin.and.ellipse' }
      : { key: 'offerings', label: 'Add an offering', icon: 'plus.circle.fill' },
  ];
  const attentionDestination: BusinessSection | null = attention
    ? attention.key === 'location'
      ? isMobile
        ? 'mobile-location'
        : 'location'
      : attention.key
    : null;
  const incompleteSetup = setupItems.filter((item) => !item.complete);
  const completedSetup = setupItems.length - incompleteSetup.length;
  const [completionOpen, setCompletionOpen] = useState(false);
  useEffect(() => {
    if (showCompletionPrompt !== false && business.status === 'draft' && incompleteSetup.length)
      setCompletionOpen(true);
  }, [business.status, incompleteSetup.length, showCompletionPrompt]);

  return (
    <View style={styles.root}>
      <Modal
        visible={completionOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCompletionOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.backgroundElement }]}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <ThemedText type="title">Finish your business page</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  You’re {Math.round((completedSetup / Math.max(1, setupItems.length)) * 100)}%
                  done. Complete these steps before submitting for review.
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close setup reminder"
                onPress={() => setCompletionOpen(false)}
                style={styles.modalClose}
              >
                <SymbolView name="xmark" tintColor={colors.textSecondary} style={styles.icon} />
              </Pressable>
            </View>
            <View style={styles.modalList}>
              {incompleteSetup.map((item) => (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => {
                    setCompletionOpen(false);
                    onOpen(item.key);
                  }}
                  style={({ pressed }) => [styles.modalRow, pressed && styles.pressed]}
                >
                  <View style={[styles.modalBullet, { backgroundColor: accent }]}>
                    <ThemedText style={styles.modalBulletText}>!</ThemedText>
                  </View>
                  <ThemedText style={styles.grow} type="smallBold">
                    {item.label}
                  </ThemedText>
                  <ThemedText style={{ color: accent }} type="smallBold">
                    Open ›
                  </ThemedText>
                </Pressable>
              ))}
            </View>
            <AppButton
              label="Continue setup"
              onPress={() => {
                setCompletionOpen(false);
                onOpen(incompleteSetup[0]?.key ?? 'review');
              }}
            />
            <AppButton
              label="Remind me later"
              variant="tertiary"
              onPress={() => setCompletionOpen(false)}
            />
          </View>
        </View>
      </Modal>
      {onOrders && <AppButton label="Pickup orders" onPress={onOrders} />}
      <View style={styles.identity}>
        <BusinessLogo name={business.name} uri={logoUri} size={56} decorative />
        <View style={styles.grow}>
          <ThemedText type="title" numberOfLines={2}>
            {business.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" type="small">
            {businessTypeLabel(business.business_type)} · {statusLabel(business.status)}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onPreview}
          style={({ pressed }) => [styles.preview, pressed && styles.pressed]}
        >
          <SymbolView name="eye" tintColor={accent} style={styles.icon} />
          <ThemedText style={{ color: accent }} type="smallBold">
            View as customer
          </ThemedText>
        </Pressable>
      </View>

      {canEdit && business.status === 'draft' && setupItems.length > 0 ? (
        <View
          style={[
            styles.setupCard,
            { backgroundColor: colors.backgroundElement, borderColor: colors.border },
          ]}
        >
          <View style={styles.setupHeading}>
            <View style={styles.grow}>
              <ThemedText type="smallBold">Get ready to publish</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">
                {completedSetup} of {setupItems.length} essentials complete
              </ThemedText>
            </View>
            <ThemedText style={{ color: accent }} type="smallBold">
              {Math.round((completedSetup / setupItems.length) * 100)}%
            </ThemedText>
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
          {incompleteSetup.slice(0, 3).map((item) => (
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
                Your essentials are ready.
              </ThemedText>
              <ThemedText style={{ color: accent }} type="smallBold">
                Submit ›
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
            { backgroundColor: colors.backgroundSelected, borderColor: accent },
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
          <ThemedText style={{ color: accent }} type="smallBold">
            {attention.actionLabel}
          </ThemedText>
        </Pressable>
      ) : null}

      {canEdit ? (
        <>
          <ThemedText style={styles.sectionLabel} type="smallBold">
            QUICK ACTIONS
          </ThemedText>
          <View
            style={[
              styles.rows,
              { backgroundColor: colors.backgroundElement, borderColor: colors.border },
            ]}
          >
            {quickActions.map((action, index) => (
              <HubRow
                key={action.key}
                accent={accent}
                colors={colors}
                icon={action.icon}
                index={index}
                onPress={() => onOpen(action.key)}
                summary={summaryFor(action.key)}
                title={action.label}
              />
            ))}
          </View>
        </>
      ) : null}

      {businessHubGroups.map((group) => {
        const rows = visibleBusinessHubDestinations({ isMobile, canEdit }).filter(
          (destination) => destination.group === group,
        );
        return (
          <View key={group} style={styles.group}>
            <ThemedText style={styles.sectionLabel} type="smallBold">
              {group}
            </ThemedText>
            <View
              style={[
                styles.rows,
                { backgroundColor: colors.backgroundElement, borderColor: colors.border },
              ]}
            >
              {rows.map((destination, index) => (
                <HubRow
                  key={destination.key}
                  accent={accent}
                  colors={colors}
                  icon={destination.icon}
                  index={index}
                  onPress={() => onOpen(destination.key)}
                  summary={summaryFor(destination.key)}
                  title={destination.title}
                />
              ))}
            </View>
          </View>
        );
      })}
      {!canEdit ? (
        <ThemedText themeColor="textSecondary" type="small">
          Staff can fulfill pickup orders. Ask an owner to change business settings or issue
          refunds.
        </ThemedText>
      ) : null}
    </View>
  );
}

function HubRow({
  colors,
  accent,
  icon,
  index,
  title,
  summary,
  onPress,
}: {
  readonly colors: ThemeColors;
  readonly accent: string;
  readonly icon: React.ComponentProps<typeof SymbolView>['name'];
  readonly index: number;
  readonly title: string;
  readonly summary: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        index > 0 && styles.separator,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.backgroundSelected }]}>
        <SymbolView name={icon} tintColor={accent} style={styles.icon} />
      </View>
      <View style={styles.grow}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText themeColor="textSecondary" type="small" numberOfLines={2}>
          {summary}
        </ThemedText>
      </View>
      <SymbolView name="chevron.right" tintColor={colors.textSecondary} style={styles.chevron} />
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
  root: { gap: Spacing.four },
  identity: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  logo: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  logoLetter: { color: Brand.onPrimary, fontSize: 26, fontWeight: '800' },
  grow: { flex: 1, gap: 2 },
  preview: { maxWidth: 80, alignItems: 'center', gap: 4, paddingVertical: Spacing.one },
  attention: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  setupCard: {
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  setupHeading: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  setupTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  setupFill: { height: 6, borderRadius: 3 },
  setupRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  modalCard: { borderRadius: Radius.large, padding: Spacing.four, gap: Spacing.three },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  modalClose: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  modalList: { gap: Spacing.one },
  modalRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modalBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBulletText: { color: '#fff', fontWeight: '800' },
  sectionLabel: { color: Brand.primary, letterSpacing: 1.05 },
  group: { gap: Spacing.two },
  rows: { borderWidth: 1, borderRadius: Radius.medium, overflow: 'hidden' },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { width: 20, height: 20 },
  chevron: { width: 16, height: 16 },
  separator: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(138,147,142,0.65)' },
  pressed: { opacity: 0.72 },
});
