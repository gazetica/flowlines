// billing.ts
// Numtap | Gazetica Studio | Sprint 5 | Task T-019
//
// TypeScript wrapper around the native Play Billing bridge (BillingPlugin.java,
// registered as "Billing"). All four products are one-time INAPP purchases.
// Every call is native-only and defensive: on web (or any error) it degrades to a
// safe no-op / failure result so the UI never throws.

import { registerPlugin, Capacitor } from '@capacitor/core';

export interface ProductDetail {
  productId: string;
  title: string;
  price: string; // formatted, e.g. "$2.99"
  priceAmountMicros: number;
  priceCurrencyCode: string;
}

export interface PurchaseResult {
  success: boolean;
  productId: string;
  purchaseToken?: string;
  error?: string;
}

export interface RestoredPurchase {
  productId: string;
  purchaseToken: string;
}

// Product IDs (must match Play Console + BillingPlugin.java).
export const PRODUCT_IDS = {
  REMOVE_ADS: 'numtap_remove_ads',
  HINT_PACK: 'numtap_hint_pack_5',
  CAMPAIGN2: 'numtap_campaign2',
  CAMPAIGN3: 'numtap_campaign3',
} as const;

// FL-S4-020 / FL-UX-D-015: Flow Lines storefront SKUs. Must match Play Console
// (Task 20.7) + BillingPlugin.java's PRODUCT_IDS list. FL: +20 gems per Hint Pack
// ($1.99). Entitlements are applied by the caller (IAPScreen / BuyHintModal) on a
// successful purchaseProduct() — REMOVE_ADS → setRemoveAds(true); HINT_PACK →
// addGems(20) + consumePurchase(token).
export const FL_PRODUCTS = {
  REMOVE_ADS: 'flowlines_remove_ads', // non-consumable, $2.99
  HINT_PACK: 'flowlines_hint_pack',   // consumable, $1.99 → +20 gems
  UNLOCK_ALL: 'flowlines_unlock_all', // FL-5A-029: non-consumable, $4.99 → bypass all level/pack gates
} as const;

// Native plugin surface (implemented by BillingPlugin.java).
interface BillingNativePlugin {
  initialise(): Promise<void>;
  queryProducts(options: { productIds: string[] }): Promise<{ products: ProductDetail[] }>;
  purchase(options: { productId: string }): Promise<PurchaseResult>;
  restorePurchases(): Promise<{ purchases: RestoredPurchase[] }>;
  consume(options: { purchaseToken: string }): Promise<void>;
}

const Billing = registerPlugin<BillingNativePlugin>('Billing');

const native = () => Capacitor.isNativePlatform();

/** Initialise the billing client. Call once on app start. No-op on web. */
export async function initialiseBilling(): Promise<void> {
  if (!native()) return;
  try {
    await Billing.initialise();
  } catch (err) {
    console.warn('[billing] initialise failed:', err);
  }
}

/** Query product details for all 4 SKUs. Returns [] on web or error. */
export async function queryProducts(): Promise<ProductDetail[]> {
  if (!native()) return [];
  try {
    const { products } = await Billing.queryProducts({ productIds: Object.values(PRODUCT_IDS) });
    return products ?? [];
  } catch (err) {
    console.warn('[billing] queryProducts failed:', err);
    return [];
  }
}

/** Launch the purchase flow for a product. Returns {success:false} on web/error. */
export async function purchaseProduct(productId: string): Promise<PurchaseResult> {
  if (!native()) return { success: false, productId, error: 'unavailable' };
  try {
    return await Billing.purchase({ productId });
  } catch (err) {
    return { success: false, productId, error: String(err) };
  }
}

/** Query existing entitlements (restore). Returns [] on web or error. */
export async function restorePurchases(): Promise<RestoredPurchase[]> {
  if (!native()) return [];
  try {
    const { purchases } = await Billing.restorePurchases();
    return purchases ?? [];
  } catch (err) {
    console.warn('[billing] restorePurchases failed:', err);
    return [];
  }
}

/** Consume a consumable purchase (hint pack) so it can be bought again. */
export async function consumePurchase(purchaseToken: string): Promise<void> {
  if (!native()) return;
  try {
    await Billing.consume({ purchaseToken });
  } catch (err) {
    console.warn('[billing] consume failed:', err);
  }
}

/**
 * FL-S4-020: whether a non-consumable (e.g. Remove Ads) is already owned. Backed
 * by restorePurchases(), so it reflects Play's current entitlements. False on web
 * or any error.
 */
export async function isOwned(productId: string): Promise<boolean> {
  const owned = await restorePurchases();
  return owned.some((p) => p.productId === productId);
}
