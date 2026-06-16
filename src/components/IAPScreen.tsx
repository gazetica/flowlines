// IAPScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 4 Day 19 | Task FL-S4-019 (VD-10)
//
// Store screen at /store. Two products: Remove Ads (non-consumable $2.99) and
// Hint Pack (consumable $0.99, +5 gems). BUY is display-only for now — real
// Google Play billing is wired in Day 21. Replaces the Numtap i18n/billing stub.

import type { CSSProperties, ReactNode } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import {
  purchaseProduct,
  restorePurchases,
  consumePurchase,
  FL_PRODUCTS,
} from '../services/billing';
import { trackIapPurchase } from '../services/analytics';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';

export function IAPScreen() {
  const navigate = useNavigate();
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const removeAdsPurchased = useFlowSettingsStore((s) => s.removeAdsPurchased);
  const setRemoveAds = useFlowSettingsStore((s) => s.setRemoveAds);
  const addGems = useFlowSettingsStore((s) => s.addGems);

  const [toast, setToast] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  };

  // Remove Ads — non-consumable. On success the billing entitlement is applied
  // to flowSettingsStore (suppresses interstitials only — hints stay ad-free).
  const handleRemoveAdsBuy = async () => {
    if (purchasing) return;
    setPurchasing(true);
    const result = await purchaseProduct(FL_PRODUCTS.REMOVE_ADS);
    if (result.success) {
      await setRemoveAds(true);
      trackIapPurchase({ product_id: FL_PRODUCTS.REMOVE_ADS, value: 2.99 });
      flashToast('Ads removed — thank you!');
    } else if (result.error !== 'USER_CANCELED') {
      flashToast(result.error ?? 'Purchase failed');
    }
    setPurchasing(false);
  };

  // Hint Pack — consumable. +5 gems (FL: not Numtap's +20), then consume the
  // token so it can be bought again.
  const handleHintPackBuy = async () => {
    if (purchasing) return;
    setPurchasing(true);
    const result = await purchaseProduct(FL_PRODUCTS.HINT_PACK);
    if (result.success) {
      await addGems(5);
      if (result.purchaseToken) await consumePurchase(result.purchaseToken);
      trackIapPurchase({ product_id: FL_PRODUCTS.HINT_PACK, value: 0.99 });
      flashToast('+5 gems added!');
    } else if (result.error !== 'USER_CANCELED') {
      flashToast(result.error ?? 'Purchase failed');
    }
    setPurchasing(false);
  };

  const handleRestore = async () => {
    if (purchasing) return;
    setPurchasing(true);
    const restored = await restorePurchases();
    if (restored.some((p) => p.productId === FL_PRODUCTS.REMOVE_ADS)) {
      await setRemoveAds(true);
    }
    flashToast(restored.length ? 'Purchases restored' : 'No purchases to restore');
    setPurchasing(false);
  };

  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    boxSizing: 'border-box',
  };
  const buyBtn: CSSProperties = {
    background: GOLD,
    color: skin.bgDeep,
    border: 'none',
    borderRadius: 10,
    padding: '10px 18px',
    fontFamily: skin.fontDisplay,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
  };
  const bullet: CSSProperties = { fontSize: 12, color: skin.muted, lineHeight: 1.7 };

  function ProductCard({
    icon,
    title,
    bullets,
    price,
    children,
  }: {
    icon: string;
    title: string;
    bullets: string[];
    price: string;
    children: ReactNode; // the BUY button / purchased badge
  }) {
    return (
      <div style={card}>
        <div style={{ fontFamily: skin.fontDisplay, fontSize: 14, color: skin.white, marginBottom: 8 }}>
          {icon} {title}
        </div>
        {bullets.map((b) => (
          <div key={b} style={bullet}>· {b}</div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 }}>
          <span style={{ fontFamily: skin.fontDisplay, fontSize: 18, color: GOLD }}>{price}</span>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>STORE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Gem balance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'rgba(255,215,0,0.1)',
            border: '1px solid rgba(255,215,0,0.3)',
            borderRadius: 12,
            padding: '10px',
            color: GOLD,
            fontFamily: skin.fontDisplay,
            fontSize: 14,
          }}
        >
          💎 Your gems: {gemBalance}
        </div>

        {/* Remove Ads — non-consumable */}
        <ProductCard
          icon="🚫"
          title="REMOVE ADS"
          bullets={['No interstitials ever', 'One-time purchase', 'Hints always free']}
          price="$2.99"
        >
          {removeAdsPurchased ? (
            <span style={{ fontFamily: skin.fontDisplay, fontSize: 13, color: GOLD }}>✓ Purchased</span>
          ) : (
            <button onClick={() => void handleRemoveAdsBuy()} disabled={purchasing} style={{ ...buyBtn, opacity: purchasing ? 0.5 : 1 }}>BUY</button>
          )}
        </ProductCard>

        {/* Hint Pack — consumable, can buy multiple */}
        <ProductCard
          icon="💡"
          title="HINT PACK"
          bullets={['5 extra hints (+5 gems)', 'Reveal the next cell', 'Works on any level']}
          price="$0.99"
        >
          <button onClick={() => void handleHintPackBuy()} disabled={purchasing} style={{ ...buyBtn, opacity: purchasing ? 0.5 : 1 }}>BUY</button>
        </ProductCard>

        {/* Footer note + restore */}
        <div style={{ textAlign: 'center', fontSize: 11, color: skin.muted, lineHeight: 1.6, marginTop: 4 }}>
          Purchases managed by Google Play. Tap BUY to start the checkout flow.
        </div>
        <button
          onClick={() => void handleRestore()}
          disabled={purchasing}
          style={{ background: 'none', border: 'none', color: skin.purpleLight, fontSize: 13, cursor: purchasing ? 'default' : 'pointer', padding: 8, opacity: purchasing ? 0.5 : 1 }}
        >
          Restore Purchases
        </button>
      </div>

      {toast && (
        <div style={{ position: 'fixed', bottom: '12%', left: 0, right: 0, textAlign: 'center', zIndex: 50, pointerEvents: 'none' }}>
          <span
            style={{
              fontFamily: skin.fontBody,
              fontSize: 13,
              color: skin.white,
              background: 'rgba(13,6,32,0.92)',
              border: '1px solid rgba(127,119,221,0.4)',
              borderRadius: 8,
              padding: '8px 14px',
            }}
          >
            {toast}
          </span>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default IAPScreen;
