import { openListingSubscriptionManagement } from '@/lib/listing-subscription-management';
import { Alert, AppState, Platform } from 'react-native';
import { listingNativeErrorDiagnostic } from '@/lib/listing-native-diagnostic';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ListingBillingIdentityCoordinator,
  type BillingIdentityRequest,
} from '@/lib/listing-billing-identity';
import {
  isListingDowngrade,
  listingPlans,
  listingProductMetadata,
  subscriptionLegalUrl,
  type ListingBillingSummary,
} from '@/lib/listing-billing-core';
import { supabase } from '@/lib/supabase';
import {
  listingPurchaseErrorFeedback,
  listingStoreHasActivePlan,
} from '@/lib/listing-purchase-feedback';
import { useAuth } from '@/providers/auth-provider';

import { parseStoreListingPackages, type StoreListingPackage } from '@/lib/listing-store-packages';

export type { StoreListingPackage } from '@/lib/listing-store-packages';

interface ListingBillingContextValue {
  readonly summary: ListingBillingSummary | null;
  readonly packages: readonly StoreListingPackage[];
  readonly loading: boolean;
  readonly purchasing: boolean;
  readonly configured: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  readonly storeDiagnostic: string | null;
  readonly refresh: () => Promise<void>;
  readonly purchase: (item: StoreListingPackage) => Promise<boolean>;
  readonly restore: () => Promise<boolean>;
  readonly manage: () => Promise<void>;
}

const ListingBillingContext = createContext<ListingBillingContextValue | null>(null);

function publicApiKey() {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  return undefined;
}

async function waitForServerEntitlement(
  expectedProductId: string | undefined,
  isCurrent: () => boolean,
) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase.rpc('get_my_listing_billing');
    if (!isCurrent()) return undefined;
    const summary = data as ListingBillingSummary | null;
    if (summary?.canPublish && (!expectedProductId || summary.productId === expectedProductId)) {
      return summary;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    if (!isCurrent()) return undefined;
  }
  return null;
}

