// LanguageScreen.tsx
// Flow Lines | Gazetica Studio | Sprint 3 Day 17 | Task FL-S3-017 (VD-14)
//
// 6-language picker. Selecting persists the code via flowSettingsStore.setLanguage
// (which writes Capacitor Preferences 'FL_LANGUAGE'). Onboarding-aware navigation:
// on first launch the pick advances to /tutorial; for a returning user (from
// Settings) it navigates back. Actual i18n string switching is Sprint 5 — this
// screen only persists + reflects the visual selection.

import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { skin } from '../styles/skin';
import { useFlowSettingsStore } from '../store/flowSettingsStore';
import { flagOf } from './CountrySelector';

const GOLD = '#FFD700';

// flag uses an ISO country code (regional-indicator emoji), distinct from the
// language code we persist.
const LANGUAGES: Array<{ code: string; flag: string; name: string; tagline: string }> = [
  { code: 'en', flag: 'GB', name: 'English',       tagline: 'Connect colours. Fill the board.' },
  { code: 'de', flag: 'DE', name: 'Deutsch',       tagline: 'Verbinde Farben, fülle das Feld.' },
  { code: 'fr', flag: 'FR', name: 'Français',      tagline: 'Reliez les couleurs, remplissez.' },
  { code: 'ko', flag: 'KR', name: '한국어',          tagline: '색깔을 연결하세요.' },
  { code: 'pt', flag: 'BR', name: 'Português (BR)', tagline: 'Conecte as cores.' },
  { code: 'es', flag: 'ES', name: 'Español',       tagline: 'Conecta los colores.' },
];

export function LanguageScreen() {
  const navigate = useNavigate();
  const language = useFlowSettingsStore((s) => s.language);
  const setLanguage = useFlowSettingsStore((s) => s.setLanguage);
  const firstLaunchComplete = useFlowSettingsStore((s) => s.firstLaunchComplete);

  const select = async (code: string) => {
    await setLanguage(code); // persists to flowSettingsStore + FL_LANGUAGE
    if (firstLaunchComplete) navigate(-1);
    else navigate('/tutorial');
  };

  const baseCard: CSSProperties = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    cursor: 'pointer',
    textAlign: 'left',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ width: '100%', minHeight: '100vh', background: skin.bgDeep, display: 'flex', flexDirection: 'column', fontFamily: skin.fontBody }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: skin.white, fontSize: 18, cursor: 'pointer' }}>‹</button>
        <span style={{ fontFamily: skin.fontDisplay, fontSize: 16, color: GOLD, letterSpacing: 2 }}>LANGUAGE</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', maxWidth: 480, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 13, color: skin.muted, margin: '4px 0 16px' }}>Select your language</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LANGUAGES.map((l) => {
            const active = l.code === language;
            return (
              <button
                key={l.code}
                onClick={() => void select(l.code)}
                style={{
                  ...baseCard,
                  background: active ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)',
                  border: active ? '1px solid rgba(255,215,0,0.4)' : '1px solid rgba(127,119,221,0.2)',
                }}
              >
                <span style={{ fontSize: 24 }}>{flagOf(l.flag)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontFamily: skin.fontDisplay, fontSize: 15, color: active ? GOLD : skin.white }}>
                    {l.name}
                  </span>
                  <span style={{ display: 'block', fontSize: 11, color: skin.muted, marginTop: 2 }}>{l.tagline}</span>
                </span>
                {active && <span style={{ color: GOLD }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default LanguageScreen;
