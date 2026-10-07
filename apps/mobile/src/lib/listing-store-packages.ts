import type { PurchasesPackage, SubscriptionOption } from 'react-native-purchases';

import {
  offeredListingProductMetadata,
  type BillingPeriod,
  type ListingPlanCode,
} from './listing-billing-core';

export interface StoreListingPackage {
  readonly key: string;
  readonly planCode: ListingPlanCode;
  readonly period: BillingPeriod;
  readonly price: number;
  readonly priceString: string;
  readonly package: PurchasesPackage;
  readonly subscriptionOption?: SubscriptionOption | undefined;
}

/** The launch paywall supports ordinary recurring prices, without trials or installments. */
export function parseStoreListingPackages(
  items: readonly PurchasesPackage[],
  platform: string,
  enabledProductIds: ReadonlySet<string>,
): StoreListingPackage[] {
  if (platform !== 'ios' && platform !== 'android') return [];
  return items.flatMap((item): StoreListingPackage[] => {
    const product = item.product;
    const metadata = offeredListingProductMetadata(product.identifier, enabledProductIds);
    if (!metadata || product.productCategory !== 'SUBSCRIPTION') return [];
    const expectedPeriod = metadata.period === 'monthly' ? 'P1M' : 'P1Y';
    if (product.subscriptionPeriod !== expectedPeriod) return [];

    let price = product.price;
    let priceString = product.priceString;
    let subscriptionOption: SubscriptionOption | undefined;
    if (platform === 'ios') {
      if (product.identifier.includes(':') || product.introPrice) return [];
    } else {
      subscriptionOption = product.subscriptionOptions?.find(
        (option) =>
          option.isBasePlan &&
          option.storeProductId === product.identifier &&
          !option.isPrepaid &&
          !option.installmentsInfo &&
          !option.freePhase &&
          !option.introPhase &&
          option.pricingPhases.length === 1 &&
          option.fullPricePhase?.recurrenceMode === 1 &&
          option.fullPricePhase.billingPeriod.iso8601 === expectedPeriod,
      );
      if (!subscriptionOption?.fullPricePhase) return [];
      price = subscriptionOption.fullPricePhase.price.amountMicros / 1_000_000;
      priceString = subscriptionOption.fullPricePhase.price.formatted;
    }
    if (!Number.isFinite(price) || price <= 0 || !priceString?.trim()) return [];
    return [
      {
        key: `${metadata.planCode}-${metadata.period}`,
        ...metadata,
        price,
        priceString,
        package: item,
        subscriptionOption,
      },
    ];
  });
}
