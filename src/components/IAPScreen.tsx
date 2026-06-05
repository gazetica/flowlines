// IAPScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-08 (placeholder)
//
// IAP storefront UI. Real Google Play billing arrives in Sprint 4 — buttons
// here are display-only with a "billing active in full release" note.

import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';

export function IAPScreen() {
  const { t } = useTranslation();
  const { removeAdsPurchased } = useSettingsStore();

  const PRODUCTS = [
    {
      key: 'remove_ads',
      badge: t('iap.popular_badge'),
      title: t('iap.remove_ads_title'),
      desc: t('iap.remove_ads_desc'),
      price: '$2.99', // placeholder — Sprint 4 fetches from Play Billing
      featured: true,
    },
    {
      key: 'hint_pack',
      badge: null,
      title: t('iap.hint_pack_title'),
      desc: t('iap.hint_pack_desc'),
      price: '$0.99',
      featured: false,
    },
  ];

  return (
    <ScreenShell title={t('iap.title')}>
      <div style={{ textAlign: 'center', padding: '20px 20px 12px' }}>
        <p style={{ fontSize: 13, color: 'var(--muted)' }}>{t('iap.sub')}</p>
      </div>

      {PRODUCTS.map((product) => (
        <div
          key={product.key}
          style={{
            margin: '0 16px 12px',
            background: 'rgba(10,26,46,0.75)',
            border: `1px solid ${product.featured ? 'var(--gold)' : 'rgba(30,139,195,0.2)'}`,
            borderRadius: 10,
            padding: '16px',
            boxShadow: product.featured ? '0 0 16px rgba(255,215,0,0.1)' : 'none',
          }}
        >
          {product.badge && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, letterSpacing: 2, color: 'var(--gold)', marginBottom: 8 }}>★ {product.badge}</div>
          )}
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: 'var(--white)', marginBottom: 4 }}>{product.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>{product.desc}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--gold)' }}>
              {product.key === 'remove_ads' && removeAdsPurchased ? t('settings.remove_ads_purchased') : product.price}
            </span>
            {/* T-020: iap_purchase analytics stub. Billing is display-only until
                T-019, which will fire (in the Play Billing purchase-completion
                callback) — analytics.iapPurchase({ productId: product.key,
                value: <price parsed from the store product> }). */}
            <button
              className="btn-gold"
              disabled={product.key === 'remove_ads' && removeAdsPurchased}
              style={{ padding: '8px 16px', fontSize: 10, opacity: product.key === 'remove_ads' && removeAdsPurchased ? 0.5 : 1 }}
            >
              {product.key === 'remove_ads' && removeAdsPurchased ? '✓' : t('iap.btn_buy')}
            </button>
          </div>
        </div>
      ))}

      {/* Sprint 4 note */}
      <div style={{ margin: '0 16px 16px', padding: '12px', background: 'rgba(30,139,195,0.06)', border: '1px solid rgba(30,139,195,0.2)', borderRadius: 8, textAlign: 'center' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'var(--blue-light)', letterSpacing: 1 }}>BILLING ACTIVE IN FULL RELEASE</p>
      </div>

      <div style={{ textAlign: 'center', padding: '0 20px 8px' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
          {t('iap.payment_note')}
          <br />
          {t('iap.terms_note')}
        </p>
      </div>

      <button
        style={{
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 20px',
          cursor: 'pointer',
          fontFamily: "'Space Mono', monospace",
          fontSize: 10,
          color: 'var(--muted)',
          letterSpacing: 1,
        }}
      >
        {t('iap.restore')}
      </button>
    </ScreenShell>
  );
}

// —— Local shell ——————————————————————————————————————————————————

function ScreenShell({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', background: 'var(--navy)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="bg-dots" />
      <ParticleCanvas />
      <div className="glass" style={{ display: 'flex', alignItems: 'center', padding: '48px 20px 16px', gap: 16, zIndex: 10, borderBottom: '1px solid rgba(30,139,195,0.2)' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>{title}</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>{children}</div>
      <BottomNav />
    </div>
  );
}
