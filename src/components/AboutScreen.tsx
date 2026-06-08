// AboutScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-10
//
// App identity + legal/support links opened in the in-app Capacitor Browser.

import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { reopenForm } from '../services/consentService';

export function AboutScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // B-003: open external links. Native-only (web logs to console). http(s) opens in
  // the in-app browser (Custom Tabs); mailto/tel can't render in Custom Tabs, so they
  // go through window.open, which Capacitor's WebView resolves to the system handler
  // (email / dialer).
  const openUrl = async (url: string) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[About] external link (web no-op):', url);
      return;
    }
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      window.open(url, '_system');
    } else {
      await Browser.open({ url });
    }
  };

  // Rows are a route (in-app navigation), a URL (openUrl), or an action (e.g. the GDPR
  // consent form). F-003: "How to Play" sits first so the tutorial is reachable any time.
  const LINKS: { label: string; route?: string; url?: string; action?: () => Promise<void> }[] = [
    { label: t('about.how_to_play'), route: '/how-to-play' }, // F-003: permanent tutorial access
    { label: t('about.privacy_policy'), url: 'https://gazetica.com/privacy' },
    { label: t('about.terms'), url: 'https://gazetica.com/terms' },
    { label: t('about.ad_preferences'), action: reopenForm }, // T-016: GDPR UMP — reopen consent form
    { label: t('about.rate_app'), url: 'https://play.google.com/store/apps/details?id=com.gazetica.numtap' },
    { label: t('about.contact'), url: 'mailto:support@gazetica.com' }, // B-003 AC4
    { label: t('about.more_games'), url: 'https://gazetica.com/games.html' }, // B-003 AC5
  ];

  return (
    <ScreenShell title={t('about.title')}>
      {/* App identity */}
      <div style={{ textAlign: 'center', padding: '28px 20px 20px' }}>
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 12px',
            background: 'var(--gold)',
            borderRadius: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Space Mono', monospace",
            fontSize: 36,
            fontWeight: 700,
            color: 'var(--navy)',
            boxShadow: '0 0 24px rgba(255,215,0,0.25)',
          }}
        >
          N
        </div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--white)', marginBottom: 4 }}>{t('app.name').toUpperCase()}</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
          {t('about.version', { version: '1.0.0' })} · {t('about.bundle_id')}
        </div>
      </div>

      {/* Links */}
      {LINKS.map((link) => (
        <button
          key={link.label}
          onClick={() => (link.route ? navigate(link.route) : link.action ? link.action() : link.url ? openUrl(link.url) : undefined)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(30,139,195,0.1)',
            padding: '14px 20px',
            cursor: link.route || link.url || link.action ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 14, color: 'var(--white)' }}>{link.label}</span>
          <span style={{ fontSize: 14, color: 'var(--muted)' }}>›</span>
        </button>
      ))}

      {/* Footer */}
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{t('about.footer')}</div>
        <div style={{ fontSize: 11, color: 'rgba(107,132,168,0.5)' }}>{t('about.copyright')}</div>
      </div>
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
      <BottomNav active="about" />
    </div>
  );
}
