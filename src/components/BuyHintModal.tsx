// BuyHintModal.tsx
// Flow Lines | Gazetica Studio | Sprint 4 Day 20 | Task FL-S4-020 (CF-003 final)
//
// Clean FL rewrite of the last @ts-nocheck Numtap component. Modal sheet offered
// when the HINT flow can't grant a hint via a rewarded ad (e.g. no ad fill) and
// the player has 0 gems. Two outs: buy a Hint Pack (+20 gems) or retry the ad.
//
// Props keep it self-contained and testable: it owns the purchase (billing.ts +
// flowSettingsStore), and delegates the ad retry to the caller (GameScreen owns
// the GameScene + level needed by showHintAd).

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { purchaseProduct, consumePurchase, FL_PRODUCTS } from '../services/billing';

const GOLD = '#FFD700';

export function BuyHintModal({
  onClose,
  onWatchAd,
}: {
  onClose: () => void;
  onWatchAd: () => void; // GameScreen retries the rewarded-hint flow
}) {
  const { t } = useTranslation();
  const gemBalance = useFlowSettingsStore((s) => s.gemBalance);
  const addGems = useFlowSettingsStore((s) => s.addGems);
  const [busy, setBusy] = useState(false);

  const handleBuy = async () => {
    if (busy) return;
    setBusy(true);
    const result = await purchaseProduct(FL_PRODUCTS.HINT_PACK);
    if (result.success) {
      await addGems(20); // FL-UX-D-015: +20 gems per Hint Pack ($1.99)
      if (result.purchaseToken) await consumePurchase(result.purchaseToken);
    }
    setBusy(false);
    onClose();
  };

  const handleWatchAd = () => {
    if (busy) return;
    onWatchAd();
    onClose();
  };

  const sheetBtn: CSSProperties = {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    fontFamily: skin.fontDisplay,
    fontSize: 13,
    cursor: busy ? 'default' : 'pointer',
    border: 'none',
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: skin.fontBody,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 320,
          background: skin.bgCard,
          border: '1px solid rgba(255,215,0,0.4)',
          borderRadius: 16,
          padding: 22,
          textAlign: 'center',
          boxShadow: '0 0 24px rgba(255,215,0,0.18), 0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 1, marginBottom: 12 }}>
          {t('buyhint.title')}
        </div>
        <div style={{ fontSize: 13, color: skin.white, marginBottom: 18 }}>
          {t('buyhint.you_have', { count: gemBalance })}
        </div>

        {/* Hint Pack product */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(127,119,221,0.2)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
          }}
        >
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 14, color: skin.white, marginBottom: 6 }}>{t('buyhint.hint_pack')}</div>
          <div style={{ fontSize: 12, color: skin.muted, marginBottom: 12 }}>{t('buyhint.hint_pack_sub')}</div>
          <button
            onClick={() => void handleBuy()}
            disabled={busy}
            style={{ ...sheetBtn, background: GOLD, color: skin.bgDeep, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? '…' : t('buyhint.buy_now')}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleWatchAd}
            disabled={busy}
            style={{ ...sheetBtn, flex: 1, background: skin.bgRaised, color: skin.white }}
          >
            {t('buyhint.watch_ad_instead')}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ ...sheetBtn, flex: 1, background: 'none', color: skin.muted, border: '1px solid rgba(127,119,221,0.25)' }}
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BuyHintModal;
