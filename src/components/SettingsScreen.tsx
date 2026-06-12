// SettingsScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 16 | Task FL-S3-016 (VD-09)
//
// Audio toggles, player (alias/country/UID), language pills, account + support.
// Audio service wiring + IAP/UMP are Sprint 4 — booleans persist today.

import { useState } from 'react';
import type { ReactNode, CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Browser } from '@capacitor/browser';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { BottomNav } from './BottomNav';
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
  const s = useFlowSettingsStore();
  const [aliasDraft, setAliasDraft] = useState(s.alias);

  const countryName = COUNTRIES.find((c) => c.code === s.country)?.name ?? s.country ?? '—';

  const openUrl = (url: string) => {
    void Browser.open({ url });
  };

  return (
    <div style={{ width: '100%', height: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>SETTINGS</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* AUDIO */}
        <Section title="AUDIO">
          <div style={rowStyle}><span>Music</span><Toggle on={s.musicEnabled} onClick={() => void s.toggleMusic()} /></div>
          <div style={rowStyle}><span>Sound Effects</span><Toggle on={s.soundEnabled} onClick={() => void s.toggleSound()} /></div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}><span>Haptics</span><Toggle on={s.hapticsEnabled} onClick={() => void s.toggleHaptics()} /></div>
        </Section>

        {/* PLAYER */}
        <Section title="PLAYER">
          <div style={rowStyle}>
            <span>Alias</span>
            <input
              value={aliasDraft}
              maxLength={20}
              placeholder="Your name"
              onChange={(e) => setAliasDraft(e.target.value)}
              onBlur={() => void s.setAlias(aliasDraft)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(127,119,221,0.25)', borderRadius: 6, padding: '6px 10px', color: skin.white, fontSize: 12, textAlign: 'right', outline: 'none', width: 140 }}
            />
          </div>
          <button onClick={() => navigate('/country')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>Country</span>
            <span style={{ color: skin.muted }}>{flagOf(s.country || 'IN')} {countryName} ›</span>
          </button>
          <div style={{ ...rowStyle, borderBottom: 'none', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <span>UID</span>
              <span style={{ fontFamily: skin.fontDisplay, fontSize: 12, color: skin.purpleLight }}>{s.playerUid || '—'} 🔒</span>
            </div>
            <span style={{ fontSize: 10, color: skin.muted }}>Permanent · Cannot be changed</span>
          </div>
        </Section>

        {/* LANGUAGE */}
        <Section title="LANGUAGE">
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
        <Section title="ACCOUNT">
          {/* TODO Sprint 4: navigate to IAP screen */}
          <button onClick={() => navigate('/')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>🚫 Remove Ads · $2.99</span><span style={{ color: skin.muted }}>›</span>
          </button>
          {/* TODO Sprint 4: open UMP re-consent */}
          <button onClick={() => navigate('/')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: 'none', cursor: 'pointer' }}>
            <span>Ad Preferences (GDPR)</span><span style={{ color: skin.muted }}>›</span>
          </button>
        </Section>

        {/* SUPPORT */}
        <Section title="SUPPORT">
          <button onClick={() => navigate('/tutorial')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>How To Play</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => openUrl('https://gazetica.com/privacy')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>Privacy Policy</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => openUrl('https://gazetica.com/terms')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(127,119,221,0.1)', cursor: 'pointer' }}>
            <span>Terms of Service</span><span style={{ color: skin.muted }}>›</span>
          </button>
          <button onClick={() => navigate('/about')} style={{ ...rowStyle, width: '100%', background: 'none', border: 'none', borderBottom: 'none', cursor: 'pointer' }}>
            <span>About Flow Lines</span><span style={{ color: skin.muted }}>›</span>
          </button>
        </Section>
      </div>

      <BottomNav />
    </div>
  );
}
