// AboutScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-10
//
// App identity + legal/support links opened in the in-app Capacitor Browser.

import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Browser } from '@capacitor/browser';
import { ParticleCanvas } from './ParticleCanvas';

export function AboutScreen() {
  const { t } = useTranslation();

  const openUrl = async (url: string) => {
    await Browser.open({ url });
  };

  const LINKS = [
    { label: t('about.privacy_policy'), url: 'https://gazetica.com/privacy' },
    { label: t('about.terms'), url: 'https://gazetica.com/terms' },
    { label: t('about.ad_preferences'), url: '' }, // T-014: GDPR UMP
    { label: t('about.rate_app'), url: 'https://play.google.com/store/apps/details?id=com.gazetica.numtap' },
    { label: t('about.contact'), url: 'mailto:support@gazetica.com' },
    { label: t('about.more_games'), url: 'https://gazetica.com' },
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
          onClick={() => link.url && openUrl(link.url)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            borderBottom: '1px solid rgba(30,139,195,0.1)',
            padding: '14px 20px',
            cursor: link.url ? 'pointer' : 'default',
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
    </div>
  );
}
