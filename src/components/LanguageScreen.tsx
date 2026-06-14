// LanguageScreen.tsx
// Flow Lines | Gazetica Studio | UX Sprint D | Task FL-UX-D-001
//
// Onboarding language/alias/country screen (route /language). 2×3 language grid
// (shortcodes, no flags), alias input, and an inline country bottom-sheet (170+
// countries + search). First-launch vs Settings-access aware. Nothing is saved
// to flowSettingsStore until CONTINUE. Country identity stays CODE-based (store +
// Supabase leaderboard rely on ISO codes), so we persist the selected code.

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { ParticleCanvas } from './ParticleCanvas';
import { COUNTRIES, flagOf, filterCountries } from '../data/countries';

const GOLD = '#FFD700';
const DARK = '#0D0620'; // FL bg-deep (button text on gold)

const LANGUAGES = [
  { code: 'en', short: 'EN', name: 'English',    native: 'English' },
  { code: 'de', short: 'DE', name: 'German',     native: 'Deutsch' },
  { code: 'fr', short: 'FR', name: 'French',     native: 'Français' },
  { code: 'ko', short: 'KO', name: 'Korean',     native: '한국어' },
  { code: 'pt', short: 'PT', name: 'Portuguese', native: 'Português BR' },
  { code: 'es', short: 'ES', name: 'Spanish',    native: 'Español' },
];

/** Best-guess country CODE from the device timezone (falls back to IN). */
function detectDefaultCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('Kolkata') || tz.includes('Calcutta')) return 'IN';
    if (tz.includes('London')) return 'GB';
    if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('Denver')) return 'US';
    if (tz.includes('Berlin') || tz.includes('Vienna')) return 'DE';
    if (tz.includes('Paris')) return 'FR';
    if (tz.includes('Seoul')) return 'KR';
    if (tz.includes('Sao_Paulo') || tz.includes('Brasilia')) return 'BR';
    if (tz.includes('Madrid')) return 'ES';
    if (tz.includes('Tokyo')) return 'JP';
    if (tz.includes('Singapore')) return 'SG';
    if (tz.includes('Dubai')) return 'AE';
  } catch { /* ignore */ }
  return 'IN';
}

