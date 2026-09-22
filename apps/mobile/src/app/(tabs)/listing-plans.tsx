import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Brand, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  annualSavingsLabel,
  listingPlans,
  listingStatusMessage,
  type BillingPeriod,
} from '@/lib/listing-billing-core';
import { useListingBilling } from '@/providers/listing-billing-provider';

function legalUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : null;
  } catch {
    return null;
  }
}

export default function ListingPlansScreen() {
  const colors = useTheme();
  const [period, setPeriod] = useState<BillingPeriod>('yearly');
  const {
    summary,
    packages,
    loading,
    purchasing,
    configured,
    notice,
    error,
    refresh,
    purchase,
    restore,
    manage,
  } = useListingBilling();
  const privacyUrl = legalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
  const termsUrl = legalUrl(process.env.EXPO_PUBLIC_TERMS_URL);
  const deviceProvider = Platform.OS === 'ios' ? 'apple' : 'google';
  const purchasedOnAnotherStore = Boolean(
    summary?.canPublish && summary.provider !== 'test_store' && summary.provider !== deviceProvider,
  );

  const savings = useMemo(() => {
    const result = new Map<string, string>();
    for (const plan of listingPlans) {
      const monthly = packages.find(
        (item) => item.planCode === plan.code && item.period === 'monthly',
      );
      const yearly = packages.find(
        (item) => item.planCode === plan.code && item.period === 'yearly',
      );
      if (monthly && yearly) {
        const label = annualSavingsLabel(monthly.price, yearly.price);
        if (label) result.set(plan.code, label);
      }
    }
    return result;
  }, [packages]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
            <ThemedText style={{ color: Brand.primary }} type="smallBold">
              ‹ Back
            </ThemedText>
          </Pressable>

          <View style={styles.heading}>
            <ThemedText type="title">Listing plan</ThemedText>
            <ThemedText themeColor="textSecondary">
              Create and edit drafts for free. A plan is only needed when an owner is ready to
              submit a business for publication.
            </ThemedText>
          </View>

          {summary && summary.status !== 'none' ? (
            <View
              style={[
                styles.currentCard,
                { backgroundColor: colors.successSurface, borderColor: colors.successText },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" style={{ color: colors.successText }}>
                    CURRENT PLAN
                  </ThemedText>
                  <ThemedText type="subtitle">{summary.planName ?? 'Listing plan'}</ThemedText>
                  <ThemedText themeColor="textSecondary" type="small">
                    {listingStatusMessage(summary)}
                  </ThemedText>
                </View>
                {summary.canPublish ? (
                  <View style={[styles.activePill, { backgroundColor: colors.background }]}>
                    <ThemedText type="smallBold" style={{ color: colors.successText }}>
                      Active
                    </ThemedText>
                  </View>
                ) : null}
              </View>
              <AppButton
                label="Manage with the store"
                onPress={() => void manage()}
                variant="secondary"
              />
            </View>
          ) : null}

          {notice ? <StateNotice kind="success" message={notice} /> : null}
          {error ? <StateNotice kind="error" message={error} /> : null}
          {summary && !summary.billingEnabled ? (
            <StateNotice message="Listing billing is not enabled in this environment yet. Store purchases stay disabled until the products, webhook, and legal links pass staging verification." />
          ) : null}
          {purchasedOnAnotherStore ? (
            <StateNotice message="This plan was purchased through another store. It remains usable here, but plan changes must be made through the original store account." />
          ) : null}

          <View
            accessibilityRole="tablist"
            style={[styles.periodPicker, { backgroundColor: colors.backgroundElement }]}
          >
            {(['monthly', 'yearly'] as const).map((choice) => {
              const selected = period === choice;
              return (
                <Pressable
                  key={choice}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setPeriod(choice)}
                  style={[styles.periodChoice, selected && { backgroundColor: Brand.primary }]}
                >
                  <ThemedText type="smallBold" style={selected ? styles.onPrimary : undefined}>
                    {choice === 'monthly' ? 'Monthly' : 'Yearly'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.planList}>
            {listingPlans.map((plan) => {
              const item = packages.find(
                (candidate) => candidate.planCode === plan.code && candidate.period === period,
              );
              const current = summary?.planCode === plan.code && summary.canPublish;
              return (
                <View
                  key={plan.code}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: colors.backgroundElement,
                      borderColor: current ? Brand.primary : colors.border,
                    },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.flex}>
                      <ThemedText type="subtitle">{plan.name}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        {plan.description}
                      </ThemedText>
                    </View>
                    <View style={styles.priceBlock}>
                      <ThemedText type="card">{item?.priceString ?? '—'}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">
                        per {period === 'monthly' ? 'month' : 'year'}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.slotRow}>
                    <ThemedText type="smallBold">
                      {plan.listingLimit} live {plan.listingLimit === 1 ? 'listing' : 'listings'}
                    </ThemedText>
                    {period === 'yearly' && savings.get(plan.code) ? (
                      <View
                        style={[styles.savingsPill, { backgroundColor: colors.successSurface }]}
                      >
                        <ThemedText type="smallBold" style={{ color: colors.successText }}>
                          {savings.get(plan.code)}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                  <AppButton
                    disabled={
                      !item ||
                      current ||
                      !configured ||
                      !summary?.billingEnabled ||
                      purchasedOnAnotherStore
                    }
                    label={
                      current
                        ? 'Current plan'
                        : item
                          ? `Choose ${plan.name}`
                          : 'Unavailable in this build'
                    }
                    loading={Boolean(item && purchasing)}
                    onPress={() => item && void purchase(item)}
                  />
                </View>
              );
            })}
          </View>

          {!loading && (!configured || packages.length === 0) ? (
            <StateNotice message="Store products are not configured for this installed build yet. Draft business tools remain available. A new Preview build is required after the store keys and products are connected." />
          ) : null}

          <View style={styles.actions}>
            <AppButton
              disabled={!configured}
              label="Restore purchases"
              loading={purchasing}
              onPress={() => void restore()}
              variant="secondary"
            />
            <AppButton
              label="Refresh plan status"
              onPress={() => void refresh()}
              variant="tertiary"
            />
          </View>

          <View style={styles.terms}>
            <ThemedText themeColor="textSecondary" type="small">
              Payment is charged to your Apple or Google account after confirmation. Subscriptions
              renew automatically unless cancelled through your store account before renewal.
              Cancelling stops the next renewal; access continues through the paid period. Expired
              plans unpublish assigned listings without deleting business data.
            </ThemedText>
            <View style={styles.legalLinks}>
              {termsUrl ? (
                <Pressable onPress={() => void Linking.openURL(termsUrl)}>
                  <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                    Terms of use
                  </ThemedText>
                </Pressable>
              ) : null}
              {privacyUrl ? (
                <Pressable onPress={() => void Linking.openURL(privacyUrl)}>
                  <ThemedText type="smallBold" style={{ color: Brand.primary }}>
                    Privacy policy
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
            {!termsUrl || !privacyUrl ? (
              <ThemedText style={{ color: colors.warningText }} type="small">
                Terms and privacy HTTPS links must be configured before store submission.
              </ThemedText>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: 120,
    gap: Spacing.four,
  },
  back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center' },
  heading: { gap: Spacing.two },
  currentCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  flex: { flex: 1, gap: Spacing.one },
  activePill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  periodPicker: { flexDirection: 'row', borderRadius: Radius.medium, padding: 4 },
  periodChoice: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
  },
  onPrimary: { color: Brand.onPrimary },
  planList: { gap: Spacing.three },
  planCard: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  priceBlock: { alignItems: 'flex-end' },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  savingsPill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  actions: { gap: Spacing.two },
  terms: { gap: Spacing.two },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four },
});
