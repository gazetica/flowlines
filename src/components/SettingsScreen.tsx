// SettingsScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 (VD-09)
//
// Audio toggles, player (alias/country/UID), language pills, account + support.
// Audio service wiring + IAP/UMP are Sprint 4 — booleans persist today.

import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Browser } from '@capacitor/browser';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { reopenForm } from '../services/consentService';
import { BottomNav } from './BottomNav';
import { FloatingPathCanvas } from './FloatingPathCanvas';
import { flagOf, COUNTRIES } from './CountrySelector';

const GOLD = '#FFD700';

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        background: on ? 'rgba(255,215,0,0.3)' : 'rgba(127,119,221,0.15)',
        transition: 'background 0.15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 20 : 2,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: on ? GOLD : skin.muted,
          transition: 'left 0.15s',
        }}
      />
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: skin.muted, letterSpacing: 1, margin: '4px 0 8px' }}>{title}</div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(127,119,221,0.2)', borderRadius: 10, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  borderBottom: '1px solid rgba(127,119,221,0.1)',
  color: skin.white,
  fontSize: 13,
};

const LANGS = ['en', 'de', 'fr', 'ko', 'pt', 'es'];

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const s = useFlowSettingsStore();
  const [aliasDraft, setAliasDraft] = useState(s.alias);

  const countryName = COUNTRIES.find((c) => c.code === s.country)?.name ?? s.country ?? '—';

  const openUrl = (url: string) => {
    void Browser.open({ url });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100dvh', background: skin.bgDeep, overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <FloatingPathCanvas />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>{t('settings.title')}</span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* AUDIO */}
        <Section title={t('settings.section_audio')}>
          <div style={rowStyle}><span>{t('settings.music')}</span><Toggle on={s.musicEnabled} onClick={() => void s.toggleMusic()} /></div>
          <div style={rowStyle}><span>{t('settings.sound_effects')}</span><Toggle on={s.soundEnabled} onClick={() => void s.toggleSound()} /></div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}><span>{t('settings.haptics')}</span><Toggle on={s.hapticsEnabled} onClick={() => void s.toggleHaptics()} /></div>
        </Section>

        {/* PLAYER */}
        <Section title={t('settings.section_player')}>
          <div style={rowStyle}>
            <span>{t('settings.alias')}</span>
            <input
              value={aliasDraft}
              maxLength={20}
              placeholder={t('settings.alias_placeholder')}
              onChange={(e) => setAliasDraft(e.target.value)}
              onBlur={() => void s.setAlias(aliasDraft)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(127,119,221,0.25)', borderRadius: 6, padding: '6px 10px', color: skin.white, fontSize: 12, textAlign: 'right', outline: 'none', width: 140 }}
            />
          </div>
          <button onClick={() => navigate('/country')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>{t('settings.country')}</span>
            <span style={{ color: skin.muted }}>{flagOf(s.country || 'IN')} {countryName} ›</span>
          </button>
          <div style={{ ...rowStyle, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>{t('settings.uid')}</span>
              <span style={{ fontFamily: skin.fontDisplay, fontSize: 12, color: skin.purpleLight }}>{s.playerUid || '—'} 🔒</span>
            </div>
            <span style={{ fontSize: 10, color: skin.muted }}>{t('settings.uid_permanent')}</span>
          </div>
        </Section>

        {/* LANGUAGE */}
        <Section title={t('settings.language')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, padding: 12 }}>
            {LANGS.map((lng) => {
              const active = s.language === lng;
              return (
                <button
                  key={lng}
                  onClick={() => void s.setLanguage(lng)}
                  style={{
                    padding: '8px',
                    borderRadius: 8,
                    border: `1px solid ${active ? 'rgba(255,215,0,0.5)' : 'rgba(127,119,221,0.3)'}`,
                    background: active ? 'rgba(255,215,0,0.1)' : 'none',
                    color: active ? GOLD : skin.muted,
                    fontFamily: skin.fontDisplay,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {lng.toUpperCase()}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ACCOUNT */}
        <Section title={t('settings.section_account')}>
          {/* FL-UX-D-013: Remove Ads → IAPScreen (/store), was navigate('/') → home */}
          <button onPointerDown={() => navigate('/store')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>{t('settings.remove_ads')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
          {/* FL-UX-D-013: Ad Preferences → re-open the UMP privacy-options form in place
              (no navigation), was navigate('/') → home */}
          <button onPointerDown={() => void reopenForm()} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: 'none', cursor: 'pointer' }}>
            <span>{t('settings.ad_preferences')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
        </Section>

        {/* SUPPORT */}
        <Section title={t('settings.section_support')}>
          <button onClick={() => navigate('/tutorial')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>{t('settings.how_to_play')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => openUrl('https://gazetica.com/privacy')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>{t('settings.privacy_policy')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => openUrl('https://gazetica.com/terms')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>{t('settings.terms_of_service')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => navigate('/about')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: 'none', cursor: 'pointer' }}>
            <span>{t('settings.about')}</span><span style={{ color: skin.muted }}>›</span>
          </button>
        </Section>
      </div>

      <div style={{ position: 'relative', zIndex: 2 }}><BottomNav /></div>
    </div>
  );
}
