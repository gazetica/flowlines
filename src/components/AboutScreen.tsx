// AboutScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 17 | Task FL-S3-017 (VD-13)
//
// Studio / legal / support screen. All external links open via the in-app
// Capacitor Browser. App version is read from @capacitor/app at runtime, with a
// "1.0" fallback when running on web (getInfo throws off-device).

import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { skin } from '../styles/skin';
import { GazeticaPromoCard } from './GazeticaPromoCard';

const GOLD = '#FFD700';

function openUrl(url: string) {
  void Browser.open({ url });
}

export function AboutScreen() {
  const navigate = useNavigate();
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

  function LinkRow({ label, onClick }: { label: string; onClick: () => void }) {
    return (
      <button
        onClick={onClick}
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
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>ABOUT</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* App identity */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{ fontFamily: skin.fontDisplay, fontSize: 24, color: GOLD, letterSpacing: 2 }}>FLOW LINES</div>
          <div style={{ fontSize: 12, color: skin.muted, marginTop: 4 }}>Version {version} · Gazetica Studio</div>
        </div>

        {/* More from Gazetica */}
        <div style={sectionLabel}>MORE FROM GAZETICA</div>
        <GazeticaPromoCard />

        {/* Legal */}
        <div style={sectionLabel}>LEGAL</div>
        <div style={card}>
          <LinkRow label="Privacy Policy" onClick={() => openUrl('https://gazetica.com/flowlines/privacy.html')} />
          <LinkRow label="Terms of Service" onClick={() => openUrl('https://gazetica.com/flowlines/terms.html')} />
          <LinkRow label="Open Source Licences" onClick={() => openUrl('https://gazetica.com/flowlines/licences.html')} />
        </div>

        {/* Support */}
        <div style={sectionLabel}>SUPPORT</div>
        <div style={card}>
          <LinkRow label="Contact Us" onClick={() => openUrl('mailto:support@gazetica.com')} />
          <LinkRow label="Rate the App" onClick={() => openUrl('market://details?id=com.gazetica.flowlines')} />
        </div>

        {/* GDPR */}
        <div style={card}>
          {/* TODO Sprint 4: UMP re-consent */}
          <LinkRow label="Ad Preferences (GDPR)" onClick={() => { /* TODO Sprint 4: UMP re-consent */ }} />
        </div>
      </div>
    </div>
  );
}

export default AboutScreen;
