package com.gazetica.flowlines;

// T-019: Real IAP via Google Play Billing Library 6.2.1, bridged to Capacitor.
// All four products are ProductType.INAPP. Non-consumables (remove_ads,
// campaign2, campaign3) are acknowledged on purchase; the consumable
// (hint_pack_5) is left for the JS layer to consume() after granting hints.

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CapacitorPlugin(name = "Billing")
public class BillingPlugin extends Plugin implements PurchasesUpdatedListener {

    // FL-S4-020: Flow Lines SKUs (must match Play Console + billing.ts FL_PRODUCTS).
    // FL-5A-029: added flowlines_unlock_all (non-consumable, $4.99 — acknowledged, not consumed).
    private static final String HINT_PACK = "flowlines_hint_pack"; // the only consumable
    private static final List<String> PRODUCT_IDS = Arrays.asList(
        "flowlines_remove_ads", HINT_PACK, "flowlines_unlock_all"
    );

    private BillingClient billingClient;
    private final Map<String, ProductDetails> productDetails = new HashMap<>();
    // The in-flight purchase() call, resolved from onPurchasesUpdated().
    private PluginCall pendingPurchase;

    @Override
    public void load() {
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases()
            .build();
    }

    // —— Connection ————————————————————————————————————————————————
    @PluginMethod
    public void initialise(final PluginCall call) {
        if (billingClient != null && billingClient.isReady()) {
            call.resolve();
            return;
        }
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(@NonNull BillingResult result) {
                if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                    call.resolve();
                } else {
                    call.reject("Billing setup failed: " + result.getDebugMessage());
                }
            }

            @Override
            public void onBillingServiceDisconnected() {
                // Connection lost; the next billing call will reconnect via initialise().
            }
        });
    }

    // —— Query products ————————————————————————————————————————————
    @PluginMethod
    public void queryProducts(final PluginCall call) {
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            products.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(products)
            .build();

        billingClient.queryProductDetailsAsync(params, (result, detailsList) -> {
            JSArray arr = new JSArray();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && detailsList != null) {
                for (ProductDetails pd : detailsList) {
                    productDetails.put(pd.getProductId(), pd);
                    ProductDetails.OneTimePurchaseOfferDetails offer = pd.getOneTimePurchaseOfferDetails();
                    JSObject o = new JSObject();
                    o.put("productId", pd.getProductId());
                    o.put("title", pd.getTitle());
                    o.put("price", offer != null ? offer.getFormattedPrice() : "");
                    o.put("priceAmountMicros", offer != null ? offer.getPriceAmountMicros() : 0);
                    o.put("priceCurrencyCode", offer != null ? offer.getPriceCurrencyCode() : "");
                    arr.put(o);
                }
            }
            JSObject ret = new JSObject();
            ret.put("products", arr);
            call.resolve(ret);
        });
    }

    // —— Purchase ——————————————————————————————————————————————————
    @PluginMethod
    public void purchase(final PluginCall call) {
        final String productId = call.getString("productId");
        if (productId == null) {
            call.reject("productId is required");
            return;
        }
        ProductDetails pd = productDetails.get(productId);
        if (pd != null) {
            launchPurchase(call, pd);
            return;
        }
        // Not cached yet — query the catalogue, then launch.
        List<QueryProductDetailsParams.Product> products = new ArrayList<>();
        for (String id : PRODUCT_IDS) {
            products.add(
                QueryProductDetailsParams.Product.newBuilder()
                    .setProductId(id)
                    .setProductType(BillingClient.ProductType.INAPP)
                    .build()
            );
        }
        billingClient.queryProductDetailsAsync(
            QueryProductDetailsParams.newBuilder().setProductList(products).build(),
            (result, detailsList) -> {
                if (detailsList != null) {
                    for (ProductDetails d : detailsList) productDetails.put(d.getProductId(), d);
                }
                ProductDetails found = productDetails.get(productId);
                if (found == null) {
                    call.resolve(failure(productId, "Product not found"));
                } else {
                    launchPurchase(call, found);
                }
            }
        );
    }

    private void launchPurchase(final PluginCall call, ProductDetails pd) {
        List<BillingFlowParams.ProductDetailsParams> paramsList = Collections.singletonList(
            BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(pd)
                .build()
        );
        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(paramsList)
            .build();

        // Keep this call alive until onPurchasesUpdated reports the result. We hold
        // a Java reference; the JS Promise stays pending until we resolve it there.
        call.setKeepAlive(true);
        pendingPurchase = call;
        BillingResult result = billingClient.launchBillingFlow(getActivity(), flowParams);
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            pendingPurchase = null;
            call.resolve(failure(pd.getProductId(), result.getDebugMessage()));
        }
    }

    @Override
    public void onPurchasesUpdated(@NonNull BillingResult result, List<Purchase> purchases) {
        if (pendingPurchase == null) return;
        PluginCall call = pendingPurchase;
        pendingPurchase = null;

        int code = result.getResponseCode();
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.resolve(failure(null, "USER_CANCELED"));
            return;
        }
        if (code != BillingClient.BillingResponseCode.OK || purchases == null || purchases.isEmpty()) {
            call.resolve(failure(null, "Purchase failed: " + result.getDebugMessage()));
            return;
        }

        Purchase purchase = purchases.get(0);
        String productId = purchase.getProducts().isEmpty() ? "" : purchase.getProducts().get(0);

        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // Acknowledge non-consumables here; the consumable is consumed by JS.
            if (!productId.equals(HINT_PACK) && !purchase.isAcknowledged()) {
                acknowledge(purchase.getPurchaseToken());
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("productId", productId);
            ret.put("purchaseToken", purchase.getPurchaseToken());
            call.resolve(ret);
        } else {
            // PENDING or UNSPECIFIED — not yet entitled.
            call.resolve(failure(productId, "Purchase pending"));
        }
    }

    private void acknowledge(String token) {
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(token)
            .build();
        billingClient.acknowledgePurchase(params, billingResult -> { /* best-effort */ });
    }

    // —— Restore ———————————————————————————————————————————————————
    @PluginMethod
    public void restorePurchases(final PluginCall call) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            JSArray arr = new JSArray();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                for (Purchase p : purchases) {
                    if (p.getPurchaseState() != Purchase.PurchaseState.PURCHASED) continue;
                    // Acknowledge restored non-consumables that weren't acknowledged.
                    String pid = p.getProducts().isEmpty() ? "" : p.getProducts().get(0);
                    if (!pid.equals(HINT_PACK) && !p.isAcknowledged()) acknowledge(p.getPurchaseToken());
                    for (String productId : p.getProducts()) {
                        JSObject o = new JSObject();
                        o.put("productId", productId);
                        o.put("purchaseToken", p.getPurchaseToken());
                        arr.put(o);
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("purchases", arr);
            call.resolve(ret);
        });
    }

    // —— Consume (hint pack) ———————————————————————————————————————
    @PluginMethod
    public void consume(final PluginCall call) {
        final String token = call.getString("purchaseToken");
        if (token == null) {
            call.reject("purchaseToken is required");
            return;
        }
        ConsumeParams params = ConsumeParams.newBuilder()
            .setPurchaseToken(token)
            .build();
        billingClient.consumeAsync(params, (result, outToken) -> call.resolve());
    }

    private JSObject failure(String productId, String error) {
        JSObject o = new JSObject();
        o.put("success", false);
        if (productId != null) o.put("productId", productId);
        if (error != null) o.put("error", error);
        return o;
    }
}