export function LanguageScreen() {
  const navigate = useNavigate();
  const isFirstLaunch = !useFlowSettingsStore((s) => s.firstLaunchComplete);

  const [selectedLang, setSelectedLang] = useState(() => useFlowSettingsStore.getState().language || 'en');
  const [alias, setAlias] = useState(() => useFlowSettingsStore.getState().alias || '');
  const [aliasFocused, setAliasFocused] = useState(false);
  // Country CODE: first-launch auto-detects; Settings access uses the stored value.
  const [selectedCountry, setSelectedCountry] = useState<string>(() =>
    isFirstLaunch ? detectDefaultCountry() : (useFlowSettingsStore.getState().country || 'IN'),
  );
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const filteredCountries = useMemo(() => filterCountries(COUNTRIES, countrySearch), [countrySearch]);
  const countryObj = COUNTRIES.find((c) => c.code === selectedCountry);

  const finish = () => {
    if (isFirstLaunch) {
      useFlowSettingsStore.getState().completeFirstLaunch();
      navigate('/tutorial');
    } else {
      navigate(-1);
    }
  };

  const onContinue = async () => {
    const store = useFlowSettingsStore.getState();
    await store.setLanguage(selectedLang);
    await store.setAlias(alias.trim() || 'Player');
    await store.setCountry(selectedCountry);
    finish();
  };

  const onSkip = () => finish(); // save nothing

  const openCountry = () => { setCountrySearch(''); setCountryModalOpen(true); };
  const pickCountry = (code: string) => { setSelectedCountry(code); setCountryModalOpen(false); };

  const sectionLabel: CSSProperties = {
    fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 6,
  };
  const fieldRow: CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(127,119,221,0.3)',
    borderRadius: 10, padding: '14px 16px',
    color: skin.white, fontSize: 15, boxSizing: 'border-box', width: '100%',
  };

  return (
    <div
      style={{
        position: 'relative', width: '100%', minHeight: '100vh',
        background: 'linear-gradient(160deg, #1A0A3C 0%, #2D1060 100%)',
        display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody, overflow: 'hidden',
      }}
    >
      <ParticleCanvas />

      {/* Header */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', padding: '16px 20px 0' }}>
        {!isFirstLaunch ? (
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 20, cursor: 'pointer', width: 28, textAlign: 'left' }}>‹</button>
        ) : (
          <span style={{ width: 28 }} />
        )}
        <span style={{ flex: 1, textAlign: 'center', fontSize: 13, letterSpacing: 2, color: 'rgba(255,255,255,0.7)' }}>CHOOSE YOUR LANGUAGE</span>
        <span style={{ width: 28 }} />
      </div>

      {/* Body */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, overflowY: 'auto', padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {/* Language grid 2×3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {LANGUAGES.map((l) => {
            const sel = l.code === selectedLang;
            return (
              <button
                key={l.code}
                onClick={() => setSelectedLang(l.code)}
                style={{
                  textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '14px 16px',
                  background: sel ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.05)',
                  border: sel ? '1.5px solid #FFD700' : '1px solid rgba(127,119,221,0.25)',
                }}
              >
                <div style={{ fontFamily: skin.fontDisplay, fontSize: 28, fontWeight: 700, color: sel ? GOLD : 'rgba(255,215,0,0.5)' }}>{l.short}</div>
                <div style={{ fontSize: 14, color: skin.white, marginTop: 2 }}>{l.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{l.native}</div>
              </button>
            );
          })}
        </div>

        {/* Alias */}
        <div>
          <div style={sectionLabel}>What should we call you?</div>
          <input
            value={alias}
            maxLength={20}
            placeholder="Player"
            onChange={(e) => setAlias(e.target.value)}
            onFocus={() => setAliasFocused(true)}
            onBlur={() => setAliasFocused(false)}
            style={{
              ...fieldRow, fontSize: 16, outline: 'none',
              border: `1px solid ${aliasFocused ? 'rgba(255,215,0,0.5)' : 'rgba(127,119,221,0.3)'}`,
            }}
          />
        </div>

        {/* Country */}
        <div>
          <div style={sectionLabel}>Where are you from?</div>
          <button
            onClick={openCountry}
            style={{ ...fieldRow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ fontSize: 15, color: skin.white }}>
              {countryObj ? `${countryObj.flag}  ${countryObj.name}` : `${flagOf(selectedCountry)}  ${selectedCountry}`}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>▼</span>
          </button>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <button
            onClick={() => void onContinue()}
            style={{ background: GOLD, color: DARK, border: 'none', borderRadius: 10, padding: 16, fontSize: 16, fontWeight: 700, letterSpacing: 1.5, width: '100%', cursor: 'pointer', fontFamily: skin.fontDisplay }}
          >
            CONTINUE
          </button>
          {isFirstLaunch && (
            <button
              onClick={onSkip}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: 14, fontSize: 14, color: 'rgba(255,255,255,0.5)', width: '100%', cursor: 'pointer' }}
            >
              I'll choose later
            </button>
          )}
        </div>
      </div>

      {/* Country bottom-sheet modal (always mounted; slides via transform) */}
      <div
        onClick={() => setCountryModalOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.6)',
          opacity: countryModalOpen ? 1 : 0,
          pointerEvents: countryModalOpen ? 'auto' : 'none',
          transition: 'opacity 280ms ease',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#1A0B3D', borderRadius: '20px 20px 0 0',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '0 0 32px',
            transform: countryModalOpen ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
          }}
        >
          <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '12px auto 16px' }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: skin.white, padding: '0 20px 12px' }}>Select your country</div>

          {/* Search */}
          <div style={{ position: 'relative', margin: '0 16px 8px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>🔍</span>
            <input
              value={countrySearch}
              autoFocus
              placeholder="Search countries..."
              onChange={(e) => setCountrySearch(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(127,119,221,0.3)',
                borderRadius: 10, padding: '11px 32px 11px 36px', fontSize: 15, color: skin.white, outline: 'none',
              }}
            />
            {countrySearch && (
              <button
                onClick={() => setCountrySearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 16, cursor: 'pointer' }}
              >×</button>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
            {filteredCountries.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 14, padding: '32px 0' }}>No countries found</div>
            ) : (
              filteredCountries.map((c) => {
                const sel = c.code === selectedCountry;
                return (
                  <button
                    key={c.code}
                    onClick={() => pickCountry(c.code)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '13px 4px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                      background: sel ? 'rgba(255,215,0,0.06)' : 'none', borderRadius: sel ? 8 : 0,
                      border: 'none', borderBottomColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{c.flag}</span>
                    <span style={{ flex: 1, fontSize: 15, color: skin.white }}>{c.name}</span>
                    {sel && <span style={{ color: GOLD, fontSize: 16 }}>✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default LanguageScreen;
