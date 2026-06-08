// SettingsScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 5 | Task T-012b | VD-07
//
// Audio/display toggles, language picker, leaderboard alias, purchases.
// `Language` is a type (verbatimModuleSyntax -> import type). `React` is a type
// import for React.CSSProperties / React.ReactNode (new JSX transform doesn't
// inject the React namespace).

import type React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticleCanvas } from './ParticleCanvas';
import { BottomNav } from './BottomNav';
import { CountrySelector, countryName } from './CountrySelector';
import { countryFlag } from '../utils/countryFlag';
import { useTranslation } from 'react-i18next';
import { Preferences } from '@capacitor/preferences';
import { useSettingsStore } from '../store/settingsStore';
import type { Language } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import * as musicService from '../services/musicService';
import { loadLocalTier, TIER_COLORS } from '../services/tierService';
import type { Tier } from '../services/tierService';
import { PRODUCT_IDS, restorePurchases } from '../services/billing';
import { prefSetBool, PREF_KEYS } from '../services/preferences';

// DEV-001: dev-only level-skip tools. Same gate as AboutScreen/consentService —
// true in `npm run dev` AND in the on-device dev build (`VITE_DEV_TOOLS=true
// npm run build`), but false in a plain release `npm run build`, so the section
// is testable on the device yet absent from production. (The brief specified bare
// `import.meta.env.DEV`, which is false in ALL builds and would make the §8 device
// check impossible — corrected to the project's established DEV_TOOLS convention.)
const DEV_TOOLS = import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === 'true';

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
    country,
    setCountry,
    removeAdsPurchased,
    setRemoveAds,
  } = useSettingsStore();
  const [countryOpen, setCountryOpen] = useState(false);
  // F-001b: local player tier tag (PRO/EXPERT) shown next to the alias.
  const [tier, setTier] = useState<Tier | null>(null);
  useEffect(() => { loadLocalTier().then(setTier); }, []);
  // F-001c (corr.4): brief toast for the placeholder purchase actions.
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1900);
  };

  // B-002: persist the toggle AND drive the music service so it starts/stops
  // immediately (AC4/AC5). play()/pause() are idempotent and safe to call before
  // any prior init (they lazily build the Howl).
  const handleMusicToggle = async (v: boolean) => {
    await setMusicEnabled(v);
    if (v) musicService.play();
    else musicService.pause();
  };

  // T-019: restore non-consumable entitlements from Play (Remove Ads, Campaign 2/3).
  const handleRestore = async () => {
    const restored = await restorePurchases();
    for (const p of restored) {
      if (p.productId === PRODUCT_IDS.REMOVE_ADS) await setRemoveAds();
      else if (p.productId === PRODUCT_IDS.CAMPAIGN2) await prefSetBool(PREF_KEYS.CAMPAIGN2_PURCHASED, true);
      else if (p.productId === PRODUCT_IDS.CAMPAIGN3) await prefSetBool(PREF_KEYS.CAMPAIGN3_PURCHASED, true);
    }
    showToast(restored.length ? 'Purchases restored ✓' : 'No purchases to restore');
  };

  // DEV-001: level-skip + test-state reset (dev builds only).
  const [jumpInput, setJumpInput] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  const handleJump = async () => {
    const n = parseInt(jumpInput.trim(), 10);
    if (Number.isNaN(n) || n < 1 || n > 300) {
      setJumpError('Enter a level between 1 and 300');
      return;
    }
    setJumpError(null);
    await Preferences.set({ key: 'currentLevel', value: String(n) });
    // Replicate CampaignScreen's flow exactly: C1 (1–100) no difficulty, C2
    // (101–200) 'pro', C3 (201–300) 'expert' — so the engine gets the right
    // tap order/multiplier for the jumped-to campaign.
    const difficulty: 'pro' | 'expert' | undefined = n <= 100 ? undefined : n <= 200 ? 'pro' : 'expert';
    useGameStore.getState().startLevel(n, 'campaign', difficulty);
    console.log(`[DEV] Jumping to level ${n}`);
    navigate('/game');
  };

  const handleReset = async () => {
    await Preferences.remove({ key: 'removeAdsPurchased' });
    await Preferences.remove({ key: 'completedLevels' });
    await Preferences.remove({ key: 'currentLevel' });
    await Preferences.remove({ key: 'campaign2_purchased' });
    await Preferences.remove({ key: 'campaign3_purchased' });
    await Preferences.remove({ key: 'player_tier' });
    await Preferences.set({ key: 'country', value: 'IN' });
    console.log('[DEV] Test state reset');
    setResetMsg('Test state reset ✓');
    setTimeout(() => setResetMsg(null), 2000);
  };

  return (
    <>
    {countryOpen && (
      <CountrySelector value={country} onSelect={setCountry} onClose={() => setCountryOpen(false)} />
    )}
    <ScreenShell title={t('settings.title')}>
      {/* AUDIO */}
      <Section label={t('settings.section_audio')}>
        <ToggleRow label={t('settings.sound_effects')} value={soundEnabled} onChange={setSoundEnabled} />
        <ToggleRow label={t('settings.music')} value={musicEnabled} onChange={handleMusicToggle} />
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
        {/* F-001c: tier tag row ABOVE the alias input — hidden entirely if none. */}
        {tier && (
          <div style={rowStyle}>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 14 }}>
              <span style={{ color: 'var(--white)' }}>{alias || 'Player'}</span>
              <span style={{ color: TIER_COLORS[tier], fontWeight: 700 }}> {t(tier === 'expert' ? 'tier.expert_tag' : 'tier.pro_tag')}</span>
            </span>
          </div>
        )}
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
        {/* Country (T-005 Part 3.5) */}
        <div style={rowStyle}>
          <span style={labelStyle}>{t('settings.country')}</span>
          <button
            onClick={() => setCountryOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--navy-card)', border: '1px solid var(--navy-border)', borderRadius: 4, padding: '6px 10px', cursor: 'pointer', color: 'var(--white)', fontFamily: "'Space Mono', monospace", fontSize: 11 }}
          >
            <span style={{ fontSize: 16 }}>{countryFlag(country)}</span>
            <span>{countryName(country)}</span>
            <span style={{ color: 'var(--muted)' }}>▼</span>
          </button>
        </div>
      </Section>

      {/* PURCHASES */}
      <Section label={t('settings.section_purchases')}>
        {/* F-001c (corr.4): the whole row is tappable → IAP screen. */}
        <div style={{ ...rowStyle, cursor: 'pointer' }} onClick={() => navigate('/iap')}>
          <div>
            <div style={labelStyle}>{t('settings.remove_ads')}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t('settings.remove_ads_sub')}</div>
          </div>
          {removeAdsPurchased ? (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--success)' }}>
              {t('settings.remove_ads_purchased')}
            </span>
          ) : (
            <span className="btn-outline" style={{ padding: '6px 12px', fontSize: 10 }}>
              {t('common.ok')}
            </span>
          )}
        </div>
        {/* F-001c (corr.4): Restore → placeholder toast (real flow in T-019). */}
        <div
          style={{ ...rowStyle, justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={handleRestore}
        >
          <span style={labelStyle}>{t('settings.restore_purchases')}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>›</span>
        </div>
      </Section>

      {/* DEV-001: hidden dev tools — only in dev / VITE_DEV_TOOLS builds. */}
      {DEV_TOOLS && (
        <div style={{ borderTop: '2px solid rgba(245,158,11,0.5)', marginTop: 8 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#F59E0B', letterSpacing: 2, padding: '14px 20px 6px' }}>⚠ DEV TOOLS</div>

          {/* Jump to Level — input + GO on one row */}
          <div style={rowStyle}>
            <span style={labelStyle}>Jump to Level</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                inputMode="numeric"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder="1-300"
                style={{ background: 'var(--navy-card)', border: '1px solid var(--navy-border)', color: 'var(--white)', borderRadius: 4, padding: '6px 10px', width: 72, fontFamily: "'Space Mono', monospace", fontSize: 11 }}
              />
              <button onClick={handleJump} className="btn-gold" style={{ padding: '6px 16px', fontSize: 10 }}>GO</button>
            </div>
          </div>
          {jumpError && (
            <div style={{ padding: '0 20px 10px', fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--danger)' }}>{jumpError}</div>
          )}

          {/* Reset Test State — own row */}
          <div style={rowStyle}>
            <span style={labelStyle}>Reset Test State</span>
            <button onClick={handleReset} className="btn-outline" style={{ padding: '6px 14px', fontSize: 10 }}>RESET</button>
          </div>
          {resetMsg && (
            <div style={{ padding: '0 20px 10px', fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--success)' }}>{resetMsg}</div>
          )}
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: '12%', left: 0, right: 0, textAlign: 'center', zIndex: 50, pointerEvents: 'none' }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: 'var(--white)', background: 'rgba(8,18,32,0.92)', border: '1px solid rgba(30,139,195,0.4)', borderRadius: 8, padding: '8px 14px' }}>
            {toast}
          </span>
        </div>
      )}
    </ScreenShell>
    </>
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
      <BottomNav active="settings" />
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
