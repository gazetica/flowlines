// AboutScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 17 | Task FL-S3-017 (VD-13)
//
// Studio / legal / support screen. All external links open via the in-app
// Capacitor Browser. App version is read from @capacitor/app at runtime, with a
// "1.0" fallback when running on web (getInfo throws off-device).

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { skin } from '../styles/skin';
import { reopenForm } from '../services/consentService';
import { GazeticaPromoCard } from './GazeticaPromoCard';
import { BottomNav } from './BottomNav';

const GOLD = '#FFD700';

/** Open a web (http/https) URL in the in-app Capacitor Browser. */
function openUrl(url: string) {
  void Browser.open({ url });
}

/** Open a non-web URI (mailto:/market:) — the Browser plugin no-ops on these, so
 *  hand it to the WebView's URL loader, which delegates to the OS app (Gmail /
 *  Play Store) via an Android Intent. */
function openExternal(uri: string) {
  window.location.href = uri;
}

export function AboutScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [version, setVersion] = useState('1.0');

  useEffect(() => {
    let cancelled = false;
    App.getInfo()
      .then((info) => {
        if (!cancelled && info?.version) setVersion(info.version);
      })
      .catch(() => {
        /* web / unavailable — keep "1.0" fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const sectionLabel: CSSProperties = {
    fontFamily: skin.fontDisplay,
    fontSize: 11,
    color: skin.muted,
    letterSpacing: 1,
    margin: '4px 0 4px',
  };
  const card: CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(127,119,221,0.2)',
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    boxSizing: 'border-box',
  };

  function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
    return (
      <button
        onPointerDown={onPress}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(127,119,221,0.12)',
          color: skin.white,
          fontSize: 14,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span>{label}</span>
        <span style={{ color: skin.muted }}>›</span>
      </button>
    );
  }

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{t('about.title')}</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* App identity */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 24, color: GOLD, letterSpacing: 2 }}>{t('about.app_title')}</div>
          <div style={{ fontSize: 12, color: skin.muted, marginTop: 4 }}>{t('common.version', { version })}</div>
        </div>

        {/* More from Gazetica */}
        <div style={sectionLabel}>{t('about.more_from')}</div>
        <GazeticaPromoCard />

        {/* Legal */}
        <div style={sectionLabel}>{t('about.legal')}</div>
        <div style={card}>
          <LinkRow label={t('about.privacy_policy')} onPress={() => openUrl('https://gazetica.com/privacy-policy')} />
          <LinkRow label={t('about.terms')} onPress={() => openUrl('https://gazetica.com/terms')} />
          <LinkRow label={t('about.open_source')} onPress={() => navigate('/licences')} />
        </div>

        {/* Support */}
        <div style={sectionLabel}>{t('about.support')}</div>
        <div style={card}>
          <LinkRow label={t('about.contact_us')} onPress={() => openExternal('mailto:support@gazetica.com')} />
          <LinkRow label={t('about.rate_app')} onPress={() => openExternal('market://details?id=com.gazetica.flowlines')} />
        </div>

        {/* GDPR */}
        <div style={card}>
          {/* FL-UX-D-016: re-open the UMP privacy-options form in place (no navigation) */}
          <LinkRow label={t('about.ad_preferences')} onPress={() => void reopenForm()} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default AboutScreen;
