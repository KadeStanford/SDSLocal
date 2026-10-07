import { PublicationRequirements } from '@/components/publication-requirements';
import { FlowSection } from '@/components/flow-layout';
import { MerchantButton, MerchantStatus } from '@/components/merchant-ui';
import { useMerchantTheme } from '@/hooks/use-merchant-theme';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { StateNotice } from '@/components/data-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useScreenBottomPadding } from '@/hooks/use-screen-bottom-padding';
import {
  annualSavingsLabel,
  businessCreationAccess,
  isListingDowngrade,
  listingPlanBenefits,
  listingPlans,
  listingProductMetadata,
  listingStatusMessage,
  subscriptionLegalUrl,
  type BillingPeriod,
} from '@/lib/listing-billing-core';
import { useListingBilling } from '@/providers/listing-billing-provider';
import { useAuth } from '@/providers/auth-provider';
import { savePendingAuthIntent } from '@/lib/auth-intents';

export default function ListingPlansScreen() {
  return <ListingPlansWorkspace />;
}

export function ListingPlansWorkspace({
  purpose = 'manage',
  includeTabOverlay = false,
  onBack = () => router.back(),
  onContinue,
  continuationError,
}: {
  readonly purpose?: 'manage' | 'create';
  readonly includeTabOverlay?: boolean;
  readonly onBack?: () => void;
  readonly onContinue?: () => void;
  readonly continuationError?: string | null;
}) {
  const { session } = useAuth();
  const colors = useTheme();
  const merchantColors = useMerchantTheme();
  const [chosenPlanCode, setSelectedPlanCode] = useState<
    (typeof listingPlans)[number]['code'] | null
  >(null);
  const bottomPadding = useScreenBottomPadding(includeTabOverlay);
  const [chosenPeriod, setPeriod] = useState<BillingPeriod>('monthly');
  const {
    summary,
    packages,
    loading,
    purchasing,
    configured,
    notice,
    error,
    storeDiagnostic,
    refresh,
    purchase,
    restore,
    manage,
  } = useListingBilling();
  const hasYearlyPlans = packages.some((item) => item.period === 'yearly');
  const period = chosenPeriod === 'yearly' && hasYearlyPlans ? 'yearly' : 'monthly';
  const privacyUrl = subscriptionLegalUrl(process.env.EXPO_PUBLIC_PRIVACY_URL);
  const termsUrl = subscriptionLegalUrl(process.env.EXPO_PUBLIC_TERMS_URL);
  const supportUrl = subscriptionLegalUrl(process.env.EXPO_PUBLIC_SUPPORT_URL);
  const storeName = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
  const creationAccess = businessCreationAccess(summary, loading);
  const deviceProvider = Platform.OS === 'ios' ? 'apple' : 'google';
  const purchasedOnAnotherStore = Boolean(
    summary?.canPublish && summary.provider !== 'test_store' && summary.provider !== deviceProvider,
  );

  const selectedPlanCode =
    chosenPlanCode ??
    listingPlans.find((plan) => plan.code === summary?.planCode)?.code ??
    'essentials';
  const selectedPlan = listingPlans.find((plan) => plan.code === selectedPlanCode)!;
  const selectedPackage = packages.find(
    (item) => item.planCode === selectedPlanCode && item.period === period,
  );
  const currentProduct = summary?.productId ? listingProductMetadata(summary.productId) : null;
  const selectedIsCurrent = Boolean(
    summary?.canPublish &&
    summary.planCode === selectedPlanCode &&
    (!currentProduct || currentProduct.period === period),
  );
  const exceedsCapacity = Boolean(
    summary?.canPublish && summary.usedListings > selectedPlan.listingLimit,
  );
  const deferredDowngrade = Boolean(
    summary?.canPublish &&
    currentProduct &&
    isListingDowngrade(currentProduct.planCode, selectedPlanCode),
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
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
          <View style={styles.navigation}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={onBack}
              style={[
                styles.back,
                { backgroundColor: colors.backgroundElement, borderColor: colors.divider },
              ]}
            >
              <ThemedText style={styles.backGlyph}>‹</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" style={styles.wordmark}>
              parish pass<ThemedText style={{ color: colors.accent }}> / business</ThemedText>
            </ThemedText>
          </View>

          <View style={styles.hero}>
            <ThemedText type="smallBold" style={[styles.eyebrow, { color: colors.accent }]}>
              BUILT FOR LOCAL BUSINESS
            </ThemedText>
            <ThemedText accessibilityRole="header" type="title" style={styles.heroTitle}>
              Your business.{'\n'}More possibilities.
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              Every plan covers up to three businesses. Choose the tools you need.
            </ThemedText>
            <View style={[styles.coverage, { backgroundColor: colors.backgroundSelected }]}>
              <ThemedText type="smallBold" style={{ color: colors.accent }}>
                One plan. Up to 3 businesses.
              </ThemedText>
            </View>
          </View>

          {summary && summary.status !== 'none' ? (
            <View
              style={[
                styles.currentCard,
                { backgroundColor: merchantColors.surface, borderColor: merchantColors.border },
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <ThemedText type="smallBold" style={{ color: colors.successText }}>
                    CURRENT PLAN
                  </ThemedText>
                  <ThemedText type="subtitle">
                    {listingPlans.find((plan) => plan.code === summary.planCode)?.name ??
                      summary.planName ??
                      'Business plan'}
                  </ThemedText>
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
                label="Manage or cancel subscription"
                onPress={() => void manage()}
                variant="secondary"
              />
            </View>
          ) : null}

          {notice ? (
            <StateNotice kind={summary?.canPublish ? 'success' : 'info'} message={notice} />
          ) : null}
          {error ? <StateNotice kind="error" message={error} /> : null}
          {process.env.EXPO_PUBLIC_APP_ENV === 'staging' && storeDiagnostic ? (
            <ThemedText type="small" themeColor="textSecondary">
              Testing details: {storeDiagnostic}
            </ThemedText>
          ) : null}
          {!loading && (error || !packages.length) && session ? (
            <MerchantButton
              label="Try again"
              secondary
              disabled={purchasing}
              onPress={() => void refresh()}
            />
          ) : null}
          <PublicationRequirements />
          {continuationError ? <StateNotice kind="error" message={continuationError} /> : null}
          {summary && !summary.billingEnabled ? (
            <StateNotice message="Subscriptions are not open yet. During preview, you can set up your business without a subscription." />
          ) : null}
          {!session ? (
            <AppButton
              label="Sign in or create an account"
              onPress={() => {
                savePendingAuthIntent({ kind: 'create_business' });
                router.replace({ pathname: '/account', params: { startBusiness: '1' } });
              }}
            />
          ) : null}
          {purpose === 'create' && session ? (
            <View style={styles.heading}>
              {creationAccess === 'full' ? (
                <StateNotice message="Your plan is already assigned to its maximum number of businesses. Manage your existing businesses before creating another." />
              ) : null}
              {creationAccess === 'ready' || creationAccess === 'preview' ? (
                <AppButton
                  label={
                    creationAccess === 'ready'
                      ? 'Continue to business setup'
                      : 'Continue during preview'
                  }
                  disabled={loading || purchasing}
                  onPress={() => onContinue?.()}
                />
              ) : null}
              {creationAccess === 'checking' ? (
                <StateNotice message="Checking your subscription before business setup…" />
              ) : null}
            </View>
          ) : null}
          {purchasedOnAnotherStore ? (
            <StateNotice message="This plan was purchased through another store. It remains usable here, but plan changes must be made through the original store account." />
          ) : null}

          <View style={styles.sectionHeading}>
            <ThemedText accessibilityRole="header" type="subtitle">
              Business plans
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Choose your tools
            </ThemedText>
          </View>
          {hasYearlyPlans ? (
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
                    disabled={purchasing}
                    onPress={() => setPeriod(choice)}
                    style={[styles.periodChoice, selected && { backgroundColor: colors.accent }]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: selected ? colors.onAccent : colors.textSecondary }}
                    >
                      {choice === 'monthly' ? 'Monthly' : 'Yearly'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Business plans"
            style={styles.planList}
          >
            {listingPlans.map((plan) => {
              const item = packages.find(
                (candidate) => candidate.planCode === plan.code && candidate.period === period,
              );
              const current =
                summary?.planCode === plan.code &&
                summary.canPublish &&
                (!currentProduct || currentProduct.period === period);
              const selected = selectedPlanCode === plan.code;
              return (
                <Pressable
                  key={plan.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected, disabled: purchasing }}
                  accessibilityLabel={
                    plan.name +
                    ', ' +
                    plan.listingLimit +
                    ' businesses, ' +
                    (item?.priceString ?? 'price unavailable') +
                    ' per ' +
                    (period === 'monthly' ? 'month' : 'year')
                  }
                  disabled={purchasing}
                  onPress={() => setSelectedPlanCode(plan.code)}
                  style={({ pressed }) => [
                    styles.planCard,
                    {
                      borderColor: selected ? colors.accent : colors.divider,
                      backgroundColor: selected
                        ? colors.backgroundSelected
                        : colors.backgroundElement,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <View style={styles.rowBetween}>
                    <View style={styles.flex}>
                      <ThemedText type="subtitle">{plan.name}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {plan.code === 'essentials'
                          ? 'Establish your presence'
                          : plan.code === 'growth'
                            ? 'Build lasting connections'
                            : 'Turn interest into business'}
                      </ThemedText>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? colors.accent : colors.backgroundElement,
                        },
                      ]}
                    >
                      {selected ? (
                        <ThemedText
                          accessible={false}
                          style={[styles.check, { color: colors.onAccent }]}
                        >
                          ✓
                        </ThemedText>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <ThemedText type="number" style={item ? styles.price : styles.unavailablePrice}>
                      {item?.priceString ?? (loading ? 'Loading…' : 'Unavailable')}
                    </ThemedText>
                    {item ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        / {period === 'monthly' ? 'month' : 'year'}
                      </ThemedText>
                    ) : null}
                  </View>
                  <View style={[styles.planFeatures, { borderColor: colors.divider }]}>
                    {plan.benefits.map((benefit) => (
                      <View key={benefit} style={styles.benefitRow}>
                        <ThemedText
                          accessible={false}
                          type="smallBold"
                          style={{ color: colors.accent }}
                        >
                          ✓
                        </ThemedText>
                        <ThemedText type="small" style={styles.benefitText}>
                          {benefit}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                  {current || (period === 'yearly' && savings.get(plan.code)) ? (
                    <View
                      style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      {current && <MerchantStatus label="Current plan" tone="success" />}
                      {period === 'yearly' && savings.get(plan.code) && (
                        <MerchantStatus label={savings.get(plan.code)!} tone="success" />
                      )}
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View
            style={[
              styles.checkout,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.divider,
              },
            ]}
          >
            <View style={styles.checkoutContent}>
              <View style={styles.sectionHeading}>
                <View style={styles.flex}>
                  <ThemedText type="small" themeColor="textSecondary">
                    YOUR SELECTION
                  </ThemedText>
                  <ThemedText type="card">{selectedPlan.name}</ThemedText>
                </View>
                {selectedPackage ? (
                  <ThemedText type="smallBold">
                    {selectedPackage.priceString} / {period === 'monthly' ? 'month' : 'year'}
                  </ThemedText>
                ) : null}
              </View>
              {selectedPackage ? (
                <View style={styles.heading}>
                  <ThemedText type="small" themeColor="textSecondary">
                    The full {selectedPackage.priceString} is billed{' '}
                    {period === 'monthly' ? 'each month' : 'each year'}. Renews automatically until
                    cancelled in {storeName}. No free trial.
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Billing begins on confirmation. Publication requires approval.
                  </ThemedText>
                  {summary?.canPublish && !selectedIsCurrent ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {deferredDowngrade
                        ? 'Your current tools remain available through the paid period. The lower plan starts at the next renewal. The store confirms the effective date and charges.'
                        : 'The store confirms the charge and when your plan change takes effect. Upgrades may apply immediately; billing duration changes may start at renewal.'}
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
              <AppButton
                label={
                  selectedIsCurrent
                    ? 'Current plan'
                    : selectedPackage
                      ? `Subscribe to ${selectedPlan.name} · ${selectedPackage.priceString}/${period === 'monthly' ? 'month' : 'year'}`
                      : loading
                        ? 'Loading plans…'
                        : 'Plans unavailable'
                }
                disabled={
                  selectedIsCurrent ||
                  exceedsCapacity ||
                  !selectedPackage ||
                  !configured ||
                  !session ||
                  !summary?.billingEnabled ||
                  purchasedOnAnotherStore ||
                  !termsUrl ||
                  !privacyUrl ||
                  !supportUrl ||
                  loading
                }
                loading={purchasing}
                onPress={() => selectedPackage && void purchase(selectedPackage)}
              />
              {exceedsCapacity ? (
                <StateNotice message="This plan has fewer slots than your assigned businesses. Keep your current plan until you can choose which businesses to retain." />
              ) : null}
              <View style={styles.legalLinks}>
                {termsUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    style={{ minHeight: 44, justifyContent: 'center' }}
                    onPress={() => void Linking.openURL(termsUrl)}
                  >
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>
                      Terms of use
                    </ThemedText>
                  </Pressable>
                ) : null}
                {privacyUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    style={{ minHeight: 44, justifyContent: 'center' }}
                    onPress={() => void Linking.openURL(privacyUrl)}
                  >
                    <ThemedText type="smallBold" style={{ color: colors.accent }}>
                      Privacy policy
                    </ThemedText>
                  </Pressable>
                ) : null}
              </View>
              {!termsUrl || !privacyUrl || !supportUrl ? (
                <ThemedText style={{ color: colors.warningText }} type="small">
                  Terms, privacy, or support links are currently unavailable. Plan purchases are
                  disabled.
                </ThemedText>
              ) : null}
            </View>
          </View>

          <FlowSection
            title="Included with every paid plan"
            description="Explore the features available on every plan"
            collapsible
          >
            {listingPlanBenefits.map((benefit) => (
              <View key={benefit} style={styles.benefitRow}>
                <ThemedText accessible={false} type="smallBold" style={{ color: colors.accent }}>
                  ✓
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.benefitText}>
                  {benefit}
                </ThemedText>
              </View>
            ))}
            <ThemedText type="small" themeColor="textSecondary">
              Ordering and appointments require supported payment setup and availability. Payment
              processing fees are separate. A subscription does not guarantee business approval or
              customer reach.
            </ThemedText>
          </FlowSection>

          <View style={styles.actions}>
            <AppButton
              disabled={!configured || !session || loading}
              label="Restore purchases"
              loading={purchasing}
              onPress={() => void restore()}
              variant="tertiary"
            />
            {summary?.status !== 'none' && summary ? (
              <AppButton
                label="Refresh plan status"
                disabled={loading || purchasing}
                onPress={() => void refresh()}
                variant="tertiary"
              />
            ) : null}
            {purpose === 'create' ? (
              <AppButton label="Continue as a customer" onPress={onBack} variant="tertiary" />
            ) : null}
          </View>

          <View style={styles.terms}>
            <ThemedText themeColor="textSecondary" type="small">
              Your personal account and customer features are free. Payment is charged to your
              {` ${storeName}`} account after confirmation. Subscriptions renew automatically unless
              cancelled through your store account before renewal. Cancelling stops the next
              renewal; access continues through the paid period. Expired plans unpublish assigned
              listings without deleting business data.
            </ThemedText>
            {supportUrl ? (
              <AppButton
                label="Subscription support"
                variant="tertiary"
                onPress={() => void Linking.openURL(supportUrl)}
              />
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  checkout: { borderWidth: 1, borderRadius: 20, padding: 20 },
  checkoutContent: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: Spacing.two },
  content: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.four,
  },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    height: 44,
    width: 44,
    borderWidth: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backGlyph: { fontSize: 30, lineHeight: 34 },
  wordmark: { fontSize: 17, letterSpacing: -0.5, flexShrink: 1 },
  hero: { gap: 12, paddingVertical: 8 },
  eyebrow: { fontSize: 11, letterSpacing: 1.6 },
  heroTitle: { fontSize: 36, lineHeight: 40, letterSpacing: -1.2 },
  coverage: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  check: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 },
  price: { fontSize: 32, lineHeight: 38, letterSpacing: -1 },
  unavailablePrice: { fontSize: 18, lineHeight: 26 },
  planFeatures: { borderTopWidth: 1, paddingTop: 14, gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  benefitText: { flex: 1 },
  included: { borderWidth: 1, borderRadius: 20, padding: 20, gap: 16 },
  heading: { gap: Spacing.two },
  currentCard: {
    borderWidth: 1,
    borderRadius: 12,
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
  planList: { gap: Spacing.three },
  planCard: {
    borderWidth: 2,
    borderRadius: Radius.large,
    padding: 20,
    gap: 14,
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
