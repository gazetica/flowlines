// SettingsScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-07
//
// Audio/display toggles, language picker, leaderboard alias, purchases.
// `Language` is a type (verbatimModuleSyntax -> import type). `React` is a type
// import for React.CSSProperties / React.ReactNode (new JSX transform doesn't
// inject the React namespace).

import type React from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticleCanvas } from './ParticleCanvas';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import type { Language } from '../store/settingsStore';

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português BR' },
  { code: 'es', label: 'Español' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    soundEnabled,
    setSoundEnabled,
    musicEnabled,
    setMusicEnabled,
    hapticsEnabled,
    setHapticsEnabled,
    language,
    setLanguage,
    alias,
    setAlias,
    removeAdsPurchased,
  } = useSettingsStore();

  return (
    <ScreenShell title={t('settings.title')}>
      {/* AUDIO */}
      <Section label={t('settings.section_audio')}>
        <ToggleRow label={t('settings.sound_effects')} value={soundEnabled} onChange={setSoundEnabled} />
        <ToggleRow label={t('settings.music')} value={musicEnabled} onChange={setMusicEnabled} />
      </Section>

      {/* DISPLAY */}
      <Section label={t('settings.section_display')}>
        <ToggleRow label={t('settings.haptic_feedback')} value={hapticsEnabled} onChange={setHapticsEnabled} />
        <div style={rowStyle}>
          <span style={labelStyle}>{t('settings.language')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            style={{
              background: 'var(--navy-card)',
              border: '1px solid var(--navy-border)',
              color: 'var(--blue-light)',
              borderRadius: 4,
              padding: '4px 8px',
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
            }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
      </Section>

      {/* PROFILE */}
      <Section label={t('settings.section_profile')}>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>{t('settings.alias_label')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('settings.alias_sub')}</div>
          </div>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={t('settings.alias_placeholder')}
            maxLength={16}
            style={{
              background: 'var(--navy-card)',
              border: '1px solid var(--navy-border)',
              color: 'var(--white)',
              borderRadius: 4,
              padding: '6px 10px',
              width: 120,
              fontFamily: "'Space Mono', monospace",
              fontSize: 11,
            }}
          />
        </div>
      </Section>

      {/* PURCHASES */}
      <Section label={t('settings.section_purchases')}>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>{t('settings.remove_ads')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('settings.remove_ads_sub')}</div>
          </div>
          {removeAdsPurchased ? (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--success)' }}>
              {t('settings.remove_ads_purchased')}
            </span>
          ) : (
            <button className="btn-outline" onClick={() => navigate('/iap')} style={{ padding: '6px 12px', fontSize: 10 }}>
              {t('common.ok')}
            </button>
          )}
        </div>
        <div style={{ ...rowStyle, justifyContent: 'space-between' }}>
          <span style={labelStyle}>{t('settings.restore_purchases')}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>›</span>
        </div>
      </Section>
    </ScreenShell>
  );
}

// —— Local helpers ——————————————————————————————————————————————————

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 20px',
  borderBottom: '1px solid rgba(30,139,195,0.1)',
};
const labelStyle: React.CSSProperties = {
  fontSize: 14,
  color: 'var(--white)',
};

function ScreenShell({ children, title }: { children: React.ReactNode; title: string }) {
  const navigate = useNavigate();
  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        background: 'var(--navy)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="bg-dots" />
      <ParticleCanvas />
      <div
        className="glass"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '48px 20px 16px',
          gap: 16,
          zIndex: 10,
          borderBottom: '1px solid rgba(30,139,195,0.2)',
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Space Mono', monospace", fontSize: 20, color: 'var(--muted)', padding: 0 }}
        >
          ←
        </button>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, color: 'var(--gold)', letterSpacing: 2, flex: 1 }}>{title}</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: 2, padding: '14px 20px 6px' }}>{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => Promise<void> }) {
  return (
    <div style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          background: value ? 'var(--success)' : 'var(--navy-border)',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
        }}
      >
        <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: value ? 23 : 3, transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}
