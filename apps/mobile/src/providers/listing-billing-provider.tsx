import type { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  listingProductMetadata,
  type BillingPeriod,
  type ListingBillingSummary,
  type ListingPlanCode,
} from '@/lib/listing-billing-core';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';

export interface StoreListingPackage {
  readonly key: string;
  readonly planCode: ListingPlanCode;
  readonly period: BillingPeriod;
  readonly price: number;
  readonly priceString: string;
  readonly package: PurchasesPackage;
}

interface ListingBillingContextValue {
  readonly summary: ListingBillingSummary | null;
  readonly packages: readonly StoreListingPackage[];
  readonly loading: boolean;
  readonly purchasing: boolean;
  readonly configured: boolean;
  readonly notice: string | null;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly purchase: (item: StoreListingPackage) => Promise<boolean>;
  readonly restore: () => Promise<boolean>;
  readonly manage: () => Promise<void>;
}

const ListingBillingContext = createContext<ListingBillingContextValue | null>(null);
let configuredUserId: string | null = null;

function publicApiKey() {
  if (Platform.OS === 'ios') return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim();
  if (Platform.OS === 'android') return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim();
  return undefined;
}

function parsePackages(items: readonly PurchasesPackage[]) {
  return items.flatMap((item): StoreListingPackage[] => {
    const metadata = listingProductMetadata(item.product.identifier);
    if (!metadata) return [];
    return [
      {
        key: `${metadata.planCode}-${metadata.period}`,
        ...metadata,
        price: item.product.price,
        priceString: item.product.priceString,
        package: item,
      },
    ];
  });
}