export function ListingBillingProvider({ children }: PropsWithChildren) {
  const { session, loading: authLoading } = useAuth();
  const activeRequestRef = useRef<BillingIdentityRequest | null>(null);
  const [identityCoordinator] = useState(
    () =>
      new ListingBillingIdentityCoordinator(async () => {
        const { default: Purchases } = await import('react-native-purchases');
        return Purchases;
      }, publicApiKey() ?? ''),
  );
  const [summary, setSummary] = useState<ListingBillingSummary | null>(null);
  const [summaryUserId, setSummaryUserId] = useState<string | null>(null);
  const [packages, setPackages] = useState<readonly StoreListingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeDiagnostic, setStoreDiagnostic] = useState<string | null>(null);

  const resetBillingState = useCallback(() => {
    setLoading(true);
    setPurchasing(false);
    setConfigured(false);
    setPackages([]);
    setSummary(null);
    setSummaryUserId(null);
    setError(null);
    setStoreError(null);
    setStoreDiagnostic(null);
    setNotice(null);
  }, []);

  const commitIfActive = useCallback(
    (request: BillingIdentityRequest, commit: () => void) => {
      if (activeRequestRef.current !== request) return false;
      return identityCoordinator.commitIfCurrent(request, commit);
    },
    [identityCoordinator],
  );

  const refreshFor = useCallback(
    async (request: BillingIdentityRequest, userId: string) => {
      if (!identityCoordinator.isCurrent(request)) return false;

      const { data, error: queryError } = await supabase.rpc('get_my_listing_billing');
      if (queryError) {
        commitIfActive(request, () => {
          setSummary(null);
          setSummaryUserId(userId);
          setError('Your listing plan could not be checked. Pull to refresh and try again.');
        });
        return false;
      }
      commitIfActive(request, () => {
        setSummary(data as ListingBillingSummary | null);
        setSummaryUserId(userId);
      });
      return true;
    },
    [commitIfActive, identityCoordinator],
  );

  const initializeSdkFor = useCallback(
    async (request: BillingIdentityRequest) => {
      let stage = 'store';
      try {
        const offerings = await identityCoordinator.runSdkFor(request, async () => {
          const { default: Purchases } = await import('react-native-purchases');
          return Purchases.getOfferings();
        });
        if (!offerings) return false;

        const offering =
          offerings.all[process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? 'business_listing'] ??
          offerings.current;
        stage = 'catalog';
        const { data: enabledProducts, error: catalogError } = await supabase
          .from('billing_products')
          .select('product_id,billing_plans!inner(is_active)')
          .eq('provider', Platform.OS === 'ios' ? 'apple' : 'google')
          .eq('is_active', true)
          .eq('billing_plans.is_active', true);
        if (catalogError) throw catalogError;
        const enabledProductIds = new Set<string>(
          (enabledProducts ?? []).map((product) => product.product_id as string),
        );
        const selectablePackages = parseStoreListingPackages(
          offering?.availablePackages ?? [],
          Platform.OS,
          enabledProductIds,
        );
        stage = 'products';
        if (!selectablePackages.length) {
          throw Object.assign(new Error('No supported store products.'), {
            code: `returned=${offering?.availablePackages.length ?? 0},enabled=${enabledProductIds.size}`,
          });
        }
        return commitIfActive(request, () => {
          setPackages(selectablePackages);
          setConfigured(true);
          setStoreError(null);
          setStoreDiagnostic(null);
        });
      } catch (cause) {
        commitIfActive(request, () => {
          setConfigured(identityCoordinator.isReadyFor(request));
          setPackages([]);
          setStoreError(
            stage === 'catalog'
              ? 'Plans could not be checked. Try again.'
              : `Plans could not load from ${Platform.OS === 'ios' ? 'the App Store' : 'Google Play'}. Try again.`,
          );
          const code = (cause as { code?: unknown } | null)?.code;
          setStoreDiagnostic(
            `${stage}: ${typeof code === 'string' || typeof code === 'number' ? String(code).slice(0, 120) : 'unknown'}`,
          );
        });
        return false;
      }
    },
    [commitIfActive, identityCoordinator],
  );

  const refresh = useCallback(async () => {
    let request = activeRequestRef.current;
    const userId = session?.user.id;
    if (!request || !userId || request.userId !== userId || purchasing) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    // Retry the native identity too if initialization failed on the first launch.
    if (request.enabled && !identityCoordinator.isReadyFor(request)) {
      request = identityCoordinator.request(userId, true);
      activeRequestRef.current = request;
      await request.ready;
    }
    try {
      await Promise.all([
        refreshFor(request, userId),
        request.enabled ? initializeSdkFor(request) : Promise.resolve(false),
      ]);
    } finally {
      commitIfActive(request, () => setLoading(false));
    }
  }, [
    commitIfActive,
    identityCoordinator,
    initializeSdkFor,
    purchasing,
    refreshFor,
    session?.user.id,
  ]);

  useEffect(() => {
    if (authLoading) return;

    const userId = session?.user.id ?? null;
    const sdkAvailable = Boolean(publicApiKey() && Platform.OS !== 'web');
    const request = identityCoordinator.request(userId, sdkAvailable);
    activeRequestRef.current = request;

    // Auth changes must clear the previous account's billing state immediately.
    resetBillingState();

    const summaryTask = userId ? refreshFor(request, userId) : Promise.resolve(true);
    const sdkTask = userId && sdkAvailable ? initializeSdkFor(request) : request.ready;
    void Promise.all([summaryTask, sdkTask]).then(() => {
      commitIfActive(request, () => setLoading(false));
    });

    return () => {
      if (activeRequestRef.current === request) activeRequestRef.current = null;
    };
  }, [
    authLoading,
    commitIfActive,
    identityCoordinator,
    initializeSdkFor,
    refreshFor,
    resetBillingState,
    session,
  ]);

  const purchase = useCallback(
    async (item: StoreListingPackage) => {
      const request = activeRequestRef.current;
      const userId = session?.user.id;
      if (
        !request ||
        !userId ||
        request.userId !== userId ||
        !identityCoordinator.isReadyFor(request) ||
        !configured ||
        purchasing ||
        summaryUserId !== userId ||
        !summary?.billingEnabled
      ) {
        return false;
      }
      const deviceProvider = Platform.OS === 'ios' ? 'apple' : 'google';
      if (
        summary?.canPublish &&
        summary.provider !== 'test_store' &&
        summary.provider !== deviceProvider
      ) {
        setError('Manage this plan through the store where it was originally purchased.');
        return false;
      }
      if (
        ![
          process.env.EXPO_PUBLIC_TERMS_URL,
          process.env.EXPO_PUBLIC_PRIVACY_URL,
          process.env.EXPO_PUBLIC_SUPPORT_URL,
        ].every(subscriptionLegalUrl)
      ) {
        setError('The subscription terms are unavailable. Please try again later.');
        return false;
      }
      const nextPlan = listingPlans.find((plan) => plan.code === item.planCode);
      if (!nextPlan || (summary.canPublish && summary.usedListings > nextPlan.listingLimit)) {
        setError(
          'This plan cannot cover your assigned businesses. Keep your current plan for now.',
        );
        return false;
      }
      setPurchasing(true);
      setError(null);
      setNotice(null);
      setStoreDiagnostic(null);
      try {
        // Recheck activation immediately before opening the store purchase sheet.
        const { data: activeProduct, error: catalogError } = await supabase
          .from('billing_products')
          .select('product_id,billing_plans!inner(is_active)')
          .eq('provider', deviceProvider)
          .eq('product_id', item.package.product.identifier)
          .eq('is_active', true)
          .eq('billing_plans.is_active', true)
          .maybeSingle();
        if (!identityCoordinator.isCurrent(request)) return false;
        if (catalogError || !activeProduct) {
          commitIfActive(request, () => setError('This plan is not available for purchase yet.'));
          return false;
        }
        const currentProduct = summary?.productId
          ? listingProductMetadata(summary.productId)
          : null;
        const deferredDowngrade = Boolean(
          currentProduct && isListingDowngrade(currentProduct.planCode, item.planCode),
        );
        const purchased = await identityCoordinator.runIfReady(request, async () => {
          const { default: Purchases } = await import('react-native-purchases');
          if (Platform.OS === 'android') {
            if (!item.subscriptionOption) throw new Error('Subscription base plan unavailable.');
            const productChange =
              summary?.canPublish &&
              summary.provider === 'google' &&
              summary.productId &&
              summary.productId !== item.package.product.identifier
                ? {
                    oldProductIdentifier: summary.productId,
                    replacementMode: deferredDowngrade
                      ? Purchases.STORE_REPLACEMENT_MODE.DEFERRED
                      : currentProduct?.planCode === item.planCode
                        ? Purchases.STORE_REPLACEMENT_MODE.WITHOUT_PRORATION
                        : Purchases.STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION,
                  }
                : null;
            return Purchases.purchaseSubscriptionOption(item.subscriptionOption, productChange);
          } else {
            return Purchases.purchasePackage(item.package);
          }
        });
        if (!purchased) return false;
        if (
          process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === 'true' &&
          identityCoordinator.isCurrent(request)
        ) {
          Alert.alert(
            'Store purchase diagnostic',
            [
              'The native purchase call completed.',
              `Active subscriptions: ${purchased.customerInfo.activeSubscriptions.length}`,
              `Purchased products: ${purchased.customerInfo.allPurchasedProductIdentifiers.length}`,
              `Selected plan active: ${listingStoreHasActivePlan(purchased.customerInfo, item.package.product.identifier) ? 'yes' : 'no'}`,
              `Store response: ${purchased.customerInfo.requestDate}`,
            ].join('\n'),
          );
        }
        if (deferredDowngrade) {
          await refreshFor(request, userId);
          commitIfActive(request, () =>
            setNotice(`Your switch to ${nextPlan.name} is scheduled for the next renewal date.`),
          );
          return true;
        }
        const serverSummary = await waitForServerEntitlement(
          item.package.product.identifier,
          () => activeRequestRef.current === request && identityCoordinator.isCurrent(request),
        );
        if (serverSummary === undefined) return false;
        if (serverSummary) {
          if (
            !commitIfActive(request, () => {
              setSummary(serverSummary);
              setSummaryUserId(userId);
              setNotice('Your listing plan is active.');
            })
          ) {
            return false;
          }
          return true;
        }
        const storeActive = listingStoreHasActivePlan(
          purchased.customerInfo,
          item.package.product.identifier,
        );
        commitIfActive(request, () => {
          setStoreDiagnostic(
            storeActive ? 'purchase: server-sync-pending' : 'purchase: no-active-entitlement',
          );
          if (storeActive) {
            setNotice(
              'The store confirmed your plan. Account activation is still syncing. Use Restore purchases to check again; do not buy another plan.',
            );
          } else {
            setError(
              'The store returned without an active listing plan. Check your store subscriptions, then use Restore purchases before trying to buy again.',
            );
          }
        });
        await refreshFor(request, userId);
        return false;
      } catch (purchaseError) {
        if (
          process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === 'true' &&
          identityCoordinator.isCurrent(request)
        ) {
          Alert.alert('Apple purchase diagnostic', listingNativeErrorDiagnostic(purchaseError));
        }
        const feedback = listingPurchaseErrorFeedback(purchaseError);
        commitIfActive(request, () => {
          setNotice(feedback.notice);
          setError(feedback.error);
          setStoreDiagnostic(feedback.diagnostic);
        });
        return false;
      } finally {
        commitIfActive(request, () => setPurchasing(false));
      }
    },
    [
      commitIfActive,
      configured,
      identityCoordinator,
      purchasing,
      refreshFor,
      session,
      summary,
      summaryUserId,
    ],
  );

  const restore = useCallback(async () => {
    const request = activeRequestRef.current;
    const userId = session?.user.id;
    if (
      !request ||
      !userId ||
      request.userId !== userId ||
      !identityCoordinator.isReadyFor(request) ||
      !configured ||
      purchasing ||
      summaryUserId !== userId
    ) {
      return false;
    }
    setPurchasing(true);
    setError(null);
    setNotice(null);
    setStoreDiagnostic(null);
    try {
      const restored = await identityCoordinator.runIfReady(request, async () => {
        const { default: Purchases } = await import('react-native-purchases');
        return Purchases.restorePurchases();
      });
      if (!restored) return false;
      if (
        process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === 'true' &&
        identityCoordinator.isCurrent(request)
      ) {
        Alert.alert(
          'Store restore diagnostic',
          [
            `App account matches: ${restored.originalAppUserId === userId ? 'yes' : 'no / aliased'}`,
            `Active subscriptions: ${restored.activeSubscriptions.length}`,
            `Purchased products: ${restored.allPurchasedProductIdentifiers.length}`,
            `Listing entitlement: ${listingStoreHasActivePlan(restored) ? 'active' : 'not active'}`,
            `Store response: ${restored.requestDate}`,
          ].join('\n'),
        );
      }
      const serverSummary = await waitForServerEntitlement(
        undefined,
        () => activeRequestRef.current === request && identityCoordinator.isCurrent(request),
      );
      if (serverSummary === undefined) return false;
      if (serverSummary) {
        commitIfActive(request, () => {
          setSummary(serverSummary);
          setSummaryUserId(userId);
        });
      } else {
        await refreshFor(request, userId);
      }
      commitIfActive(request, () =>
        setNotice(
          serverSummary
            ? 'Your listing plan was restored.'
            : listingStoreHasActivePlan(restored)
              ? 'The store found your plan, but account activation is still syncing. Do not purchase again. Refresh to check its status.'
              : 'Restore finished. No active listing plan was found for this store account.',
        ),
      );
      return Boolean(serverSummary);
    } catch (restoreError) {
      if (
        process.env.EXPO_PUBLIC_IAP_DIAGNOSTICS === 'true' &&
        identityCoordinator.isCurrent(request)
      ) {
        Alert.alert('Store restore diagnostic', listingNativeErrorDiagnostic(restoreError));
      }
      commitIfActive(request, () =>
        setError('Purchases could not be restored. Check your connection and try again.'),
      );
      return false;
    } finally {
      commitIfActive(request, () => setPurchasing(false));
    }
  }, [
    commitIfActive,
    configured,
    identityCoordinator,
    purchasing,
    refreshFor,
    session,
    summaryUserId,
  ]);

  const managingSubscription = useRef(false);
  const manage = useCallback(async () => {
    if (!session?.user.id || managingSubscription.current || purchasing) return;
    const request = activeRequestRef.current;
    const provider =
      summary?.provider === 'apple' || summary?.provider === 'google'
        ? summary.provider
        : Platform.OS === 'ios'
          ? 'apple'
          : 'google';
    managingSubscription.current = true;
    setError(null);
    try {
      await openListingSubscriptionManagement({
        platform: Platform.OS,
        provider,
        showAppleSheet: async () => {
          if (!request || !configured || !identityCoordinator.isReadyFor(request))
            throw new Error('Store connection is not ready');
          await identityCoordinator.runIfReady(request, async () => {
            const { default: Purchases } = await import('react-native-purchases');
            await Purchases.showManageSubscriptions();
          });
          if (identityCoordinator.isCurrent(request) && request.userId)
            await refreshFor(request, request.userId);
        },
        openUrl: async (url) => {
          const { Linking } = await import('react-native');
          return Linking.openURL(url);
        },
      });
    } catch {
      if (!request || identityCoordinator.isCurrent(request))
        setError(
          provider === 'apple'
            ? 'Apple subscription management could not open. For sandbox purchases, use Settings → Developer → Sandbox Apple Account → Manage Subscriptions. For a regular subscription, use Settings → your Apple Account → Subscriptions.'
            : 'Subscription management could not open. Open subscriptions in Google Play.',
        );
    } finally {
      managingSubscription.current = false;
    }
  }, [configured, identityCoordinator, purchasing, refreshFor, session, summary]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      const request = activeRequestRef.current;
      const userId = session?.user.id;
      if (state !== 'active' || purchasing || !request || !userId || request.userId !== userId)
        return;
      void refreshFor(request, userId);
      if (identityCoordinator.isReadyFor(request)) void initializeSdkFor(request);
    });
    return () => listener.remove();
  }, [identityCoordinator, initializeSdkFor, purchasing, refreshFor, session?.user.id]);

  const value = useMemo<ListingBillingContextValue>(
    () => ({
      summary: summaryUserId === session?.user.id ? summary : null,
      packages,
      loading: loading || Boolean(session?.user.id && summaryUserId !== session.user.id),
      purchasing,
      configured,
      notice,
      error: error ?? storeError,
      storeDiagnostic,
      refresh,
      purchase,
      restore,
      manage,
    }),
    [
      configured,
      error,
      storeError,
      storeDiagnostic,
      loading,
      manage,
      notice,
      packages,
      purchase,
      purchasing,
      refresh,
      restore,
      summary,
      summaryUserId,
      session?.user.id,
    ],
  );
  return <ListingBillingContext.Provider value={value}>{children}</ListingBillingContext.Provider>;
}

export function useListingBilling() {
  const value = useContext(ListingBillingContext);
  if (!value) throw new Error('useListingBilling must be used inside ListingBillingProvider.');
  return value;
}
