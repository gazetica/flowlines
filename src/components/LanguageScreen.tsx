// @ts-nocheck — Numtap component, broken SKIN import; replaced in Sprint 3 (FL-S1-004 Task 0)
// LanguageScreen.tsx
// Numtap | Gazetica Studio | Sprint 3 Day 4 | Task T-012a | VD-12
//
// First-launch language selection. 6-language grid, gold selection, persists to
// Preferences + i18next via settingsStore. NOTE: `Language` is a type so it is
// imported with `import type` (verbatimModuleSyntax); the brief's combined
// import would not compile here.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ParticleCanvas } from './ParticleCanvas';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';
import type { Language } from '../store/settingsStore';
import { skin as SKIN } from '../styles/skin';
import { CountrySelector, countryName } from './CountrySelector';
import { countryFlag } from '../utils/countryFlag';

const LANGUAGES: { code: Language; flag: string; name: string; native: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English', native: 'English' },
  { code: 'de', flag: '🇩🇪', name: 'German', native: 'Deutsch' },
  { code: 'fr', flag: '🇫🇷', name: 'French', native: 'Français' },
  { code: 'ko', flag: '🇰🇷', name: 'Korean', native: '한국어' },
  { code: 'pt', flag: '🇧🇷', name: 'Portuguese', native: 'Português BR' },
  { code: 'es', flag: '🇪🇸', name: 'Spanish', native: 'Español' },
];

export function LanguageScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { language, setLanguage, setLanguageSelected, setAlias, alias, country, setCountry } = useSettingsStore();
  const [selected, setSelected] = useState<Language>(language);
  const [countryOpen, setCountryOpen] = useState(false);
  // T-004A Fix 4: first-launch player name. Defaults to "Player"; writes to the
  // same settingsStore.alias the Settings screen uses (store sanitises the value).
  const [name, setName] = useState(alias || 'Player');
  const [nameFocused, setNameFocused] = useState(false);

  const handleContinue = async () => {
    await setLanguage(selected);
    await setAlias(name.trim() || 'Player');
    await setLanguageSelected();
    navigate('/how-to-play', { replace: true });
  };

  const handleLater = async () => {
    await setAlias(name.trim() || 'Player');
    await setLanguageSelected();
    navigate('/how-to-play', { replace: true });
  };

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

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '48px 24px 24px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🌐</div>
        <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, color: 'var(--white)', marginBottom: 6 }}>
          {t('language.title')}
        </h1>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }}>
          {t('language.sub')}
        </p>
      </div>

      {/* Language grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
          padding: '0 20px 16px',
          position: 'relative',
          zIndex: 1,
          flex: 1,
        }}
      >
        {LANGUAGES.map((lang) => {
          const isSelected = selected === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => setSelected(lang.code)}
              style={{
                background: isSelected ? 'rgba(255,215,0,0.08)' : 'rgba(10,26,46,0.75)',
                border: `1px solid ${isSelected ? 'var(--gold)' : 'rgba(30,139,195,0.2)'}`,
                borderRadius: 8,
                padding: '12px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'border-color 0.2s',
                boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
              }}
            >
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: SKIN.gold, minWidth: 34, textAlign: 'center' }}>
                {lang.code.toUpperCase()}
              </span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: 'var(--white)' }}>
                  {lang.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{lang.native}</div>
              </div>
              {isSelected && (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'var(--navy)',
                    fontWeight: 700,
                    boxShadow: '0 0 6px rgba(255,215,0,0.4)',
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Player name (T-004A Fix 4) — below the grid, above the CTAs. */}
      <div style={{ padding: '0 20px 12px', position: 'relative', zIndex: 1 }}>
        <label
          htmlFor="player-name"
          style={{ display: 'block', fontSize: 11, color: SKIN.muted, marginBottom: 6, letterSpacing: 0.5 }}
        >
          {t('language.nameLabel')}
        </label>
        <input
          id="player-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
          maxLength={20}
          placeholder="Player"
          style={{
            width: '100%',
            padding: '12px 14px',
            background: SKIN.cardBg,
            border: `1px solid ${nameFocused ? SKIN.gold : SKIN.cardBorder}`,
            borderRadius: 8,
            outline: 'none',
            fontFamily: "'Space Mono', monospace",
            fontSize: 14,
            color: SKIN.white,
            boxShadow: nameFocused ? '0 0 8px rgba(255,215,0,0.2)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />
      </div>

      {/* Country (T-005 Part 3.4) */}
      <div style={{ padding: '0 20px 12px', position: 'relative', zIndex: 1 }}>
        <label style={{ display: 'block', fontSize: 11, color: SKIN.muted, marginBottom: 6, letterSpacing: 0.5 }}>
          {t('language.countryLabel')}
        </label>
        <button
          onClick={() => setCountryOpen(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: SKIN.cardBg, border: `1px solid ${SKIN.cardBorder}`, borderRadius: 8, cursor: 'pointer' }}
        >
          <span style={{ fontSize: 20 }}>{countryFlag(country)}</span>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: SKIN.white, flex: 1, textAlign: 'left' }}>{countryName(country)}</span>
          <span style={{ color: SKIN.muted }}>▼</span>
        </button>
      </div>

      {/* CTAs */}
      <div style={{ padding: '0 20px 40px', position: 'relative', zIndex: 1 }}>
        <button
          className="btn-gold"
          onClick={handleContinue}
          style={{ width: '100%', padding: '14px', fontSize: 11, letterSpacing: 2, marginBottom: 10 }}
        >
          {t('language.btn_continue')}
        </button>
        <button className="btn-outline" onClick={handleLater} style={{ width: '100%', padding: '10px', fontSize: 10 }}>
          {t('language.btn_later')}
        </button>
      </div>

      {countryOpen && (
        <CountrySelector value={country} onSelect={setCountry} onClose={() => setCountryOpen(false)} />
      )}
    </div>
  );
}