async function waitForServerEntitlement(expectedProductId?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data } = await supabase.rpc('get_my_listing_billing');
    const summary = data as ListingBillingSummary | null;
    if (summary?.canPublish && (!expectedProductId || summary.productId === expectedProductId)) {
      return summary;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

export function ListingBillingProvider({ children }: PropsWithChildren) {
  const { session, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<ListingBillingSummary | null>(null);
  const [packages, setPackages] = useState<readonly StoreListingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!session) {
      setSummary(null);
      return;
    }
    const { data, error: queryError } = await supabase.rpc('get_my_listing_billing');
    if (queryError) {
      setError('Your listing plan could not be checked. Pull to refresh and try again.');
      return;
    }
    setSummary(data as ListingBillingSummary);
  }, [session]);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    async function initialize() {
      setLoading(true);
      setError(null);
      setNotice(null);
      if (!session) {
        setSummary(null);
        setPackages([]);
        setConfigured(false);
        setLoading(false);
        return;
      }

      await refresh();
      const apiKey = publicApiKey();
      if (!apiKey || Platform.OS === 'web') {
        if (!cancelled) {
          setConfigured(false);
          setPackages([]);
          setLoading(false);
        }
        return;
      }

      try {
        const { default: Purchases } = await import('react-native-purchases');
        const isConfigured = await Purchases.isConfigured();
        if (!isConfigured) {
          Purchases.configure({ apiKey, appUserID: session.user.id });
        } else if (configuredUserId !== session.user.id) {
          await Purchases.logIn(session.user.id);
        }
        configuredUserId = session.user.id;
        const offerings = await Purchases.getOfferings();
        const offering =
          offerings.all[process.env.EXPO_PUBLIC_REVENUECAT_OFFERING_ID ?? 'business_listing'] ??
          offerings.current;
        if (!cancelled) {
          setPackages(parsePackages(offering?.availablePackages ?? []));
          setConfigured(true);
        }
      } catch {
        if (!cancelled) {
          setConfigured(false);
          setPackages([]);
          setError('Store plans are temporarily unavailable. Your existing listing is unchanged.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void initialize();
    return () => {
      cancelled = true;
    };
  }, [authLoading, refresh, session]);

  const purchase = useCallback(
    async (item: StoreListingPackage) => {
      if (!session || !configured || purchasing || !summary?.billingEnabled) return false;
      const deviceProvider = Platform.OS === 'ios' ? 'apple' : 'google';
      if (
        summary?.canPublish &&
        summary.provider !== 'test_store' &&
        summary.provider !== deviceProvider
      ) {
        setError('Manage this plan through the store where it was originally purchased.');
        return false;
      }
      setPurchasing(true);
      setError(null);
      setNotice(null);
      try {
        const { default: Purchases } = await import('react-native-purchases');
        const currentProduct = summary?.productId
          ? listingProductMetadata(summary.productId)
          : null;
        const deferredDowngrade =
          currentProduct?.planCode === 'multi' && item.planCode === 'single';
        if (
          Platform.OS === 'android' &&
          summary?.canPublish &&
          summary.provider === 'google' &&
          summary.productId &&
          summary.productId !== item.package.product.identifier
        ) {
          const replacementMode =
            currentProduct?.planCode === 'multi' && item.planCode === 'single'
              ? Purchases.STORE_REPLACEMENT_MODE.DEFERRED
              : currentProduct?.planCode === item.planCode
                ? Purchases.STORE_REPLACEMENT_MODE.WITHOUT_PRORATION
                : Purchases.STORE_REPLACEMENT_MODE.WITH_TIME_PRORATION;
          await Purchases.purchasePackage(item.package, null, {
            oldProductIdentifier: summary.productId,
            replacementMode,
          });
        } else {
          await Purchases.purchasePackage(item.package);
        }
        if (deferredDowngrade) {
          await refresh();
          setNotice('Your switch to Single is scheduled for the next renewal date.');
          return true;
        }
        const serverSummary = await waitForServerEntitlement(item.package.product.identifier);
        if (serverSummary) {
          setSummary(serverSummary);
          setNotice('Your listing plan is active.');
          return true;
        }
        setNotice('Purchase received. Store confirmation is still syncing; refresh in a moment.');
        await refresh();
        return true;
      } catch (purchaseError) {
        const candidate = purchaseError as { userCancelled?: boolean };
        if (!candidate.userCancelled) {
          setError('The purchase did not complete. Nothing was charged by this app.');
        }
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [configured, purchasing, refresh, session, summary],
  );

  const restore = useCallback(async () => {
    if (!session || !configured || purchasing) return false;
    setPurchasing(true);
    setError(null);
    setNotice(null);
    try {
      const { default: Purchases } = await import('react-native-purchases');
      await Purchases.restorePurchases();
      const serverSummary = await waitForServerEntitlement();
      if (serverSummary) setSummary(serverSummary);
      else await refresh();
      setNotice(
        serverSummary
          ? 'Your listing plan was restored.'
          : 'Restore finished. No active listing plan was found for this account.',
      );
      return Boolean(serverSummary);
    } catch {
      setError('Purchases could not be restored. Check your connection and try again.');
      return false;
    } finally {
      setPurchasing(false);
    }
  }, [configured, purchasing, refresh, session]);

  const manage = useCallback(async () => {
    if (!configured) return;
    const { default: Purchases } = await import('react-native-purchases');
    const info = await Purchases.getCustomerInfo();
    if (info.managementURL) {
      const { Linking } = await import('react-native');
      await Linking.openURL(info.managementURL);
    } else if (Platform.OS === 'ios') {
      await Purchases.showManageSubscriptions();
    }
  }, [configured]);

  const value = useMemo<ListingBillingContextValue>(
    () => ({
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
    }),
    [
      configured,
      error,
      loading,
      manage,
      notice,
      packages,
      purchase,
      purchasing,
      refresh,
      restore,
      summary,
    ],
  );
  return <ListingBillingContext.Provider value={value}>{children}</ListingBillingContext.Provider>;
}

export function useListingBilling() {
  const value = useContext(ListingBillingContext);
  if (!value) throw new Error('useListingBilling must be used inside ListingBillingProvider.');
  return value;
}
