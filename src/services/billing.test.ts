// billing.test.ts
// Numtap | Gazetica Studio | Sprint 5 | Task T-019
//
// Billing service wrapper. The native bridge (registerPlugin('Billing')) is mocked
// — no real billing calls. Covers native pass-through, error handling, and the
// web (non-native) safe-degradation paths.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const H = vi.hoisted(() => ({
  native: true,
  plugin: {
    initialise: vi.fn(async (): Promise<void> => {}),
    queryProducts: vi.fn(async (): Promise<{ products: unknown[] }> => ({ products: [] })),
    purchase: vi.fn(async (): Promise<Record<string, unknown>> => ({ success: true, productId: 'x' })),
    restorePurchases: vi.fn(async (): Promise<{ purchases: unknown[] }> => ({ purchases: [] })),
    consume: vi.fn(async (): Promise<void> => {}),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => H.native },
  registerPlugin: () => H.plugin,
}));

import {
  initialiseBilling,
  queryProducts,
  purchaseProduct,
  restorePurchases,
  consumePurchase,
  PRODUCT_IDS,
} from './billing';

beforeEach(() => {
  H.native = true;
  vi.clearAllMocks();
  H.plugin.initialise.mockResolvedValue(undefined);
  H.plugin.queryProducts.mockResolvedValue({ products: [] });
  H.plugin.purchase.mockResolvedValue({ success: true, productId: 'x' });
  H.plugin.restorePurchases.mockResolvedValue({ purchases: [] });
  H.plugin.consume.mockResolvedValue(undefined);
});

describe('billing service (T-019)', () => {
  it('1. initialiseBilling resolves and calls the native bridge', async () => {
    await expect(initialiseBilling()).resolves.toBeUndefined();
    expect(H.plugin.initialise).toHaveBeenCalledTimes(1);
  });

  it('2. initialiseBilling swallows native errors (still resolves)', async () => {
    H.plugin.initialise.mockRejectedValueOnce(new Error('setup failed'));
    await expect(initialiseBilling()).resolves.toBeUndefined();
  });

  it('3. purchaseProduct with an invalid SKU returns success:false (native failure passthrough)', async () => {
    H.plugin.purchase.mockResolvedValueOnce({ success: false, productId: 'bad_sku', error: 'Product not found' });
    const res = await purchaseProduct('bad_sku');
    expect(res.success).toBe(false);
    expect(res.error).toBe('Product not found');
  });

  it('4. purchaseProduct returns success:false when the native call throws', async () => {
    H.plugin.purchase.mockRejectedValueOnce(new Error('boom'));
    const res = await purchaseProduct(PRODUCT_IDS.REMOVE_ADS);
    expect(res.success).toBe(false);
    expect(res.productId).toBe(PRODUCT_IDS.REMOVE_ADS);
  });

  it('5. purchaseProduct passes a successful result through', async () => {
    H.plugin.purchase.mockResolvedValueOnce({ success: true, productId: PRODUCT_IDS.HINT_PACK, purchaseToken: 'tok123' });
    const res = await purchaseProduct(PRODUCT_IDS.HINT_PACK);
    expect(res).toEqual({ success: true, productId: PRODUCT_IDS.HINT_PACK, purchaseToken: 'tok123' });
    expect(H.plugin.purchase).toHaveBeenCalledWith({ productId: PRODUCT_IDS.HINT_PACK });
  });

  it('6. restorePurchases returns an array (populated)', async () => {
    H.plugin.restorePurchases.mockResolvedValueOnce({ purchases: [{ productId: PRODUCT_IDS.REMOVE_ADS, purchaseToken: 't' }] });
    const res = await restorePurchases();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(1);
    expect(res[0].productId).toBe(PRODUCT_IDS.REMOVE_ADS);
  });

  it('7. queryProducts returns the native product list', async () => {
    H.plugin.queryProducts.mockResolvedValueOnce({ products: [{ productId: PRODUCT_IDS.REMOVE_ADS, title: 'Remove Ads', price: '$2.99', priceAmountMicros: 2990000, priceCurrencyCode: 'USD' }] });
    const res = await queryProducts();
    expect(res).toHaveLength(1);
    expect(res[0].price).toBe('$2.99');
    expect(H.plugin.queryProducts).toHaveBeenCalledWith({ productIds: Object.values(PRODUCT_IDS) });
  });

  it('8. consumePurchase forwards the token to the bridge', async () => {
    await consumePurchase('tok-abc');
    expect(H.plugin.consume).toHaveBeenCalledWith({ purchaseToken: 'tok-abc' });
  });

  it('9. on web (non-native) all calls degrade safely without hitting the bridge', async () => {
    H.native = false;
    await expect(initialiseBilling()).resolves.toBeUndefined();
    expect(await queryProducts()).toEqual([]);
    expect(await restorePurchases()).toEqual([]);
    const res = await purchaseProduct(PRODUCT_IDS.REMOVE_ADS);
    expect(res).toEqual({ success: false, productId: PRODUCT_IDS.REMOVE_ADS, error: 'unavailable' });
    await consumePurchase('t');
    expect(H.plugin.initialise).not.toHaveBeenCalled();
    expect(H.plugin.purchase).not.toHaveBeenCalled();
    expect(H.plugin.consume).not.toHaveBeenCalled();
  });
});
